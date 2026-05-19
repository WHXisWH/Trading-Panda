from typing import Any

from pydantic import BaseModel, Field


class CandlePayload(BaseModel):
    open: float
    high: float
    low: float
    close: float
    volume: float
    interval: str = "1m"


class MarketEvent(BaseModel):
    asset: str
    pair: str
    timestamp: float
    price: float
    prev_price: float
    volume: float
    rsi: float
    ma20: float
    prev_ma20: float
    macd_signal: bool
    volatility: float
    trend_strength: float
    market_regime: str
    funding_rate: float = 0.0
    orderbook_imbalance: float = 0.0
    candle: CandlePayload | None = None
    stale: bool = False

    def to_publish_dict(self) -> dict[str, Any]:
        return self.model_dump(exclude_none=True)


def pool_to_pair(pool: str) -> str:
    """SUI_USDC → SUI-USDC"""
    return pool.replace("_", "-")


def pair_to_asset(pair: str) -> str:
    """SUI-USDC → SUI"""
    return pair.split("-")[0].split("_")[0]
