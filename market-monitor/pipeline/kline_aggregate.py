"""Aggregate order_fills rows into OHLCV candles."""

from __future__ import annotations

from dataclasses import dataclass

from feed.deepbook_client import Candle

_INTERVAL_SECONDS: dict[str, int] = {
    "1m": 60,
    "5m": 300,
    "15m": 900,
    "1h": 3600,
    "4h": 14400,
    "1d": 86400,
}


@dataclass(frozen=True)
class FillRow:
    fill_id: int
    timestamp_sec: float
    price: float
    quantity: float


def interval_to_seconds(interval: str) -> int:
    key = interval.strip().lower()
    if key not in _INTERVAL_SECONDS:
        raise ValueError(f"unsupported interval: {interval}")
    return _INTERVAL_SECONDS[key]


def window_start_sec(timestamp_sec: float, interval: str) -> int:
    step = interval_to_seconds(interval)
    ts = int(timestamp_sec)
    return (ts // step) * step


def fills_to_candles(
    fills: list[FillRow],
    interval: str,
    limit: int,
) -> list[Candle]:
    if not fills or limit <= 0:
        return []

    buckets: dict[int, list[FillRow]] = {}
    for row in sorted(fills, key=lambda f: f.timestamp_sec):
        bucket = window_start_sec(row.timestamp_sec, interval)
        buckets.setdefault(bucket, []).append(row)

    candles: list[Candle] = []
    for bucket_ts in sorted(buckets.keys()):
        window = buckets[bucket_ts]
        prices = [f.price for f in window]
        volumes = [f.quantity for f in window]
        candles.append(
            Candle(
                open=prices[0],
                high=max(prices),
                low=min(prices),
                close=prices[-1],
                volume=sum(volumes),
                timestamp=float(bucket_ts),
            )
        )

    return candles[-limit:]
