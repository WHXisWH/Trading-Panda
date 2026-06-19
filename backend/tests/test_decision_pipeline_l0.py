"""L0 formula isolation — skill memory, philosophy edge cases, full-run boundaries."""
import random

import pytest

from app.engine.decision_pipeline import DecisionPipeline
from tests.conftest import CRASH_MARKET, RSI_BUY_STRATEGY, make_personality, make_pipeline


@pytest.fixture
def pipe() -> DecisionPipeline:
    return DecisionPipeline(rng=random.Random(0))


class TestSkillMemoryCorrection:
    def test_matching_pair_and_regime_adds_boost(self, pipe: DecisionPipeline):
        memories = [
            {
                "pair": "BTC/USD",
                "market_regime": "bear",
                "confidence": 0.75,
            }
        ]
        boost = pipe._skill_memory_correction(memories, "BTC/USD", "bear")
        assert boost == pytest.approx(min(0.05, 0.75 * 0.08))

    def test_wrong_pair_skipped(self, pipe: DecisionPipeline):
        memories = [{"pair": "ETH/USDC", "market_regime": "bear", "confidence": 0.9}]
        assert pipe._skill_memory_correction(memories, "BTC/USD", "bear") == 0.0

    def test_wrong_regime_skipped(self, pipe: DecisionPipeline):
        memories = [{"pair": "BTC/USD", "market_regime": "bull", "confidence": 0.9}]
        assert pipe._skill_memory_correction(memories, "BTC/USD", "bear") == 0.0

    def test_zero_confidence_skipped(self, pipe: DecisionPipeline):
        memories = [{"pair": "BTC/USD", "confidence": 0.0}]
        assert pipe._skill_memory_correction(memories, "BTC/USD", "bear") == 0.0

    def test_total_boost_capped_at_012(self, pipe: DecisionPipeline):
        memories = [{"confidence": 1.0} for _ in range(8)]
        assert pipe._skill_memory_correction(memories, None, "bear") == pytest.approx(0.12)

    def test_skill_memory_raises_step3_score(self, pipe: DecisionPipeline):
        market = {**CRASH_MARKET, "pair": "BTC/USD"}
        from app.engine.experience_engine import ExperienceEngine

        engine = ExperienceEngine("test")
        base = pipe._step3_experience(0.5, market, {}, engine, [])
        boosted = pipe._step3_experience(
            0.5,
            market,
            {},
            engine,
            [{"pair": "BTC/USD", "market_regime": "bear", "confidence": 0.8}],
        )
        assert boosted > base


class TestContrarianPhilosophyStep1:
    def test_contrarian_dampens_buy_signal(self, pipe: DecisionPipeline):
        buy_rules = {
            "philosophy": "contrarian",
            "signal_rules": [{"indicator": "RSI", "condition": "<30", "action": "BUY"}],
        }
        trend_rules = {
            "philosophy": "trend_following",
            "signal_rules": [{"indicator": "RSI", "condition": "<30", "action": "BUY"}],
        }
        s_contr, _ = pipe._step1_raw_signal(CRASH_MARKET, buy_rules, make_personality())
        s_trend, _ = pipe._step1_raw_signal(CRASH_MARKET, trend_rules, make_personality())
        assert s_contr < s_trend
        assert s_contr == pytest.approx(s_trend * 0.8, rel=0.01)


class TestFullRunVerdictBoundaries:
    def test_observe_zone_at_global_floor(self):
        result = make_pipeline(0).run(
            CRASH_MARKET,
            make_personality(boldness=50, patience=50, experience_level=30),
            {**RSI_BUY_STRATEGY, "proficiency": 80},
            {},
            "cautious",
        )
        magnitude = abs(result.final_score)
        if 0.40 <= magnitude <= result.entry_threshold:
            assert result.zone == "OBSERVE"
            assert result.action == "HOLD"

    def test_ignore_zone_below_global_floor(self):
        result = make_pipeline(0).run(
            {**CRASH_MARKET, "rsi": 50},
            make_personality(boldness=20, patience=80, experience_level=10),
            {"philosophy": "grid", "proficiency": 80, "signal_rules": []},
            {},
            "numb",
        )
        if abs(result.final_score) < 0.40:
            assert result.zone == "IGNORE"

    def test_mature_panda_perception_four_step6(self, pipe: DecisionPipeline):
        personality = make_personality(experience_level=85)
        mature = pipe._step6_environment(
            1.0,
            personality,
            {"philosophy": "trend_following", "signal_rules": []},
            {**CRASH_MARKET, "market_regime": "bull", "trend_strength": 0.9},
            {},
        )
        assert mature > 0
