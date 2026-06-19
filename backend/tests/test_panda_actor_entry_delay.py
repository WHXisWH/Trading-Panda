"""PandaActor entry_delay — execute cached decision after waiting bars."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.engine.decision_pipeline import DecisionResult
from app.engine.market_event import MarketEvent
from app.engine.panda_actor import PandaActor


def _market_event() -> MarketEvent:
    return MarketEvent(
        asset="DEEP",
        pair="DEEP/SUI",
        timestamp=100.0,
        price=1.5,
        prev_price=1.4,
        volume=1000.0,
        rsi=28.0,
        ma20=1.45,
        prev_ma20=1.44,
        macd_signal=True,
        volatility=0.05,
        trend_strength=0.6,
        market_regime="bull",
    )


def _execute_result() -> DecisionResult:
    return DecisionResult(
        final_score=0.72,
        action="BUY",
        steps=[{"step": 1, "score": 0.7}],
        zone="EXECUTE",
        entry_delay=2,
        entry_threshold=0.65,
        signal_direction=1,
    )


@pytest.mark.asyncio
async def test_entry_delay_executes_cached_result_without_rerunning_pipeline():
    actor = PandaActor("panda-1", "sim-1", "normal", publisher=None, seed=1)
    actor._pipeline.run = MagicMock(return_value=_execute_result())  # type: ignore[method-assign]
    actor._apply_decision = AsyncMock()  # type: ignore[method-assign]

    event = _market_event()
    await actor._tick(event)
    assert actor._pending_delay is not None
    actor._pipeline.run.assert_called_once()

    await actor._tick(event)
    assert actor._pending_delay is not None
    actor._pipeline.run.assert_called_once()

    await actor._tick(event)
    actor._pipeline.run.assert_called_once()
    actor._apply_decision.assert_awaited_once()
    called_event, called_result = actor._apply_decision.await_args.args
    assert called_event is event
    assert called_result.zone == "EXECUTE"
    assert called_result.action == "BUY"
