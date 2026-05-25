"""Derived panda stats — growth stage, trade aggregates."""

from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Trade


def growth_stage_from_experience(experience_level: int) -> str:
    if experience_level < 10:
        return "newborn"
    if experience_level < 30:
        return "learning"
    if experience_level < 60:
        return "experienced"
    if experience_level < 85:
        return "master"
    return "legend"


async def trade_stats_for_panda(
    panda_id: str,
    db: AsyncSession,
) -> tuple[int, float | None]:
    """Return (total_trades, win_rate 0-1 or None)."""
    count_result = await db.execute(
        select(func.count()).select_from(Trade).where(Trade.panda_id == panda_id)
    )
    total = int(count_result.scalar() or 0)
    if total == 0:
        return 0, None

    win_result = await db.execute(
        select(func.count())
        .select_from(Trade)
        .where(Trade.panda_id == panda_id, Trade.pnl_pct.isnot(None), Trade.pnl_pct > 0)
    )
    wins = int(win_result.scalar() or 0)
    closed_result = await db.execute(
        select(func.count())
        .select_from(Trade)
        .where(Trade.panda_id == panda_id, Trade.pnl_pct.isnot(None))
    )
    closed = int(closed_result.scalar() or 0)
    if closed == 0:
        return total, None
    return total, round(wins / closed, 4)
