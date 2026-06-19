"""Epic 4 — strategy policy compatibility tests."""

from __future__ import annotations

import pytest

from app.schemas.errors import ApiError, ApiErrorCode
from app.schemas.strategy import ParsedStrategyLayers, StrategyFeedRequest
from app.services.policy_compatibility import (
    PolicyMirror,
    check_policy_compatibility,
    resolve_target_pairs,
)
from app.services.strategy_feed import (
    next_strategy_version,
    validate_strategy_body,
)
from tests.test_schemas import _sample_parsed


def _parsed(**overrides) -> ParsedStrategyLayers:
    data = {**_sample_parsed(), **overrides}
    return ParsedStrategyLayers.model_validate(data)


def _policy(**overrides) -> PolicyMirror:
    base = {
        "version": 1,
        "allowed_pairs": ["DEEP/SUI", "SUI/USDC"],
        "max_notional_per_trade": 500.0,
        "max_daily_loss": 800.0,
        "paused": False,
    }
    base.update(overrides)
    return PolicyMirror(**base)


def test_unauthorized_pair_blocked():
    parsed = _parsed(target_pairs=["WAL/USDC"])
    result = check_policy_compatibility(
        parsed,
        _policy(),
        target_pairs=["WAL/USDC"],
    )
    assert result.compatible is False
    assert result.blocked_pairs == ["WAL/USDC"]
    assert result.conflicts[0].field == "target_pairs"
    assert result.conflicts[0].code == "POLICY_PAIR_NOT_ALLOWED"


def test_notional_conflict_returns_field_error():
    parsed = _parsed(
        position_sizing={"type": "fixed", "value": 0.2},
    )
    result = check_policy_compatibility(
        parsed,
        _policy(max_notional_per_trade=100.0),
        target_pairs=["DEEP/SUI"],
        initial_capital=10_000.0,
    )
    assert result.compatible is False
    assert any(c.field == "position_sizing.value" for c in result.conflicts)
    assert any(c.code == "POLICY_NOTIONAL_EXCEEDED" for c in result.conflicts)


def test_drawdown_does_not_block_against_daily_loss_cap():
    parsed = _parsed(
        target_pairs=["DEEP/SUI"],
        position_sizing={"type": "fixed", "value": 0.04},
        risk_management={
            "stop_loss_pct": 0.05,
            "take_profit_pct": 0.15,
            "max_drawdown_pct": 0.50,
        },
    )
    result = check_policy_compatibility(
        parsed,
        _policy(max_daily_loss=8.0, max_notional_per_trade=500.0),
        target_pairs=["DEEP/SUI"],
        initial_capital=10_000.0,
    )
    assert result.compatible is True
    assert not any(c.code == "POLICY_DAILY_LOSS_EXCEEDED" for c in result.conflicts)


def test_validate_body_marks_invalid_when_policy_conflicts():
    body = StrategyFeedRequest(parsed=_parsed(target_pairs=["WAL/USDC"]))
    data = validate_strategy_body(
        body,
        policy_mirror=_policy(),
        fallback_pairs=["DEEP/SUI"],
    )
    assert data.valid is False
    assert data.policy_compatible is False
    assert data.blocked_pairs == ["WAL/USDC"]


def test_validate_body_compatible_with_policy():
    parsed = _parsed(
        target_pairs=["DEEP/SUI"],
        position_sizing={"type": "fixed", "value": 0.04},
        risk_management={
            "stop_loss_pct": 0.05,
            "take_profit_pct": 0.15,
            "max_drawdown_pct": 0.05,
        },
    )
    body = StrategyFeedRequest(parsed=parsed)
    data = validate_strategy_body(
        body,
        policy_mirror=_policy(max_daily_loss=2500.0, max_notional_per_trade=500.0),
        fallback_pairs=["DEEP/SUI"],
    )
    assert data.valid is True
    assert data.policy_compatible is True
    assert data.policy_conflicts == []


def test_resolve_target_pairs_prefers_explicit():
    parsed = _parsed(target_pairs=["SUI/USDC"])
    pairs = resolve_target_pairs(parsed, fallback_pairs=["DEEP/SUI"])
    assert pairs == ["SUI/USDC"]


def test_resolve_target_pairs_normalizes_deepbook_pool_name():
    parsed = _parsed(target_pairs=["SUI_USDC"])
    pairs = resolve_target_pairs(parsed, fallback_pairs=["DEEP/SUI"])
    assert pairs == ["SUI-USDC"]


def test_raise_policy_conflicts_on_feed_validation():
    from app.services.strategy_feed import _raise_policy_conflicts
    from app.schemas.strategy import PolicyConflictDetail

    with pytest.raises(ApiError) as exc:
        _raise_policy_conflicts(
            [
                PolicyConflictDetail(
                    field="target_pairs",
                    code="POLICY_PAIR_NOT_ALLOWED",
                    message="Pair WAL/USDC is not allowed",
                    value="WAL/USDC",
                )
            ]
        )
    assert exc.value.code == ApiErrorCode.STRATEGY_POLICY_CONFLICT
    assert exc.value.policy_conflicts is not None


def test_decision_pipeline_reads_skill_memory():
    from app.engine.decision_pipeline import DecisionPipeline

    pipeline = DecisionPipeline()
    base = pipeline._skill_memory_correction([], "DEEP/SUI", "bear")
    boosted = pipeline._skill_memory_correction(
        [
            {
                "pair": "DEEP/SUI",
                "market_regime": "bear",
                "confidence": 0.8,
                "rule_text": "buy dips",
            }
        ],
        "DEEP/SUI",
        "bear",
    )
    assert boosted > base


@pytest.mark.asyncio
async def test_next_strategy_version_increments():
    class _Scalar:
        def __init__(self, value):
            self.value = value

        def scalar(self):
            return self.value

    class _FakeDb:
        def __init__(self, count: int):
            self.count = count

        async def execute(self, _query):
            return _Scalar(self.count)

    assert await next_strategy_version("panda-1", _FakeDb(0)) == 1
    assert await next_strategy_version("panda-1", _FakeDb(2)) == 3
