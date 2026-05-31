from app.services.pool_catalog import max_pools_for_focus, normalize_subscribed_pools


def test_normalize_subscribed_pools_default() -> None:
    assert normalize_subscribed_pools(None) == ["DEEP/SUI"]
    assert normalize_subscribed_pools([]) == ["DEEP/SUI"]


def test_normalize_subscribed_pools_filters_invalid() -> None:
    assert normalize_subscribed_pools(["DEEP/SUI", "INVALID", "SUI/DBUSDC"]) == [
        "DEEP/SUI",
        "SUI/DBUSDC",
    ]


def test_max_pools_for_focus() -> None:
    assert max_pools_for_focus(0) == 1
    assert max_pools_for_focus(50) == 2
    assert max_pools_for_focus(100) == 2
