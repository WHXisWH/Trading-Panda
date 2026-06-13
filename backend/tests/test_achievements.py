"""Achievement evaluation logic — DB-free."""
from app.services.achievements import (
    ACHIEVEMENT_DEFS,
    evaluate_unlocked,
    get_definition,
)


def test_catalog_codes_unique():
    codes = [d["code"] for d in ACHIEVEMENT_DEFS]
    assert len(codes) == len(set(codes))


def test_empty_stats_unlocks_nothing():
    assert evaluate_unlocked({}) == set()


def test_first_panda_and_first_trade():
    unlocked = evaluate_unlocked({"pandas_count": 1, "total_trades": 1, "closed_trades": 1})
    assert "first_panda" in unlocked
    assert "first_trade" in unlocked
    assert "collector" not in unlocked


def test_trade_count_tiers():
    assert "ten_trades" in evaluate_unlocked({"total_trades": 10})
    assert "hundred_trades" not in evaluate_unlocked({"total_trades": 99})
    assert "hundred_trades" in evaluate_unlocked({"total_trades": 100})


def test_sharp_shooter_requires_min_closed_trades():
    # high win rate but too few trades -> not unlocked
    assert "sharp_shooter" not in evaluate_unlocked({"win_rate": 0.9, "closed_trades": 5})
    assert "sharp_shooter" in evaluate_unlocked({"win_rate": 0.6, "closed_trades": 10})


def test_level_tiers():
    assert "veteran" in evaluate_unlocked({"max_level": 50})
    assert "grandmaster" not in evaluate_unlocked({"max_level": 99})
    assert "grandmaster" in evaluate_unlocked({"max_level": 100})


def test_in_the_green_needs_positive_pnl():
    assert "in_the_green" not in evaluate_unlocked({"best_pnl_pct": 0.0})
    assert "in_the_green" in evaluate_unlocked({"best_pnl_pct": 0.5})


def test_get_definition():
    assert get_definition("veteran")["title"] == "Veteran"
    assert get_definition("nope") is None
