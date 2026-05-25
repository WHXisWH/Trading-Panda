"""Shared fixtures for Decision Engine tests."""
from __future__ import annotations

import random

import pytest

from app.engine.decision_pipeline import DecisionPipeline


@pytest.fixture
def pipeline() -> DecisionPipeline:
    return DecisionPipeline(rng=random.Random(42))


@pytest.fixture
def deterministic_pipeline() -> DecisionPipeline:
    return DecisionPipeline(rng=random.Random(0))


def make_pipeline(seed: int = 42) -> DecisionPipeline:
    return DecisionPipeline(rng=random.Random(seed))


def make_personality(
    boldness: int = 50,
    patience: int = 50,
    intuition: int = 50,
    focus: int = 50,
    contrarian: int = 50,
    experience_level: int = 30,
    emotion_stability: int = 50,
    talent: int = 0,
) -> dict:
    return {
        "panda_id": "test-panda",
        "boldness": boldness,
        "patience": patience,
        "intuition": intuition,
        "focus": focus,
        "contrarian": contrarian,
        "experience_level": experience_level,
        "emotion_stability": emotion_stability,
        "talent": talent,
    }


RSI_BUY_STRATEGY = {
    "philosophy": "balanced",
    "proficiency": 50,
    "signal_rules": [{"indicator": "RSI", "condition": "<30", "action": "BUY"}],
}

TREND_STRATEGY = {
    "philosophy": "trend_following",
    "proficiency": 50,
    "signal_rules": [{"indicator": "RSI", "condition": "<30", "action": "BUY"}],
}

GRID_STRATEGY = {
    "philosophy": "grid",
    "proficiency": 50,
    "signal_rules": [{"indicator": "RSI", "condition": "<30", "action": "BUY"}],
}

MACD_SELL_STRATEGY = {
    "philosophy": "balanced",
    "proficiency": 80,
    "signal_rules": [{"indicator": "MACD", "condition": "death_cross", "action": "SELL"}],
}

CRASH_MARKET = {
    "asset": "BTC",
    "rsi": 23,
    "price": 58800,
    "prev_price": 62000,
    "ma20": 60000,
    "prev_ma20": 60500,
    "market_regime": "bear",
    "trend_strength": 0.8,
    "volatility": 0.12,
    "macd_signal": "death_cross",
}

RANGING_MARKET = {
    "asset": "BTC",
    "rsi": 50,
    "price": 60000,
    "prev_price": 59900,
    "ma20": 59800,
    "prev_ma20": 59700,
    "market_regime": "ranging",
    "trend_strength": 0.2,
    "volatility": 0.05,
    "macd_signal": False,
}
