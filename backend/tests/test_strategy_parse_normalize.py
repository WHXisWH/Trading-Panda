"""Tests for LLM strategy parse normalization."""

from __future__ import annotations

import pytest

from app.schemas.strategy import ParsedStrategyLayers
from app.services.strategy_feed import parse_strategy_only
from app.services.strategy_parse_normalize import (
    _filter_garbage_rules,
    _infer_risk_management,
    build_heuristic_draft,
    normalize_llm_parsed,
)


USER_PROMPT = (
    "Use very small size on SUI/USDC while learning. "
    "Buy only on clear signals, sell quickly on small wins, "
    "and stop out fast if the setup fail."
)

MOMENTUM_PROMPT = (
    "Only buy SUI/USDC when momentum is clearly up across several candles. "
    "Exit if the trend breaks. Use small size while I am still learning."
)


def test_filter_removes_price_tautology():
    rules = [
        {"indicator": "PRICE", "condition": "> 0", "threshold": 0, "action": "BUY"},
        {"indicator": "MA20", "condition": "cross_above", "action": "BUY"},
    ]
    kept, warnings = _filter_garbage_rules(rules)
    assert len(kept) == 1
    assert kept[0]["indicator"] == "MA20"
    assert warnings


def test_normalize_maps_volume_and_vague_conditions():
    raw = {
        "philosophy": "learning",
        "position_sizing": {"type": "fixed", "value": 0.02},
        "signal_rules": [
            {"indicator": "VOLUME", "condition": "spike", "action": "BUY"},
            {"indicator": "PRICE", "condition": "> 0", "threshold": 0, "action": "SELL"},
        ],
        "risk_management": {"stop_loss_pct": 0.02, "max_drawdown_pct": 0.1},
    }
    normalized, warnings = normalize_llm_parsed(raw, USER_PROMPT)
    layers = ParsedStrategyLayers.model_validate(normalized)
    compiled, invalid = layers.validate_compilable_rules()
    assert compiled >= 1
    assert layers.position_sizing.value == 0.02
    assert any("Removed unusable rule" in w for w in warnings)
    assert "SUI/USDC" in layers.target_pairs


def test_learning_caps_loose_llm_risk():
    risk = _infer_risk_management(
        MOMENTUM_PROMPT,
        {"stop_loss_pct": 0.25, "take_profit_pct": 0.1, "max_drawdown_pct": 0.5},
    )
    assert risk["stop_loss_pct"] <= 0.05
    assert risk["max_drawdown_pct"] <= 0.15


def test_heuristic_draft_from_momentum_prompt():
    draft = build_heuristic_draft(MOMENTUM_PROMPT)
    layers = ParsedStrategyLayers.model_validate(draft)
    compiled, invalid = layers.validate_compilable_rules()
    assert compiled == 2
    assert invalid == []
    assert layers.signal_rules[0].indicator == "MA20"
    assert layers.position_sizing.value == 0.05


@pytest.mark.asyncio
async def test_parse_strategy_only_accepts_vague_llm_output(monkeypatch):
    from app.services import strategy_feed as feed_mod

    async def fake_parse_strategy_text(raw_text: str):
        return {
            "philosophy": "learning",
            "position_sizing": {"type": "fixed", "value": 0.02},
            "signal_rules": [
                {"indicator": "VOLUME", "condition": "clear signals", "action": "BUY"},
                {"indicator": "MACD", "condition": "weak setup", "action": "SELL"},
            ],
            "risk_management": {"stop_loss_pct": 0.02, "max_drawdown_pct": 0.1},
        }

    monkeypatch.setattr(feed_mod, "parse_strategy_text", fake_parse_strategy_text)
    monkeypatch.setattr(feed_mod.settings, "deepseek_api_key", "key")

    body = __import__(
        "app.schemas.strategy", fromlist=["StrategyFeedRequest"]
    ).StrategyFeedRequest(raw_text=USER_PROMPT)
    data = await feed_mod.parse_strategy_only(body, "user-1")
    assert data["parsed"]["philosophy"] == "custom"
    assert data["draft_valid"] is True
    assert "title" in data
    assert "human_summary" in data


@pytest.mark.asyncio
async def test_parse_strategy_only_strips_price_garbage(monkeypatch):
    from app.services import strategy_feed as feed_mod

    async def fake_parse_strategy_text(raw_text: str):
        return {
            "philosophy": "trend_following",
            "position_sizing": {"type": "fixed", "value": 0.05},
            "signal_rules": [
                {"indicator": "PRICE", "condition": "> 0", "threshold": 0, "action": "BUY"},
                {"indicator": "MA20", "condition": "cross_below", "action": "SELL"},
            ],
            "risk_management": {
                "stop_loss_pct": 0.25,
                "take_profit_pct": 0.1,
                "max_drawdown_pct": 0.5,
            },
        }

    monkeypatch.setattr(feed_mod, "parse_strategy_text", fake_parse_strategy_text)
    monkeypatch.setattr(feed_mod.settings, "deepseek_api_key", "key")

    body = __import__(
        "app.schemas.strategy", fromlist=["StrategyFeedRequest"]
    ).StrategyFeedRequest(raw_text=MOMENTUM_PROMPT)
    data = await feed_mod.parse_strategy_only(body, "user-1")
    indicators = [r["indicator"] for r in data["parsed"]["signal_rules"]]
    assert "PRICE" not in indicators
    assert data["parsed"]["risk_management"]["stop_loss_pct"] <= 0.05
    assert data["parsed"]["risk_management"]["max_drawdown_pct"] <= 0.15
    assert any("Removed unusable rule" in w for w in data["warnings"])
