"""Final verdict — zone, action, BUY/SELL/HOLD boundaries."""
import random

import pytest

from app.engine.decision_pipeline import DecisionPipeline


@pytest.fixture
def pipe() -> DecisionPipeline:
    return DecisionPipeline(rng=random.Random(0))


class TestDetermineAction:
    def test_execute_buy(self, pipe: DecisionPipeline):
        action, zone = pipe._determine_action(0.70, 0.65, 1)
        assert action == "BUY"
        assert zone == "EXECUTE"

    def test_execute_sell(self, pipe: DecisionPipeline):
        action, zone = pipe._determine_action(-0.70, 0.65, -1)
        assert action == "SELL"
        assert zone == "EXECUTE"

    def test_observe_at_040(self, pipe: DecisionPipeline):
        action, zone = pipe._determine_action(0.50, 0.65, 1)
        assert action == "HOLD"
        assert zone == "OBSERVE"

    def test_ignore_below_040(self, pipe: DecisionPipeline):
        action, zone = pipe._determine_action(0.30, 0.65, 1)
        assert action == "HOLD"
        assert zone == "IGNORE"

    def test_execute_when_score_equals_threshold_plus_epsilon(self, pipe: DecisionPipeline):
        action, zone = pipe._determine_action(0.651, 0.65, 1)
        assert zone == "EXECUTE"

    def test_observe_at_exactly_040(self, pipe: DecisionPipeline):
        action, zone = pipe._determine_action(0.40, 0.65, 1)
        assert zone == "OBSERVE"

    def test_ignore_at_039(self, pipe: DecisionPipeline):
        action, zone = pipe._determine_action(0.39, 0.65, 1)
        assert zone == "IGNORE"

    def test_lower_threshold_easier_execute(self, pipe: DecisionPipeline):
        _, zone_high = pipe._determine_action(0.50, 0.65, 1)
        _, zone_low = pipe._determine_action(0.50, 0.45, 1)
        assert zone_high == "OBSERVE"
        assert zone_low == "EXECUTE"


class TestSellViaPipeline:
    def test_macd_death_cross_can_sell(self):
        from tests.conftest import MACD_SELL_STRATEGY, CRASH_MARKET, make_personality, make_pipeline

        result = make_pipeline(0).run(
            market_data=CRASH_MARKET,
            personality=make_personality(boldness=100, patience=0),
            strategy=MACD_SELL_STRATEGY,
            experience={},
            emotion="focused",
        )
        assert result.signal_direction < 0
        if abs(result.final_score) > result.entry_threshold:
            assert result.action == "SELL"
            assert result.zone == "EXECUTE"
