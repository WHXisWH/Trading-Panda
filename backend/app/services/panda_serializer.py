"""Serialize Panda ORM rows to api-spec §3.2 wire shapes."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Panda, Strategy
from app.services.panda_stats import growth_stage_from_experience, trade_stats_for_panda
from app.services.pool_catalog import max_pools_for_focus, normalize_subscribed_pools
from app.services.talent_meta import talent_payload


def _iso(dt: datetime | None) -> str:
    if dt is None:
        return datetime.now(timezone.utc).isoformat()
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc).isoformat()
    return dt.isoformat()


def _personality(panda: Panda) -> dict[str, int]:
    return {
        "boldness": int(panda.boldness),
        "patience": int(panda.patience),
        "intuition": int(panda.intuition),
        "focus": int(panda.focus),
        "contrarian": int(panda.contrarian),
    }


def _talent_full(panda: Panda) -> dict[str, str | int]:
    return talent_payload(int(panda.talent))


def _talent_list_item(panda: Panda) -> dict[str, str | int]:
    t = talent_payload(int(panda.talent))
    return {"id": t["id"], "name": t["name"]}


async def panda_detail_dict(
    panda: Panda,
    db: AsyncSession,
    *,
    strategy: Strategy | None = None,
    name: str | None = None,
) -> dict:
    total_trades, win_rate = await trade_stats_for_panda(panda.id, db)
    current_strategy = None
    if strategy is not None:
        current_strategy = {
            "philosophy": strategy.philosophy,
            "proficiency": int(strategy.proficiency),
        }

    raw_pools = getattr(panda, "subscribed_pools", None)
    subscribed = normalize_subscribed_pools(raw_pools)
    return {
        "id": panda.id,
        "sui_object_id": panda.sui_object_id,
        "owner_id": panda.owner_id,
        "name": name,
        "subscribed_pools": subscribed,
        "primary_pool": subscribed[0],
        "max_pools": max_pools_for_focus(int(panda.focus)),
        "personality": _personality(panda),
        "talent": _talent_full(panda),
        "experience_level": int(panda.experience_level),
        "growth_stage": growth_stage_from_experience(int(panda.experience_level)),
        "emotion_state": panda.emotion_state,
        "emotion_stability": int(panda.emotion_stability),
        "is_trading": bool(panda.is_trading),
        "current_strategy": current_strategy,
        "active_strategy_id": strategy.id if strategy is not None else None,
        "total_trades": total_trades,
        "win_rate": win_rate,
        "walrus_sync_status": panda.walrus_sync_status,
        "generation": int(panda.generation),
        "created_at": _iso(panda.created_at),
        "updated_at": _iso(panda.updated_at),
    }


async def panda_list_item_dict(panda: Panda, db: AsyncSession) -> dict:
    total_trades, win_rate = await trade_stats_for_panda(panda.id, db)
    return {
        "id": panda.id,
        "sui_object_id": panda.sui_object_id,
        "name": None,
        "personality": _personality(panda),
        "talent": _talent_list_item(panda),
        "experience_level": int(panda.experience_level),
        "growth_stage": growth_stage_from_experience(int(panda.experience_level)),
        "emotion_state": panda.emotion_state,
        "is_trading": bool(panda.is_trading),
        "total_trades": total_trades,
        "win_rate": win_rate,
        "created_at": _iso(panda.created_at),
    }
