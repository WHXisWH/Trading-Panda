"""LedgerService snapshot helpers — Epic 5.6."""

from app.services.ledger_service import LedgerService, LedgerSnapshot


def test_snapshot_to_dict_roundtrip():
    ledger = LedgerService()
    snap = LedgerSnapshot(
        cash_balance=8000.0,
        debt_balance=0.0,
        equity=10500.0,
        realized_pnl=200.0,
        unrealized_pnl=500.0,
        positions=[
            {
                "pair": "DEEP/SUI",
                "asset": "DEEP",
                "quantity": 100.0,
                "avg_entry_price": 1.5,
                "current_price": 1.6,
                "notional_value": 160.0,
                "unrealized_pnl": 10.0,
            }
        ],
    )
    data = ledger.snapshot_to_dict(snap)
    assert data["cash_balance"] == 8000.0
    assert data["equity"] == 10500.0
    assert len(data["positions"]) == 1
    assert data["positions"][0]["pair"] == "DEEP/SUI"
