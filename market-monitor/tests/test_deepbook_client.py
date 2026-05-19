from feed.deepbook_client import _parse_candles, _parse_pool_list


def test_parse_pools_list() -> None:
    assert _parse_pool_list(["SUI_USDC", "DEEP_USDC"]) == ["SUI_USDC", "DEEP_USDC"]


def test_parse_candles() -> None:
    raw = [
        {
            "open_time": 1_700_000_000_000,
            "open": 1.0,
            "high": 1.1,
            "low": 0.9,
            "close": 1.05,
            "volume": 100,
        }
    ]
    candles = _parse_candles(raw)
    assert len(candles) == 1
    assert candles[0].close == 1.05
    assert candles[0].timestamp == 1_700_000_000.0
