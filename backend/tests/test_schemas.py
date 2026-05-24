"""Schema contract tests — Sprint 0.1."""

import pytest
from pydantic import ValidationError

from app.engine.rule_engine import rule_is_compilable, validate_signal_rules
from app.schemas.errors import ApiError, ApiErrorCode, HTTP_STATUS_BY_CODE
from app.schemas.strategy import ParsedStrategyLayers, StrategyFeedRequest


def _sample_parsed() -> dict:
    return {
        "philosophy": "trend_following",
        "position_sizing": {"type": "fixed", "value": 0.1},
        "signal_rules": [
            {"indicator": "RSI", "condition": "< 30", "threshold": 30, "action": "BUY"},
            {"indicator": "RSI", "condition": "> 70", "threshold": 70, "action": "SELL"},
        ],
        "risk_management": {
            "stop_loss_pct": 0.05,
            "take_profit_pct": 0.15,
            "max_drawdown_pct": 0.20,
        },
    }


def test_parsed_strategy_layers_valid():
    layers = ParsedStrategyLayers.model_validate(_sample_parsed())
    assert layers.compiled_rule_count() == 2


def test_strategy_feed_request_parsed_only():
    req = StrategyFeedRequest(parsed=ParsedStrategyLayers.model_validate(_sample_parsed()))
    assert req.resolved_parse_with_llm() is False


def test_strategy_feed_request_raw_text_only():
    req = StrategyFeedRequest(raw_text="buy when rsi below 30")
    assert req.resolved_parse_with_llm() is True


def test_strategy_feed_request_requires_body():
    with pytest.raises(ValidationError):
        StrategyFeedRequest()


def test_validate_for_feed_rejects_short_text():
    req = StrategyFeedRequest(raw_text="short")
    with pytest.raises(ApiError) as exc:
        req.validate_for_feed()
    assert exc.value.code == ApiErrorCode.STRATEGY_TEXT_TOO_SHORT


def test_validate_for_feed_rejects_invalid_rules():
    parsed = ParsedStrategyLayers.model_validate(
        {
            **_sample_parsed(),
            "signal_rules": [
                {"indicator": "RSI", "condition": "< 30", "threshold": 30, "action": "BUY"},
                {"indicator": "MACD", "condition": "unknown_pattern", "action": "BUY"},
            ],
        }
    )
    req = StrategyFeedRequest(parsed=parsed)
    with pytest.raises(ApiError) as exc:
        req.validate_for_feed()
    assert exc.value.code == ApiErrorCode.STRATEGY_RULE_INVALID
    assert exc.value.invalid_rules is not None
    assert exc.value.invalid_rules[0]["index"] == 1


def test_rule_is_compilable():
    ok, reason = rule_is_compilable(
        {"indicator": "RSI", "condition": "<30", "action": "BUY"}
    )
    assert ok is True
    assert reason is None

    bad, reason = rule_is_compilable(
        {"indicator": "UNKNOWN", "condition": "x", "action": "BUY"}
    )
    assert bad is False
    assert reason is not None


def test_validate_signal_rules_partial_invalid():
    count, invalid = validate_signal_rules(
        [
            {"indicator": "RSI", "condition": "<30", "action": "BUY"},
            {"indicator": "BAD", "condition": "x", "action": "SELL"},
        ]
    )
    assert count == 1
    assert len(invalid) == 1


def test_error_codes_have_http_status():
    for code in (
        ApiErrorCode.PANDA_NOT_FOUND,
        ApiErrorCode.STRATEGY_RULE_INVALID,
        ApiErrorCode.STRATEGY_BODY_EMPTY,
    ):
        assert code in HTTP_STATUS_BY_CODE
