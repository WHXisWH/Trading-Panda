"""Chain Proof Mode 2 APIs — Epic 6."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.api.panda_read import _load_owned_panda
from app.db.database import get_db
from app.db.models import User
from app.schemas.common import error, success
from app.schemas.errors import ApiError
from app.services.chain_proof_service import get_chain_proof_status, request_and_process_proof

router = APIRouter()


def _api_error_response(exc: ApiError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content=error(exc.code.value, exc.message, details=exc.details),
    )


@router.get("/{panda_id}/chain-proof/{trade_fact_id}")
async def chain_proof_status(
    panda_id: str,
    trade_fact_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        await _load_owned_panda(panda_id, user, db)
        data = await get_chain_proof_status(db, panda_id, trade_fact_id)
    except ApiError as exc:
        return _api_error_response(exc)
    return JSONResponse(content=success(data))


@router.post("/{panda_id}/chain-proof/{trade_fact_id}/request")
async def request_chain_proof(
    panda_id: str,
    trade_fact_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        await _load_owned_panda(panda_id, user, db)
        data = await request_and_process_proof(
            db,
            panda_id,
            trade_fact_id,
            user_id=user.id,
        )
    except ApiError as exc:
        return _api_error_response(exc)
    return JSONResponse(content=success(data))
