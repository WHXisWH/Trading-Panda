"""GET/PUT /panda/:id/pools — Epic 4 DeepBook pool subscription."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.api.panda_read import _load_owned_panda
from app.db.database import get_db
from app.db.models import User
from app.engine.actor_manager import actor_manager
from app.schemas.common import error, success
from app.schemas.errors import ApiError, ApiErrorCode
from app.services.pool_catalog import (
    MVP_POOLS,
    POOL_CATALOG,
    max_pools_for_focus,
    normalize_subscribed_pools,
)
from sqlalchemy.exc import SQLAlchemyError

router = APIRouter()


class PoolsUpdateBody(BaseModel):
    subscribed_pools: list[str] = Field(min_length=1, max_length=2)
    primary_pool: str | None = None


@router.get("/{panda_id}/pools")
async def get_panda_pools(
    panda_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        panda = await _load_owned_panda(panda_id, user, db)
    except ApiError as exc:
        return JSONResponse(status_code=exc.status_code, content=error(exc.code.value, exc.message))

    subscribed = normalize_subscribed_pools(panda.subscribed_pools)
    max_pools = max_pools_for_focus(int(panda.focus))
    primary = subscribed[0] if subscribed else "DEEP/SUI"

    return JSONResponse(
        content=success(
            {
                "subscribed_pools": subscribed,
                "primary_pool": primary,
                "max_pools": max_pools,
                "available_pools": POOL_CATALOG,
            }
        )
    )


@router.put("/{panda_id}/pools")
async def update_panda_pools(
    panda_id: str,
    body: PoolsUpdateBody,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        panda = await _load_owned_panda(panda_id, user, db)
    except ApiError as exc:
        return JSONResponse(status_code=exc.status_code, content=error(exc.code.value, exc.message))

    if panda.is_trading:
        return JSONResponse(
            status_code=409,
            content=error(
                ApiErrorCode.PANDA_IS_TRADING.value,
                "Stop training before changing subscribed pools",
            ),
        )

    max_pools = max_pools_for_focus(int(panda.focus))
    pools = [p for p in body.subscribed_pools if p in MVP_POOLS]
    if not pools:
        return JSONResponse(
            status_code=400,
            content=error("VALIDATION_ERROR", "At least one valid DeepBook pool required"),
        )
    if len(pools) > max_pools:
        return JSONResponse(
            status_code=400,
            content=error(
                "VALIDATION_ERROR",
                f"Focus allows at most {max_pools} pool(s)",
            ),
        )

    primary = body.primary_pool
    if primary and primary in pools:
        pools = [primary] + [p for p in pools if p != primary]
    elif primary and primary not in pools:
        return JSONResponse(
            status_code=400,
            content=error("VALIDATION_ERROR", "primary_pool must be in subscribed_pools"),
        )

    try:
        panda.subscribed_pools = pools
        await db.commit()
    except SQLAlchemyError as exc:
        await db.rollback()
        msg = str(exc).lower()
        if "subscribed_pools" in msg or "undefinedcolumn" in msg:
            hint = "Run: cd backend && alembic upgrade head"
            return JSONResponse(
                status_code=503,
                content=error(
                    ApiErrorCode.SERVICE_UNAVAILABLE.value,
                    f"Database missing subscribed_pools column. {hint}",
                ),
            )
        return JSONResponse(
            status_code=500,
            content=error(ApiErrorCode.INTERNAL_ERROR.value, str(exc)),
        )

    actor_manager.set_subscribed_pools(panda.id, pools)

    return JSONResponse(
        content=success(
            {
                "subscribed_pools": pools,
                "primary_pool": pools[0],
                "max_pools": max_pools,
            }
        )
    )
