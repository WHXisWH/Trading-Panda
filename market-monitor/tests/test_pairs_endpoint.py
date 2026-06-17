"""Smoke tests for launch pair metadata endpoints."""

from feed.pair_registry import LAUNCH_PAIR_PRIORITY, build_pair_meta
from monitor import MarketMonitorService, MonitorState
from config import Settings


def test_build_pair_meta_includes_decimals() -> None:
    meta = build_pair_meta("SUI_USDC", pool_id="0xabc")
    assert meta.base_decimals == 9
    assert meta.quote_decimals == 6
    assert meta.min_tick_size == 1e-6


def test_pairs_payload_exposes_launch_pairs() -> None:
    settings = Settings(
        deepbook_network="mainnet",
        launch_pairs=",".join(LAUNCH_PAIR_PRIORITY),
        redis_url="",
    )
    svc = MarketMonitorService(settings)
    svc._state = MonitorState(
        ranked_pairs=[],
    )
    payload = svc.pairs_payload()
    assert payload["network"] == "mainnet"
    assert payload["launch_pairs"] == list(LAUNCH_PAIR_PRIORITY)
