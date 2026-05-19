from broadcast.schemas import pair_to_asset, pool_to_pair


def test_pool_pair_asset() -> None:
    assert pool_to_pair("SUI_USDC") == "SUI-USDC"
    assert pair_to_asset("SUI-USDC") == "SUI"
