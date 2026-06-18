"""Paginated REST candles — window math and has_more for chart lazy load."""

from __future__ import annotations

import time
from dataclasses import dataclass

from feed.deepbook_client import Candle
from pipeline.kline_aggregate import interval_to_seconds

HISTORY_MAX_SEC = 365 * 86400
DEFAULT_PAGE_LIMIT = 150
MAX_PAGE_LIMIT = 500


@dataclass(frozen=True)
class CandlesPageResult:
    candles: list[Candle]
    has_more: bool
    oldest_t: int | None
    newest_t: int | None


def clamp_limit(limit: int) -> int:
    return max(1, min(limit, MAX_PAGE_LIMIT))


def history_floor(now: float | None = None) -> int:
    clock = time.time() if now is None else now
    return int(clock) - HISTORY_MAX_SEC


def compute_indexer_window(
    interval: str,
    limit: int,
    before: int | None,
    now: float | None = None,
) -> tuple[int, int]:
    """Return (start_time, end_time) inclusive for DeepBook indexer /ohclv."""
    clock = int(now if now is not None else time.time())
    step = interval_to_seconds(interval)
    span = step * clamp_limit(limit)
    floor = history_floor(now=clock)

    if before is not None:
        end_time = max(floor, int(before) - 1)
    else:
        end_time = clock

    start_time = max(floor, end_time - span * 2)
    if start_time > end_time:
        start_time = end_time
    return start_time, end_time


def trim_candles(candles: list[Candle], limit: int, before: int | None) -> list[Candle]:
    ordered = sorted(candles, key=lambda c: c.timestamp)
    if before is not None:
        ordered = [c for c in ordered if int(c.timestamp) < int(before)]
    if len(ordered) > limit:
        ordered = ordered[-limit:]
    return ordered


def build_page_result(
    candles: list[Candle],
    limit: int,
    before: int | None,
    now: float | None = None,
) -> CandlesPageResult:
    trimmed = trim_candles(candles, clamp_limit(limit), before)
    oldest = int(trimmed[0].timestamp) if trimmed else None
    newest = int(trimmed[-1].timestamp) if trimmed else None
    floor = history_floor(now=now)
    has_more = False
    if trimmed and oldest is not None:
        has_more = oldest > floor and len(trimmed) >= clamp_limit(limit)
    return CandlesPageResult(
        candles=trimmed,
        has_more=has_more,
        oldest_t=oldest,
        newest_t=newest,
    )
