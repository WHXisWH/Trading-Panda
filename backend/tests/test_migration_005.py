"""Migration 005 chain proof idempotency index."""

from pathlib import Path

_MIGRATION = (
    Path(__file__).resolve().parents[1]
    / "alembic"
    / "versions"
    / "005_chain_proof_idempotency.py"
).read_text()


def test_migration_005_revision_chain():
    assert 'revision: str = "005_chain_proof_idempotency"' in _MIGRATION
    assert 'down_revision: Union[str, None] = "004_v31_agent_wallet"' in _MIGRATION


def test_migration_005_adds_retryable_and_idempotency_index():
    assert "retryable" in _MIGRATION
    assert "idx_chain_execution_logs_idempotency" in _MIGRATION
    assert "trade_fact_id" in _MIGRATION
    assert "policy_version" in _MIGRATION
    assert "decision_hash" in _MIGRATION
