"""Training Ledger hot path unit checks — Epic 5.6."""

from app.engine.market_event import MarketEvent
from app.services.trade_fact_writer import build_decision_hash


def test_market_stale_is_not_tradeable():
    event = MarketEvent(
        asset="DEEP",
        pair="DEEP/SUI",
        timestamp=1_700_000_000,
        price=1.5,
        prev_price=1.4,
        volume=1000,
        rsi=50,
        ma20=1.45,
        prev_ma20=1.44,
        macd_signal=False,
        volatility=0.05,
        trend_strength=0.5,
        market_regime="ranging",
        stale=True,
        health="stale",
    )
    assert event.is_tradeable() is False


def test_decision_hash_is_deterministic():
    h1 = build_decision_hash(
        panda_id="p1",
        pair="DEEP/SUI",
        side="BUY",
        timestamp=100.0,
        final_score=0.72,
    )
    h2 = build_decision_hash(
        panda_id="p1",
        pair="DEEP/SUI",
        side="BUY",
        timestamp=100.0,
        final_score=0.72,
    )
    assert h1 == h2
    assert len(h1) == 64
