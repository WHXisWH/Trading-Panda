"""Step 6 — perception levels, market match, correlation."""
import random

import pytest

from app.engine.decision_pipeline import STRATEGY_MARKET_MATCH, DecisionPipeline
from tests.conftest import CRASH_MARKET, GRID_STRATEGY, RANGING_MARKET, TREND_STRATEGY, make_personality


@pytest.fixture
def pipe() -> DecisionPipeline:
    return DecisionPipeline(rng=random.Random(0))


class TestMarketMatchTable:
    @pytest.mark.parametrize(
        "philosophy,regime,factor",
        [
            ("趋势跟踪", "bull", 1.0),
            ("趋势跟踪", "ranging", 0.7),
            ("网格交易", "ranging", 1.0),
            ("网格交易", "bull", 0.7),
            ("逆向抄底", "bear", 1.0),
        ],
    )
    def test_strategy_market_match_constants(
        self, philosophy: str, regime: str, factor: float
    ):
        assert STRATEGY_MARKET_MATCH[(philosophy, regime)] == factor

    def test_trend_in_ranging_reduces_step6(self, pipe: DecisionPipeline):
        personality = make_personality(experience_level=40)
        s_pers = 1.0
        bull = pipe._step6_environment(
            s_pers, personality, TREND_STRATEGY, {**CRASH_MARKET, "market_regime": "bull"}, {}
        )
        ranging = pipe._step6_environment(
            s_pers, personality, TREND_STRATEGY, {**RANGING_MARKET, "market_regime": "ranging"}, {}
        )
        assert ranging < bull

    def test_cub_perception_discount_in_bear(self, pipe: DecisionPipeline):
        personality = make_personality(experience_level=10)
        neutral = pipe._step6_environment(
            1.0, personality, GRID_STRATEGY, {**CRASH_MARKET, "market_regime": "bull"}, {}
        )
        bear = pipe._step6_environment(
            1.0, personality, GRID_STRATEGY, CRASH_MARKET, {}
        )
        assert bear < neutral


class TestCorrelationPenalty:
    def test_held_position_halves_signal(self, pipe: DecisionPipeline):
        personality = make_personality(experience_level=60)
        market = {**CRASH_MARKET, "asset": "BTC"}
        alone = pipe._step6_environment(1.0, personality, TREND_STRATEGY, market, {})
        crowded = pipe._step6_environment(
            1.0, personality, TREND_STRATEGY, market, {"ETH": 1.0}
        )
        assert crowded == pytest.approx(alone * 0.5)
