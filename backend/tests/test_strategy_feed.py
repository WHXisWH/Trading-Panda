"""Epic 2 — strategy feed & validate service tests."""

from __future__ import annotations

import pytest

from app.engine.rule_engine import RuleEngine
from app.schemas.errors import ApiError, ApiErrorCode
from app.schemas.strategy import ParsedStrategyLayers, StrategyFeedRequest
from app.services.strategy_feed import (
    build_human_summary,
    build_auto_title,
    build_preview_signal,
    strategy_hash_from_parsed,
    summarize_parsed,
    validate_strategy_body,
)
from tests.conftest import CRASH_MARKET
from tests.test_schemas import _sample_parsed


def _parsed_layers() -> ParsedStrategyLayers:
    return ParsedStrategyLayers.model_validate(_sample_parsed())


def test_strategy_hash_stable():
    layers = _parsed_layers()
    h1 = strategy_hash_from_parsed(layers)
    h2 = strategy_hash_from_parsed(layers)
    assert h1 == h2
    assert len(h1) == 64


def test_summarize_parsed_contains_rules():
    text = summarize_parsed(_parsed_layers())
    assert "RSI" in text
    assert "BUY" in text


def test_build_auto_title_and_human_summary():
    layers = _parsed_layers()
    title = build_auto_title(layers)
    summary = build_human_summary(layers)
    assert "RSI" in title
    assert "playbook" in summary
    assert "buy" in summary.lower()


def test_validate_valid_parsed():
    body = StrategyFeedRequest(parsed=_parsed_layers())
    result = validate_strategy_body(body, market_snapshot=CRASH_MARKET)
    assert result.valid is True
    assert result.compiled_count == 2
    assert result.preview_signal is not None
    assert result.preview_signal.total_rules == 2


def test_validate_invalid_indicator():
    parsed = ParsedStrategyLayers.model_validate(
        {
            **_sample_parsed(),
            "signal_rules": [
                {"indicator": "RSI", "condition": "< 30", "threshold": 30, "action": "BUY"},
                {"indicator": "MACD", "condition": "unknown_pattern", "action": "SELL"},
            ],
        }
    )
    body = StrategyFeedRequest(parsed=parsed)
    result = validate_strategy_body(body)
    assert result.valid is False
    assert result.invalid_rules[0].indicator == "MACD"


def test_feed_request_rejects_invalid_rules():
    parsed = ParsedStrategyLayers.model_validate(
        {
            **_sample_parsed(),
            "signal_rules": [
                {"indicator": "MACD", "condition": "unknown_pattern", "action": "BUY"},
            ],
        }
    )
    req = StrategyFeedRequest(parsed=parsed)
    with pytest.raises(ApiError) as exc:
        req.validate_for_feed()
    assert exc.value.code == ApiErrorCode.STRATEGY_RULE_INVALID


def test_rule_engine_match_signal_detail():
    rules = _sample_parsed()["signal_rules"]
    engine = RuleEngine(rules)
    signed, buy, sell, matched = engine.match_signal_detail(CRASH_MARKET)
    assert buy >= 1
    assert signed > 0
    assert len(matched) >= 1


def test_validate_warnings_only_buy():
    parsed = ParsedStrategyLayers.model_validate(
        {
            **_sample_parsed(),
            "signal_rules": [
                {"indicator": "RSI", "condition": "< 30", "threshold": 30, "action": "BUY"},
            ],
        }
    )
    result = validate_strategy_body(StrategyFeedRequest(parsed=parsed))
    assert result.valid is True
    assert any("BUY" in w for w in result.warnings)


def test_preview_signal_buy_sell_rules():
    preview = build_preview_signal(_parsed_layers(), CRASH_MARKET)
    assert preview.total_rules == 2


@pytest.mark.asyncio
async def test_parse_strategy_only_returns_draft_payload(monkeypatch):
    from app.services import strategy_feed as feed_mod

    async def fake_parse_strategy_text(raw_text: str):
        return {
            "philosophy": "trend_following",
            "position_sizing": {"type": "fixed", "value": 0.1, "scale_in": False},
            "signal_rules": [
                {"indicator": "RSI", "condition": "< 30", "threshold": 30, "action": "BUY"}
            ],
            "risk_management": {
                "stop_loss_pct": 0.05,
                "take_profit_pct": 0.15,
                "max_drawdown_pct": 0.2,
            },
        }

    monkeypatch.setattr(feed_mod, "parse_strategy_text", fake_parse_strategy_text)
    monkeypatch.setattr(feed_mod.settings, "deepseek_api_key", "key")

    body = StrategyFeedRequest(raw_text="Buy when RSI is oversold and stay cautious")
    data = await feed_mod.parse_strategy_only(body, "user-1")
    assert data["parsed"]["philosophy"] == "trend_following"
    assert "title" in data
    assert "human_summary" in data
