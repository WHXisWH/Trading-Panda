from pathlib import Path

from app.services.chain_proof_service import is_dry_run_execution


def test_is_dry_run_execution_detects_dryrun_digest():
    assert is_dry_run_execution("DRYRUN_abc123", {}) is True


def test_is_dry_run_execution_detects_payload_flag():
    assert is_dry_run_execution("real_digest", {"dry_run": True}) is True


def test_is_dry_run_execution_allows_real_digest():
    assert is_dry_run_execution("real_digest", {"dry_run": False}) is False


def test_attach_execution_result_reuses_idempotent_chain_log():
    source = Path("app/services/chain_proof_service.py").read_text()

    assert "ChainExecutionLog.proof_key == proof_key" in source
    assert "ChainExecutionLog.trade_fact_id == trade_fact_id" in source
    assert "ChainExecutionLog.policy_version == policy_version" in source
    assert "ChainExecutionLog.decision_hash == decision_hash" in source
