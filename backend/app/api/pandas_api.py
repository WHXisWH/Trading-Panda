"""Panda CRUD endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional

from app.db.database import get_db
from app.db.models import Panda, User, Strategy
from app.api.deps import get_current_user

router = APIRouter()


class CreatePandaRequest(BaseModel):
    sui_object_id: str
    boldness: int
    patience: int
    intuition: int
    focus: int
    contrarian: int
    talent: int
    generation: int = 1


class PandaResponse(BaseModel):
    id: str
    sui_object_id: str
    boldness: int
    patience: int
    intuition: int
    focus: int
    contrarian: int
    talent: int
    generation: int
    experience_level: int
    is_trading: bool
    emotion_state: str
    emotion_stability: int
    active_strategy_id: Optional[str] = None

    model_config = {"from_attributes": True}


async def _get_active_strategy_id(panda_id: str, db: AsyncSession) -> Optional[str]:
    result = await db.execute(
        select(Strategy.id).where(Strategy.panda_id == panda_id, Strategy.is_active == True)
    )
    row = result.first()
    return str(row[0]) if row else None


def _panda_to_response(panda: Panda, active_strategy_id: Optional[str] = None) -> dict:
    return {
        "id": panda.id,
        "sui_object_id": panda.sui_object_id,
        "boldness": panda.boldness,
        "patience": panda.patience,
        "intuition": panda.intuition,
        "focus": panda.focus,
        "contrarian": panda.contrarian,
        "talent": panda.talent,
        "generation": panda.generation,
        "experience_level": panda.experience_level,
        "is_trading": panda.is_trading,
        "emotion_state": panda.emotion_state,
        "emotion_stability": panda.emotion_stability,
        "active_strategy_id": active_strategy_id,
    }


@router.get("")
async def list_pandas(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(select(Panda).where(Panda.owner_id == user.id))
    pandas = result.scalars().all()
    out = []
    for p in pandas:
        sid = await _get_active_strategy_id(p.id, db)
        out.append(_panda_to_response(p, sid))
    return out


@router.post("", status_code=201)
async def create_panda(
    body: CreatePandaRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    existing = await db.execute(select(Panda).where(Panda.sui_object_id == body.sui_object_id))
    if existing.scalar_one_or_none():
        raise HTTPException(409, "Panda already registered")

    panda = Panda(
        owner_id=user.id,
        sui_object_id=body.sui_object_id,
        boldness=body.boldness,
        patience=body.patience,
        intuition=body.intuition,
        focus=body.focus,
        contrarian=body.contrarian,
        talent=body.talent,
        generation=body.generation,
    )
    db.add(panda)
    await db.commit()
    await db.refresh(panda)
    return _panda_to_response(panda)


@router.get("/{panda_id}")
async def get_panda(
    panda_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(select(Panda).where(Panda.id == panda_id, Panda.owner_id == user.id))
    panda = result.scalar_one_or_none()
    if panda is None:
        raise HTTPException(404, "Panda not found")
    sid = await _get_active_strategy_id(panda.id, db)
    return _panda_to_response(panda, sid)


@router.get("/{panda_id}/strategy")
async def get_panda_strategy(
    panda_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(select(Panda).where(Panda.id == panda_id, Panda.owner_id == user.id))
    if result.scalar_one_or_none() is None:
        raise HTTPException(404, "Panda not found")
    s_result = await db.execute(
        select(Strategy).where(Strategy.panda_id == panda_id, Strategy.is_active == True)
    )
    strategy = s_result.scalar_one_or_none()
    if strategy is None:
        return None
    return {
        "id": strategy.id,
        "raw_text": strategy.raw_text,
        "parsed_json": strategy.parsed_json,
        "philosophy": strategy.philosophy,
        "proficiency": strategy.proficiency,
        "created_at": strategy.created_at,
    }
