import time

from feed.pair_registry import (
    LAUNCH_PAIR_PRIORITY,
    build_pair_meta,
    filter_pools_for_network,
    launch_priority_for,
    parse_pool_assets,
    preferred_pool_candidates,
)
from pipeline.pair_ranking import (
    HEALTH_FRESH,
    HEALTH_NO_FILLS,
    HEALTH_STALE,
    HEALTH_UNRESOLVED,
    PairQualitySignals,
    compute_pair_score,
    rank_pairs,
    resolve_health,
)


def test_parse_pool_assets() -> None:
    assert parse_pool_assets("SUI_USDC") == ("SUI", "USDC")
    assert parse_pool_assets("DEEP/SUI") == ("DEEP", "SUI")


def test_launch_priority() -> None:
    assert launch_priority_for("SUI_USDC") == 0
    assert launch_priority_for("DEEP_USDC") == 1
    assert launch_priority_for("DEEP/SUI") is None


def test_build_pair_meta_mainnet_launch() -> None:
    meta = build_pair_meta("SUI_USDC", pool_id="0xabc")
    assert meta.base_asset == "SUI"
    assert meta.quote_asset == "USDC"
    assert meta.stable_quote is True
    assert meta.launch_priority == 0
    assert meta.is_fallback is False
    assert meta.base_decimals == 9
    assert meta.quote_decimals == 6


def test_build_pair_meta_testnet_fallback() -> None:
    meta = build_pair_meta("DEEP/SUI")
    assert meta.is_fallback is True
    assert meta.stable_quote is False


def test_preferred_pool_candidates_mainnet() -> None:
    discovered = ["WAL_USDC", "SUI_USDC", "RANDOM_SUI"]
    ordered = preferred_pool_candidates(discovered, network="mainnet")
    assert ordered[0] == "SUI_USDC"


def test_filter_pools_for_mainnet_drops_testnet_fallbacks() -> None:
    pools = filter_pools_for_network(
        ["DEEP_SUI", "DEEP/SUI", "SUI/DBUSDC"],
        network="mainnet",
    )
    assert pools == ["DEEP_SUI"]


def test_filter_pools_for_testnet_keeps_fallbacks() -> None:
    pools = filter_pools_for_network(["DEEP/SUI", "SUI/DBUSDC"], network="testnet")
    assert pools == ["DEEP/SUI", "SUI/DBUSDC"]


def test_compute_pair_score_prefers_liquid_pair() -> None:
    now = time.time()
    liquid = PairQualitySignals(
        pool="SUI_USDC",
        volume_24h=1_000_000,
        volume_7d=5_000_000,
        spread_bps=8,
        bid_depth=500,
        ask_depth=480,
        last_candle_ts=now - 30,
        orderbook_available=True,
    )
    illiquid = PairQualitySignals(
        pool="NS_SUI",
        volume_24h=100,
        volume_7d=500,
        spread_bps=400,
        bid_depth=1,
        ask_depth=1,
        last_candle_ts=now - 600,
        orderbook_available=True,
    )
    assert compute_pair_score(liquid, stable_quote=True, now=now) > compute_pair_score(
        illiquid, now=now
    )


def test_rank_pairs_orders_by_score() -> None:
    now = time.time()
    rows = rank_pairs(
        [
            PairQualitySignals(
                pool="DEEP_USDC",
                volume_24h=50_000,
                spread_bps=20,
                bid_depth=100,
                ask_depth=90,
                last_candle_ts=now - 45,
                orderbook_available=True,
            ),
            PairQualitySignals(
                pool="SUI_USDC",
                volume_24h=500_000,
                spread_bps=5,
                bid_depth=800,
                ask_depth=750,
                last_candle_ts=now - 20,
                orderbook_available=True,
            ),
        ],
        {"SUI_USDC": "0x1", "DEEP_USDC": "0x2"},
        now=now,
    )
    assert rows[0].meta.pool == "SUI_USDC"
    assert rows[0].rank == 1
    assert rows[0].health == HEALTH_FRESH


def test_resolve_health_stale() -> None:
    now = time.time()
    health, freshness = resolve_health(
        PairQualitySignals(
            pool="SUI_USDC",
            last_candle_ts=now - 300,
            orderbook_available=True,
        ),
        now=now,
        stale_threshold_sec=120,
    )
    assert health == HEALTH_STALE
    assert freshness is not None
    assert freshness > 120


def test_resolve_health_no_fills() -> None:
    health, _ = resolve_health(
        PairQualitySignals(
            pool="SUI_USDC",
            monitor_error="no_fills_ever: indexer has no trades",
        )
    )
    assert health == HEALTH_NO_FILLS


def test_resolve_health_pool_unresolved() -> None:
    health, _ = resolve_health(
        PairQualitySignals(
            pool="DEEP_USDC",
            monitor_error="pool_unresolved: check get_pools / DEEPBOOK_POOLS",
        )
    )
    assert health == HEALTH_UNRESOLVED


def test_launch_pairs_constant() -> None:
    assert "SUI_USDC" in LAUNCH_PAIR_PRIORITY
    assert "DEEP_USDC" in LAUNCH_PAIR_PRIORITY
