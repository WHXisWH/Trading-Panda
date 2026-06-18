from candles_page import (
    build_page_result,
    clamp_limit,
    compute_indexer_window,
    history_floor,
    trim_candles,
)
from feed.deepbook_client import Candle


def test_compute_indexer_window_latest() -> None:
    now = 1_700_000_000.0
    start, end = compute_indexer_window("1h", 150, None, now=now)
    assert end == int(now)
    assert start >= history_floor(now=now)
    assert end - start >= 3600 * 150


def test_compute_indexer_window_before() -> None:
    now = 1_700_000_000.0
    before = 1_699_000_000
    start, end = compute_indexer_window("1h", 150, before, now=now)
    assert end == before - 1
    assert start < end


def test_build_page_result_has_more() -> None:
    now = 1_700_000_000.0
    candles = [
        Candle(open=1, high=1, low=1, close=1, volume=1, timestamp=float(now - i * 60))
        for i in range(150)
    ]
    page = build_page_result(candles, 150, None, now=now)
    assert page.has_more is True
    assert page.oldest_t == int(now - 149 * 60)
    assert page.newest_t == int(now)


def test_build_page_result_history_floor() -> None:
    now = 1_700_000_000.0
    floor = history_floor(now=now)
    candles = [
        Candle(open=1, high=1, low=1, close=1, volume=1, timestamp=float(floor + 60))
    ]
    page = build_page_result(candles, 150, None, now=now)
    assert page.has_more is False


def test_trim_candles_before() -> None:
    candles = [
        Candle(open=1, high=1, low=1, close=1, volume=1, timestamp=float(t))
        for t in (100, 200, 300)
    ]
    trimmed = trim_candles(candles, 2, before=300)
    assert len(trimmed) == 2
    assert int(trimmed[-1].timestamp) == 200


def test_clamp_limit() -> None:
    assert clamp_limit(999) == 500
    assert clamp_limit(0) == 1
