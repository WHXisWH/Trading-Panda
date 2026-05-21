from feed.fills_client import resolve_window_start


def test_resolve_window_start_prefers_lookback() -> None:
    now = 1_700_000_000.0
    start = resolve_window_start(
        since_sec=None,
        lookback_sec=259_200,
        interval="1m",
        limit=60,
        now=now,
    )
    assert start == now - 259_200


def test_resolve_window_start_since_sec_wins() -> None:
    now = 1_700_000_000.0
    start = resolve_window_start(
        since_sec=now - 100,
        lookback_sec=259_200,
        interval="1m",
        limit=60,
        now=now,
    )
    assert start == now - 100


def test_resolve_window_start_fallback_interval_limit() -> None:
    now = 1_700_000_000.0
    start = resolve_window_start(
        since_sec=None,
        lookback_sec=None,
        interval="1m",
        limit=60,
        now=now,
    )
    assert start == now - 3600
