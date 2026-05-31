"""POST/GET /panda/:id/strategy — Epic 2 feed & validate."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.database import get_db
from app.db.models import User
from app.schemas.common import error, success
from app.schemas.errors import ApiError, ApiErrorCode
from app.schemas.strategy import StrategyFeedRequest, StrategyValidateData
from app.services.strategy_feed import (
    feed_strategy,
    get_active_strategy_record,
    load_owned_panda,
    validate_strategy_body,
)

router = APIRouter()


def _api_error_response(exc: ApiError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content=error(
            exc.code.value,
            exc.message,
            invalid_rules=exc.invalid_rules,
        ),
    )


def _validation_error_response(exc: ValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=400,
        content=error(
            ApiErrorCode.STRATEGY_BODY_EMPTY.value,
            "Invalid request body",
            details=exc.errors(),
        ),
    )


@router.post("/{panda_id}/strategy")
async def post_strategy(
    panda_id: str,
    body: StrategyFeedRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        panda = await load_owned_panda(panda_id, user, db)
        data = await feed_strategy(panda, body, db, user.id)
        return JSONResponse(content=success(data))
    except ApiError as exc:
        return _api_error_response(exc)
    except ValidationError as exc:
        return _validation_error_response(exc)


@router.post("/{panda_id}/strategy/validate")
async def post_strategy_validate(
    panda_id: str,
    body: StrategyFeedRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        await load_owned_panda(panda_id, user, db)
        if body.raw_text is not None and len(body.raw_text.strip()) < 10:
            raise ApiError(
                ApiErrorCode.STRATEGY_TEXT_TOO_SHORT,
                "Strategy text must be at least 10 characters",
            )
        data: StrategyValidateData = validate_strategy_body(body)
        return JSONResponse(content=success(data.model_dump()))
    except ApiError as exc:
        return _api_error_response(exc)
    except ValidationError as exc:
        return _validation_error_response(exc)


@router.get("/{panda_id}/strategy")
async def get_strategy(
    panda_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        await load_owned_panda(panda_id, user, db)
        record = await get_active_strategy_record(panda_id, db)
        if record is None:
            return JSONResponse(
                status_code=404,
                content=error(ApiErrorCode.STRATEGY_NOT_FOUND.value, "No active strategy"),
            )
        return JSONResponse(content=success(record))
    except ApiError as exc:
        return _api_error_response(exc)
