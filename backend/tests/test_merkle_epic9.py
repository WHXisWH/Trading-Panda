"""Merkle worker async + Trade Fact leaf tests."""
from __future__ import annotations

import hashlib
from unittest.mock import AsyncMock

import pytest

from app.engine.merkle_worker import (
    build_leaves_from_facts,
    compute_merkle_root,
    trade_fact_leaf,
)
from app.services.merkle_service import batch_trade_id_range, preview_batch_root
from app.services.trust_proof_service import (
    MerkleSubmitParams,
    SkillDigestParams,
    TrustProofService,
)
from app.workers.merkle_worker import process_merkle_batch_job
from app.workers.walrus_sync_worker import process_walrus_archive_job


def test_trade_fact_leaf_prefers_fact_hash():
    fact_hash = hashlib.sha256(b"canonical-fact").hexdigest()
    assert trade_fact_leaf({"fact_hash": fact_hash, "side": "BUY"}) == fact_hash


def test_trade_fact_leaf_is_deterministic_without_hash():
    fact = {
        "id": "f1",
        "pair": "DEEP/SUI",
        "side": "BUY",
        "decision_snapshot": {"final_score": 0.8},
        "execution_snapshot": {"reference_price": 1.2, "quantity": 10},
        "realized_pnl": 0.5,
    }
    assert trade_fact_leaf(fact) == trade_fact_leaf(dict(fact))


def test_preview_batch_root_stable():
    facts = [{"id": str(i), "fact_hash": hashlib.sha256(str(i).encode()).hexdigest()} for i in range(3)]
    root_a = preview_batch_root(facts)
    root_b = preview_batch_root(facts)
    assert root_a == root_b
    assert len(root_a) == 64


def test_batch_trade_id_range_zero_based():
    start, end = batch_trade_id_range(1, 50)
    assert start == 0
    assert end == 49
    start2, end2 = batch_trade_id_range(2, 50)
    assert start2 == 50
    assert end2 == 99


@pytest.mark.asyncio
async def test_trust_proof_service_dry_run_merkle():
    service = TrustProofService()
    result = await service.submit_merkle_root(
        MerkleSubmitParams(
            panda_object_id="0xabc",
            root_hash=hashlib.sha256(b"root").hexdigest(),
            trade_count=50,
            start_trade_id=0,
            end_trade_id=49,
            batch_index=1,
        )
    )
    assert result.dry_run is True
    assert result.tx_digest.startswith("DRYRUN_MERKLE_")


@pytest.mark.asyncio
async def test_trust_proof_service_dry_run_skill():
    service = TrustProofService()
    skill_hash = hashlib.sha256(b"skill").hexdigest()
    result = await service.submit_skill_digest(
        SkillDigestParams(
            panda_object_id="0xabc",
            skill_version=1,
            skill_hash=skill_hash,
        )
    )
    assert result.dry_run is True
    assert result.tx_digest.startswith("DRYRUN_SKILL_")


@pytest.mark.asyncio
async def test_walrus_archive_skips_when_unconfigured(monkeypatch):
    monkeypatch.setattr("app.workers.walrus_sync_worker._walrus_configured", lambda: False)
    result = await process_walrus_archive_job(
        AsyncMock(),
        {"archive_type": "skill_snapshot", "panda_id": "p1", "skill_version_id": "sv1"},
    )
    assert result["status"] == "skipped"
    assert result["reason"] == "walrus_not_configured"


@pytest.mark.asyncio
async def test_merkle_job_skips_empty_batch(monkeypatch):
    session = AsyncMock()

    async def _empty_facts(*_args, **_kwargs):
        return []

    async def _no_existing_row(*_args, **_kwargs):
        result = AsyncMock()
        result.scalar_one_or_none = lambda: None
        return result

    monkeypatch.setattr("app.workers.merkle_worker.load_batch_facts", _empty_facts)
    session.execute = _no_existing_row

    result = await process_merkle_batch_job(
        session,
        {"panda_id": "p1", "batch_index": 1},
        trust_service=TrustProofService(),
    )
    assert result["status"] == "skipped"
    assert result["reason"] == "no_trade_facts"
