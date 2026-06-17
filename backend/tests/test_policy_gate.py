"""PolicyGate pass/reject matrix — Epic 5.6."""

from app.services.policy_compatibility import PolicyMirror
from app.services.policy_gate import PolicyGate


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


def test_hold_always_passes():
    gate = PolicyGate()
    result = gate.evaluate(_policy(), pair="DEEP/SUI", side="HOLD", notional=0)
    assert result.passed is True


def test_missing_policy_rejects_buy():
    gate = PolicyGate()
    result = gate.evaluate(None, pair="DEEP/SUI", side="BUY", notional=100)
    assert result.passed is False
    assert result.rejection_code == "POLICY_NOT_FOUND"


def test_paused_policy_rejects():
    gate = PolicyGate()
    result = gate.evaluate(
        _policy(paused=True),
        pair="DEEP/SUI",
        side="BUY",
        notional=100,
    )
    assert result.passed is False
    assert result.rejection_code == "POLICY_PAUSED"


def test_unauthorized_pair_rejects():
    gate = PolicyGate()
    result = gate.evaluate(
        _policy(),
        pair="BTC/USDC",
        side="BUY",
        notional=100,
    )
    assert result.passed is False
    assert result.rejection_code == "POLICY_PAIR_NOT_ALLOWED"


def test_notional_exceeded_rejects():
    gate = PolicyGate()
    result = gate.evaluate(
        _policy(max_notional_per_trade=50),
        pair="DEEP/SUI",
        side="BUY",
        notional=100,
    )
    assert result.passed is False
    assert result.rejection_code == "POLICY_NOTIONAL_EXCEEDED"


def test_daily_loss_exceeded_rejects():
    gate = PolicyGate()
    result = gate.evaluate(
        _policy(max_daily_loss=100),
        pair="DEEP/SUI",
        side="SELL",
        notional=50,
        daily_realized_loss=150,
    )
    assert result.passed is False
    assert result.rejection_code == "POLICY_DAILY_LOSS_EXCEEDED"


def test_valid_buy_passes():
    gate = PolicyGate()
    result = gate.evaluate(
        _policy(),
        pair="DEEP/SUI",
        side="BUY",
        notional=100,
        daily_realized_loss=10,
    )
    assert result.passed is True
    assert result.policy_snapshot is not None
    assert result.policy_snapshot["version"] == 1
