"""Tests for Step 7 social_signal derivation."""

from app.engine.market_event import MarketEvent
from app.engine.social_signal import derive_social_signal


def _event(**overrides) -> MarketEvent:
    base = dict(
        asset="DEEP",
        pair="DEEP/SUI",
        timestamp=1.0,
        price=1.0,
        prev_price=1.0,
        volume=100.0,
        rsi=50.0,
        ma20=1.0,
        prev_ma20=1.0,
        macd_signal=False,
        volatility=0.05,
        trend_strength=0.5,
        market_regime="ranging",
    )
    base.update(overrides)
    return MarketEvent(**base)


def test_neutral_market_yields_near_zero_signal():
    assert abs(derive_social_signal(_event())) < 0.05


def test_buying_imbalance_and_rally_are_positive():
    signal = derive_social_signal(
        _event(orderbook_imbalance=0.8, price=1.1, prev_price=1.0)
    )
    assert signal > 0.2


def test_panic_sell_pressure_is_negative():
    signal = derive_social_signal(
        _event(orderbook_imbalance=-0.6, price=0.92, prev_price=1.0)
    )
    assert signal < -0.2
