"""Epic 8 — Safety owner controls and PolicyGate extensions."""

from __future__ import annotations

from app.services.agent_wallet_event_parser import parse_owner_action_from_tx
from app.services.policy_compatibility import PolicyMirror
from app.services.policy_gate import PolicyGate
from app.services.safety_service import derive_risk_status


def _policy(**kwargs) -> PolicyMirror:
    defaults = {
        "version": 1,
        "allowed_pairs": ["DEEP/SUI", "SUI/USDC"],
        "max_notional_per_trade": 500.0,
        "max_daily_loss": 200.0,
        "paused": False,
        "agent_revoked": False,
        "mirror_synced": True,
    }
    defaults.update(kwargs)
    return PolicyMirror(**defaults)


def test_revoked_agent_rejects_execution():
    gate = PolicyGate()
    result = gate.evaluate(
        _policy(agent_revoked=True),
        pair="DEEP/SUI",
        side="BUY",
        notional=100,
    )
    assert result.passed is False
    assert result.rejection_code == "POLICY_AGENT_REVOKED"


def test_mirror_stale_blocks_execution():
    gate = PolicyGate()
    result = gate.evaluate(
        _policy(mirror_synced=False),
        pair="DEEP/SUI",
        side="BUY",
        notional=100,
    )
    assert result.passed is False
    assert result.rejection_code == "POLICY_MIRROR_STALE"


def test_tightened_max_notional_rejects_previously_valid_intent():
    gate = PolicyGate()
    result = gate.evaluate(
        _policy(max_notional_per_trade=50),
        pair="DEEP/SUI",
        side="BUY",
        notional=100,
    )
    assert result.passed is False
    assert result.rejection_code == "POLICY_NOTIONAL_EXCEEDED"


def test_parse_pause_event():
    events = [
        {
            "type": "0xpkg::trading_policy::TradingPolicyPaused",
            "parsedJson": {
                "policy_id": "0xabc",
                "panda_id": "0xpanda",
                "paused": True,
            },
        }
    ]
    parsed = parse_owner_action_from_tx(events, "0xpkg")
    assert parsed is not None
    assert parsed.action == "pause"
    assert parsed.paused is True


def test_parse_revoke_event():
    events = [
        {
            "type": "0xpkg::trading_policy::AgentRevoked",
            "parsedJson": {
                "policy_id": "0xabc",
                "panda_id": "0xpanda",
                "old_agent": "0xagent",
            },
        }
    ]
    parsed = parse_owner_action_from_tx(events, "0xpkg")
    assert parsed is not None
    assert parsed.action == "revoke"
    assert parsed.agent_revoked is True


def test_derive_risk_status_revoked():
    class Vault:
        status = "revoked"

    class Policy:
        paused = True
        authorized_agent = None

    assert derive_risk_status(vault=Vault(), policy=Policy(), mirror="synced") == "revoked"
