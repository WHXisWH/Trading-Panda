"""Review logic unit tests — Epic 7.5."""

from app.services.review_logic import (
    analyze_hypotheses,
    compute_verdict,
    has_required_evidence,
    should_update_skill,
)


def _closed_fact(**overrides):
    base = {
        "side": "BUY",
        "realized_pnl": 12.5,
        "closed_at": "2026-06-17T12:00:00Z",
        "decision_snapshot": {
            "reason": "Momentum breakout on DEEP/SUI",
            "final_score": 0.72,
            "steps": [{"name": "Strategy signal", "score": 0.72}],
        },
        "market_snapshot": {"pair": "DEEP/SUI", "market_regime": "bull"},
        "outcome": {
            "entry_price": 1.0,
            "exit_price": 1.05,
            "entry_reference_price": 1.0,
            "exit_reference_price": 1.05,
        },
        "fact_hash": "abc123",
    }
    base.update(overrides)
    return base


def test_positive_pnl_does_not_auto_verify_without_alignment():
    fact = _closed_fact(
        side="BUY",
        realized_pnl=8.0,
        outcome={"entry_price": 1.0, "exit_price": 0.98},
    )
    hypotheses = analyze_hypotheses(fact)
    assert hypotheses[0]["status"] != "verified"


def test_missing_evidence_blocks_review():
    fact = _closed_fact(decision_snapshot={}, outcome={})
    assert has_required_evidence(fact) is False


def test_supported_hypothesis_creates_memory_candidate():
    fact = _closed_fact(
        decision_snapshot={"reason": "Trend follow", "final_score": 0.68},
        outcome={"entry_price": 1.0, "exit_price": 1.03},
    )
    hypotheses = analyze_hypotheses(fact)
    assert hypotheses[0]["status"] == "supported"
    assert should_update_skill(hypotheses) is True


def test_verified_hypothesis_when_strong_evidence():
    fact = _closed_fact(
        decision_snapshot={"reason": "High conviction trend", "final_score": 0.81},
        outcome={"entry_price": 1.0, "exit_price": 1.08},
        realized_pnl=25.0,
    )
    hypotheses = analyze_hypotheses(fact)
    assert hypotheses[0]["status"] == "verified"
    assert should_update_skill(hypotheses) is True


def test_contradictory_evidence_weakens_hypothesis():
    fact = _closed_fact(
        side="BUY",
        realized_pnl=-5.0,
        decision_snapshot={"reason": "Weak signal", "final_score": 0.35},
        outcome={"entry_price": 1.0, "exit_price": 0.92},
    )
    hypotheses = analyze_hypotheses(fact)
    assert hypotheses[0]["status"] in ("weakened", "retired")
    assert should_update_skill(hypotheses) is False


def test_compute_verdict_win_loss_breakeven():
    assert compute_verdict(1.0) == "win"
    assert compute_verdict(-0.01) == "loss"
    assert compute_verdict(0.0) == "breakeven"
