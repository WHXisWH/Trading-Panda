"""ProofSelector eligibility and idempotency — Epic 6."""

from app.services.policy_compatibility import PolicyMirror
from app.services.proof_selector import (
    AUTO_SCORE_THRESHOLD,
    compute_proof_key,
    evaluate_eligibility,
)


def _policy() -> PolicyMirror:
    return PolicyMirror(
        version=1,
        allowed_pairs=["DEEP/SUI", "SUI/USDC"],
        max_notional_per_trade=50.0,
        max_daily_loss=8.0,
        paused=False,
    )


def _fact(**overrides):
    base = {
        "id": "fact-1",
        "pair": "DEEP/SUI",
        "side": "BUY",
        "proof_status": "not_requested",
        "decision_snapshot": {"decision_hash": "abc123"},
    }
    base.update(overrides)
    return base


def _intent(**overrides):
    base = {
        "policy_version": 1,
        "pair": "DEEP/SUI",
        "side": "BUY",
        "notional": 10.0,
        "final_score": 0.80,
        "decision_hash": "abc123",
        "status": "EXECUTED",
    }
    base.update(overrides)
    return base


def test_compute_proof_key_deterministic():
    a = compute_proof_key("fact-1", 1, "hash-a")
    b = compute_proof_key("fact-1", 1, "hash-a")
    c = compute_proof_key("fact-1", 2, "hash-a")
    assert a == b
    assert a != c


def test_auto_eligible_when_all_checks_pass():
    result = evaluate_eligibility(
        trade_fact=_fact(),
        order_intent=_intent(),
        policy=_policy(),
        chain_proof_enabled=True,
        manual=False,
    )
    assert result.eligible is True
    assert result.proof_key is not None
    assert result.score_bypassed is False


def test_auto_ineligible_below_score_threshold():
    result = evaluate_eligibility(
        trade_fact=_fact(),
        order_intent=_intent(final_score=0.70),
        policy=_policy(),
        chain_proof_enabled=True,
        manual=False,
    )
    assert result.eligible is False
    assert any("threshold" in r.lower() for r in result.reasons)


def test_manual_bypasses_score_threshold():
    result = evaluate_eligibility(
        trade_fact=_fact(),
        order_intent=_intent(final_score=0.50),
        policy=_policy(),
        chain_proof_enabled=True,
        manual=True,
    )
    assert result.eligible is True
    assert result.score_bypassed is True


def test_manual_still_requires_policy_pass():
    result = evaluate_eligibility(
        trade_fact=_fact(pair="FOO/BAR"),
        order_intent=_intent(pair="FOO/BAR", final_score=0.99),
        policy=_policy(),
        chain_proof_enabled=True,
        manual=True,
    )
    assert result.eligible is False
    assert any("not allowed" in r.lower() or "not supported" in r.lower() for r in result.reasons)


def test_disabled_chain_proof_blocks():
    result = evaluate_eligibility(
        trade_fact=_fact(),
        order_intent=_intent(),
        policy=_policy(),
        chain_proof_enabled=False,
        manual=True,
    )
    assert result.eligible is False
    assert any("disabled" in r.lower() for r in result.reasons)


def test_daily_cap_blocks():
    result = evaluate_eligibility(
        trade_fact=_fact(),
        order_intent=_intent(),
        policy=_policy(),
        chain_proof_enabled=True,
        manual=True,
        proofs_today=10,
    )
    assert result.eligible is False
    assert any("cap" in r.lower() for r in result.reasons)
