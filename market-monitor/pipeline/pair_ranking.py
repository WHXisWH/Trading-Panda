"""Liquidity-first DeepBook pair ranking."""

from __future__ import annotations

import math
import time
from dataclasses import dataclass

from feed.pair_registry import PairMeta, build_pair_meta, launch_priority_for

HEALTH_FRESH = "fresh"
HEALTH_STALE = "stale"
HEALTH_NO_FILLS = "no_fills"
HEALTH_INSUFFICIENT_CANDLES = "insufficient_candles"
HEALTH_UNRESOLVED = "unresolved"
HEALTH_SOURCE_DOWN = "source_down"
HEALTH_ORDERBOOK_UNAVAILABLE = "orderbook_unavailable"


@dataclass(frozen=True)
class PairQualitySignals:
    pool: str
    volume_24h: float = 0.0
    volume_7d: float = 0.0
    spread_bps: float = 9999.0
    bid_depth: float = 0.0
    ask_depth: float = 0.0
    last_candle_ts: float | None = None
    candle_count: int = 0
    monitor_error: str | None = None
    orderbook_available: bool = False
    pg_ok: bool = True
    deepbook_ok: bool = True


@dataclass(frozen=True)
class RankedPair:
    meta: PairMeta
    score: float
    rank: int
    health: str
    freshness_sec: float | None
    signals: PairQualitySignals


def _volume_score(volume_24h: float, volume_7d: float) -> float:
    v24 = math.log1p(max(volume_24h, 0.0))
    v7 = math.log1p(max(volume_7d, 0.0)) * 0.35
    return v24 + v7


def _depth_score(bid_depth: float, ask_depth: float) -> float:
    depth = min(bid_depth, ask_depth)
    return math.log1p(max(depth, 0.0)) * 2.0


def _spread_penalty(spread_bps: float) -> float:
    if spread_bps >= 9999:
        return 5.0
    return spread_bps / 50.0


def _freshness_score(last_candle_ts: float | None, now: float, stale_threshold: float) -> float:
    if last_candle_ts is None:
        return -3.0
    age = max(0.0, now - last_candle_ts)
    if age > stale_threshold:
        return -2.0
    if age <= 60:
        return 2.0
    if age <= 300:
        return 1.0
    return 0.0


def _launch_bonus(pool: str) -> float:
    priority = launch_priority_for(pool)
    if priority is None:
        return 0.0
    return max(0.0, 3.0 - priority * 0.5)


def compute_pair_score(
    signals: PairQualitySignals,
    *,
    stable_quote: bool = False,
    now: float | None = None,
    stale_threshold_sec: float = 120.0,
) -> float:
    clock = time.time() if now is None else now
    score = 0.0
    score += _volume_score(signals.volume_24h, signals.volume_7d)
    score += _depth_score(signals.bid_depth, signals.ask_depth)
    score -= _spread_penalty(signals.spread_bps)
    score += _freshness_score(signals.last_candle_ts, clock, stale_threshold_sec)
    score += _launch_bonus(signals.pool)
    if stable_quote:
        score += 0.5
    if signals.monitor_error:
        score -= 4.0
    if not signals.pg_ok and not signals.deepbook_ok:
        score -= 6.0
    return round(score, 4)


def resolve_health(
    signals: PairQualitySignals,
    *,
    now: float | None = None,
    stale_threshold_sec: float = 120.0,
    stale_flag: bool = False,
) -> tuple[str, float | None]:
    if not signals.pg_ok and not signals.deepbook_ok:
        return HEALTH_SOURCE_DOWN, None
    if signals.monitor_error:
        err = signals.monitor_error.lower()
        if "no_fills_ever" in err or "no_fills_in_poll_window" in err:
            return HEALTH_NO_FILLS, None
        if "insufficient_candles" in err:
            return HEALTH_INSUFFICIENT_CANDLES, None
        if "pool_unresolved" in err:
            return HEALTH_UNRESOLVED, None
    clock = time.time() if now is None else now
    freshness: float | None = None
    if signals.last_candle_ts is not None:
        freshness = max(0.0, clock - signals.last_candle_ts)
    if stale_flag or (
        freshness is not None and freshness > stale_threshold_sec
    ):
        return HEALTH_STALE, freshness
    if not signals.orderbook_available and signals.candle_count >= 2:
        return HEALTH_ORDERBOOK_UNAVAILABLE, freshness
    return HEALTH_FRESH, freshness


def rank_pairs(
    signal_rows: list[PairQualitySignals],
    pool_directory: dict[str, str],
    *,
    now: float | None = None,
    stale_threshold_sec: float = 120.0,
    max_pairs: int | None = None,
) -> list[RankedPair]:
    scored: list[tuple[float, PairQualitySignals]] = []
    for signals in signal_rows:
        meta = build_pair_meta(signals.pool)
        score = compute_pair_score(
            signals,
            stable_quote=meta.stable_quote,
            now=now,
            stale_threshold_sec=stale_threshold_sec,
        )
        scored.append((score, signals))

    scored.sort(key=lambda row: row[0], reverse=True)
    if max_pairs is not None:
        scored = scored[: max(0, max_pairs)]

    ranked: list[RankedPair] = []
    for idx, (score, signals) in enumerate(scored, start=1):
        meta = build_pair_meta(
            signals.pool,
            pool_id=pool_directory.get(signals.pool)
            or pool_directory.get(signals.pool.replace("/", "_")),
        )
        health, freshness = resolve_health(
            signals,
            now=now,
            stale_threshold_sec=stale_threshold_sec,
        )
        ranked.append(
            RankedPair(
                meta=meta,
                score=score,
                rank=idx,
                health=health,
                freshness_sec=freshness,
                signals=signals,
            )
        )
    return ranked
