"""Safety owner controls APIs — Epic 8."""

from __future__ import annotations

from typing import Any, Literal

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.api.panda_read import _load_owned_panda
from app.db.database import get_db
from app.db.models import User
from app.schemas.common import error, success
from app.schemas.errors import ApiError
from app.services import agent_wallet as wallet_service
from app.services.safety_service import get_safety_status

router = APIRouter()


class PolicyDraftBody(BaseModel):
    allowed_pairs: list[str] = Field(default_factory=list)
    max_notional_per_trade: float = 50.0
    max_daily_loss: float = 8.0
    max_open_positions: int = 1
    cooldown_ms: int = 0
    max_proofs_per_day: int = 10
    proof_mode: Literal["manual", "auto"] = "manual"
    policy_hash: str | None = None


class OwnerActionSyncBody(BaseModel):
    sui_tx_digest: str
    action: Literal["pause", "unpause", "revoke", "tighten"]
    draft: PolicyDraftBody | None = None


def _api_error_response(exc: ApiError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content=error(exc.code.value, exc.message, details=exc.details),
    )


@router.get("/{panda_id}/safety")
async def get_safety(
    panda_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        panda = await _load_owned_panda(panda_id, user, db)
        data = await get_safety_status(panda, db)
    except ApiError as exc:
        return _api_error_response(exc)
    return JSONResponse(content=success(data))


@router.post("/{panda_id}/safety/owner-action")
async def sync_safety_owner_action(
    panda_id: str,
    body: OwnerActionSyncBody,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        panda = await _load_owned_panda(panda_id, user, db)
        draft: dict[str, Any] | None = body.draft.model_dump() if body.draft else None
        await wallet_service.sync_owner_action_from_tx(
            panda,
            body.action,
            body.sui_tx_digest.strip(),
            db,
            draft,
        )
        data = await get_safety_status(panda, db)
    except ApiError as exc:
        return _api_error_response(exc)
    return JSONResponse(content=success(data))
