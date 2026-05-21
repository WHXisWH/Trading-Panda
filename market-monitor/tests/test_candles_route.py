from main import _normalize_pool_param


def test_normalize_pool_param() -> None:
    assert _normalize_pool_param("DEEP/SUI") == "DEEP/SUI"
    assert _normalize_pool_param("DEEP%2FSUI") == "DEEP/SUI"
