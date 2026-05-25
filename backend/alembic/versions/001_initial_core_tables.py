"""Initial core tables: users, pandas, strategies, strategy_history, simulations, trades.

Revision ID: 001_initial_core
Revises:
Create Date: 2026-05-25
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "001_initial_core"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute('CREATE EXTENSION IF NOT EXISTS "pgcrypto"')

    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("wallet_address", sa.Text(), nullable=False),
        sa.Column("zk_login_subject", sa.Text(), nullable=True),
        sa.Column("display_name", sa.Text(), nullable=True),
        sa.Column("avatar_url", sa.Text(), nullable=True),
        sa.Column("onboarding_survey", postgresql.JSONB(), nullable=True),
        sa.Column("experience_level", sa.String(20), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("wallet_address", name="uq_users_wallet_address"),
    )
    op.create_index(
        "idx_users_zk_login",
        "users",
        ["zk_login_subject"],
        unique=False,
        postgresql_where=sa.text("zk_login_subject IS NOT NULL"),
    )

    op.create_table(
        "pandas",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("sui_object_id", sa.Text(), nullable=False),
        sa.Column("owner_id", postgresql.UUID(as_uuid=False), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("boldness", sa.SmallInteger(), nullable=False),
        sa.Column("patience", sa.SmallInteger(), nullable=False),
        sa.Column("intuition", sa.SmallInteger(), nullable=False),
        sa.Column("focus", sa.SmallInteger(), nullable=False),
        sa.Column("contrarian", sa.SmallInteger(), nullable=False),
        sa.Column("talent", sa.SmallInteger(), nullable=False, server_default="0"),
        sa.Column("generation", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("experience_level", sa.SmallInteger(), nullable=False, server_default="0"),
        sa.Column("is_trading", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("emotion_state", sa.String(20), nullable=False, server_default="focused"),
        sa.Column("emotion_stability", sa.SmallInteger(), nullable=False, server_default="50"),
        sa.Column("walrus_blob_id", sa.Text(), nullable=True),
        sa.Column("walrus_last_synced_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("walrus_sync_status", sa.String(10), nullable=False, server_default="pending"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("sui_object_id", name="uq_pandas_sui_object_id"),
        sa.CheckConstraint("boldness BETWEEN 0 AND 100", name="ck_pandas_boldness"),
        sa.CheckConstraint("patience BETWEEN 0 AND 100", name="ck_pandas_patience"),
        sa.CheckConstraint("intuition BETWEEN 0 AND 100", name="ck_pandas_intuition"),
        sa.CheckConstraint("focus BETWEEN 0 AND 100", name="ck_pandas_focus"),
        sa.CheckConstraint("contrarian BETWEEN 0 AND 100", name="ck_pandas_contrarian"),
        sa.CheckConstraint("talent BETWEEN 0 AND 6", name="ck_pandas_talent"),
        sa.CheckConstraint("experience_level BETWEEN 0 AND 100", name="ck_pandas_experience_level"),
        sa.CheckConstraint("emotion_stability BETWEEN 0 AND 100", name="ck_pandas_emotion_stability"),
    )
    op.create_index("idx_pandas_owner", "pandas", ["owner_id"])
    op.create_index("idx_pandas_emotion", "pandas", ["emotion_state"])
    op.create_index(
        "idx_pandas_walrus_sync",
        "pandas",
        ["walrus_sync_status"],
        postgresql_where=sa.text("walrus_sync_status != 'synced'"),
    )

    op.create_table(
        "strategies",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("panda_id", postgresql.UUID(as_uuid=False), sa.ForeignKey("pandas.id", ondelete="CASCADE"), nullable=False),
        sa.Column("raw_text", sa.Text(), nullable=False),
        sa.Column("parsed_json", postgresql.JSONB(), nullable=False),
        sa.Column("strategy_hash", sa.Text(), nullable=False),
        sa.Column("philosophy", sa.String(30), nullable=False),
        sa.Column("proficiency", sa.SmallInteger(), nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.CheckConstraint("proficiency BETWEEN 0 AND 100", name="ck_strategies_proficiency"),
    )
    op.create_index("idx_strategies_panda", "strategies", ["panda_id"])
    op.create_index(
        "idx_strategies_active",
        "strategies",
        ["panda_id"],
        postgresql_where=sa.text("is_active = TRUE"),
    )
    op.create_index("idx_strategies_parsed", "strategies", ["parsed_json"], postgresql_using="gin")

    op.create_table(
        "simulations",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("panda_id", postgresql.UUID(as_uuid=False), sa.ForeignKey("pandas.id", ondelete="CASCADE"), nullable=False),
        sa.Column("strategy_id", postgresql.UUID(as_uuid=False), sa.ForeignKey("strategies.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="running"),
        sa.Column("speed", sa.String(10), nullable=False, server_default="1x"),
        sa.Column("initial_capital", sa.Numeric(20, 2), nullable=False, server_default="10000.00"),
        sa.Column("final_equity", sa.Numeric(20, 2), nullable=True),
        sa.Column("total_trades", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("win_rate", sa.Numeric(5, 4), nullable=True),
        sa.Column("max_drawdown", sa.Numeric(5, 4), nullable=True),
        sa.Column("data_source", sa.String(20), nullable=False, server_default="csv"),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("idx_simulations_panda", "simulations", ["panda_id", "started_at"])
    op.create_index(
        "idx_simulations_status",
        "simulations",
        ["status"],
        postgresql_where=sa.text("status = 'running'"),
    )

    op.create_table(
        "strategy_history",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("panda_id", postgresql.UUID(as_uuid=False), sa.ForeignKey("pandas.id", ondelete="CASCADE"), nullable=False),
        sa.Column("strategy_hash", sa.Text(), nullable=False),
        sa.Column("proficiency_at_switch", sa.SmallInteger(), nullable=False),
        sa.Column("ghost_weight", sa.Numeric(5, 4), nullable=False, server_default="1.0000"),
        sa.Column("trades_since_switch", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("switched_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.CheckConstraint(
            "proficiency_at_switch BETWEEN 0 AND 100",
            name="ck_strategy_history_proficiency",
        ),
    )
    op.create_index("idx_strategy_history_panda", "strategy_history", ["panda_id"])
    op.create_index(
        "idx_strategy_history_active",
        "strategy_history",
        ["panda_id", "ghost_weight"],
        postgresql_where=sa.text("ghost_weight > 0.01"),
    )

    op.create_table(
        "trades",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("panda_id", postgresql.UUID(as_uuid=False), sa.ForeignKey("pandas.id", ondelete="CASCADE"), nullable=False),
        sa.Column("strategy_id", postgresql.UUID(as_uuid=False), sa.ForeignKey("strategies.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("simulation_id", postgresql.UUID(as_uuid=False), sa.ForeignKey("simulations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("asset", sa.String(5), nullable=False),
        sa.Column("action", sa.String(5), nullable=False),
        sa.Column("price", sa.Numeric(20, 8), nullable=False),
        sa.Column("quantity", sa.Numeric(20, 8), nullable=False),
        sa.Column("position_size_pct", sa.Numeric(5, 4), nullable=False),
        sa.Column("raw_signal", sa.Numeric(5, 4), nullable=True),
        sa.Column("filtered_signal", sa.Numeric(5, 4), nullable=True),
        sa.Column("final_score", sa.Numeric(5, 4), nullable=False),
        sa.Column("emotion_at_trade", sa.String(20), nullable=False),
        sa.Column("proficiency_at_trade", sa.SmallInteger(), nullable=False),
        sa.Column("pnl_pct", sa.Numeric(8, 4), nullable=True),
        sa.Column("decision_details", postgresql.JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.CheckConstraint("proficiency_at_trade BETWEEN 0 AND 100", name="ck_trades_proficiency"),
    )
    op.create_index("idx_trades_panda", "trades", ["panda_id", "created_at"])
    op.create_index("idx_trades_simulation", "trades", ["simulation_id"])
    op.create_index("idx_trades_asset", "trades", ["asset", "created_at"])
    op.create_index(
        "idx_trades_pnl",
        "trades",
        ["panda_id", "pnl_pct"],
        postgresql_where=sa.text("pnl_pct IS NOT NULL"),
    )
    op.create_index("idx_trades_decision", "trades", ["decision_details"], postgresql_using="gin")
    op.create_index("idx_trades_created_brin", "trades", ["created_at"], postgresql_using="brin")


def downgrade() -> None:
    op.drop_table("trades")
    op.drop_table("strategy_history")
    op.drop_table("simulations")
    op.drop_table("strategies")
    op.drop_table("pandas")
    op.drop_table("users")
