"""Daily check-in streak + reward — pure logic (DB-free, testable)."""
from __future__ import annotations

from datetime import date, timedelta

MAX_STREAK_BONUS_DAYS = 7
BASE_REWARD = 10
PER_DAY_BONUS = 5


def next_streak(last_date: date | None, last_streak: int, today: date) -> int:
    """Streak after checking in on `today`.

    - no prior check-in -> 1
    - last check-in was yesterday -> +1 (continued)
    - last check-in was today -> unchanged (idempotent)
    - any older gap -> reset to 1
    """
    if last_date is None:
        return 1
    if last_date == today:
        return max(1, last_streak)
    if last_date == today - timedelta(days=1):
        return last_streak + 1
    return 1


def checkin_reward(streak: int) -> tuple[str, int]:
    """Reward grows with streak, capped after MAX_STREAK_BONUS_DAYS."""
    capped = min(max(streak, 1), MAX_STREAK_BONUS_DAYS)
    amount = BASE_REWARD + capped * PER_DAY_BONUS
    return ("calm_bamboo", amount)


def is_checked_in_today(last_date: date | None, today: date) -> bool:
    return last_date == today


def current_streak(last_date: date | None, last_streak: int, today: date) -> int:
    """Streak as displayed today (0 if the run is already broken)."""
    if last_date is None:
        return 0
    if last_date == today:
        return last_streak
    if last_date == today - timedelta(days=1):
        return last_streak
    return 0
