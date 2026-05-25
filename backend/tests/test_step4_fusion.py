"""Step 4 — strategy/experience fusion weights and ghost blend."""
import random

import pytest

from app.engine.decision_pipeline import DecisionPipeline
from tests.conftest import make_personality


@pytest.fixture
def pipe() -> DecisionPipeline:
    return DecisionPipeline(rng=random.Random(0))


class TestFusionWeights:
    @pytest.mark.parametrize(
        "exp_level,expected",
        [
            (10, 0.55),
            (24, 0.55),
            (25, 0.50),
            (40, 0.50),
            (64, 0.50),
            (65, 0.30),
            (90, 0.30),
        ],
    )
    def test_weight_by_growth_stage(self, pipe: DecisionPipeline, exp_level: int, expected: float):
        personality = make_personality(experience_level=exp_level)
        s_fuse = pipe._step4_fusion(1.0, 0.0, personality, 0.0, None, {})
        assert s_fuse == pytest.approx(expected)

    def test_fusion_uses_step3_output_not_correction_only(self, pipe: DecisionPipeline):
        personality = make_personality(experience_level=10)
        s_prof, s_exp = 0.8, 0.5
        s_fuse = pipe._step4_fusion(s_prof, s_exp, personality, 0.0, None, {})
        assert s_fuse == pytest.approx(0.8 * 0.55 + 0.5 * 0.10)

    def test_cub_favors_strategy_when_s_exp_low(self, pipe: DecisionPipeline):
        s_prof, s_exp = 1.0, 0.2
        cub = pipe._step4_fusion(
            s_prof, s_exp, make_personality(experience_level=10), 0.0, None, {}
        )
        mature = pipe._step4_fusion(
            s_prof, s_exp, make_personality(experience_level=80), 0.0, None, {}
        )
        assert cub > mature

    def test_mature_favors_experience_when_s_exp_high(self, pipe: DecisionPipeline):
        s_prof, s_exp = 0.4, 0.9
        cub = pipe._step4_fusion(
            s_prof, s_exp, make_personality(experience_level=10), 0.0, None, {}
        )
        mature = pipe._step4_fusion(
            s_prof, s_exp, make_personality(experience_level=80), 0.0, None, {}
        )
        assert mature > cub


class TestGhostBlend:
    def test_ghost_pulls_toward_old_signal(self, pipe: DecisionPipeline):
        personality = make_personality(experience_level=30)
        market = {"rsi": 23, "asset": "BTC"}
        new_fuse = pipe._step4_fusion(
            0.9,
            0.9,
            personality,
            0.0,
            None,
            market,
        )
        ghost_strategy = {
            "signal_rules": [{"indicator": "RSI", "condition": ">70", "action": "SELL"}],
        }
        with_ghost = pipe._step4_fusion(
            0.9,
            0.9,
            personality,
            0.4,
            ghost_strategy,
            {**market, "rsi": 80},
        )
        assert with_ghost != pytest.approx(new_fuse)

    def test_ghost_blend_formula(self, pipe: DecisionPipeline):
        personality = make_personality(experience_level=30)
        market = {"rsi": 25, "asset": "BTC"}
        ghost = {"signal_rules": [{"indicator": "RSI", "condition": "<30", "action": "BUY"}]}
        s_prof, s_exp = 0.6, 0.6
        pre_blend = pipe._step4_fusion(s_prof, s_exp, personality, 0.0, None, market)
        result = pipe._step4_fusion(s_prof, s_exp, personality, 0.4, ghost, market)
        old_signal = 1.0
        expected = pre_blend * 0.6 + old_signal * 0.4
        assert result == pytest.approx(expected)


class TestStrategyExperienceTension:
    def test_negative_experience_lowers_fusion_score(self, pipe: DecisionPipeline):
        personality = make_personality(experience_level=30)
        s_prof = 0.85
        s_exp_weak = 0.85
        s_exp_strong_neg = 0.50
        fuse_weak = pipe._step4_fusion(s_prof, s_exp_weak, personality, 0.0, None, {})
        fuse_strong = pipe._step4_fusion(s_prof, s_exp_strong_neg, personality, 0.0, None, {})
        assert fuse_strong < fuse_weak
