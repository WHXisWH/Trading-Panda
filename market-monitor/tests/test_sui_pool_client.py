import pytest

from feed.sui_pool_client import (
    _split_top_level_types,
    normalize_pool_list,
    pool_name_from_pool_created_type,
)


def test_pool_name_from_standard_event_type() -> None:
    t = "0xdee9::pool::PoolCreated<0x2::sui::SUI, 0xabc::usdc::USDC>"
    assert pool_name_from_pool_created_type(t, module="pool") == "SUI_USDC"


def test_pool_name_case_insensitive_module_path() -> None:
    t = "0x000000000000000000000000000000000000000000000000000000000000dee9::pool::PoolCreated<0x2::sui::SUI, 0x1::coin::COIN>"
    assert pool_name_from_pool_created_type(t, module="pool") == "SUI_COIN"


def test_pool_name_with_nested_generics() -> None:
    inner = "0x2::coin::Coin<0x2::sui::SUI>, 0x9::token::TOKEN"
    parts = _split_top_level_types(inner)
    assert len(parts) == 2
    assert pool_name_from_pool_created_type(
        f"0xdee9::pool::PoolCreated<{inner}>", module="pool"
    ) == "SUI_TOKEN"


def test_pool_name_unknown_module() -> None:
    assert pool_name_from_pool_created_type("0x2::coin::Minted", module="pool") is None


def test_normalize_pool_list() -> None:
    assert normalize_pool_list(["A", "B", "A"]) == ["A", "B"]


def test_normalize_pool_list_rejects_url() -> None:
    assert normalize_pool_list(["http://host/get_pools", "DEEP/SUI"]) == ["DEEP/SUI"]


@pytest.mark.asyncio
async def test_discover_pools_parses_mock_rpc_response(monkeypatch: pytest.MonkeyPatch) -> None:
    from feed import sui_pool_client

    seen_params = []

    async def fake_rpc(_client, _url, _method, _params):
        seen_params.append(_params)
        return {
            "data": [
                {
                    "type": "0x2c8d603bc51326b8c13cef9dd07031a408a48dddb541963357661df5d3204809::pool::PoolCreated<0x2::sui::SUI, 0x1::deep::DEEP>",
                }
            ],
            "hasNextPage": False,
            "nextCursor": None,
        }

    monkeypatch.setattr(sui_pool_client, "_sui_rpc", fake_rpc)
    pools = await sui_pool_client.discover_pools_via_rpc(
        "https://example.invalid",
        "0x2c8d603bc51326b8c13cef9dd07031a408a48dddb541963357661df5d3204809",
        pool_module="pool",
        limit_per_page=10,
        max_pages=1,
    )
    assert pools == ["SUI_DEEP"]
    assert seen_params[0][3] is False
