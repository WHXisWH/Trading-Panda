"""Trade Fact close semantics — full exit detection and outcome enrichment."""

from types import SimpleNamespace

from app.services.trade_fact_close import (
    apply_close_fields,
    enrich_sell_outcome,
    pair_fully_closed,
)


def test_pair_fully_closed_when_quantity_zero():
    ledger = {"positions": [{"pair": "DEEP/SUI", "quantity": 0.0}]}
    assert pair_fully_closed(ledger, "DEEP/SUI") is True


def test_pair_not_closed_when_quantity_remains():
    ledger = {"positions": [{"pair": "DEEP/SUI", "quantity": 12.5}]}
    assert pair_fully_closed(ledger, "DEEP/SUI") is False


def test_enrich_sell_outcome_includes_entry_and_exit_prices():
    outcome = enrich_sell_outcome(
        side="SELL",
        realized_delta=42.0,
        entry_price=1.2,
        exit_price=1.5,
        initial_capital=10_000.0,
    )
    assert outcome["entry_reference_price"] == 1.2
    assert outcome["exit_reference_price"] == 1.5
    assert outcome["realized_pnl_delta"] == 42.0


def test_enrich_breakeven_sell_outcome_keeps_review_evidence():
    outcome = enrich_sell_outcome(
        side="SELL",
        realized_delta=0.0,
        entry_price=1.2,
        exit_price=1.2,
        initial_capital=10_000.0,
    )
    assert outcome["entry_price"] == 1.2
    assert outcome["exit_price"] == 1.2
    assert outcome["realized_pnl_delta"] == 0.0


def test_apply_close_fields_sets_closed_at_and_review_status():
    fact = SimpleNamespace(
        closed_at=None,
        review_status="pending",
        outcome={},
        realized_pnl_pct=None,
    )
    ledger = {"positions": [{"pair": "DEEP/SUI", "quantity": 0}]}
    outcome = enrich_sell_outcome(
        side="SELL",
        realized_delta=10.0,
        entry_price=1.0,
        exit_price=1.1,
        initial_capital=10_000.0,
    )
    apply_close_fields(
        fact,
        pair="DEEP/SUI",
        ledger_after=ledger,
        outcome=outcome,
        realized_delta=10.0,
        initial_capital=10_000.0,
    )
    assert fact.closed_at is not None
    assert fact.review_status == "pending_review"
    assert fact.realized_pnl_pct == 0.001
