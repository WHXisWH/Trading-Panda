from unittest.mock import MagicMock

from monitor import MarketMonitorService, MonitorState, PoolRuntime
from config import Settings


def test_health_payload_includes_ranking_fields() -> None:
    settings = Settings(
        deepbook_network="mainnet",
        deepbook_pools="SUI_USDC",
        redis_url="",
    )
    svc = MarketMonitorService(settings)
    svc._state = MonitorState(
        pg_ok=True,
        deepbook_ok=True,
        pools={
            "SUI_USDC": PoolRuntime(
                pool="SUI_USDC",
                pair="SUI-USDC",
                asset="SUI",
                last_candle_ts=1_700_000_000.0,
                last_publish_ts=1_700_000_015.0,
                health="fresh",
                freshness_sec=15.0,
                spread_bps=8.0,
                volume_24h=1000.0,
            )
        },
    )
    svc._publisher = MagicMock()
    svc._publisher.is_connected = True

    payload = svc.health_payload()
    assert payload["network"] == "mainnet"
    assert payload["stale_threshold_sec"] == 120.0
    assert "SUI-USDC" in payload["pools"]
    assert payload["pools"]["SUI-USDC"]["health"] == "fresh"
