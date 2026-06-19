import json

from broadcast.schemas import (
    MarketEvent,
    PairMetaPayload,
    canonical_market_pair,
    normalize_pool_name,
    pool_to_pair,
)


def test_market_event_extended_fields() -> None:
    event = MarketEvent(
        asset="SUI",
        pair="SUI-USDC",
        timestamp=1715616005.0,
        price=3.28,
        prev_price=3.27,
        volume=100.0,
        rsi=52.0,
        ma20=3.26,
        prev_ma20=3.25,
        macd_signal=False,
        volatility=0.03,
        trend_strength=0.5,
        market_regime="ranging",
        source="deepbook",
        reference_price=3.281,
        spread_bps=12.5,
        bid_depth=1000.0,
        ask_depth=950.0,
        freshness_sec=15.0,
        health="fresh",
        pair_meta=PairMetaPayload(
            pool="SUI_USDC",
            pair="SUI-USDC",
            base_asset="SUI",
            quote_asset="USDC",
            stable_quote=True,
            launch_priority=0,
        ),
    )
    payload = event.to_publish_dict()
    assert payload["source"] == "deepbook"
    assert payload["health"] == "fresh"
    assert payload["pair_meta"]["base_asset"] == "SUI"
    assert "reference_price" in payload


def test_canonical_market_pair() -> None:
    assert canonical_market_pair("DEEP/SUI") == "DEEP-SUI"
    assert canonical_market_pair("SUI_USDC") == "SUI-USDC"
    assert canonical_market_pair("SUI-USDC") == "SUI-USDC"


def test_pool_to_pair_uses_canonical_form() -> None:
    assert pool_to_pair("DEEP/SUI") == "DEEP-SUI"
    assert pool_to_pair("SUI_USDC") == "SUI-USDC"


def test_normalize_pool_name() -> None:
    assert normalize_pool_name("DEEP-SUI") == "DEEP_SUI"
    assert normalize_pool_name("DEEP/SUI") == "DEEP_SUI"
    assert normalize_pool_name("SUI_USDC") == "SUI_USDC"
    assert normalize_pool_name("SUI-USDC") == "SUI_USDC"


def test_market_event_json_roundtrip() -> None:
    event = MarketEvent(
        asset="DEEP",
        pair="DEEP-SUI",
        timestamp=1.0,
        price=30.0,
        prev_price=29.0,
        volume=1.0,
        rsi=40.0,
        ma20=29.5,
        prev_ma20=29.0,
        macd_signal=True,
        volatility=0.02,
        trend_strength=0.6,
        market_regime="bull",
        stale=True,
        health="stale",
    )
    raw = json.dumps(event.to_publish_dict())
    data = json.loads(raw)
    assert data["stale"] is True
    assert data["health"] == "stale"
