"""Achievement catalog + off-chain unlock evaluation.

Pure logic (no DB) so it can be unit-tested without Postgres. The route
aggregates a user's stats, calls `evaluate_unlocked`, and persists new
unlocks into `user_achievements`. On-chain unlock (contract) is deferred.
"""
from __future__ import annotations

from typing import Any

# Each requirement: {"metric": <stats key>, "gte": <threshold>, "min_trades"?: int}
ACHIEVEMENT_DEFS: list[dict[str, Any]] = [
    {
        "code": "first_panda",
        "title": "First Companion",
        "description": "Mint your first trading panda.",
        "requirement": {"metric": "pandas_count", "gte": 1},
    },
    {
        "code": "collector",
        "title": "Collector",
        "description": "Own 3 or more pandas.",
        "requirement": {"metric": "pandas_count", "gte": 3},
    },
    {
        "code": "first_trade",
        "title": "First Steps",
        "description": "Your panda completes its first trade.",
        "requirement": {"metric": "total_trades", "gte": 1},
    },
    {
        "code": "ten_trades",
        "title": "Getting Warmed Up",
        "description": "Reach 10 trades.",
        "requirement": {"metric": "total_trades", "gte": 10},
    },
    {
        "code": "hundred_trades",
        "title": "Seasoned Trader",
        "description": "Reach 100 trades.",
        "requirement": {"metric": "total_trades", "gte": 100},
    },
    {
        "code": "in_the_green",
        "title": "In the Green",
        "description": "Land a profitable trade.",
        "requirement": {"metric": "best_pnl_pct", "gte": 0.01},
    },
    {
        "code": "sharp_shooter",
        "title": "Sharp Shooter",
        "description": "Hit a 60%+ win rate over at least 10 closed trades.",
        "requirement": {"metric": "win_rate", "gte": 0.6, "min_trades": 10},
    },
    {
        "code": "veteran",
        "title": "Veteran",
        "description": "Grow a panda to experience level 50.",
        "requirement": {"metric": "max_level", "gte": 50},
    },
    {
        "code": "grandmaster",
        "title": "Grandmaster",
        "description": "Grow a panda to experience level 100.",
        "requirement": {"metric": "max_level", "gte": 100},
    },
]

_DEFS_BY_CODE = {d["code"]: d for d in ACHIEVEMENT_DEFS}

# stats keys the route is expected to provide; defaults keep evaluation safe.
DEFAULT_STATS: dict[str, float] = {
    "pandas_count": 0,
    "total_trades": 0,
    "closed_trades": 0,
    "win_rate": 0.0,
    "max_level": 0,
    "total_pnl_pct": 0.0,
    "best_pnl_pct": 0.0,
}


def _requirement_met(requirement: dict[str, Any], stats: dict[str, Any]) -> bool:
    min_trades = requirement.get("min_trades")
    if min_trades is not None and stats.get("closed_trades", 0) < min_trades:
        return False
    value = stats.get(requirement["metric"], 0)
    return value is not None and value >= requirement["gte"]


def evaluate_unlocked(stats: dict[str, Any]) -> set[str]:
    """Return the set of achievement codes the given stats satisfy."""
    merged = {**DEFAULT_STATS, **(stats or {})}
    return {
        d["code"]
        for d in ACHIEVEMENT_DEFS
        if _requirement_met(d["requirement"], merged)
    }


def get_definition(code: str) -> dict[str, Any] | None:
    return _DEFS_BY_CODE.get(code)
