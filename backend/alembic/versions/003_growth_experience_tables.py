"""Growth + experience + trust tables (remaining 12 of 18).

Creates: experience_patterns, experience_mastery, experience_mistakes,
experience_cycles, emotions_log, merkle_roots, achievements,
user_achievements, checkins, market_data_cache, correlation_matrix,
panda_diary.

Revision ID: 003_growth_experience
Revises: 002_panda_subscribed_pools
Create Date: 2026-06-13
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "003_growth_experience"
down_revision: Union[str, None] = "002_panda_subscribed_pools"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_UUID = postgresql.UUID(as_uuid=False)
_PK = dict(primary_key=True, server_default=sa.text("gen_random_uuid()"))


def upgrade() -> None:
    # ── experience subsystem ──
    op.create_table(
        "experience_patterns",
        sa.Column("id", _UUID, **_PK),
        sa.Column("panda_id", _UUID, sa.ForeignKey("pandas.id", ondelete="CASCADE"), nullable=False),
        sa.Column("pattern_type", sa.String(50), nullable=False),
        sa.Column("pattern_data", postgresql.JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("confidence", sa.Numeric(5, 4), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("idx_exp_patterns_panda", "experience_patterns", ["panda_id"])

    op.create_table(
        "experience_mastery",
        sa.Column("id", _UUID, **_PK),
        sa.Column("panda_id", _UUID, sa.ForeignKey("pandas.id", ondelete="CASCADE"), nullable=False),
        sa.Column("asset", sa.String(10), nullable=False),
        sa.Column("mastery_score", sa.Numeric(5, 4), nullable=False, server_default="0"),
        sa.Column("trade_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("panda_id", "asset", name="uq_exp_mastery_panda_asset"),
    )
    op.create_index("idx_exp_mastery_panda", "experience_mastery", ["panda_id"])

    op.create_table(
        "experience_mistakes",
        sa.Column("id", _UUID, **_PK),
        sa.Column("panda_id", _UUID, sa.ForeignKey("pandas.id", ondelete="CASCADE"), nullable=False),
        sa.Column("trade_id", _UUID, sa.ForeignKey("trades.id", ondelete="SET NULL"), nullable=True),
        sa.Column("mistake_type", sa.String(50), nullable=False),
        sa.Column("penalty", sa.Numeric(5, 4), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("idx_exp_mistakes_panda", "experience_mistakes", ["panda_id"])

    op.create_table(
        "experience_cycles",
        sa.Column("id", _UUID, **_PK),
        sa.Column("panda_id", _UUID, sa.ForeignKey("pandas.id", ondelete="CASCADE"), nullable=False),
        sa.Column("cycle_type", sa.String(30), nullable=False),
        sa.Column("performance_data", postgresql.JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("idx_exp_cycles_panda", "experience_cycles", ["panda_id"])

    # ── emotion log ──
    op.create_table(
        "emotions_log",
        sa.Column("id", _UUID, **_PK),
        sa.Column("panda_id", _UUID, sa.ForeignKey("pandas.id", ondelete="CASCADE"), nullable=False),
        sa.Column("from_state", sa.String(20), nullable=False),
        sa.Column("to_state", sa.String(20), nullable=False),
        sa.Column("trigger", sa.String(50), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("idx_emotions_log_panda", "emotions_log", ["panda_id", "created_at"])

    # ── trust / merkle ──
    op.create_table(
        "merkle_roots",
        sa.Column("id", _UUID, **_PK),
        sa.Column("panda_id", _UUID, sa.ForeignKey("pandas.id", ondelete="CASCADE"), nullable=False),
        sa.Column("root_hash", sa.Text(), nullable=False),
        sa.Column("trade_count", sa.Integer(), nullable=False),
        sa.Column("batch_index", sa.Integer(), nullable=False),
        sa.Column("sui_tx_digest", sa.Text(), nullable=True),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("panda_id", "batch_index", name="uq_merkle_panda_batch"),
    )
    op.create_index("idx_merkle_roots_panda", "merkle_roots", ["panda_id", "batch_index"])

    # ── achievements ──
    op.create_table(
        "achievements",
        sa.Column("id", _UUID, **_PK),
        sa.Column("code", sa.Text(), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("requirement_json", postgresql.JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("code", name="uq_achievements_code"),
    )

    op.create_table(
        "user_achievements",
        sa.Column("id", _UUID, **_PK),
        sa.Column("user_id", _UUID, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("panda_id", _UUID, sa.ForeignKey("pandas.id", ondelete="CASCADE"), nullable=True),
        sa.Column("achievement_id", _UUID, sa.ForeignKey("achievements.id", ondelete="CASCADE"), nullable=False),
        sa.Column("unlocked_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("user_id", "achievement_id", name="uq_user_achievement"),
    )
    op.create_index("idx_user_achievements_user", "user_achievements", ["user_id"])

    # ── checkins ──
    op.create_table(
        "checkins",
        sa.Column("id", _UUID, **_PK),
        sa.Column("user_id", _UUID, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("streak_count", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("checkin_date", sa.Date(), nullable=False),
        sa.Column("reward_type", sa.Text(), nullable=False),
        sa.Column("reward_amount", sa.Numeric(10, 2), nullable=False, server_default="0"),
        sa.UniqueConstraint("user_id", "checkin_date", name="uq_checkin_user_date"),
    )
    op.create_index("idx_checkins_user", "checkins", ["user_id", "checkin_date"])

    # ── caches ──
    op.create_table(
        "market_data_cache",
        sa.Column("id", _UUID, **_PK),
        sa.Column("asset", sa.String(10), nullable=False),
        sa.Column("timeframe", sa.String(10), nullable=False),
        sa.Column("data", postgresql.JSONB(), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("cached_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("asset", "timeframe", name="uq_market_cache_asset_tf"),
    )

    op.create_table(
        "correlation_matrix",
        sa.Column("id", _UUID, **_PK),
        sa.Column("asset_pair", sa.String(20), nullable=False),
        sa.Column("correlation", sa.Numeric(5, 4), nullable=False),
        sa.Column("calculated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("asset_pair", name="uq_correlation_pair"),
    )

    # ── diary ──
    op.create_table(
        "panda_diary",
        sa.Column("id", _UUID, **_PK),
        sa.Column("panda_id", _UUID, sa.ForeignKey("pandas.id", ondelete="CASCADE"), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("trade_id", _UUID, sa.ForeignKey("trades.id", ondelete="SET NULL"), nullable=True),
        sa.Column("emotion_state", sa.String(20), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("idx_panda_diary_panda", "panda_diary", ["panda_id", "created_at"])


def downgrade() -> None:
    op.drop_table("panda_diary")
    op.drop_table("correlation_matrix")
    op.drop_table("market_data_cache")
    op.drop_table("checkins")
    op.drop_table("user_achievements")
    op.drop_table("achievements")
    op.drop_table("merkle_roots")
    op.drop_table("emotions_log")
    op.drop_table("experience_cycles")
    op.drop_table("experience_mistakes")
    op.drop_table("experience_mastery")
    op.drop_table("experience_patterns")
