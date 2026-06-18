"""Training Ledger read APIs — account state, intents, trade facts (Epic 5)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.api.panda_read import _load_owned_panda
from app.db.database import get_db
from app.db.models import OrderIntent, PandaAccount, TradeFact, User
from app.engine.actor_manager import actor_manager
from app.schemas.common import error, success
from app.schemas.errors import ApiError
from app.services.ledger_service import LedgerService

router = APIRouter()
_ledger = LedgerService()


def _intent_dict(row: OrderIntent) -> dict:
    return {
        "id": row.id,
        "panda_id": row.panda_id,
        "vault_id": row.vault_id,
        "policy_id": row.policy_id,
        "policy_version": row.policy_version,
        "mode": row.mode,
        "pair": row.pair,
        "side": row.side,
        "notional": float(row.notional),
        "reference_price": float(row.reference_price),
        "final_score": float(row.final_score) if row.final_score is not None else None,
        "decision_hash": row.decision_hash,
        "proof_eligible": row.proof_eligible,
        "status": row.status,
        "rejection_reason": row.rejection_reason,
        "market_snapshot": row.market_snapshot,
        "decision_snapshot": row.decision_snapshot,
        "policy_snapshot": row.policy_snapshot,
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }


def _trade_fact_dict(row: TradeFact) -> dict:
    return {
        "id": row.id,
        "panda_id": row.panda_id,
        "order_intent_id": row.order_intent_id,
        "pair": row.pair,
        "side": row.side,
        "mode": row.mode,
        "fact_hash": row.fact_hash,
        "proof_status": row.proof_status,
        "realized_pnl": float(row.realized_pnl) if row.realized_pnl is not None else None,
        "realized_pnl_pct": float(row.realized_pnl_pct) if row.realized_pnl_pct else None,
        "review_status": row.review_status,
        "market_snapshot": row.market_snapshot,
        "decision_snapshot": row.decision_snapshot,
        "policy_snapshot": row.policy_snapshot,
        "ledger_snapshot_before": row.ledger_snapshot_before,
        "ledger_snapshot_after": row.ledger_snapshot_after,
        "execution_snapshot": row.execution_snapshot,
        "outcome": row.outcome,
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }


@router.get("/{panda_id}/training/ledger")
async def training_ledger_state(
    panda_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        await _load_owned_panda(panda_id, user, db)
    except ApiError as exc:
        return JSONResponse(status_code=exc.status_code, content=error(exc.code.value, exc.message))

    result = await db.execute(
        select(PandaAccount).where(
            PandaAccount.panda_id == panda_id,
            PandaAccount.mode == "training_ledger",
        )
    )
    account = result.scalar_one_or_none()
    actor_state = await actor_manager.get_state(panda_id)

    if account is None:
        payload = {
            "mode": "training_ledger",
            "cash_balance": 0,
            "equity": 0,
            "realized_pnl": 0,
            "unrealized_pnl": 0,
            "positions": [],
            "actor_active": actor_state is not None,
        }
        if actor_state:
            payload["equity"] = actor_state.get("equity", 0)
            payload["positions"] = [
                {"asset": k, "quantity": v} for k, v in (actor_state.get("positions") or {}).items()
            ]
        return JSONResponse(content=success(payload))

    snap = await _ledger.snapshot(db, account)
    payload = {
        "account_id": account.id,
        "mode": account.mode,
        "status": account.status,
        **_ledger.snapshot_to_dict(snap),
        "actor_active": actor_state is not None,
        "last_order_intent": actor_state.get("last_order_intent") if actor_state else None,
        "last_trade_fact": actor_state.get("last_trade_fact") if actor_state else None,
        "policy_version": actor_state.get("policy_version") if actor_state else None,
    }
    return JSONResponse(content=success(payload))


@router.get("/{panda_id}/training/order-intents")
async def list_order_intents(
    panda_id: str,
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        await _load_owned_panda(panda_id, user, db)
    except ApiError as exc:
        return JSONResponse(status_code=exc.status_code, content=error(exc.code.value, exc.message))

    rows = (
        await db.execute(
            select(OrderIntent)
            .where(OrderIntent.panda_id == panda_id)
            .order_by(OrderIntent.created_at.desc())
            .limit(limit)
        )
    ).scalars().all()
    return JSONResponse(content=success([_intent_dict(r) for r in rows]))


@router.get("/{panda_id}/training/trade-facts")
async def list_trade_facts(
    panda_id: str,
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        await _load_owned_panda(panda_id, user, db)
    except ApiError as exc:
        return JSONResponse(status_code=exc.status_code, content=error(exc.code.value, exc.message))

    rows = (
        await db.execute(
            select(TradeFact)
            .where(TradeFact.panda_id == panda_id)
            .order_by(TradeFact.created_at.desc())
            .limit(limit)
        )
    ).scalars().all()
    return JSONResponse(content=success([_trade_fact_dict(r) for r in rows]))
