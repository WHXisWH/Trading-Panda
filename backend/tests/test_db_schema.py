"""Sprint 0.2 — core table ORM matches migration scope."""
import importlib.util
from pathlib import Path

from app.db.models import (
    Panda,
    Simulation,
    Strategy,
    StrategyHistory,
    Trade,
    User,
)


def test_core_tables_registered():
    names = {t.name for t in User.metadata.tables.values()}
    for expected in (
        "users",
        "pandas",
        "strategies",
        "strategy_history",
        "simulations",
        "trades",
    ):
        assert expected in names


def test_strategy_history_ghost_columns():
    cols = {c.name for c in StrategyHistory.__table__.columns}
    assert cols == {
        "id",
        "panda_id",
        "strategy_hash",
        "proficiency_at_switch",
        "ghost_weight",
        "trades_since_switch",
        "switched_at",
    }


def test_simulation_capital_columns():
    cols = {c.name for c in Simulation.__table__.columns}
    assert "initial_capital" in cols
    assert "final_equity" in cols
    assert "total_trades" in cols
    assert "trade_count" not in cols


def test_initial_migration_file_exists():
    versions = Path(__file__).resolve().parents[1] / "alembic" / "versions"
    files = list(versions.glob("*.py"))
    assert len(files) >= 1
    spec = importlib.util.spec_from_file_location("migration", files[0])
    assert spec and spec.loader
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    assert mod.revision == "001_initial_core"
    assert mod.down_revision is None
