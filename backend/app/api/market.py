"""Internal market tick injection — mirrors Redis market:tick:* for dev/tests."""
from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel

from app.engine.actor_manager import actor_manager
from app.engine.market_event import MarketEvent

router = APIRouter()


class MarketTickBody(BaseModel):
    asset: str = "BTC"
    pair: str = "BTC-USDC"
    timestamp: float = 0.0
    price: float = 50000.0
    prev_price: float = 49900.0
    volume: float = 1000.0
    rsi: float = 50.0
    ma20: float = 49800.0
    prev_ma20: float = 49700.0
    macd_signal: bool = False
    volatility: float = 0.05
    trend_strength: float = 0.5
    market_regime: str = "ranging"
    extra: dict[str, Any] = {}


@router.post("/market/tick")
async def push_market_tick(body: MarketTickBody):
    payload = body.model_dump(exclude={"extra"})
    payload.update(body.extra)
    event = MarketEvent.from_json(payload)
    await actor_manager.broadcast_market_tick(event)
    return {
        "status": "broadcast",
        "asset": event.asset,
        "active_actors": actor_manager.active_count,
    }
