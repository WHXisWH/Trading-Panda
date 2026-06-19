"""Strategy parsing — natural language → 4-layer JSON."""
import hashlib
import json

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from app.db.database import get_db
from app.db.models import Panda, User
from app.api.deps import get_current_user
from app.integrations.deepseek import parse_strategy_text
from app.schemas.common import success

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
    db=Depends(get_db),
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
    return success(
        {
            "panda_id": panda.id,
            "parsed_json": parsed,
            "strategy_hash": strategy_hash,
            "philosophy": parsed.get("philosophy", "trend_following"),
            "llm_reasoning": "Parsed draft only; save happens through /api/panda/:id/strategy",
        }
    )
