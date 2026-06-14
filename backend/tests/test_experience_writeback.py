"""Experience write-back pure logic — DB-free."""
from app.engine.experience_engine import (
    MISTAKE_LOSS_THRESHOLD,
    is_mistake,
    merge_pattern,
    mistake_penalty_for,
)


def test_merge_pattern_from_empty():
    data, conf = merge_pattern(None, "abc123", "bull", won=True)
    assert data == {"hash": "abc123", "count": 1, "wins": 1, "regime": "bull"}
    assert conf == 1.0


def test_merge_pattern_running_win_rate():
    data, conf = merge_pattern(
        {"hash": "abc", "count": 3, "wins": 2, "regime": "bull"}, "abc", "bull", won=False
    )
    assert data["count"] == 4
    assert data["wins"] == 2
    assert conf == 0.5  # 2 / 4


def test_merge_pattern_keeps_latest_regime():
    data, _ = merge_pattern({"count": 1, "wins": 1}, "h", "bear", won=True)
    assert data["regime"] == "bear"


def test_is_mistake_threshold():
    assert is_mistake(-0.05) is True
    assert is_mistake(MISTAKE_LOSS_THRESHOLD) is False  # boundary not a mistake
    assert is_mistake(-0.01) is False
    assert is_mistake(0.10) is False


def test_mistake_penalty_scales_and_caps():
    assert mistake_penalty_for(-0.05) == 0.1  # 0.05 * 2
    assert mistake_penalty_for(-0.5) == 0.5   # capped
    assert mistake_penalty_for(-10) == 0.5    # capped
