"""ExperienceEngine pure helpers — signal classification and pattern hash."""
from app.engine.experience_engine import ExperienceEngine, _regime_to_cycle, merge_pattern, mistake_penalty_for, is_mistake


def test_classify_signal_type_chase_high():
    engine = ExperienceEngine("p1")
    assert engine.classify_signal_type({"rsi": 20, "market_regime": "bull"}) == "追高"


def test_classify_signal_type_bottom_fish():
    engine = ExperienceEngine("p1")
    assert engine.classify_signal_type({"rsi": 75, "market_regime": "bear"}) == "抄底"


def test_classify_signal_type_trend_follow():
    engine = ExperienceEngine("p1")
    assert (
        engine.classify_signal_type({"rsi": 50, "market_regime": "bull", "trend_strength": 0.9})
        == "顺势"
    )


def test_classify_signal_type_range_default():
    engine = ExperienceEngine("p1")
    assert (
        engine.classify_signal_type({"rsi": 50, "market_regime": "ranging", "trend_strength": 0.2})
        == "震荡"
    )


def test_compute_pattern_hash_stable():
    engine = ExperienceEngine("p1")
    market = {"rsi": 42, "market_regime": "bear", "trend_strength": 0.55}
    assert engine.compute_pattern_hash(market) == engine.compute_pattern_hash(market)
    assert len(engine.compute_pattern_hash(market)) == 12


def test_regime_to_cycle_mapping():
    assert _regime_to_cycle("ranging") == "sideways"
    assert _regime_to_cycle("bull") == "bull"
    assert _regime_to_cycle("unknown") == "unknown"


def test_merge_pattern_tracks_wins():
    data, confidence = merge_pattern(None, "abc", "bear", won=True)
    assert data["count"] == 1
    assert data["wins"] == 1
    assert confidence == 1.0


def test_mistake_penalty_scales_and_caps():
    assert is_mistake(-0.03) is True
    assert mistake_penalty_for(-0.05) == 0.10
