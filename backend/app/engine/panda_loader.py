"""Load panda + strategy + experience from PostgreSQL for PandaActor."""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Panda, Strategy
from app.engine.experience_engine import ExperienceEngine


async def load_actor_context(session: AsyncSession, panda_id: str) -> dict | None:
    result = await session.execute(select(Panda).where(Panda.id == panda_id))
    panda = result.scalar_one_or_none()
    if panda is None:
        return None

    strat_result = await session.execute(
        select(Strategy)
        .where(Strategy.panda_id == panda_id, Strategy.is_active == True)
        .order_by(Strategy.created_at.desc())
        .limit(1)
    )
    strategy_row = strat_result.scalar_one_or_none()
    parsed = strategy_row.parsed_json if strategy_row else {}
    exp_engine = ExperienceEngine(panda_id)
    experience = await exp_engine.load(session)

    personality = {
        "panda_id": panda_id,
        "boldness": int(panda.boldness),
        "patience": int(panda.patience),
        "intuition": int(panda.intuition),
        "focus": int(panda.focus),
        "contrarian": int(panda.contrarian),
        "experience_level": int(panda.experience_level),
        "emotion_stability": int(panda.emotion_stability or panda.patience),
        "talent": int(panda.talent),
    }

    strategy = {
        "philosophy": strategy_row.philosophy if strategy_row else "balanced",
        "proficiency": int(strategy_row.proficiency) if strategy_row else 0,
        "signal_rules": parsed.get("signal_rules", []),
        "position_sizing": parsed.get("position_sizing", {"value": 0.05}),
        "risk_management": parsed.get("risk_management", {"stop_loss_pct": 0.08}),
        "parsed_json": parsed,
        "strategy_id": strategy_row.id if strategy_row else None,
    }

    max_assets = 1 + personality["focus"] // 25

    return {
        "personality": personality,
        "strategy": strategy,
        "experience": experience,
        "emotion": panda.emotion_state or "focused",
        "max_assets": max_assets,
        "strategy_id": strategy_row.id if strategy_row else None,
    }
