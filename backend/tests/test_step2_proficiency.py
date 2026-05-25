"""Step 2 — proficiency noise tiers."""
import random
from unittest.mock import MagicMock

import pytest

from app.engine.decision_pipeline import DecisionPipeline


class TestProficiencyNoise:
    def test_master_proficiency_zero_noise(self):
        pipe = DecisionPipeline(rng=random.Random(0))
        pipe._rng.uniform = MagicMock(return_value=0.99)
        s_prof = pipe._step2_proficiency_noise(
            0.8, {"proficiency": 85}, {"boldness": 100}
        )
        assert s_prof == pytest.approx(0.8)

    def test_novice_noise_amplified_by_boldness(self):
        pipe = DecisionPipeline(rng=random.Random(0))
        pipe._rng.uniform = MagicMock(return_value=0.30)
        s_prof = pipe._step2_proficiency_noise(
            1.0, {"proficiency": 10}, {"boldness": 100}
        )
        assert s_prof == pytest.approx(1.0)

    def test_timid_panda_less_noise_impact(self):
        pipe = DecisionPipeline(rng=random.Random(0))
        pipe._rng.uniform = MagicMock(return_value=0.30)
        bold = pipe._step2_proficiency_noise(1.0, {"proficiency": 10}, {"boldness": 100})
        timid = pipe._step2_proficiency_noise(1.0, {"proficiency": 10}, {"boldness": 0})
        assert bold == pytest.approx(1.0)
        assert timid == pytest.approx(1.0 * (1 + 0.30 * 0.0))

    @pytest.mark.parametrize("prof,expected_max_noise", [(10, 0.30), (35, 0.15), (60, 0.05)])
    def test_noise_tier_ranges(self, prof: int, expected_max_noise: float):
        pipe = DecisionPipeline(rng=random.Random(0))
        pipe._rng.uniform = MagicMock(return_value=expected_max_noise)
        s_prof = pipe._step2_proficiency_noise(
            1.0, {"proficiency": prof}, {"boldness": 100}
        )
        assert s_prof == pytest.approx(1.0)

    def test_output_clamped_to_unit_interval(self):
        pipe = DecisionPipeline(rng=random.Random(0))
        pipe._rng.uniform = MagicMock(return_value=0.30)
        s_prof = pipe._step2_proficiency_noise(
            0.9, {"proficiency": 5}, {"boldness": 100}
        )
        assert 0.0 <= s_prof <= 1.0
