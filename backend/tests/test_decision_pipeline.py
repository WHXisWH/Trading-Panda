"""Integration smoke tests + emotion state machine."""
from tests.conftest import (
    CRASH_MARKET,
    RSI_BUY_STRATEGY,
    make_personality,
    make_pipeline,
)


class TestDecisionPipelineSmoke:
    def test_returns_decision_result(self):
        result = make_pipeline().run(
            market_data={"price": 50000, "rsi": 28, "asset": "BTC"},
            personality=make_personality(),
            strategy=RSI_BUY_STRATEGY,
            experience={},
            emotion="focused",
        )
        assert len(result.steps) == 8
        assert result.action in ("BUY", "SELL", "HOLD")
        assert result.zone in ("EXECUTE", "OBSERVE", "IGNORE")

    def test_rsi_oversold_produces_buy_signal(self):
        result = make_pipeline().run(
            market_data=CRASH_MARKET,
            personality=make_personality(boldness=90, patience=15, intuition=60),
            strategy={**RSI_BUY_STRATEGY, "proficiency": 35},
            experience={},
            emotion="excited",
        )
        assert result.final_score > 0
        assert result.entry_delay == 0

    def test_high_patience_increases_entry_delay(self):
        impulsive = make_pipeline().run(
            CRASH_MARKET,
            make_personality(patience=15),
            RSI_BUY_STRATEGY,
            {},
            "focused",
        )
        patient = make_pipeline().run(
            CRASH_MARKET,
            make_personality(patience=85),
            RSI_BUY_STRATEGY,
            {},
            "focused",
        )
        assert patient.entry_delay >= impulsive.entry_delay

    def test_greedy_emotion_amplifies_signal(self):
        pipeline = make_pipeline()
        market = {**CRASH_MARKET, "rsi": 28}
        base = abs(
            pipeline.run(market, make_personality(), RSI_BUY_STRATEGY, {}, "focused").final_score
        )
        greedy = abs(
            pipeline.run(market, make_personality(), RSI_BUY_STRATEGY, {}, "greedy").final_score
        )
        assert greedy >= base

    def test_panicking_reduces_signal(self):
        pipeline = make_pipeline()
        market = {**CRASH_MARKET, "rsi": 28}
        focused = abs(
            pipeline.run(market, make_personality(), RSI_BUY_STRATEGY, {}, "focused").final_score
        )
        panicking = abs(
            pipeline.run(market, make_personality(), RSI_BUY_STRATEGY, {}, "panicking").final_score
        )
        assert panicking <= focused

    def test_steps_monotonic_names(self):
        result = make_pipeline().run(
            CRASH_MARKET, make_personality(), RSI_BUY_STRATEGY, {}, "focused"
        )
        assert [s["step"] for s in result.steps] == list(range(1, 9))


class TestEmotionStateMachine:
    def test_win_streak_triggers_excited(self):
        from app.engine.emotion_state_machine import EmotionContext, EmotionStateMachine

        machine = EmotionStateMachine()
        ctx = EmotionContext(current="focused", win_streak=0)
        for _ in range(3):
            state = machine.transition(ctx, "win", 0.02)
        assert state == "excited"

    def test_excited_to_greedy_after_five_wins(self):
        from app.engine.emotion_state_machine import EmotionContext, EmotionStateMachine

        machine = EmotionStateMachine()
        ctx = EmotionContext(current="excited", win_streak=0)
        for _ in range(5):
            state = machine.transition(ctx, "win", 0.02)
        assert state == "greedy"

    def test_calm_bamboo_resets_to_focused(self):
        from app.engine.emotion_state_machine import EmotionContext, EmotionStateMachine

        machine = EmotionStateMachine()
        ctx = EmotionContext(current="panicking")
        state = machine.transition(ctx, "calm_bamboo")
        assert state == "focused"

    def test_talent_1_prevents_panic(self):
        from app.engine.emotion_state_machine import EmotionContext, EmotionStateMachine

        machine = EmotionStateMachine()
        ctx = EmotionContext(current="cautious", talent=1)
        state = machine.transition(ctx, "drawdown", 0.15)
        assert state != "panicking"

    def test_loss_from_greedy_returns_focused(self):
        from app.engine.emotion_state_machine import EmotionContext, EmotionStateMachine

        machine = EmotionStateMachine()
        ctx = EmotionContext(current="greedy")
        state = machine.transition(ctx, "loss", 0.03)
        assert state == "focused"

    def test_idle_panicking_to_numb(self):
        from app.engine.emotion_state_machine import EmotionContext, EmotionStateMachine

        machine = EmotionStateMachine()
        ctx = EmotionContext(current="panicking", idle_count=0)
        state = ctx.current
        for _ in range(10):
            state = machine.transition(ctx, "idle")
        assert state == "numb"
