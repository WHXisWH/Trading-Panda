"""Epic 2 — Agent Wallet service and API tests."""

from __future__ import annotations

import pytest

from app.services.agent_wallet import (
    compute_policy_hash,
    launch_pairs,
    validate_policy_draft,
)


def test_launch_pairs_defaults():
    pairs = launch_pairs()
    assert "DEEP/SUI" in pairs


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
    assert result["policy_hash"] == compute_policy_hash([pair], 50, 8, 1, 0, 10, "manual")


def test_validate_policy_draft_rejects_unsupported_pair(monkeypatch):
    monkeypatch.setattr(
        "app.services.agent_wallet.settings.agent_signer_address",
        "0xagent",
    )
    result = validate_policy_draft(["FOO/BAR"], 50, 8, 1, "0xagent")
    assert result["valid"] is False


def test_compute_policy_hash_stable():
    h1 = compute_policy_hash(["DEEP/SUI", "SUI/USDC"], 50, 8, 1, 0, 10, "manual")
    h2 = compute_policy_hash(["SUI/USDC", "DEEP/SUI"], 50, 8, 1, 0, 10, "manual")
    assert h1 == h2
