"""ChainExecutionWorker helpers and AgentSigner dry-run — Epic 6."""

from __future__ import annotations

import pytest

from app.services.agent_signer import AgentSignerService, ChainProofParams, SubmitResult
from app.services.pysui_compat import tx_digest_from_result, tx_failure_reason
from app.workers.chain_execution_worker import decision_hash_bytes


def test_decision_hash_bytes_hex():
    raw = "a" * 64
    assert len(decision_hash_bytes(raw)) == 32


def test_decision_hash_bytes_plain():
    assert len(decision_hash_bytes("decision-1")) == 32


def test_tx_digest_from_result_uses_result_data_digest():
    class ResultData:
        digest = "REAL_DIGEST"

    class Result:
        result_data = ResultData()

    assert tx_digest_from_result(Result()) == "REAL_DIGEST"


def test_tx_failure_reason_detects_failed_effects():
    result = type(
        "Result",
        (),
        {
            "result_data": {
                "effects": {
                    "status": {
                        "status": "failure",
                        "error": "CommandArgumentError",
                    }
                }
            }
        },
    )()

    assert tx_failure_reason(result) == "CommandArgumentError"


@pytest.mark.asyncio
async def test_agent_signer_dry_run_without_private_key(monkeypatch):
    monkeypatch.setattr(
        "app.services.agent_signer.settings.chain_proof_enabled",
        True,
    )
    monkeypatch.setattr("app.services.agent_signer.settings.agent_signer_address", "0xa6e47")
    monkeypatch.setattr("app.services.agent_signer.settings.agent_signer_private_key", "")

    signer = AgentSignerService()
    signer.validate_preconditions(
        policy_authorized_agent="0xa6e47",
        vault_authorized_agent="0xa6e47",
        policy_version=1,
        expected_policy_version=1,
        policy_paused=False,
        vault_status="active",
    )

    result = await signer.submit_chain_proof(
        ChainProofParams(
            vault_object_id="0xvault",
            policy_object_id="0xpolicy",
            pair="DEEP/SUI",
            side="BUY",
            notional=10,
            reference_price=100,
            decision_hash=decision_hash_bytes("abc"),
            proof_key="a" * 64,
            proof_source=2,
            policy_version=1,
        )
    )
    assert result.dry_run is True
    assert result.tx_digest.startswith("DRYRUN_")


@pytest.mark.asyncio
async def test_agent_signer_custom_submit_fn():
    async def fake_submit(params: ChainProofParams) -> SubmitResult:
        return SubmitResult(tx_digest="CUSTOM_DIGEST", event_payload={"pair": params.pair})

    signer = AgentSignerService(submit_fn=fake_submit)
    result = await signer.submit_chain_proof(
        ChainProofParams(
            vault_object_id="0x1",
            policy_object_id="0x2",
            pair="DEEP/SUI",
            side="SELL",
            notional=5,
            reference_price=50,
            decision_hash=b"\x01",
            proof_key="b" * 64,
            proof_source=1,
            policy_version=1,
        )
    )
    assert result.tx_digest == "CUSTOM_DIGEST"
