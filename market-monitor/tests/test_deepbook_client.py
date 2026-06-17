from feed.deepbook_client import (
    _parse_candles,
    _parse_pool_list,
    encode_pool_for_path,
    parse_pool_catalog,
    parse_pool_directory,
)


def test_parse_pools_list() -> None:
    assert _parse_pool_list(["SUI_USDC", "DEEP_USDC"]) == ["SUI_USDC", "DEEP_USDC"]


def test_parse_pools_json_objects() -> None:
    raw = [
        {
            "pool_id": "0xabc",
            "pool_name": "DEEP/SUI",
        }
    ]
    assert _parse_pool_list(raw) == ["DEEP/SUI"]
    assert parse_pool_directory(raw)["DEEP/SUI"] == "0xabc"
    assert parse_pool_directory(raw)["DEEP_SUI"] == "0xabc"


def test_parse_pool_catalog_metadata() -> None:
    raw = [
        {
            "pool_id": "0x1",
            "pool_name": "SUI_USDC",
            "base_asset_decimals": 9,
            "quote_asset_decimals": 6,
            "min_tick_size": 0.000001,
        }
    ]
    catalog = parse_pool_catalog(raw)
    entry = catalog["SUI_USDC"]
    assert entry.pool_id == "0x1"
    assert entry.base_decimals == 9
    assert entry.quote_decimals == 6
    assert entry.min_tick_size == 0.000001


def test_parse_pools_rejects_url() -> None:
    assert _parse_pool_list(["http://152.53.166.128:9008/get_pools"]) == []


def test_encode_pool_for_path() -> None:
    assert encode_pool_for_path("DEEP/SUI") == "DEEP%2FSUI"
    assert encode_pool_for_path("SUI_USDC") == "SUI_USDC"


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
