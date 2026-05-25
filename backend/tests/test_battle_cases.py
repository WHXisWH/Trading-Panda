"""L2 Battle Case regression — 阿暴 / 阿稳 / 阿鬼 / 策略不适配."""
from tests.conftest import (
    CRASH_MARKET,
    RSI_BUY_STRATEGY,
    TREND_STRATEGY,
    make_personality,
    make_pipeline,
)


def abao_personality() -> dict:
    return make_personality(
        boldness=90,
        patience=15,
        intuition=60,
        focus=40,
        contrarian=60,
        experience_level=30,
        emotion_stability=20,
    )


def awen_personality() -> dict:
    return make_personality(
        boldness=25,
        patience=85,
        intuition=40,
        focus=80,
        contrarian=20,
        experience_level=45,
        emotion_stability=80,
    )


def agui_personality() -> dict:
    return make_personality(
        boldness=55,
        patience=50,
        intuition=95,
        focus=60,
        contrarian=85,
        experience_level=70,
        emotion_stability=50,
    )


class TestBattleCase1BtcCrash:
    def test_abao_rushes_on_flash_crash(self):
        result = make_pipeline(42).run(
            CRASH_MARKET,
            abao_personality(),
            {**RSI_BUY_STRATEGY, "proficiency": 35},
            {},
            "excited",
        )
        assert result.final_score > 0
        assert result.entry_delay == 0
        assert result.steps[0]["direction"] > 0
        assert abs(result.final_score) >= 0.40

    def test_awen_waits_multiple_bars(self):
        result = make_pipeline(42).run(
            CRASH_MARKET,
            awen_personality(),
            {**RSI_BUY_STRATEGY, "proficiency": 50},
            {},
            "focused",
        )
        assert result.entry_delay >= 3

    def test_agui_social_offset_on_crowd_panic(self):
        market = CRASH_MARKET
        without = make_pipeline(42).run(
            market, agui_personality(), RSI_BUY_STRATEGY, {}, "focused", social_signal=0.0
        )
        with_crowd = make_pipeline(42).run(
            market,
            agui_personality(),
            RSI_BUY_STRATEGY,
            {},
            "focused",
            social_signal=-0.8,
        )
        assert with_crowd.steps[6]["score"] != without.steps[6]["score"]


class TestBattleCase4Mismatch:
    def test_awen_trend_strategy_in_ranging_market(self):
        market = {
            **CRASH_MARKET,
            "market_regime": "ranging",
            "rsi": 25,
            "trend_strength": 0.15,
        }
        result = make_pipeline(42).run(
            market,
            awen_personality(),
            {**TREND_STRATEGY, "proficiency": 50},
            {},
            "focused",
        )
        assert result.steps[0]["score"] > 0
        assert result.steps[5]["score"] <= result.steps[4]["score"]
