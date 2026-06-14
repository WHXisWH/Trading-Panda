"""POST /checkin (claim today) + GET /checkin (status) — daily streak.

Streak/reward math lives in app.services.checkin for DB-free testing.
On-chain reward grant (contract) is deferred; this records off-chain.
"""
from __future__ import annotations

from datetime import date, timedelta

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.database import get_db
from app.db.models import Checkin, User
from app.schemas.common import success
from app.services.checkin import (
    checkin_reward,
    current_streak,
    is_checked_in_today,
    next_streak,
)

router = APIRouter()


async def _latest_checkin(user_id: str, db: AsyncSession) -> Checkin | None:
    result = await db.execute(
        select(Checkin)
        .where(Checkin.user_id == user_id)
        .order_by(Checkin.checkin_date.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


@router.post("")
async def do_checkin(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    today = date.today()
    latest = await _latest_checkin(user.id, db)
    last_date = latest.checkin_date if latest else None
    last_streak = latest.streak_count if latest else 0

    if is_checked_in_today(last_date, today):
        return JSONResponse(
            content=success(
                {
                    "already_checked_in": True,
                    "streak": latest.streak_count,
                    "reward_type": latest.reward_type,
                    "reward_amount": float(latest.reward_amount),
                    "checkin_date": today.isoformat(),
                }
            )
        )

    streak = next_streak(last_date, last_streak, today)
    reward_type, reward_amount = checkin_reward(streak)
    db.add(
        Checkin(
            user_id=user.id,
            streak_count=streak,
            checkin_date=today,
            reward_type=reward_type,
            reward_amount=reward_amount,
        )
    )
    await db.commit()

    return JSONResponse(
        content=success(
            {
                "already_checked_in": False,
                "streak": streak,
                "reward_type": reward_type,
                "reward_amount": reward_amount,
                "checkin_date": today.isoformat(),
            }
        )
    )


@router.get("")
async def checkin_status(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    today = date.today()
    latest = await _latest_checkin(user.id, db)
    last_date = latest.checkin_date if latest else None
    last_streak = latest.streak_count if latest else 0

    recent = (
        await db.execute(
            select(Checkin)
            .where(
                Checkin.user_id == user.id,
                Checkin.checkin_date >= today - timedelta(days=30),
            )
            .order_by(Checkin.checkin_date.desc())
        )
    ).scalars().all()

    return JSONResponse(
        content=success(
            {
                "checked_in_today": is_checked_in_today(last_date, today),
                "streak": current_streak(last_date, last_streak, today),
                "history": [c.checkin_date.isoformat() for c in recent],
            }
        )
    )
