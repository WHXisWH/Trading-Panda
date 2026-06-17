"""POST /panda/mint — register on-chain Panda NFT into PostgreSQL (api-spec §3.2)."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.database import get_db
from app.db.models import Panda, User
from app.schemas.common import error, success
from app.schemas.errors import ApiError, ApiErrorCode
from app.schemas.panda import (
    PandaMintData,
    PandaMintRequest,
    PandaPersonalityData,
    PandaTalentData,
)
from app.services.mint_event_parser import fetch_parsed_mint_from_tx
from app.services.mint_registration import ExistingMintDecision, decide_existing_mint
from app.services.sui_rpc import get_object
from app.services.talent_meta import talent_payload
from app.services.wallet_verify import normalize_sui_address

router = APIRouter()


def _iso(dt: datetime | None) -> str:
    if dt is None:
        return datetime.now(timezone.utc).isoformat()
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc).isoformat()
    return dt.isoformat()


def _emotion_stability(patience: int, focus: int) -> int:
    return max(0, min(100, int((patience + focus) / 2)))


def _api_error_response(exc: ApiError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content=error(exc.code.value, exc.message, details=exc.details),
    )


def _panda_mint_data(
    panda: Panda,
    sui_tx_digest: str,
    name: str | None,
    mint_ev: object | None = None,
) -> PandaMintData:
    """Build API payload from DB row (optionally with parsed mint event for talent meta)."""
    from app.services.mint_event_parser import ParsedMintEvent

    talent_id = panda.talent
    if isinstance(mint_ev, ParsedMintEvent):
        talent_id = mint_ev.talent

    talent = talent_payload(talent_id)
    return PandaMintData(
        id=panda.id,
        sui_object_id=panda.sui_object_id,
        sui_tx_digest=sui_tx_digest,
        name=name,
        personality=PandaPersonalityData(
            boldness=panda.boldness,
            patience=panda.patience,
            intuition=panda.intuition,
            focus=panda.focus,
            contrarian=panda.contrarian,
        ),
        talent=PandaTalentData(
            id=int(talent["id"]),
            name=str(talent["name"]),
            description=str(talent["description"]),
        ),
        generation=panda.generation,
        created_at=_iso(panda.created_at),
    )


@router.post("/mint", status_code=201)
async def register_mint(
    body: PandaMintRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        body.validate_name_or_raise()
    except ApiError as exc:
        return _api_error_response(exc)

    existing = await db.execute(
        select(Panda).where(Panda.sui_object_id == body.sui_object_id)
    )
    existing_panda = existing.scalar_one_or_none()
    decision = decide_existing_mint(
        existing_panda.owner_id if existing_panda else None,
        user.id,
    )
    if decision == ExistingMintDecision.CONFLICT:
        return JSONResponse(
            status_code=409,
            content=error(
                ApiErrorCode.VALIDATION_ERROR.value,
                "Panda already registered for this sui_object_id",
            ),
        )
    if decision == ExistingMintDecision.RETURN_EXISTING and existing_panda:
        data = _panda_mint_data(existing_panda, body.sui_tx_digest, body.name)
        return JSONResponse(status_code=200, content=success(data.model_dump()))

    try:
        mint_ev = await fetch_parsed_mint_from_tx(
            body.sui_tx_digest,
            expected_object_id=body.sui_object_id,
        )
    except ApiError as exc:
        return _api_error_response(exc)

    if mint_ev.minter:
        wallet = normalize_sui_address(user.wallet_address)
        minter = normalize_sui_address(mint_ev.minter)
        if wallet != minter:
            return _api_error_response(
                ApiError(
                    ApiErrorCode.PANDA_NOT_OWNER,
                    "Mint transaction sender does not match authenticated wallet",
                )
            )

    try:
        obj = await get_object(body.sui_object_id)
    except Exception as exc:
        return _api_error_response(
            ApiError(
                ApiErrorCode.PANDA_TX_FAILED,
                "Minted object not found on chain",
                details=str(exc),
            )
        )

    owner = (obj.get("data") or {}).get("owner") or {}
    addr_owner = owner.get("AddressOwner") if isinstance(owner, dict) else None
    if addr_owner:
        wallet = normalize_sui_address(user.wallet_address)
        if normalize_sui_address(str(addr_owner)) != wallet:
            return _api_error_response(
                ApiError(
                    ApiErrorCode.PANDA_NOT_OWNER,
                    "On-chain object owner does not match authenticated wallet",
                )
            )

    stability = _emotion_stability(mint_ev.patience, mint_ev.focus)
    panda = Panda(
        owner_id=user.id,
        sui_object_id=body.sui_object_id,
        boldness=mint_ev.boldness,
        patience=mint_ev.patience,
        intuition=mint_ev.intuition,
        focus=mint_ev.focus,
        contrarian=mint_ev.contrarian,
        talent=mint_ev.talent,
        generation=mint_ev.generation,
        emotion_stability=stability,
        # Mint creates identity only — vault/policy wired in Agent Wallet setup (Epic 2).
        active_vault_id=None,
        active_policy_id=None,
    )
    db.add(panda)
    await db.commit()
    await db.refresh(panda)

    data = _panda_mint_data(panda, body.sui_tx_digest, body.name, mint_ev)
    return JSONResponse(status_code=201, content=success(data.model_dump()))
