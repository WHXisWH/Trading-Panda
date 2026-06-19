"""Derive Step 7 social_signal from market-monitor tick fields."""

from __future__ import annotations

from app.engine.market_event import MarketEvent


def _clamp(value: float, low: float = -1.0, high: float = 1.0) -> float:
    return max(low, min(high, value))


def derive_social_signal(event: MarketEvent) -> float:
    """Map orderbook tilt + short-term price shock to [-1, 1] crowd pressure."""
    imbalance = _clamp(float(event.orderbook_imbalance))
    prev = max(float(event.prev_price), 1e-9)
    price_shock = _clamp((float(event.price) - prev) / prev * 10.0)
    # Positive shock = buying pressure; negative = panic sell.
    return _clamp(0.6 * imbalance + 0.4 * price_shock)
