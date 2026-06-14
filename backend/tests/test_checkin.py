"""Check-in streak + reward logic — DB-free."""
from datetime import date, timedelta

from app.services.checkin import (
    checkin_reward,
    current_streak,
    is_checked_in_today,
    next_streak,
)

TODAY = date(2026, 6, 13)
YESTERDAY = TODAY - timedelta(days=1)
WEEK_AGO = TODAY - timedelta(days=7)


def test_first_ever_checkin_streak_one():
    assert next_streak(None, 0, TODAY) == 1


def test_consecutive_day_increments():
    assert next_streak(YESTERDAY, 4, TODAY) == 5


def test_gap_resets_streak():
    assert next_streak(WEEK_AGO, 9, TODAY) == 1


def test_same_day_is_idempotent():
    assert next_streak(TODAY, 3, TODAY) == 3


def test_reward_grows_then_caps():
    assert checkin_reward(1)[1] < checkin_reward(5)[1]
    assert checkin_reward(7) == checkin_reward(100)  # capped at 7 days
    assert checkin_reward(3)[0] == "calm_bamboo"


def test_is_checked_in_today():
    assert is_checked_in_today(TODAY, TODAY) is True
    assert is_checked_in_today(YESTERDAY, TODAY) is False
    assert is_checked_in_today(None, TODAY) is False


def test_current_streak_breaks_on_gap():
    assert current_streak(TODAY, 5, TODAY) == 5
    assert current_streak(YESTERDAY, 5, TODAY) == 5  # still alive, claim today
    assert current_streak(WEEK_AGO, 5, TODAY) == 0
    assert current_streak(None, 0, TODAY) == 0
