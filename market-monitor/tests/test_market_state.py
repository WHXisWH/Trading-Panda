from pipeline.market_state import detect_regime


def test_ranging_low_trend() -> None:
    assert detect_regime(100, 100, 0.01, 50) == "ranging"
