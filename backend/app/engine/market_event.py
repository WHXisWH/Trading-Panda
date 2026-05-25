"""Market tick event — aligned with market-monitor/broadcast/schemas.py."""
from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any


@dataclass(frozen=True)
class MarketEvent:
    asset: str
    pair: str
    timestamp: float
    price: float
    prev_price: float
    volume: float
    rsi: float
    ma20: float
    prev_ma20: float
    macd_signal: bool | str
    volatility: float
    trend_strength: float
    market_regime: str
    funding_rate: float = 0.0
    orderbook_imbalance: float = 0.0
    stale: bool = False

    @classmethod
    def from_json(cls, raw: str | bytes | dict[str, Any]) -> "MarketEvent":
        data = json.loads(raw) if isinstance(raw, (str, bytes)) else raw
        macd = data.get("macd_signal", False)
        return cls(
            asset=str(data.get("asset", "BTC")),
            pair=str(data.get("pair", data.get("asset", "BTC"))),
            timestamp=float(data.get("timestamp", 0)),
            price=float(data.get("price", 0)),
            prev_price=float(data.get("prev_price", data.get("price", 0))),
            volume=float(data.get("volume", 0)),
            rsi=float(data.get("rsi", 50)),
            ma20=float(data.get("ma20", 0)),
            prev_ma20=float(data.get("prev_ma20", data.get("ma20", 0))),
            macd_signal=macd,
            volatility=float(data.get("volatility", 0)),
            trend_strength=float(data.get("trend_strength", 0.5)),
            market_regime=str(data.get("market_regime", "unknown")),
            funding_rate=float(data.get("funding_rate", 0)),
            orderbook_imbalance=float(data.get("orderbook_imbalance", 0)),
            stale=bool(data.get("stale", False)),
        )

    def to_market_dict(self) -> dict[str, Any]:
        return {
            "asset": self.asset,
            "pair": self.pair,
            "timestamp": self.timestamp,
            "price": self.price,
            "prev_price": self.prev_price,
            "volume": self.volume,
            "rsi": self.rsi,
            "ma20": self.ma20,
            "prev_ma20": self.prev_ma20,
            "macd_signal": self.macd_signal,
            "volatility": self.volatility,
            "trend_strength": self.trend_strength,
            "market_regime": self.market_regime,
            "funding_rate": self.funding_rate,
            "orderbook_imbalance": self.orderbook_imbalance,
            "stale": self.stale,
        }
