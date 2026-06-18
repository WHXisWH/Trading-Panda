"""Agent Wallet setup APIs — Epic 2."""

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

router = APIRouter()


class PolicyDraftBody(BaseModel):
    training_budget: float = Field(default=10_000.0, ge=100, le=1_000_000)
    allowed_pairs: list[str] = Field(default_factory=list)
    max_notional_per_trade: float = 50.0
    max_daily_loss: float = 8.0
    max_open_positions: int = 1
    cooldown_ms: int = 0
    max_proofs_per_day: int = 10
    proof_mode: Literal["manual", "auto"] = "manual"


class TrainingBudgetBody(BaseModel):
    training_budget: float = Field(ge=100, le=1_000_000)


class AgentWalletSyncBody(BaseModel):
    sui_tx_digest: str
    draft: PolicyDraftBody | None = None


class OwnerActionSyncBody(BaseModel):
    sui_tx_digest: str
    action: Literal["pause", "unpause", "revoke", "tighten"]
    draft: PolicyDraftBody | None = None


def _api_error_response(exc: ApiError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content=error(exc.code.value, exc.message, details=exc.details),
    )


@router.get("/{panda_id}/agent-wallet")
async def get_agent_wallet_status(
    panda_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        panda = await _load_owned_panda(panda_id, user, db)
    except ApiError as exc:
        return _api_error_response(exc)
    data = await wallet_service.get_setup_status(panda, db)
    return JSONResponse(content=success(data))


@router.post("/{panda_id}/agent-wallet/validate-policy")
async def validate_policy_draft(
    panda_id: str,
    body: PolicyDraftBody,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        await _load_owned_panda(panda_id, user, db)
    except ApiError as exc:
        return _api_error_response(exc)

    result = await wallet_service.validate_policy_draft_async(
        body.allowed_pairs,
        body.max_notional_per_trade,
        body.max_daily_loss,
        body.max_open_positions,
        None,
        training_budget=body.training_budget,
        cooldown_ms=body.cooldown_ms,
        max_proofs_per_day=body.max_proofs_per_day,
        proof_mode=body.proof_mode,
    )
    return JSONResponse(content=success(result))


@router.patch("/{panda_id}/agent-wallet/training-budget")
async def patch_training_budget(
    panda_id: str,
    body: TrainingBudgetBody,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        panda = await _load_owned_panda(panda_id, user, db)
        data = await wallet_service.update_training_budget(panda, body.training_budget, db)
    except ApiError as exc:
        return _api_error_response(exc)
    return JSONResponse(content=success(data))


@router.post("/{panda_id}/agent-wallet/sync")
async def sync_agent_wallet(
    panda_id: str,
    body: AgentWalletSyncBody,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        panda = await _load_owned_panda(panda_id, user, db)
        draft: dict[str, Any] | None = body.draft.model_dump() if body.draft else None
        data = await wallet_service.sync_setup_from_tx(
            panda,
            user,
            body.sui_tx_digest.strip(),
            draft,
            db,
        )
    except ApiError as exc:
        return _api_error_response(exc)
    return JSONResponse(content=success(data))


@router.post("/{panda_id}/agent-wallet/owner-action")
async def sync_owner_action(
    panda_id: str,
    body: OwnerActionSyncBody,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        panda = await _load_owned_panda(panda_id, user, db)
        draft: dict[str, Any] | None = body.draft.model_dump() if body.draft else None
        data = await wallet_service.sync_owner_action_from_tx(
            panda,
            body.action,
            body.sui_tx_digest.strip(),
            db,
            draft,
        )
    except ApiError as exc:
        return _api_error_response(exc)
    return JSONResponse(content=success(data))
