"""Step 5 — boldness, patience, focus."""
import random

import pytest

from app.engine.decision_pipeline import DecisionPipeline, PipelineContext
from tests.conftest import make_personality


@pytest.fixture
def pipe() -> DecisionPipeline:
    return DecisionPipeline(rng=random.Random(0))


class TestEntryThreshold:
    def test_boldness_zero_raises_threshold(self, pipe: DecisionPipeline):
        ctx = PipelineContext()
        pipe._step5_personality(1.0, make_personality(boldness=0), ctx)
        assert ctx.entry_threshold == pytest.approx(0.65 * (1 - (0 - 50) / 200))

    def test_boldness_100_lowers_threshold(self, pipe: DecisionPipeline):
        ctx = PipelineContext()
        pipe._step5_personality(1.0, make_personality(boldness=100), ctx)
        assert ctx.entry_threshold == pytest.approx(0.65 * (1 - (100 - 50) / 200))

    def test_threshold_monotonic_with_boldness(self, pipe: DecisionPipeline):
        thresholds = []
        for b in (0, 25, 50, 75, 100):
            ctx = PipelineContext()
            pipe._step5_personality(1.0, make_personality(boldness=b), ctx)
            thresholds.append(ctx.entry_threshold)
        assert thresholds == sorted(thresholds, reverse=True)


class TestEntryDelay:
    @pytest.mark.parametrize(
        "patience,expected_delay",
        [
            (15, 0),
            (19, 0),
            (20, 0),
            (40, 1),
            (60, 2),
            (85, 3),
            (100, 4),
        ],
    )
    def test_patience_to_delay(self, pipe: DecisionPipeline, patience: int, expected_delay: int):
        ctx = PipelineContext()
        pipe._step5_personality(1.0, make_personality(patience=patience), ctx)
        assert ctx.entry_delay == expected_delay


class TestFocusAndBoldnessScore:
    def test_focus_bonus_multipliers(self, pipe: DecisionPipeline):
        base = 1.0
        low = pipe._step5_personality(base, make_personality(focus=0), PipelineContext())
        mid = pipe._step5_personality(base, make_personality(focus=50), PipelineContext())
        high = pipe._step5_personality(base, make_personality(focus=100), PipelineContext())
        assert low == pytest.approx(0.75)
        assert mid == pytest.approx(1.0)
        assert high == pytest.approx(1.25)

    def test_boldness_amplifies_signal(self, pipe: DecisionPipeline):
        timid = pipe._step5_personality(1.0, make_personality(boldness=0), PipelineContext())
        bold = pipe._step5_personality(1.0, make_personality(boldness=100), PipelineContext())
        assert bold > timid

    def test_position_factor_scales_with_boldness(self, pipe: DecisionPipeline):
        ctx_low = PipelineContext()
        ctx_high = PipelineContext()
        pipe._step5_personality(1.0, make_personality(boldness=0), ctx_low)
        pipe._step5_personality(1.0, make_personality(boldness=100), ctx_high)
        assert ctx_high.position_factor > ctx_low.position_factor
