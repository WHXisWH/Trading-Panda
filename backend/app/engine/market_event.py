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
    source: str = "deepbook"
    reference_price: float | None = None
    spread_bps: float | None = None
    bid_depth: float | None = None
    ask_depth: float | None = None
    freshness_sec: float | None = None
    health: str = "fresh"
    pair_meta: dict[str, Any] | None = None

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
            source=str(data.get("source", "deepbook")),
            reference_price=_optional_float(data.get("reference_price")),
            spread_bps=_optional_float(data.get("spread_bps")),
            bid_depth=_optional_float(data.get("bid_depth")),
            ask_depth=_optional_float(data.get("ask_depth")),
            freshness_sec=_optional_float(data.get("freshness_sec")),
            health=str(data.get("health", "fresh")),
            pair_meta=data.get("pair_meta"),
        )

    def is_tradeable(self) -> bool:
        """Conservative gate: stale or degraded market should not execute."""
        if self.stale:
            return False
        if self.health in {"stale", "source_down", "no_fills", "insufficient_candles"}:
            return False
        if self.freshness_sec is not None and self.freshness_sec > 120:
            return False
        return True

    def to_market_dict(self) -> dict[str, Any]:
        out: dict[str, Any] = {
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
            "source": self.source,
            "health": self.health,
        }
        if self.reference_price is not None:
            out["reference_price"] = self.reference_price
        if self.freshness_sec is not None:
            out["freshness_sec"] = self.freshness_sec
        return out


def _optional_float(value: Any) -> float | None:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None
