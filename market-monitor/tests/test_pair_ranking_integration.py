"""Integration-style test with sample DeepBook fill/orderbook signals."""

import time

from pipeline.pair_ranking import PairQualitySignals, rank_pairs


def test_ranking_with_sample_deepbook_signals() -> None:
    now = time.time()
    sample = [
        PairQualitySignals(
            pool="SUI_USDC",
            volume_24h=2_500_000,
            volume_7d=12_000_000,
            spread_bps=6.2,
            bid_depth=1200,
            ask_depth=1150,
            last_candle_ts=now - 12,
            candle_count=60,
            orderbook_available=True,
        ),
        PairQualitySignals(
            pool="DEEP_USDC",
            volume_24h=180_000,
            volume_7d=900_000,
            spread_bps=18.0,
            bid_depth=220,
            ask_depth=210,
            last_candle_ts=now - 55,
            candle_count=60,
            orderbook_available=True,
        ),
        PairQualitySignals(
            pool="DEEP/SUI",
            volume_24h=500,
            volume_7d=2000,
            spread_bps=250,
            bid_depth=2,
            ask_depth=1,
            last_candle_ts=now - 3600,
            candle_count=5,
            monitor_error="no_fills_in_poll_window: no trades in last 72h",
            orderbook_available=True,
        ),
    ]
    ranked = rank_pairs(
        sample,
        {"SUI_USDC": "0xsui", "DEEP_USDC": "0xdeep", "DEEP/SUI": "0xfallback"},
        now=now,
    )
    assert ranked[0].meta.pool == "SUI_USDC"
    assert ranked[-1].meta.pool == "DEEP/SUI"
    assert ranked[-1].meta.is_fallback is True
