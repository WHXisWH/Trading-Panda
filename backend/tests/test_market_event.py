"""MarketEvent schema and stale-market gating (Epic 3)."""

import time

from app.engine.market_event import MarketEvent


def _fresh_event(**overrides) -> MarketEvent:
    base = {
        "asset": "SUI",
        "pair": "SUI-USDC",
        "timestamp": time.time(),
        "price": 3.2,
        "prev_price": 3.19,
        "volume": 100.0,
        "rsi": 50.0,
        "ma20": 3.18,
        "prev_ma20": 3.17,
        "macd_signal": False,
        "volatility": 0.02,
        "trend_strength": 0.5,
        "market_regime": "ranging",
        "health": "fresh",
        "freshness_sec": 15.0,
        "stale": False,
    }
    base.update(overrides)
    return MarketEvent.from_json(base)


def test_from_json_extended_fields() -> None:
    event = _fresh_event(
        reference_price=3.21,
        spread_bps=8.0,
        source="deepbook",
        pair_meta={"pool": "SUI_USDC", "base_asset": "SUI"},
    )
    assert event.reference_price == 3.21
    assert event.spread_bps == 8.0
    assert event.pair_meta["base_asset"] == "SUI"


def test_is_tradeable_fresh_market() -> None:
    assert _fresh_event().is_tradeable() is True


def test_is_tradeable_stale_flag_blocks() -> None:
    assert _fresh_event(stale=True).is_tradeable() is False


def test_is_tradeable_health_stale_blocks() -> None:
    assert _fresh_event(health="stale").is_tradeable() is False


def test_is_tradeable_source_down_blocks() -> None:
    assert _fresh_event(health="source_down").is_tradeable() is False


def test_is_tradeable_no_fills_blocks() -> None:
    assert _fresh_event(health="no_fills").is_tradeable() is False


def test_is_tradeable_old_freshness_blocks() -> None:
    assert _fresh_event(freshness_sec=180.0).is_tradeable() is False
