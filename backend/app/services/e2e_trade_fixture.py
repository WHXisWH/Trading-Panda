"""Dev/test fixture for making one Training Ledger paper trade deterministic."""
from __future__ import annotations

import hashlib
import json
from typing import Any

E2E_POSITION_PCT = 0.004
E2E_PERSONALITY: dict[str, int] = {
    "boldness": 100,
    "patience": 0,
    "intuition": 0,
    "focus": 100,
    "contrarian": 0,
    "experience_level": 0,
    "emotion_stability": 100,
}


def build_e2e_buy_strategy(pair: str) -> dict[str, Any]:
    return {
        "philosophy": "trend_following",
        "target_pairs": [pair],
        "position_sizing": {
            "type": "fixed",
            "value": E2E_POSITION_PCT,
            "scale_in": False,
        },
        "signal_rules": [
            {
                "indicator": "RSI",
                "condition": "< 30",
                "threshold": 30.0,
                "action": "BUY",
            }
        ],
        "risk_management": {
            "stop_loss_pct": 0.03,
            "take_profit_pct": 0.06,
            "max_drawdown_pct": 0.15,
        },
    }


def e2e_strategy_hash(parsed: dict[str, Any]) -> str:
    payload = json.dumps(parsed, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(payload.encode()).hexdigest()


def build_e2e_tick(pair: str = "DEEP-SUI") -> dict[str, Any]:
    asset = pair.split("-", 1)[0].split("/", 1)[0]
    return {
        "asset": asset,
        "pair": pair,
        "timestamp": 0.0,
        "price": 0.02329,
        "prev_price": 0.02325,
        "volume": 210000.0,
        "rsi": 24.0,
        "ma20": 0.02324,
        "prev_ma20": 0.02322,
        "macd_signal": True,
        "volatility": 0.025,
        "trend_strength": 0.9,
        "market_regime": "bull",
        "funding_rate": 0.0,
        "orderbook_imbalance": 0.15,
        "stale": False,
        "source": "manual_e2e_trade_fixture",
        "reference_price": 0.02329,
        "spread_bps": 4.3,
        "bid_depth": 100000.0,
        "ask_depth": 100000.0,
        "freshness_sec": 1.0,
        "health": "fresh",
    }
