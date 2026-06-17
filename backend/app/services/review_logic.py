"""Pure review analysis — evidence-backed hypothesis lifecycle (Epic 7)."""

from __future__ import annotations

import hashlib
import json
from decimal import Decimal
from typing import Any


HYPOTHESIS_STATUSES = ("proposed", "supported", "verified", "weakened", "retired")
REVIEW_VERDICTS = ("win", "loss", "breakeven", "invalid")


def _to_float(value: Any) -> float | None:
    if value is None:
        return None
    if isinstance(value, Decimal):
        return float(value)
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def is_position_closed(trade_fact: dict[str, Any]) -> bool:
    return trade_fact.get("closed_at") is not None


def has_required_evidence(trade_fact: dict[str, Any]) -> bool:
    decision = trade_fact.get("decision_snapshot") or {}
    outcome = trade_fact.get("outcome") or {}
    market = trade_fact.get("market_snapshot") or {}
    if not decision or not outcome or not market:
        return False
    if decision.get("reason") is None and not decision.get("steps"):
        return False
    entry = _to_float(outcome.get("entry_price") or outcome.get("entry_reference_price"))
    exit_price = _to_float(outcome.get("exit_price") or outcome.get("exit_reference_price"))
    return entry is not None and exit_price is not None


def compute_verdict(realized_pnl: float | None) -> str:
    if realized_pnl is None:
        return "invalid"
    if realized_pnl > 0:
        return "win"
    if realized_pnl < 0:
        return "loss"
    return "breakeven"


def _direction_aligned(side: str, entry: float, exit_price: float) -> bool:
    if side.upper() == "BUY":
        return exit_price > entry
    if side.upper() == "SELL":
        return exit_price < entry
    return False


def _extract_thesis(decision: dict[str, Any]) -> str:
    reason = decision.get("reason") or decision.get("thesis") or ""
    if reason:
        return str(reason)
    steps = decision.get("steps") or []
    if steps:
        top = steps[0]
        return str(top.get("name") or top.get("label") or "Strategy signal")
    return "Undocumented thesis"


def _score_support(decision: dict[str, Any]) -> float:
    score = _to_float(decision.get("final_score"))
    if score is None:
        return 0.0
    return min(1.0, max(0.0, abs(score)))


def analyze_hypotheses(trade_fact: dict[str, Any]) -> list[dict[str, Any]]:
    """Compare original decision evidence with outcome; never auto-verify on PnL alone."""
    decision = trade_fact.get("decision_snapshot") or {}
    outcome = trade_fact.get("outcome") or {}
    side = str(trade_fact.get("side") or decision.get("action") or "BUY")
    entry = _to_float(outcome.get("entry_price") or outcome.get("entry_reference_price")) or 0.0
    exit_price = _to_float(outcome.get("exit_price") or outcome.get("exit_reference_price")) or 0.0
    realized_pnl = _to_float(trade_fact.get("realized_pnl")) or 0.0
    thesis = _extract_thesis(decision)
    aligned = _direction_aligned(side, entry, exit_price)
    score_support = _score_support(decision)

    confirming: list[str] = []
    contradicting: list[str] = []

    if aligned:
        confirming.append("Price moved in the direction implied by the trade side.")
    else:
        contradicting.append("Price moved against the trade side.")

    if score_support >= 0.65:
        confirming.append(f"Decision score {score_support:.2f} was in execute zone.")
    elif score_support < 0.40:
        contradicting.append(f"Decision score {score_support:.2f} was weak at entry.")

    if realized_pnl > 0 and not aligned:
        contradicting.append("Profit occurred without directional alignment — likely luck.")
    if realized_pnl <= 0 and aligned:
        contradicting.append("Direction was correct but realized PnL was not positive.")

    status = "proposed"
    if contradicting and not confirming:
        status = "retired" if len(contradicting) >= 2 else "weakened"
    elif contradicting and confirming:
        status = "weakened"
    elif confirming and not contradicting:
        if score_support >= 0.75 and aligned and realized_pnl > 0:
            status = "verified"
        elif aligned or score_support >= 0.65:
            status = "supported"
        else:
            status = "proposed"

    return [
        {
            "thesis": thesis,
            "status": status,
            "confirming_evidence": confirming,
            "contradicting_evidence": contradicting,
            "entry_reference_price": entry,
            "exit_reference_price": exit_price,
            "realized_pnl": realized_pnl,
        }
    ]


def should_update_skill(hypotheses: list[dict[str, Any]]) -> bool:
    return any(h.get("status") in ("supported", "verified") for h in hypotheses)


def skill_update_status(hypotheses: list[dict[str, Any]]) -> str | None:
    if any(h.get("status") == "verified" for h in hypotheses):
        return "verified"
    if any(h.get("status") == "supported" for h in hypotheses):
        return "supported"
    return None


def build_reason_summary(verdict: str, hypotheses: list[dict[str, Any]]) -> str:
    primary = hypotheses[0] if hypotheses else {}
    thesis = primary.get("thesis", "Trade thesis")
    status = primary.get("status", "proposed")
    pnl = primary.get("realized_pnl", 0)
    return (
        f"{verdict.upper()} · {thesis[:80]} — hypothesis {status}; "
        f"realized PnL {pnl:+.4f}."
    )


def build_evidence_payload(trade_fact: dict[str, Any]) -> dict[str, Any]:
    return {
        "decision_snapshot": trade_fact.get("decision_snapshot") or {},
        "market_snapshot": trade_fact.get("market_snapshot") or {},
        "outcome": trade_fact.get("outcome") or {},
        "policy_snapshot": trade_fact.get("policy_snapshot") or {},
        "ledger_snapshot_before": trade_fact.get("ledger_snapshot_before") or {},
        "ledger_snapshot_after": trade_fact.get("ledger_snapshot_after") or {},
        "decision_hash": (trade_fact.get("decision_snapshot") or {}).get("decision_hash"),
        "fact_hash": trade_fact.get("fact_hash"),
    }


def compute_review_hash(panda_id: str, trade_fact_id: str, hypotheses: list[dict]) -> str:
    canonical = json.dumps(
        {"panda_id": panda_id, "trade_fact_id": trade_fact_id, "hypotheses": hypotheses},
        sort_keys=True,
        separators=(",", ":"),
    )
    return hashlib.sha256(canonical.encode()).hexdigest()


def compute_skill_hash(panda_id: str, version: int, memories: list[dict[str, Any]]) -> str:
    canonical = json.dumps(
        {"panda_id": panda_id, "version": version, "memories": memories},
        sort_keys=True,
        separators=(",", ":"),
    )
    return hashlib.sha256(canonical.encode()).hexdigest()
