"""Step 1 — philosophy modifiers and intuition path."""
import random
from unittest.mock import MagicMock

import pytest

from app.engine.decision_pipeline import DecisionPipeline
from app.engine.rule_engine import normalize_philosophy
from tests.conftest import CRASH_MARKET, make_personality


@pytest.fixture
def pipe() -> DecisionPipeline:
    return DecisionPipeline(rng=random.Random(0))


class TestPhilosophyModifiers:
    def test_trend_following_boosts_buy_signal(self, pipe: DecisionPipeline):
        strategy = {
            "philosophy": "trend_following",
            "signal_rules": [{"indicator": "RSI", "condition": "<30", "action": "BUY"}],
        }
        s_raw, direction = pipe._step1_raw_signal(CRASH_MARKET, strategy, make_personality())
        assert direction > 0
        assert s_raw > 0

    def test_contrarian_boosts_sell_direction(self, pipe: DecisionPipeline):
        strategy = {
            "philosophy": "contrarian",
            "signal_rules": [{"indicator": "RSI", "condition": ">70", "action": "SELL"}],
        }
        market = {**CRASH_MARKET, "rsi": 75}
        s_raw, direction = pipe._step1_raw_signal(market, strategy, make_personality())
        assert direction < 0
        assert s_raw > 0

    def test_normalize_philosophy_aliases(self):
        assert normalize_philosophy("trend_following") == "趋势跟踪"
        assert normalize_philosophy("intuition_driven") == "直觉驱动"


class TestIntuitionFallback:
    def test_no_intuition_without_rules(self, pipe: DecisionPipeline):
        strategy = {"philosophy": "balanced", "signal_rules": [], "proficiency": 50}
        personality = make_personality(intuition=0)
        s_raw, direction = pipe._step1_raw_signal(CRASH_MARKET, strategy, personality)
        assert s_raw == 0.0
        assert direction == 0

    def test_intuition_triggers_with_mock_rng(self):
        pipe = DecisionPipeline(rng=random.Random(0))
        pipe._rng.random = MagicMock(side_effect=[0.01, 0.9])
        strategy = {
            "philosophy": "intuition_driven",
            "signal_rules": [],
            "proficiency": 80,
        }
        personality = make_personality(intuition=100, experience_level=50)
        s_raw, direction = pipe._step1_raw_signal(CRASH_MARKET, strategy, personality)
        assert s_raw > 0
        assert direction != 0

    def test_intuition_does_not_trigger_when_random_above_weight(self):
        pipe = DecisionPipeline(rng=random.Random(0))
        pipe._rng.random = MagicMock(return_value=0.99)
        strategy = {"philosophy": "balanced", "signal_rules": [], "proficiency": 10}
        personality = make_personality(intuition=10, experience_level=0)
        s_raw, _ = pipe._step1_raw_signal(CRASH_MARKET, strategy, personality)
        assert s_raw == 0.0
