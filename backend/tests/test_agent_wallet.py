"""Epic 2 — Agent Wallet service and API tests."""

from __future__ import annotations

from types import SimpleNamespace

import pytest

from app.config import settings
from app.db.models import PandaAccount, PandaVault
from app.services import agent_wallet
from app.services import market_pairs
from app.services.agent_wallet_event_parser import ParsedAgentWalletSetup
from app.services.agent_wallet import (
    compute_policy_hash,
    launch_pairs,
    sync_setup_from_tx,
    validate_policy_draft,
)


OWNER_ADDRESS = "0x" + "1" * 64
PANDA_OBJECT_ID = "0x" + "2" * 64


class _Result:
    def __init__(self, row):
        self.row = row

    def scalar_one_or_none(self):
        return self.row


class _MirrorSyncSession:
    def __init__(self, existing_vault=None):
        self.existing_vault = existing_vault
        self.added = []
        self.flushed_vault_ids = set()
        self.committed = False

    async def execute(self, _statement):
        return _Result(self.existing_vault)

    def add(self, row):
        self.added.append(row)

    async def flush(self):
        for row in self.added:
            if isinstance(row, PandaVault):
                self.flushed_vault_ids.add(row.id)

    async def commit(self):
        for row in self.added:
            if isinstance(row, PandaAccount) and row.vault_id not in self.flushed_vault_ids:
                raise AssertionError("PandaAccount was committed before its PandaVault was flushed")
        self.committed = True


def _panda():
    return SimpleNamespace(
        id="panda-db-id",
        sui_object_id=PANDA_OBJECT_ID,
        active_vault_id=None,
        active_policy_id=None,
    )


def _user():
    return SimpleNamespace(wallet_address=OWNER_ADDRESS)


def _parsed_setup():
    return ParsedAgentWalletSetup(
        vault_object_id="0x" + "3" * 64,
        policy_object_id="0x" + "4" * 64,
        panda_object_id=PANDA_OBJECT_ID,
        owner=OWNER_ADDRESS,
        authorized_agent=None,
        policy_version=1,
    )


def test_launch_pairs_defaults():
    pairs = launch_pairs()
    assert "DEEP-SUI" in pairs


@pytest.mark.asyncio
async def test_sync_setup_flushes_vault_before_account(monkeypatch):
    async def fake_fetch_setup_from_tx(*_args, **_kwargs):
        return _parsed_setup()

    async def fake_resolve_launch_pairs():
        return ["DEEP-SUI", "SUI-USDC"]

    async def fake_get_setup_status(panda, _db):
        return {"setup_state": "ready", "vault_id": panda.active_vault_id}

    monkeypatch.setattr(settings, "agent_signer_address", "")
    monkeypatch.setattr(agent_wallet, "fetch_setup_from_tx", fake_fetch_setup_from_tx)
    monkeypatch.setattr(agent_wallet, "resolve_launch_pairs", fake_resolve_launch_pairs)
    monkeypatch.setattr(agent_wallet, "get_setup_status", fake_get_setup_status)

    db = _MirrorSyncSession()
    result = await sync_setup_from_tx(_panda(), _user(), "setup-digest", None, db)

    assert db.committed is True
    assert result["setup_state"] == "ready"


@pytest.mark.asyncio
async def test_sync_setup_retry_same_digest_returns_existing_status(monkeypatch):
    existing_vault = SimpleNamespace(
        id="vault-db-id",
        policy_id="policy-db-id",
        sui_object_id="0x" + "3" * 64,
        created_tx_digest="setup-digest",
    )

    async def fail_if_fetching_chain(*_args, **_kwargs):
        raise AssertionError("same transaction retry should not re-fetch chain state")

    async def fake_get_setup_status(_panda, _db):
        return {"setup_state": "ready", "mirror_sync_status": "synced"}

    monkeypatch.setattr(agent_wallet, "fetch_setup_from_tx", fail_if_fetching_chain)
    monkeypatch.setattr(agent_wallet, "get_setup_status", fake_get_setup_status)

    db = _MirrorSyncSession(existing_vault=existing_vault)
    result = await sync_setup_from_tx(_panda(), _user(), "setup-digest", None, db)

    assert result == {"setup_state": "ready", "mirror_sync_status": "synced"}
    assert db.added == []
    assert db.committed is False


def test_canonical_market_pair_unifies_separators():
    assert market_pairs.canonical_market_pair("DEEP/SUI") == "DEEP-SUI"
    assert market_pairs.canonical_market_pair("SUI_USDC") == "SUI-USDC"
    assert market_pairs.canonical_market_pair("wal-usdc") == "wal-usdc"


@pytest.mark.asyncio
async def test_resolve_launch_pairs_merges_configured_and_monitor_ranked_pairs(monkeypatch):
    async def fake_fetch():
        return {
            "pairs": [
                {"pair": "SUI-USDC", "rank": 1},
                {"pair": "DEEP-USDC", "rank": 2},
                {"pair": "WAL-USDC", "rank": 3},
                {"pair": "NS-USDC", "rank": 4},
            ],
            "launch_pairs": ["DEEP-SUI", "SUI-USDC"],
        }

    monkeypatch.setattr(market_pairs, "_fetch_monitor_pairs_payload", fake_fetch)
    pairs = await market_pairs.resolve_launch_pairs()
    assert pairs == ["DEEP-SUI", "SUI-USDC", "DEEP-USDC", "WAL-USDC", "NS-USDC"]


@pytest.mark.asyncio
async def test_resolve_launch_pairs_dedupes_slash_and_dash_forms(monkeypatch):
    async def fake_fetch():
        return {
            "pairs": [
                {"pair": "SUI-USDC", "rank": 1},
                {"pair": "DEEP-SUI", "rank": 2},
            ],
        }

    monkeypatch.setattr(market_pairs, "_fetch_monitor_pairs_payload", fake_fetch)
    monkeypatch.setattr(settings, "deepbook_launch_pairs", "DEEP/SUI,SUI/USDC")
    pairs = await market_pairs.resolve_launch_pairs()
    assert pairs == ["DEEP-SUI", "SUI-USDC"]


@pytest.mark.asyncio
async def test_resolve_launch_pairs_keeps_configured_pairs_when_monitor_has_ranked_pairs(monkeypatch):
    async def fake_fetch():
        return {
            "pairs": [
                {"pair": "SUI-USDC", "rank": 1},
                {"pair": "WAL-USDC", "rank": 2},
            ],
        }

    monkeypatch.setattr(market_pairs, "_fetch_monitor_pairs_payload", fake_fetch)
    monkeypatch.setattr(settings, "deepbook_launch_pairs", "DEEP-SUI,SUI-USDC")
    pairs = await market_pairs.resolve_launch_pairs()
    assert pairs[:2] == ["DEEP-SUI", "SUI-USDC"]
    assert "WAL-USDC" in pairs


@pytest.mark.asyncio
async def test_resolve_launch_pairs_falls_back_to_config_when_monitor_empty(monkeypatch):
    async def fake_fetch():
        return None

    monkeypatch.setattr(market_pairs, "_fetch_monitor_pairs_payload", fake_fetch)
    monkeypatch.setattr(settings, "deepbook_launch_pairs", "DEEP-SUI,SUI-USDC")
    pairs = await market_pairs.resolve_launch_pairs()
    assert pairs == ["DEEP-SUI", "SUI-USDC"]


def test_normalize_monitor_base_url_downgrades_localhost_https():
    assert (
        market_pairs._normalize_monitor_base_url("https://localhost:8001")
        == "http://localhost:8001"
    )
    assert (
        market_pairs._normalize_monitor_base_url("http://localhost:8001")
        == "http://localhost:8001"
    )


def test_validate_policy_draft_rejects_empty_pairs(monkeypatch):
    monkeypatch.setattr(
        "app.services.agent_wallet.settings.agent_signer_address",
        "0xagent",
    )
    result = validate_policy_draft([], 50, 8, 1, "0xagent")
    assert result["valid"] is False
    assert any(e["field"] == "allowed_pairs" for e in result["errors"])


def test_validate_policy_draft_accepts_launch_pair(monkeypatch):
    monkeypatch.setattr(
        "app.services.agent_wallet.settings.agent_signer_address",
        "0xagent",
    )
    pair = launch_pairs()[0]
    result = validate_policy_draft([pair], 50, 8, 1, "0xagent")
    assert result["valid"] is True
    assert result["policy_hash"] == compute_policy_hash(
        [pair], 50, 8, 1, 0, 10, "manual", 10_000.0
    )


def test_validate_policy_draft_accepts_slash_form_when_canonical_is_dash(monkeypatch):
    monkeypatch.setattr(
        "app.services.agent_wallet.settings.agent_signer_address",
        "0xagent",
    )
    result = validate_policy_draft(["DEEP/SUI"], 50, 8, 1, "0xagent")
    assert result["valid"] is True


@pytest.mark.asyncio
async def test_validate_policy_draft_accepts_monitor_ranked_pair(monkeypatch):
    async def fake_fetch():
        return {
            "pairs": [
                {"pair": "SUI-USDC", "rank": 1},
                {"pair": "WAL-USDC", "rank": 2},
            ],
        }

    monkeypatch.setattr(market_pairs, "_fetch_monitor_pairs_payload", fake_fetch)
    monkeypatch.setattr(
        "app.services.agent_wallet.settings.agent_signer_address",
        "0xagent",
    )
    result = await market_pairs.resolve_launch_pairs()
    assert "WAL-USDC" in result

    from app.services.agent_wallet import validate_policy_draft_async

    validation = await validate_policy_draft_async(["WAL-USDC"], 50, 8, 1, "0xagent")
    assert validation["valid"] is True


@pytest.mark.asyncio
async def test_validate_policy_draft_normalizes_pool_underscore(monkeypatch):
    async def fake_fetch():
        return {"pairs": [{"pool": "SUI_USDC", "rank": 1}]}

    monkeypatch.setattr(market_pairs, "_fetch_monitor_pairs_payload", fake_fetch)
    monkeypatch.setattr(
        "app.services.agent_wallet.settings.agent_signer_address",
        "0xagent",
    )

    from app.services.agent_wallet import validate_policy_draft_async

    validation = await validate_policy_draft_async(["SUI_USDC"], 50, 8, 1, "0xagent")
    assert validation["valid"] is True
    assert "SUI-USDC" in validation["supported_pairs"]


def test_validate_policy_draft_rejects_unsupported_pair(monkeypatch):
    monkeypatch.setattr(
        "app.services.agent_wallet.settings.agent_signer_address",
        "0xagent",
    )
    result = validate_policy_draft(["FOO/BAR"], 50, 8, 1, "0xagent")
    assert result["valid"] is False


def test_compute_policy_hash_stable():
    h1 = compute_policy_hash(["DEEP-SUI", "SUI-USDC"], 50, 8, 1, 0, 10, "manual", 10_000.0)
    h2 = compute_policy_hash(["SUI-USDC", "DEEP-SUI"], 50, 8, 1, 0, 10, "manual", 10_000.0)
    assert h1 == h2


def test_validate_policy_draft_rejects_notional_above_budget(monkeypatch):
    monkeypatch.setattr(
        "app.services.agent_wallet.settings.agent_signer_address",
        "0xagent",
    )
    pair = launch_pairs()[0]
    result = validate_policy_draft([pair], 500, 8, 1, "0xagent", training_budget=100)
    assert result["valid"] is False
    assert any(e["field"] == "max_notional_per_trade" for e in result["errors"])


def test_validate_policy_draft_rejects_budget_out_of_range(monkeypatch):
    monkeypatch.setattr(
        "app.services.agent_wallet.settings.agent_signer_address",
        "0xagent",
    )
    pair = launch_pairs()[0]
    result = validate_policy_draft([pair], 50, 8, 1, "0xagent", training_budget=50)
    assert result["valid"] is False
    assert any(e["field"] == "training_budget" for e in result["errors"])
