"""Leaderboard ranking — pure logic, DB-independent (testable without Postgres).

The route aggregates per-panda stats in SQL, then hands plain dicts to
`rank_leaderboard` for sorting + rank assignment.
"""
from __future__ import annotations

from typing import Any

LeaderboardDimension = str  # "winrate" | "pnl" | "level"
VALID_DIMENSIONS = ("winrate", "pnl", "level")
DEFAULT_DIMENSION = "winrate"


def normalize_dimension(value: str | None) -> str:
    return value if value in VALID_DIMENSIONS else DEFAULT_DIMENSION


def build_entry(
    *,
    panda_id: str,
    owner_name: str | None,
    level: int,
    trade_count: int,
    wins: int,
    closed: int,
    sum_pnl_pct: float,
) -> dict[str, Any]:
    """Derive display metrics for one panda from raw aggregates."""
    win_rate = round(wins / closed, 4) if closed else 0.0
    return {
        "panda_id": panda_id,
        "owner_name": owner_name,
        "level": int(level),
        "trade_count": int(trade_count),
        "win_rate": win_rate,
        "total_pnl_pct": round(float(sum_pnl_pct), 4),
    }


def _sort_key(dimension: str):
    if dimension == "pnl":
        return lambda e: (e["total_pnl_pct"], e["trade_count"])
    if dimension == "level":
        return lambda e: (e["level"], e["trade_count"])
    # winrate: require at least one closed trade to rank above the untraded
    return lambda e: (e["win_rate"], e["trade_count"])


def rank_leaderboard(
    entries: list[dict[str, Any]],
    dimension: str,
    limit: int = 50,
) -> list[dict[str, Any]]:
    """Sort entries by the chosen dimension (desc) and assign 1-based rank."""
    dim = normalize_dimension(dimension)
    limit = max(1, min(int(limit), 200))
    ranked = sorted(entries, key=_sort_key(dim), reverse=True)[:limit]
    return [{**entry, "rank": index + 1} for index, entry in enumerate(ranked)]
