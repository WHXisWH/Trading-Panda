"""Review & Skill Memory APIs — Epic 7."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.database import get_db
from app.db.models import Panda, TradeReview, User
from app.schemas.common import error, success
from app.schemas.errors import ApiError, ApiErrorCode
from app.services.review_service import (
    get_review_for_fact,
    list_reviews,
    request_review,
    review_to_dict,
)
from app.services.skill_memory_service import (
    get_latest_skill_version,
    list_skill_memories,
)
from app.workers.queue_dispatcher import process_pending_jobs

router = APIRouter()


def _api_error_response(exc: ApiError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content=error(exc.code.value, exc.message, details=exc.details),
    )


async def _load_owned_panda(panda_id: str, user: User, db: AsyncSession) -> Panda:
    result = await db.execute(
        select(Panda).where(Panda.id == panda_id, Panda.owner_id == user.id)
    )
    panda = result.scalar_one_or_none()
    if panda is None:
        raise ApiError(ApiErrorCode.PANDA_NOT_FOUND, "Panda not found")
    return panda


@router.get("/{panda_id}/reviews")
async def get_panda_reviews(
    panda_id: str,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        await _load_owned_panda(panda_id, user, db)
        items = await list_reviews(db, panda_id, limit=min(limit, 50))
    except ApiError as exc:
        return _api_error_response(exc)
    return JSONResponse(content=success(items))


@router.get("/{panda_id}/reviews/{review_id}")
async def get_panda_review_detail(
    panda_id: str,
    review_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        await _load_owned_panda(panda_id, user, db)
        result = await db.execute(
            select(TradeReview).where(
                TradeReview.id == review_id,
                TradeReview.panda_id == panda_id,
            )
        )
        review = result.scalar_one_or_none()
        if review is None:
            raise ApiError(ApiErrorCode.REVIEW_NOT_FOUND, "Review not found")
    except ApiError as exc:
        return _api_error_response(exc)
    return JSONResponse(content=success(review_to_dict(review)))


@router.get("/{panda_id}/trade-facts/{trade_fact_id}/review")
async def get_trade_fact_review(
    panda_id: str,
    trade_fact_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        await _load_owned_panda(panda_id, user, db)
        review = await get_review_for_fact(db, trade_fact_id)
        if review is None:
            raise ApiError(ApiErrorCode.REVIEW_NOT_FOUND, "Review not found")
        if review.panda_id != panda_id:
            raise ApiError(ApiErrorCode.REVIEW_NOT_FOUND, "Review not found")
    except ApiError as exc:
        return _api_error_response(exc)
    return JSONResponse(content=success(review_to_dict(review)))


@router.post("/{panda_id}/trade-facts/{trade_fact_id}/review")
async def post_request_review(
    panda_id: str,
    trade_fact_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        await _load_owned_panda(panda_id, user, db)
        data = await request_review(db, panda_id, trade_fact_id, source="manual")
        await process_pending_jobs(db)
    except ApiError as exc:
        return _api_error_response(exc)
    return JSONResponse(content=success(data))


@router.get("/{panda_id}/skill-memories")
async def get_skill_memories(
    panda_id: str,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        await _load_owned_panda(panda_id, user, db)
        items = await list_skill_memories(db, panda_id, limit=min(limit, 50))
    except ApiError as exc:
        return _api_error_response(exc)
    return JSONResponse(content=success(items))


@router.get("/{panda_id}/skill-versions/latest")
async def get_latest_skill(
    panda_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        await _load_owned_panda(panda_id, user, db)
        row = await get_latest_skill_version(db, panda_id)
        if row is None:
            raise ApiError(ApiErrorCode.SKILL_VERSION_NOT_FOUND, "No skill version yet")
    except ApiError as exc:
        return _api_error_response(exc)
    return JSONResponse(content=success(row))
