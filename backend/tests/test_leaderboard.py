"""Leaderboard ranking logic — DB-free."""
from app.services.leaderboard import (
    build_entry,
    normalize_dimension,
    rank_leaderboard,
)


def _entry(pid, level, trades, wins, closed, pnl):
    return build_entry(
        panda_id=pid,
        owner_name=pid,
        level=level,
        trade_count=trades,
        wins=wins,
        closed=closed,
        sum_pnl_pct=pnl,
    )


def test_normalize_dimension_defaults_to_winrate():
    assert normalize_dimension(None) == "winrate"
    assert normalize_dimension("bogus") == "winrate"
    assert normalize_dimension("pnl") == "pnl"
    assert normalize_dimension("level") == "level"


def test_build_entry_computes_win_rate():
    e = _entry("a", 10, 10, 6, 8, 12.5)
    assert e["win_rate"] == 0.75  # 6 / 8 closed
    assert e["total_pnl_pct"] == 12.5
    e0 = _entry("b", 0, 0, 0, 0, 0)
    assert e0["win_rate"] == 0.0  # no closed trades -> no div by zero


def test_rank_by_winrate_assigns_sequential_rank():
    entries = [
        _entry("low", 1, 10, 2, 10, 1),
        _entry("high", 1, 10, 9, 10, 1),
        _entry("mid", 1, 10, 5, 10, 1),
    ]
    ranked = rank_leaderboard(entries, "winrate")
    assert [e["panda_id"] for e in ranked] == ["high", "mid", "low"]
    assert [e["rank"] for e in ranked] == [1, 2, 3]


def test_rank_by_pnl():
    entries = [_entry("a", 1, 5, 1, 5, 3.0), _entry("b", 1, 5, 1, 5, 9.0)]
    ranked = rank_leaderboard(entries, "pnl")
    assert ranked[0]["panda_id"] == "b"


def test_rank_by_level_tiebreaks_on_trade_count():
    entries = [_entry("a", 5, 2, 1, 2, 1), _entry("b", 5, 9, 1, 9, 1)]
    ranked = rank_leaderboard(entries, "level")
    assert ranked[0]["panda_id"] == "b"  # same level, more trades wins


def test_rank_respects_limit():
    entries = [_entry(str(i), 1, 1, 1, 1, i) for i in range(10)]
    ranked = rank_leaderboard(entries, "pnl", limit=3)
    assert len(ranked) == 3
