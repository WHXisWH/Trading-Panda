"""GET /leaderboard — public ranking by win rate / pnl / level.

Stats are aggregated off-chain from `trades` + `pandas` (PRD C11: win rate
is computed off-chain, not on-chain). Ranking logic lives in
app.services.leaderboard for DB-free unit testing.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from fastapi.responses import JSONResponse
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.db.models import Panda, Trade, User
from app.schemas.common import success
from app.services.leaderboard import build_entry, normalize_dimension, rank_leaderboard

router = APIRouter()


@router.get("")
async def get_leaderboard(
    dimension: str = Query(default="winrate"),
    limit: int = Query(default=50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    dim = normalize_dimension(dimension)

    stmt = (
        select(
            Panda.id.label("panda_id"),
            Panda.experience_level.label("level"),
            User.display_name.label("owner_name"),
            func.count(Trade.id).label("trade_count"),
            func.count(case((Trade.pnl_pct > 0, 1))).label("wins"),
            func.count(Trade.pnl_pct).label("closed"),
            func.coalesce(func.sum(Trade.pnl_pct), 0).label("sum_pnl"),
        )
        .select_from(Panda)
        .join(User, User.id == Panda.owner_id)
        .outerjoin(Trade, Trade.panda_id == Panda.id)
        .group_by(Panda.id, Panda.experience_level, User.display_name)
    )
    rows = (await db.execute(stmt)).all()

    entries = [
        build_entry(
            panda_id=row.panda_id,
            owner_name=row.owner_name,
            level=row.level or 0,
            trade_count=row.trade_count or 0,
            wins=row.wins or 0,
            closed=row.closed or 0,
            sum_pnl_pct=float(row.sum_pnl or 0),
        )
        for row in rows
    ]

    ranked = rank_leaderboard(entries, dim, limit)
    return JSONResponse(content=success({"dimension": dim, "entries": ranked}))
