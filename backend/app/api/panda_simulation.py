"""POST simulation start/stop · GET trades — Epic 3 Dashboard."""

from __future__ import annotations

import uuid
from decimal import Decimal

from fastapi import APIRouter, Depends, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.api.panda_read import _active_strategy, _load_owned_panda
from app.db.database import get_db
from app.db.models import Simulation, Trade, User
from app.engine.actor_manager import actor_manager
from app.schemas.common import error, success
from app.schemas.errors import ApiError, ApiErrorCode
from app.services.pool_catalog import MVP_POOLS, normalize_subscribed_pools

router = APIRouter()


class SimulationStartBody(BaseModel):
    speed: str = "1x"
    subscribed_pools: list[str] = Field(default_factory=lambda: ["DEEP/SUI"])
    initial_capital: float = 10_000.0
    data_source: str = "deepbook"


def _normalize_speed(raw: str) -> str:
    mapping = {
        "1×": "1x",
        "10×": "10x",
        "100×": "100x",
        "跳到结果": "instant",
    }
    cleaned = mapping.get(raw.strip(), raw.strip().lower().replace("×", "x"))
    if cleaned not in ("1x", "10x", "100x", "instant"):
        raise ApiError(ApiErrorCode.SIM_INVALID_SPEED, f"Invalid speed: {raw}")
    return cleaned


def _trade_dict(row: Trade) -> dict:
    details = row.decision_details if isinstance(row.decision_details, dict) else {}
    return {
        "id": row.id,
        "panda_id": row.panda_id,
        "strategy_id": row.strategy_id,
        "simulation_id": row.simulation_id,
        "asset": row.asset,
        "action": row.action,
        "price": float(row.price),
        "quantity": float(row.quantity),
        "position_size_pct": float(row.position_size_pct),
        "final_score": float(row.final_score),
        "emotion_at_trade": row.emotion_at_trade,
        "proficiency_at_trade": int(row.proficiency_at_trade),
        "pnl_pct": float(row.pnl_pct) if row.pnl_pct is not None else None,
        "decision_details": details,
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }


@router.post("/{panda_id}/simulation/start")
async def start_simulation(
    panda_id: str,
    body: SimulationStartBody,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        panda = await _load_owned_panda(panda_id, user, db)
    except ApiError as exc:
        return JSONResponse(status_code=exc.status_code, content=error(exc.code.value, exc.message))

    strategy = await _active_strategy(panda.id, db)
    if strategy is None:
        return JSONResponse(
            status_code=400,
            content=error(ApiErrorCode.SIM_NO_STRATEGY.value, "Panda has no active strategy"),
        )

    running = await db.execute(
        select(Simulation).where(
            Simulation.panda_id == panda.id,
            Simulation.status == "running",
        )
    )
    if running.scalar_one_or_none() is not None:
        return JSONResponse(
            status_code=409,
            content=error(ApiErrorCode.SIM_ALREADY_RUNNING.value, "Simulation already running"),
        )

    pools = [p for p in body.subscribed_pools if p in MVP_POOLS]
    if not pools:
        pools = normalize_subscribed_pools(panda.subscribed_pools)
    panda.subscribed_pools = pools

    try:
        speed = _normalize_speed(body.speed)
    except ApiError as exc:
        return JSONResponse(status_code=exc.status_code, content=error(exc.code.value, exc.message))

    sim_id = str(uuid.uuid4())
    sim = Simulation(
        id=sim_id,
        panda_id=panda.id,
        strategy_id=strategy.id,
        status="running",
        speed=speed,
        initial_capital=Decimal(str(body.initial_capital)),
        data_source=body.data_source,
    )
    db.add(sim)
    panda.is_trading = True
    await db.commit()

    try:
        await actor_manager.start(
            panda.id,
            sim_id,
            speed,
            subscribed_pools=pools,
            initial_capital=float(body.initial_capital),
        )
    except RuntimeError as exc:
        sim.status = "stopped"
        panda.is_trading = False
        await db.commit()
        return JSONResponse(status_code=503, content=error("SERVICE_UNAVAILABLE", str(exc)))

    return JSONResponse(
        content=success(
            {
                "simulation_id": sim_id,
                "panda_id": panda.id,
                "status": "running",
                "speed": speed,
                "subscribed_pools": pools,
                "data_source": body.data_source,
            }
        )
    )


@router.post("/{panda_id}/simulation/stop")
async def stop_simulation(
    panda_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        panda = await _load_owned_panda(panda_id, user, db)
    except ApiError as exc:
        return JSONResponse(status_code=exc.status_code, content=error(exc.code.value, exc.message))

    result = await db.execute(
        select(Simulation)
        .where(Simulation.panda_id == panda.id, Simulation.status == "running")
        .order_by(Simulation.started_at.desc())
        .limit(1)
    )
    sim = result.scalar_one_or_none()

    await actor_manager.stop(panda.id)
    if sim is not None:
        sim.status = "stopped"
    panda.is_trading = False
    await db.commit()

    return JSONResponse(
        content=success(
            {
                "panda_id": panda.id,
                "simulation_id": sim.id if sim else None,
                "status": "stopped",
            }
        )
    )


@router.get("/{panda_id}/simulation/status")
async def simulation_status(
    panda_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        panda = await _load_owned_panda(panda_id, user, db)
    except ApiError as exc:
        return JSONResponse(status_code=exc.status_code, content=error(exc.code.value, exc.message))

    result = await db.execute(
        select(Simulation)
        .where(Simulation.panda_id == panda.id, Simulation.status == "running")
        .order_by(Simulation.started_at.desc())
        .limit(1)
    )
    sim = result.scalar_one_or_none()
    actor_state = await actor_manager.get_state(panda.id)
    initial_capital = float(sim.initial_capital) if sim else 10_000.0

    payload: dict = {
        "simulation_id": sim.id if sim else None,
        "status": sim.status if sim else "idle",
        "speed": sim.speed if sim else None,
        "is_trading": bool(panda.is_trading),
        "actor_active": actor_state is not None,
        "initial_capital": initial_capital,
    }
    if actor_state:
        payload["equity"] = actor_state.get("equity", initial_capital)
        payload["trade_count"] = actor_state.get("trade_count", 0)
        payload["positions"] = actor_state.get("positions", {})
        payload["emotion"] = actor_state.get("emotion")
    elif sim:
        payload["equity"] = (
            float(sim.final_equity) if sim.final_equity is not None else initial_capital
        )
        payload["trade_count"] = int(sim.total_trades or 0)

    return JSONResponse(content=success(payload))


@router.get("/{panda_id}/trades")
async def list_trades(
    panda_id: str,
    limit: int = Query(50, ge=1, le=200),
    simulation_id: str | None = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        await _load_owned_panda(panda_id, user, db)
    except ApiError as exc:
        return JSONResponse(status_code=exc.status_code, content=error(exc.code.value, exc.message))

    stmt = select(Trade).where(Trade.panda_id == panda_id)
    if simulation_id:
        stmt = stmt.where(Trade.simulation_id == simulation_id)
    stmt = stmt.order_by(Trade.created_at.desc()).limit(limit)
    result = await db.execute(stmt)
    rows = result.scalars().all()
    return JSONResponse(content=success([_trade_dict(r) for r in rows]))
