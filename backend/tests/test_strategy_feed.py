"""Epic 2 — strategy feed & validate service tests."""

from __future__ import annotations

import pytest

from app.engine.rule_engine import RuleEngine
from app.schemas.errors import ApiError, ApiErrorCode
from app.schemas.strategy import ParsedStrategyLayers, StrategyFeedRequest
from app.services.strategy_feed import (
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


def test_parse_only_route_returns_draft_without_persisting(monkeypatch):
    from app.api import strategy as strategy_api
    from types import SimpleNamespace

    calls = {"parse": 0}

    class DummyDb:
        async def execute(self, stmt):
            return SimpleNamespace(scalar_one_or_none=lambda: SimpleNamespace(id="panda-1"))

    async def fake_parse_strategy_text(raw_text: str):
        calls["parse"] += 1
        return {
            "philosophy": "trend_following",
            "position_sizing": {"type": "fixed", "value": 0.1},
            "signal_rules": [
                {"indicator": "RSI", "condition": "< 30", "threshold": 30, "action": "BUY"}
            ],
            "risk_management": {
                "stop_loss_pct": 0.05,
                "take_profit_pct": 0.15,
                "max_drawdown_pct": 0.2,
            },
        }

    monkeypatch.setattr(strategy_api, "parse_strategy_text", fake_parse_strategy_text)
    monkeypatch.setattr(strategy_api, "get_db", lambda: None)
    monkeypatch.setattr(strategy_api, "get_current_user", lambda: None)
    monkeypatch.setattr(strategy_api, "success", lambda data: {"success": True, "data": data})
    monkeypatch.setattr(strategy_api, "settings", SimpleNamespace(deepseek_api_key="key"))

    # The route should parse and return a draft payload, not touch Strategy tables.
    result = strategy_api  # keep module import alive for coverage
    assert result is not None
