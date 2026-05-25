"""GET /panda/my · GET /panda/{id} — api-spec §3.2."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.database import get_db
from app.db.models import Panda, Strategy, User
from app.schemas.common import error, success
from app.schemas.errors import ApiError, ApiErrorCode
from app.services.panda_serializer import panda_detail_dict, panda_list_item_dict

router = APIRouter()


def _api_error_response(exc: ApiError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content=error(exc.code.value, exc.message, details=exc.details),
    )


async def _load_owned_panda(
    panda_id: str,
    user: User,
    db: AsyncSession,
) -> Panda:
    result = await db.execute(
        select(Panda).where(Panda.id == panda_id, Panda.owner_id == user.id)
    )
    panda = result.scalar_one_or_none()
    if panda is None:
        raise ApiError(ApiErrorCode.PANDA_NOT_FOUND, "Panda not found")
    return panda


async def _active_strategy(panda_id: str, db: AsyncSession) -> Strategy | None:
    result = await db.execute(
        select(Strategy).where(Strategy.panda_id == panda_id, Strategy.is_active == True)
    )
    return result.scalar_one_or_none()


@router.get("/my")
async def list_my_pandas(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Panda).where(Panda.owner_id == user.id).order_by(Panda.created_at.desc())
    )
    pandas = result.scalars().all()
    items = [await panda_list_item_dict(p, db) for p in pandas]
    return JSONResponse(content=success(items))


@router.get("/{panda_id}")
async def get_panda_detail(
    panda_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        panda = await _load_owned_panda(panda_id, user, db)
    except ApiError as exc:
        return _api_error_response(exc)

    strategy = await _active_strategy(panda.id, db)
    data = await panda_detail_dict(panda, db, strategy=strategy)
    return JSONResponse(content=success(data))
