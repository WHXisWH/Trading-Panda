"""L1 control-variable experiments CV-01 .. CV-08."""
from tests.conftest import (
    CRASH_MARKET,
    GRID_STRATEGY,
    MACD_SELL_STRATEGY,
    RSI_BUY_STRATEGY,
    TREND_STRATEGY,
    make_personality,
    make_pipeline,
)
from app.engine.experience_engine import ExperienceEngine


class TestCV01BoldnessThreshold:
    def test_entry_threshold_monotonic(self):
        pipe = make_pipeline(42)
        thresholds = []
        for b in (0, 50, 100):
            r = pipe.run(CRASH_MARKET, make_personality(boldness=b), RSI_BUY_STRATEGY, {}, "focused")
            thresholds.append(r.entry_threshold)
        assert thresholds[0] > thresholds[1] > thresholds[2]


class TestCV02ExperienceLevel:
    def test_mature_panda_lower_fusion_with_negative_step3_output(self):
        pipe = make_pipeline(0)
        exp_data = {}
        s_prof = 0.85
        s_exp_neg = 0.35
        young_fuse = pipe._step4_fusion(
            s_prof, s_exp_neg, make_personality(experience_level=10), 0.0, None, {}
        )
        mature_fuse = pipe._step4_fusion(
            s_prof, s_exp_neg, make_personality(experience_level=80), 0.0, None, {}
        )
        assert mature_fuse < young_fuse


class TestCV03PatternMemory:
    def test_bad_pattern_lowers_step3(self):
        engine = ExperienceEngine("t")
        h = engine.compute_pattern_hash(CRASH_MARKET)
        exp = {"patterns": {h: {"win_rate": 0.15, "occurrence_count": 30}}}
        with_exp = make_pipeline(0).run(
            CRASH_MARKET, make_personality(), RSI_BUY_STRATEGY, exp, "focused"
        )
        without = make_pipeline(0).run(
            CRASH_MARKET, make_personality(), RSI_BUY_STRATEGY, {}, "focused"
        )
        assert with_exp.steps[2]["score"] < without.steps[2]["score"]


class TestCV04PhilosophyMarket:
    def test_grid_beats_trend_in_ranging_step6(self):
        market = {**CRASH_MARKET, "market_regime": "ranging", "rsi": 25, "trend_strength": 0.2}
        trend = make_pipeline(0).run(
            market, make_personality(experience_level=40), TREND_STRATEGY, {}, "focused"
        )
        grid = make_pipeline(0).run(
            market, make_personality(experience_level=40), GRID_STRATEGY, {}, "focused"
        )
        assert grid.steps[5]["score"] > trend.steps[5]["score"]


class TestCV05SocialContrarian:
    def test_agui_differs_with_crowd_signal(self):
        market = CRASH_MARKET
        base = make_pipeline(0).run(
            market,
            make_personality(contrarian=85),
            RSI_BUY_STRATEGY,
            {},
            "focused",
            social_signal=0.0,
        )
        social = make_pipeline(0).run(
            market,
            make_personality(contrarian=85),
            RSI_BUY_STRATEGY,
            {},
            "focused",
            social_signal=-0.8,
        )
        assert social.steps[6]["score"] != base.steps[6]["score"]


class TestCV06IntuitionNoRules:
    def test_zero_intuition_stays_zero_step1(self):
        strategy = {"philosophy": "balanced", "signal_rules": [], "proficiency": 50}
        r = make_pipeline(0).run(
            CRASH_MARKET,
            make_personality(intuition=0),
            strategy,
            {},
            "focused",
        )
        assert r.steps[0]["score"] == 0.0


class TestCV07MacdSell:
    def test_sell_direction_on_death_cross(self):
        r = make_pipeline(0).run(
            CRASH_MARKET,
            make_personality(boldness=100, patience=0),
            MACD_SELL_STRATEGY,
            {},
            "focused",
        )
        assert r.steps[0]["direction"] < 0


class TestCV08GhostInterference:
    def test_ghost_between_new_and_old(self):
        new_strategy = RSI_BUY_STRATEGY
        ghost = {
            "signal_rules": [{"indicator": "RSI", "condition": ">70", "action": "SELL"}],
        }
        market = CRASH_MARKET
        no_ghost = make_pipeline(0).run(
            market, make_personality(), new_strategy, {}, "focused"
        )
        with_ghost = make_pipeline(0).run(
            market,
            make_personality(),
            new_strategy,
            {},
            "focused",
            ghost_weight=0.4,
            ghost_strategy=ghost,
        )
        assert with_ghost.steps[3]["score"] != no_ghost.steps[3]["score"]
