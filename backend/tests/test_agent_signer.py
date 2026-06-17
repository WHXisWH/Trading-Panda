"""AgentSigner precondition checks — Epic 6."""

import pytest

from app.schemas.errors import ApiError, ApiErrorCode
from app.services.agent_signer import AgentSignerService


AGENT_ADDR = "0xa6e47"
OTHER_ADDR = "0xb6e47"


def test_signer_rejects_paused_policy(monkeypatch):
    monkeypatch.setattr("app.services.agent_signer.settings.chain_proof_enabled", True)
    monkeypatch.setattr("app.services.agent_signer.settings.agent_signer_address", AGENT_ADDR)

    signer = AgentSignerService()
    with pytest.raises(ApiError) as exc:
        signer.validate_preconditions(
            policy_authorized_agent=AGENT_ADDR,
            vault_authorized_agent=AGENT_ADDR,
            policy_version=1,
            expected_policy_version=1,
            policy_paused=True,
            vault_status="active",
        )
    assert exc.value.code == ApiErrorCode.POLICY_PAUSED


def test_signer_rejects_revoked_agent(monkeypatch):
    monkeypatch.setattr("app.services.agent_signer.settings.chain_proof_enabled", True)
    monkeypatch.setattr("app.services.agent_signer.settings.agent_signer_address", AGENT_ADDR)

    signer = AgentSignerService()
    with pytest.raises(ApiError) as exc:
        signer.validate_preconditions(
            policy_authorized_agent=None,
            vault_authorized_agent=None,
            policy_version=1,
            expected_policy_version=1,
            policy_paused=False,
            vault_status="active",
        )
    assert exc.value.code == ApiErrorCode.AGENT_SIGNER_UNAUTHORIZED


def test_signer_rejects_mismatched_agent(monkeypatch):
    monkeypatch.setattr("app.services.agent_signer.settings.chain_proof_enabled", True)
    monkeypatch.setattr("app.services.agent_signer.settings.agent_signer_address", AGENT_ADDR)

    signer = AgentSignerService()
    with pytest.raises(ApiError) as exc:
        signer.validate_preconditions(
            policy_authorized_agent=OTHER_ADDR,
            vault_authorized_agent=OTHER_ADDR,
            policy_version=1,
            expected_policy_version=1,
            policy_paused=False,
            vault_status="active",
        )
    assert exc.value.code == ApiErrorCode.AGENT_SIGNER_UNAUTHORIZED
