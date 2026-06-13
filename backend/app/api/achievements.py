"""GET /achievements — catalog + the current user's unlock state.

Aggregates the user's stats, evaluates unlocks off-chain, lazily persists
new ones into user_achievements, and returns the full catalog with flags.
On-chain unlock (contract) is deferred.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.database import get_db
from app.db.models import Achievement, Panda, Trade, User, UserAchievement
from app.schemas.common import success
from app.services.achievements import ACHIEVEMENT_DEFS, evaluate_unlocked

router = APIRouter()


async def _user_stats(user_id: str, db: AsyncSession) -> dict:
    pandas_count, max_level = (
        await db.execute(
            select(
                func.count(Panda.id),
                func.coalesce(func.max(Panda.experience_level), 0),
            ).where(Panda.owner_id == user_id)
        )
    ).one()

    total, closed, wins, sum_pnl, best_pnl = (
        await db.execute(
            select(
                func.count(Trade.id),
                func.count(Trade.pnl_pct),
                func.count(case((Trade.pnl_pct > 0, 1))),
                func.coalesce(func.sum(Trade.pnl_pct), 0),
                func.coalesce(func.max(Trade.pnl_pct), 0),
            )
            .select_from(Trade)
            .join(Panda, Panda.id == Trade.panda_id)
            .where(Panda.owner_id == user_id)
        )
    ).one()

    return {
        "pandas_count": int(pandas_count or 0),
        "total_trades": int(total or 0),
        "closed_trades": int(closed or 0),
        "win_rate": round((wins / closed), 4) if closed else 0.0,
        "max_level": int(max_level or 0),
        "total_pnl_pct": float(sum_pnl or 0),
        "best_pnl_pct": float(best_pnl or 0),
    }


async def _ensure_catalog(db: AsyncSession) -> dict[str, str]:
    existing = set((await db.execute(select(Achievement.code))).scalars().all())
    for d in ACHIEVEMENT_DEFS:
        if d["code"] not in existing:
            db.add(
                Achievement(
                    code=d["code"],
                    title=d["title"],
                    description=d["description"],
                    requirement_json=d["requirement"],
                )
            )
    await db.flush()
    rows = (await db.execute(select(Achievement.id, Achievement.code))).all()
    return {code: aid for aid, code in rows}


@router.get("")
async def list_achievements(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    stats = await _user_stats(user.id, db)
    id_by_code = await _ensure_catalog(db)

    already = {
        aid
        for (aid,) in (
            await db.execute(
                select(UserAchievement.achievement_id).where(
                    UserAchievement.user_id == user.id
                )
            )
        ).all()
    }

    unlocked_codes = evaluate_unlocked(stats)
    for code in unlocked_codes:
        aid = id_by_code.get(code)
        if aid and aid not in already:
            db.add(UserAchievement(user_id=user.id, achievement_id=aid))
    await db.commit()

    unlocked_at_by_code = {
        code: ts
        for code, ts in (
            await db.execute(
                select(Achievement.code, UserAchievement.unlocked_at)
                .join(UserAchievement, UserAchievement.achievement_id == Achievement.id)
                .where(UserAchievement.user_id == user.id)
            )
        ).all()
    }

    items = [
        {
            "code": d["code"],
            "title": d["title"],
            "description": d["description"],
            "unlocked": d["code"] in unlocked_at_by_code,
            "unlocked_at": (
                unlocked_at_by_code[d["code"]].isoformat()
                if unlocked_at_by_code.get(d["code"])
                else None
            ),
        }
        for d in ACHIEVEMENT_DEFS
    ]

    unlocked_count = sum(1 for i in items if i["unlocked"])
    return JSONResponse(
        content=success(
            {"total": len(items), "unlocked": unlocked_count, "achievements": items}
        )
    )
