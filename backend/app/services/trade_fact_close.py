"""Trade Fact close semantics for Review eligibility (full position exit)."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any


def pair_fully_closed(ledger_after: dict[str, Any], pair: str) -> bool:
    """True when no open quantity remains for the pair after a sell."""
    for pos in ledger_after.get("positions") or []:
        if pos.get("pair") == pair:
            return float(pos.get("quantity", 0)) <= 1e-9
    return True


def enrich_sell_outcome(
    *,
    side: str,
    realized_delta: float,
    entry_price: float | None,
    exit_price: float,
    initial_capital: float,
) -> dict[str, Any]:
    outcome: dict[str, Any] = {"realized_pnl_delta": realized_delta}
    if side != "SELL":
        return outcome
    if entry_price is not None:
        outcome["entry_reference_price"] = entry_price
        outcome["entry_price"] = entry_price
    outcome["exit_reference_price"] = exit_price
    outcome["exit_price"] = exit_price
    return outcome


def apply_close_fields(
    trade_fact: Any,
    *,
    pair: str,
    ledger_after: dict[str, Any],
    outcome: dict[str, Any],
    realized_delta: float,
    initial_capital: float,
) -> None:
    """Set closed_at / review_status / outcome on TradeFact when position fully exits."""
    if not pair_fully_closed(ledger_after, pair):
        return
    trade_fact.closed_at = datetime.now(timezone.utc)
    trade_fact.review_status = "pending_review"
    trade_fact.outcome = outcome
    if initial_capital > 0:
        trade_fact.realized_pnl_pct = realized_delta / initial_capital
