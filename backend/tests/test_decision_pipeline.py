"""Tests for the 8-step decision pipeline.

Coverage target: 80%+ (see docs/testing-strategy.md)
"""
import pytest
from app.engine.decision_pipeline import DecisionPipeline


def make_pipeline() -> DecisionPipeline:
    return DecisionPipeline()


def make_personality(boldness=50, patience=50, intuition=50, focus=50, contrarian=50) -> dict:
    return {
        "boldness": boldness,
        "patience": patience,
        "intuition": intuition,
        "focus": focus,
        "contrarian": contrarian,
        "experience_level": 0,
    }


class TestDecisionPipeline:
    def test_returns_decision_result(self):
        pipeline = make_pipeline()
        result = pipeline.run(
            market_data={"price": 50000, "rsi": 28, "asset": "BTC"},
            personality=make_personality(),
            strategy={"signal_rules": [], "proficiency": 50},
            experience={},
            emotion="focused",
        )
        assert result.final_score >= 0
        assert result.action in ("BUY", "SELL", "HOLD")
        assert len(result.steps) == 8

    def test_greedy_emotion_amplifies_signal(self):
        pipeline = make_pipeline()
        result_focused = pipeline.run({}, make_personality(), {}, {}, "focused")
        result_greedy = pipeline.run({}, make_personality(), {}, {}, "greedy")
        # Greedy coefficient (1.3) > focused (1.0) — greedy score should be higher
        assert result_greedy.final_score >= result_focused.final_score

    def test_panicking_reduces_signal(self):
        pipeline = make_pipeline()
        result_focused = pipeline.run({}, make_personality(), {}, {}, "focused")
        result_panicking = pipeline.run({}, make_personality(), {}, {}, "panicking")
        assert result_panicking.final_score <= result_focused.final_score


class TestEmotionStateMachine:
    def test_win_streak_triggers_excited(self):
        from app.engine.emotion_state_machine import EmotionStateMachine, EmotionContext
        machine = EmotionStateMachine()
        ctx = EmotionContext(current="focused", win_streak=0)
        for _ in range(3):
            state = machine.transition(ctx, "win", 0.02)
        assert state == "excited"

    def test_calm_bamboo_resets_to_focused(self):
        from app.engine.emotion_state_machine import EmotionStateMachine, EmotionContext
        machine = EmotionStateMachine()
        ctx = EmotionContext(current="panicking")
        state = machine.transition(ctx, "calm_bamboo")
        assert state == "focused"

    def test_talent_1_prevents_panic(self):
        from app.engine.emotion_state_machine import EmotionStateMachine, EmotionContext
        machine = EmotionStateMachine()
        ctx = EmotionContext(current="cautious", talent=1)
        state = machine.transition(ctx, "drawdown", 0.15)
        assert state != "panicking"
