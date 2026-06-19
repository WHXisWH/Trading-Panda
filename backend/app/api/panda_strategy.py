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
from app.schemas.strategy import StrategyFeedRequest, StrategyUpdateRequest, StrategyValidateData
from app.services.strategy_feed import (
    activate_strategy_record,
    feed_strategy,
    get_active_strategy_record,
    list_strategy_records,
    load_owned_panda,
    parse_strategy_only,
    update_strategy_record,
    validate_strategy_for_panda,
)

router = APIRouter()


def _api_error_response(exc: ApiError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content=error(
            exc.code.value,
            exc.message,
            invalid_rules=exc.invalid_rules,
            policy_conflicts=exc.policy_conflicts,
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


@router.get("/{panda_id}/strategies")
async def get_strategies(
    panda_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        await load_owned_panda(panda_id, user, db)
        data = await list_strategy_records(panda_id, db)
        return JSONResponse(content=success(data))
    except ApiError as exc:
        return _api_error_response(exc)


@router.post("/{panda_id}/strategy/parse")
async def post_strategy_parse(
    panda_id: str,
    body: StrategyFeedRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        await load_owned_panda(panda_id, user, db)
        data = await parse_strategy_only(body, user.id)
        return JSONResponse(content=success(data))
    except ApiError as exc:
        return _api_error_response(exc)
    except ValidationError as exc:
        return _validation_error_response(exc)


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


@router.patch("/{panda_id}/strategy/{strategy_id}")
async def patch_strategy(
    panda_id: str,
    strategy_id: str,
    body: StrategyUpdateRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        panda = await load_owned_panda(panda_id, user, db)
        data = await update_strategy_record(panda, strategy_id, body, db)
        return JSONResponse(content=success(data))
    except ApiError as exc:
        return _api_error_response(exc)
    except ValidationError as exc:
        return _validation_error_response(exc)


@router.post("/{panda_id}/strategy/{strategy_id}/activate")
async def post_strategy_activate(
    panda_id: str,
    strategy_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        panda = await load_owned_panda(panda_id, user, db)
        data = await activate_strategy_record(panda, strategy_id, db)
        return JSONResponse(content=success(data))
    except ApiError as exc:
        return _api_error_response(exc)


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
        data: StrategyValidateData = await validate_strategy_for_panda(panda_id, body, db)
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
