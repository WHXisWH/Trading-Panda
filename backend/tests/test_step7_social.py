"""Step 7 — social signal and contrarian bias."""
import random

import pytest

from app.engine.decision_pipeline import DecisionPipeline
from tests.conftest import make_personality


@pytest.fixture
def pipe() -> DecisionPipeline:
    return DecisionPipeline(rng=random.Random(0))


class TestSocialBias:
    def test_zero_social_passthrough(self, pipe: DecisionPipeline):
        assert pipe._step7_social(0.8, make_personality(), 0.0) == pytest.approx(0.8)

    def test_high_contrarian_less_crowd_following_on_buy(self, pipe: DecisionPipeline):
        base = 0.7
        herd = pipe._step7_social(base, make_personality(contrarian=20), 0.8)
        contrarian = pipe._step7_social(base, make_personality(contrarian=85), 0.8)
        assert contrarian > herd

    def test_low_contrarian_less_boost_than_high_on_crowd_buy(self, pipe: DecisionPipeline):
        base = 0.7
        low = pipe._step7_social(base, make_personality(contrarian=20), 0.8)
        high = pipe._step7_social(base, make_personality(contrarian=85), 0.8)
        assert low < high

    def test_low_contrarian_opposes_crowd_sell_more_than_high(self, pipe: DecisionPipeline):
        base = 0.6
        low = pipe._step7_social(base, make_personality(contrarian=20), -0.8)
        high = pipe._step7_social(base, make_personality(contrarian=85), -0.8)
        assert low > high
