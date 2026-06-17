from typing import Any

from pydantic import BaseModel, Field


class CandlePayload(BaseModel):
    open: float
    high: float
    low: float
    close: float
    volume: float
    interval: str = "1m"


class PairMetaPayload(BaseModel):
    pool: str
    pair: str
    base_asset: str
    quote_asset: str
    pool_id: str | None = None
    stable_quote: bool = False
    launch_priority: int | None = None
    is_fallback: bool = False
    base_decimals: int | None = None
    quote_decimals: int | None = None
    min_tick_size: float | None = None


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
    source: str = "deepbook"
    reference_price: float | None = None
    spread_bps: float | None = None
    bid_depth: float | None = None
    ask_depth: float | None = None
    freshness_sec: float | None = None
    health: str = "fresh"
    pair_meta: PairMetaPayload | None = None

    def to_publish_dict(self) -> dict[str, Any]:
        return self.model_dump(exclude_none=True)


def pool_to_pair(pool: str) -> str:
    """SUI_USDC → SUI-USDC; DEEP/SUI stays DEEP/SUI."""
    return pool.replace("_", "-")


def pair_to_asset(pair: str) -> str:
    """SUI-USDC → SUI; DEEP/SUI → DEEP."""
    token = pair.split("-")[0].split("_")[0]
    if "/" in token:
        return token.split("/")[0]
    return token
