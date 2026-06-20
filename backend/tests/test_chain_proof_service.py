from app.services.chain_proof_service import is_dry_run_execution


def test_is_dry_run_execution_detects_dryrun_digest():
    assert is_dry_run_execution("DRYRUN_abc123", {}) is True


def test_is_dry_run_execution_detects_payload_flag():
    assert is_dry_run_execution("real_digest", {"dry_run": True}) is True


def test_is_dry_run_execution_allows_real_digest():
    assert is_dry_run_execution("real_digest", {"dry_run": False}) is False
