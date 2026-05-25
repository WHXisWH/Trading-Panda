"""Strategy parsing — natural language → 4-layer JSON, stored in DB."""
import hashlib
import json

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from app.db.database import get_db
from app.db.models import Panda, Strategy, StrategyHistory, User
from app.api.deps import get_current_user
from app.integrations.deepseek import parse_strategy_text

router = APIRouter()

_MOCK_PARSED = {
    "philosophy": "trend_following",
    "position_sizing": {"type": "fixed", "value": 0.1},
    "signal_rules": [{"indicator": "RSI", "condition": "<30", "action": "BUY"}],
    "risk_management": {"stop_loss_pct": 5, "max_drawdown_pct": 15},
}


class ParseRequest(BaseModel):
    panda_id: str
    raw_text: str


@router.post("/parse")
async def parse_strategy(
    body: ParseRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Panda).where(Panda.id == body.panda_id, Panda.owner_id == user.id)
    )
    panda = result.scalar_one_or_none()
    if panda is None:
        raise HTTPException(404, "Panda not found")

    from app.config import settings
    if settings.deepseek_api_key:
        try:
            parsed = await parse_strategy_text(body.raw_text)
        except Exception:
            parsed = _MOCK_PARSED
    else:
        parsed = _MOCK_PARSED

    strategy_hash = hashlib.sha256(
        json.dumps(parsed, sort_keys=True).encode()
    ).hexdigest()

    old_result = await db.execute(
        select(Strategy).where(
            Strategy.panda_id == panda.id,
            Strategy.is_active == True,
        )
    )
    old_strategy = old_result.scalar_one_or_none()

    await db.execute(
        update(Strategy)
        .where(Strategy.panda_id == panda.id, Strategy.is_active == True)
        .values(is_active=False)
    )

    strategy = Strategy(
        panda_id=panda.id,
        raw_text=body.raw_text,
        parsed_json=parsed,
        strategy_hash=strategy_hash,
        philosophy=parsed.get("philosophy", "trend_following"),
        is_active=True,
    )
    db.add(strategy)
    await db.flush()

    if old_strategy is not None:
        ghost = StrategyHistory(
            panda_id=panda.id,
            strategy_hash=old_strategy.strategy_hash,
            proficiency_at_switch=int(old_strategy.proficiency),
        )
        db.add(ghost)
    await db.commit()
    await db.refresh(strategy)

    return {
        "strategy_id": strategy.id,
        "panda_id": panda.id,
        "parsed": parsed,
        "philosophy": strategy.philosophy,
        "hash": strategy_hash,
    }
