from datetime import datetime, timezone
from decimal import Decimal

from app.api.panda_training import _intent_dict, _trade_fact_dict
from app.db.models import OrderIntent, TradeFact


def test_intent_dict_includes_full_evidence_fields():
    intent = OrderIntent(
        id="intent-1",
        panda_id="panda-1",
        vault_id=None,
        policy_id=None,
        policy_version=2,
        mode="training_ledger",
        pair="DEEP-SUI",
        side="BUY",
        notional=Decimal("40"),
        reference_price=Decimal("0.02329"),
        max_slippage_bps=Decimal("25"),
        final_score=Decimal("1.202809"),
        reason="RSI oversold",
        decision_hash="hash",
        proof_eligible=True,
        proof_requested=True,
        proof_request_source="manual",
        proof_key="proof-key",
        status="EXECUTED",
        market_snapshot={"rsi": 24},
        decision_snapshot={"entry_threshold": 0.455},
        policy_snapshot={"version": 2},
        rejection_reason=None,
        created_at=datetime(2026, 6, 20, tzinfo=timezone.utc),
    )

    data = _intent_dict(intent)

    assert data["max_slippage_bps"] == 25.0
    assert data["reason"] == "RSI oversold"
    assert data["proof_requested"] is True
    assert data["proof_request_source"] == "manual"
    assert data["proof_key"] == "proof-key"


def test_trade_fact_dict_includes_execution_ledger_and_timestamps():
    fact = TradeFact(
        id="fact-1",
        panda_id="panda-1",
        order_intent_id="intent-1",
        pair="DEEP-SUI",
        side="BUY",
        mode="training_ledger",
        fact_hash="fact-hash",
        proof_status="eligible",
        proof_key="proof-key",
        realized_pnl=Decimal("0"),
        realized_pnl_pct=Decimal("0"),
        review_status="pending",
        market_snapshot={"rsi": 24},
        decision_snapshot={"steps": []},
        policy_snapshot={"version": 2},
        ledger_snapshot_before={"cash_balance": 10000},
        ledger_snapshot_after={"cash_balance": 9960},
        execution_snapshot={"notional": 40, "quantity": 1717.4753},
        outcome={"status": "opened"},
        opened_at=datetime(2026, 6, 20, tzinfo=timezone.utc),
        closed_at=None,
        created_at=datetime(2026, 6, 20, tzinfo=timezone.utc),
    )

    data = _trade_fact_dict(fact)

    assert data["proof_key"] == "proof-key"
    assert data["execution_snapshot"]["quantity"] == 1717.4753
    assert data["ledger_snapshot_after"]["cash_balance"] == 9960
    assert data["opened_at"] == "2026-06-20T00:00:00+00:00"
    assert data["closed_at"] is None
