"""Step 3 — experience corrections (pattern, mastery, mistakes, cycles)."""
import random

import pytest

from app.engine.experience_engine import ExperienceEngine
from app.engine.decision_pipeline import DecisionPipeline
from tests.conftest import CRASH_MARKET


@pytest.fixture
def engine() -> ExperienceEngine:
    return ExperienceEngine("test")


@pytest.fixture
def pipe() -> DecisionPipeline:
    return DecisionPipeline(rng=random.Random(0))


class TestExperienceEngineUnits:
    def test_pattern_correction_requires_min_occurrences(self, engine: ExperienceEngine):
        h = engine.compute_pattern_hash(CRASH_MARKET)
        exp = {"patterns": {h: {"win_rate": 0.25, "occurrence_count": 4}}}
        assert engine.pattern_correction(h, "BTC", exp) == 0.0

    def test_pattern_correction_negative_win_rate(self, engine: ExperienceEngine):
        h = engine.compute_pattern_hash(CRASH_MARKET)
        exp = {"patterns": {h: {"win_rate": 0.25, "occurrence_count": 10}}}
        assert engine.pattern_correction(h, "BTC", exp) == pytest.approx((0.25 - 0.5) * 0.20)

    def test_mastery_correction(self, engine: ExperienceEngine):
        exp = {"mastery": {"BTC": 90}}
        assert engine.mastery_correction("BTC", exp) == pytest.approx(0.20)
        assert engine.mastery_correction("SOL", exp) == pytest.approx(0.0)

    def test_mistake_penalty(self, engine: ExperienceEngine):
        exp = {"mistakes": {"追高": {"vigilance": 1.0}}}
        assert engine.mistake_penalty("追高", exp) == pytest.approx(-0.10)

    def test_cycle_bonus_tiers(self, engine: ExperienceEngine):
        assert engine.cycle_bonus("bear", {"cycles": {"bear": {"days_experienced": 5}}}) == 0.0
        assert engine.cycle_bonus("bear", {"cycles": {"bear": {"days_experienced": 15}}}) == 0.10
        assert engine.cycle_bonus("bear", {"cycles": {"bear": {"days_experienced": 40}}}) == 0.20


class TestStep3Pipeline:
    def test_mastery_raises_step3_score(self, pipe: DecisionPipeline, engine: ExperienceEngine):
        base_exp = {}
        rich_exp = {"mastery": {"BTC": 90}}
        s_base = pipe._step3_experience(0.5, CRASH_MARKET, base_exp, engine)
        s_rich = pipe._step3_experience(0.5, CRASH_MARKET, rich_exp, engine)
        assert s_rich > s_base

    def test_mistake_lowers_step3_score(self, pipe: DecisionPipeline, engine: ExperienceEngine):
        h = engine.compute_pattern_hash(CRASH_MARKET)
        signal_type = engine.classify_signal_type(CRASH_MARKET)
        exp = {"mistakes": {signal_type: {"vigilance": 1.0}}}
        s = pipe._step3_experience(0.6, CRASH_MARKET, exp, engine)
        assert s < 0.6

    def test_pattern_memory_lowers_step3(self, pipe: DecisionPipeline, engine: ExperienceEngine):
        h = engine.compute_pattern_hash(CRASH_MARKET)
        exp = {"patterns": {h: {"win_rate": 0.2, "occurrence_count": 20}}}
        s = pipe._step3_experience(0.7, CRASH_MARKET, exp, engine)
        assert s < 0.7
