from feed.deepbook_client import Candle
from pipeline.kline_aggregate import FillRow, fills_to_candles, window_start_sec


def test_window_start_aligns_to_minute():
    assert window_start_sec(125.0, "1m") == 120


def test_fills_to_candles_single_bucket():
    fills = [
        FillRow(fill_id=1, timestamp_sec=100.0, price=10.0, quantity=1.0),
        FillRow(fill_id=2, timestamp_sec=110.0, price=12.0, quantity=2.0),
        FillRow(fill_id=3, timestamp_sec=119.0, price=11.0, quantity=1.5),
    ]
    candles = fills_to_candles(fills, "1m", 10)
    assert len(candles) == 1
    c = candles[0]
    assert c.open == 10.0
    assert c.high == 12.0
    assert c.low == 10.0
    assert c.close == 11.0
    assert c.volume == 4.5
    assert c.timestamp == 60.0


def test_fills_to_candles_multiple_buckets():
    fills = [
        FillRow(fill_id=1, timestamp_sec=0.0, price=1.0, quantity=1.0),
        FillRow(fill_id=2, timestamp_sec=60.0, price=2.0, quantity=1.0),
        FillRow(fill_id=3, timestamp_sec=120.0, price=3.0, quantity=1.0),
    ]
    candles = fills_to_candles(fills, "1m", 2)
    assert len(candles) == 2
    assert isinstance(candles[0], Candle)
    assert candles[-1].close == 3.0
