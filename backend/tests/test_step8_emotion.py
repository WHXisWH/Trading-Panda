"""Step 8 — emotion profiles and stability dampening."""
import random

import pytest

from app.engine.decision_pipeline import DecisionPipeline, PipelineContext
from tests.conftest import make_personality


@pytest.fixture
def pipe() -> DecisionPipeline:
    return DecisionPipeline(rng=random.Random(0))


class TestEmotionProfiles:
    @pytest.mark.parametrize(
        "emotion,expected_factor",
        [
            ("focused", 1.0),
            ("greedy", 1.3),
            ("panicking", 0.5),
            ("cautious", 0.85),
        ],
    )
    def test_raw_signal_factors(self, pipe: DecisionPipeline, emotion: str, expected_factor: float):
        ctx = PipelineContext()
        personality = make_personality(emotion_stability=0)
        out = pipe._step8_emotion(1.0, emotion, personality, ctx)
        assert out == pytest.approx(expected_factor)

    def test_stability_dampens_greedy(self, pipe: DecisionPipeline):
        ctx_stable = PipelineContext()
        ctx_volatile = PipelineContext()
        pipe._step8_emotion(1.0, "greedy", make_personality(emotion_stability=90), ctx_stable)
        out_volatile = pipe._step8_emotion(
            1.0, "greedy", make_personality(emotion_stability=10), ctx_volatile
        )
        out_stable = pipe._step8_emotion(
            1.0, "greedy", make_personality(emotion_stability=90), ctx_stable
        )
        assert out_volatile > out_stable

    def test_greedy_lowers_entry_threshold(self, pipe: DecisionPipeline):
        ctx = PipelineContext(entry_threshold=0.65)
        pipe._step8_emotion(0.5, "greedy", make_personality(emotion_stability=0), ctx)
        assert ctx.entry_threshold < 0.65

    def test_panicking_raises_entry_threshold(self, pipe: DecisionPipeline):
        ctx = PipelineContext(entry_threshold=0.65)
        pipe._step8_emotion(0.5, "panicking", make_personality(emotion_stability=0), ctx)
        assert ctx.entry_threshold > 0.65

    def test_emotion_sets_position_modifiers(self, pipe: DecisionPipeline):
        ctx = PipelineContext()
        pipe._step8_emotion(1.0, "greedy", make_personality(emotion_stability=0), ctx)
        assert ctx.emotion_position_mod > 1.0
        assert ctx.emotion_stoploss_mod > 1.0
