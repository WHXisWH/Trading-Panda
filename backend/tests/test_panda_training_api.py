from __future__ import annotations

from types import SimpleNamespace

from app.api import panda_training


def test_intent_dict_exposes_snapshots():
    row = SimpleNamespace(
        id="intent-1",
        panda_id="panda-1",
        vault_id=None,
        policy_id="policy-1",
        policy_version=4,
        mode="training_ledger",
        pair="DEEP/SUI",
        side="BUY",
        notional=50,
        reference_price=2,
        final_score=0.82,
        decision_hash="hash-123",
        proof_eligible=True,
        status="EXECUTED",
        rejection_reason=None,
        market_snapshot={"pair": "DEEP/SUI"},
        decision_snapshot={"steps": [{"step": 1}]},
        policy_snapshot={"version": 4},
        created_at=None,
    )

    data = panda_training._intent_dict(row)
    assert data["market_snapshot"] == {"pair": "DEEP/SUI"}
    assert data["decision_snapshot"] == {"steps": [{"step": 1}]}
    assert data["policy_snapshot"] == {"version": 4}


def test_trade_fact_dict_exposes_snapshots():
    row = SimpleNamespace(
        id="fact-1",
        panda_id="panda-1",
        order_intent_id="intent-1",
        pair="DEEP/SUI",
        side="BUY",
        mode="training_ledger",
        fact_hash="fact-hash",
        proof_status="eligible",
        realized_pnl=1.5,
        realized_pnl_pct=0.015,
        review_status="pending",
        market_snapshot={"pair": "DEEP/SUI"},
        decision_snapshot={"steps": [{"step": 1}]},
        policy_snapshot={"version": 4},
        ledger_snapshot_before={"cash_balance": 100, "positions": []},
        ledger_snapshot_after={"cash_balance": 50, "positions": []},
        execution_snapshot={"notional": 50},
        outcome={"realized_pnl_delta": 1.5},
        created_at=None,
    )

    data = panda_training._trade_fact_dict(row)
    assert data["ledger_snapshot_before"] == {"cash_balance": 100, "positions": []}
    assert data["ledger_snapshot_after"] == {"cash_balance": 50, "positions": []}
    assert data["execution_snapshot"] == {"notional": 50}
    assert data["outcome"] == {"realized_pnl_delta": 1.5}
