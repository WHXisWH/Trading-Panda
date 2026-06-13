"""003 migration covers the remaining growth/experience/trust tables.

No DB needed — introspects ORM metadata and the migration source text.
"""
from pathlib import Path

from app.db.models import Base

ALL_18_TABLES = {
    "users",
    "pandas",
    "strategies",
    "strategy_history",
    "simulations",
    "trades",
    "experience_patterns",
    "experience_mastery",
    "experience_mistakes",
    "experience_cycles",
    "emotions_log",
    "merkle_roots",
    "achievements",
    "user_achievements",
    "checkins",
    "market_data_cache",
    "correlation_matrix",
    "panda_diary",
}

GROWTH_12_TABLES = ALL_18_TABLES - {
    "users",
    "pandas",
    "strategies",
    "strategy_history",
    "simulations",
    "trades",
}

_MIGRATION = (
    Path(__file__).resolve().parents[1]
    / "alembic"
    / "versions"
    / "003_growth_experience_tables.py"
).read_text()


def test_all_18_tables_registered_in_orm():
    names = {t.name for t in Base.metadata.tables.values()}
    assert ALL_18_TABLES <= names


def test_003_creates_all_growth_tables():
    for table in GROWTH_12_TABLES:
        assert f'"{table}"' in _MIGRATION, f"003 missing create_table for {table}"


def test_003_revision_chain():
    assert 'revision: str = "003_growth_experience"' in _MIGRATION
    assert 'down_revision: Union[str, None] = "002_panda_subscribed_pools"' in _MIGRATION


def test_003_downgrade_drops_growth_tables():
    downgrade = _MIGRATION.split("def downgrade")[1]
    for table in GROWTH_12_TABLES:
        assert table in downgrade, f"003 downgrade missing {table}"
