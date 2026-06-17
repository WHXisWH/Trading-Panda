"""004 migration covers v3.1 agent wallet tables.

No DB needed — introspects ORM metadata and the migration source text.
"""
from pathlib import Path

from app.db.models import Base

LEGACY_TABLES = {
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

V31_TABLES = {
    "panda_vaults",
    "trading_policies",
    "panda_accounts",
    "panda_positions",
    "order_intents",
    "ledger_entries",
    "trade_facts",
    "trade_reviews",
    "skill_memories",
    "skill_versions",
    "chain_execution_logs",
    "async_jobs",
    "outbox_events",
}

_MIGRATION = (
    Path(__file__).resolve().parents[1]
    / "alembic"
    / "versions"
    / "004_v31_agent_wallet_tables.py"
).read_text()


def test_v31_tables_registered_in_orm():
    names = {t.name for t in Base.metadata.tables.values()}
    assert LEGACY_TABLES <= names
    assert V31_TABLES <= names


def test_004_creates_all_v31_tables():
    for table in V31_TABLES:
        assert f'"{table}"' in _MIGRATION, f"004 missing create_table for {table}"


def test_004_extends_pandas_wallet_pointers():
    for column in ("active_vault_id", "active_policy_id", "active_skill_version"):
        assert column in _MIGRATION, f"004 missing pandas.{column}"


def test_004_revision_chain():
    assert 'revision: str = "004_v31_agent_wallet"' in _MIGRATION
    assert 'down_revision: Union[str, None] = "003_growth_experience"' in _MIGRATION


def test_004_downgrade_drops_v31_tables():
    downgrade = _MIGRATION.split("def downgrade")[1]
    for table in V31_TABLES:
        assert table in downgrade, f"004 downgrade missing {table}"
