"""v3.1 Autonomous Agent Wallet tables + pandas wallet pointers.

Adds: panda_vaults, trading_policies, panda_accounts, panda_positions,
order_intents, ledger_entries, trade_facts, trade_reviews, skill_memories,
skill_versions, chain_execution_logs, async_jobs, outbox_events.
Extends pandas with active_vault_id, active_policy_id, active_skill_version.

Revision ID: 004_v31_agent_wallet
Revises: 003_growth_experience
Create Date: 2026-06-17
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "004_v31_agent_wallet"
down_revision: Union[str, None] = "003_growth_experience"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_UUID = postgresql.UUID(as_uuid=False)
_PK = dict(primary_key=True, server_default=sa.text("gen_random_uuid()"))
_NOW = sa.text("now()")
_JSONB = postgresql.JSONB()


def upgrade() -> None:
    op.add_column("pandas", sa.Column("active_vault_id", _UUID, nullable=True))
    op.add_column("pandas", sa.Column("active_policy_id", _UUID, nullable=True))
    op.add_column(
        "pandas",
        sa.Column("active_skill_version", sa.Integer(), nullable=False, server_default="0"),
    )

    op.create_table(
        "panda_vaults",
        sa.Column("id", _UUID, **_PK),
        sa.Column("panda_id", _UUID, sa.ForeignKey("pandas.id", ondelete="CASCADE"), nullable=False),
        sa.Column("sui_object_id", sa.Text(), unique=True),
        sa.Column("sui_object_kind", sa.Text(), nullable=False, server_default="shared_object"),
        sa.Column("mode", sa.Text(), nullable=False),
        sa.Column("status", sa.Text(), nullable=False, server_default="active"),
        sa.Column("owner_address", sa.Text(), nullable=False),
        sa.Column("authorized_agent", sa.Text()),
        sa.Column("agent_key_scope", sa.Text(), nullable=False, server_default="environment"),
        sa.Column("base_asset", sa.Text(), nullable=False, server_default="vUSDC"),
        sa.Column("policy_id", _UUID, nullable=True),
        sa.Column("policy_version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("created_tx_digest", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=_NOW),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=_NOW),
    )
    op.create_index("idx_panda_vaults_panda", "panda_vaults", ["panda_id"])
    op.create_index(
        "idx_panda_vaults_agent",
        "panda_vaults",
        ["authorized_agent"],
        postgresql_where=sa.text("authorized_agent IS NOT NULL"),
    )

    op.create_table(
        "trading_policies",
        sa.Column("id", _UUID, **_PK),
        sa.Column("panda_id", _UUID, sa.ForeignKey("pandas.id", ondelete="CASCADE"), nullable=False),
        sa.Column("vault_id", _UUID, sa.ForeignKey("panda_vaults.id", ondelete="CASCADE"), nullable=True),
        sa.Column("sui_object_id", sa.Text(), unique=True),
        sa.Column("object_model", sa.Text(), nullable=False, server_default="standalone_shared_object"),
        sa.Column("owner_address", sa.Text(), nullable=False),
        sa.Column("authorized_agent", sa.Text()),
        sa.Column("agent_key_scope", sa.Text(), nullable=False, server_default="environment"),
        sa.Column("agent_key_version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("mode", sa.Text(), nullable=False),
        sa.Column("allowed_pairs", _JSONB, nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("max_notional_per_trade", sa.Numeric(20, 8), nullable=False),
        sa.Column("max_daily_loss", sa.Numeric(20, 8), nullable=False),
        sa.Column("max_leverage", sa.Numeric(10, 4), nullable=False, server_default="1.0"),
        sa.Column("max_open_positions", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("expires_at", sa.DateTime(timezone=True)),
        sa.Column("paused", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("policy_hash", sa.Text(), nullable=False),
        sa.Column("created_tx_digest", sa.Text()),
        sa.Column("updated_tx_digest", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=_NOW),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=_NOW),
    )
    op.create_index("idx_trading_policies_panda", "trading_policies", ["panda_id", sa.text("version DESC")])
    op.create_index(
        "idx_trading_policies_active",
        "trading_policies",
        ["panda_id"],
        postgresql_where=sa.text("paused = false"),
    )

    op.create_table(
        "panda_accounts",
        sa.Column("id", _UUID, **_PK),
        sa.Column("panda_id", _UUID, sa.ForeignKey("pandas.id", ondelete="CASCADE"), nullable=False),
        sa.Column("vault_id", _UUID, sa.ForeignKey("panda_vaults.id", ondelete="CASCADE"), nullable=True),
        sa.Column("mode", sa.Text(), nullable=False, server_default="training_ledger"),
        sa.Column("base_asset", sa.Text(), nullable=False, server_default="vUSDC"),
        sa.Column("cash_balance", sa.Numeric(24, 8), nullable=False, server_default="0"),
        sa.Column("debt_balance", sa.Numeric(24, 8), nullable=False, server_default="0"),
        sa.Column("equity", sa.Numeric(24, 8), nullable=False, server_default="0"),
        sa.Column("realized_pnl", sa.Numeric(24, 8), nullable=False, server_default="0"),
        sa.Column("unrealized_pnl", sa.Numeric(24, 8), nullable=False, server_default="0"),
        sa.Column("status", sa.Text(), nullable=False, server_default="active"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=_NOW),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=_NOW),
        sa.UniqueConstraint("panda_id", "mode", name="uq_panda_accounts_panda_mode"),
    )
    op.create_index("idx_panda_accounts_panda", "panda_accounts", ["panda_id"])

    op.create_table(
        "panda_positions",
        sa.Column("id", _UUID, **_PK),
        sa.Column("panda_id", _UUID, sa.ForeignKey("pandas.id", ondelete="CASCADE"), nullable=False),
        sa.Column("account_id", _UUID, sa.ForeignKey("panda_accounts.id", ondelete="CASCADE"), nullable=False),
        sa.Column("pair", sa.Text(), nullable=False),
        sa.Column("asset", sa.Text(), nullable=False),
        sa.Column("quantity", sa.Numeric(24, 8), nullable=False, server_default="0"),
        sa.Column("avg_entry_price", sa.Numeric(24, 8), nullable=False, server_default="0"),
        sa.Column("current_price", sa.Numeric(24, 8), nullable=False, server_default="0"),
        sa.Column("notional_value", sa.Numeric(24, 8), nullable=False, server_default="0"),
        sa.Column("unrealized_pnl", sa.Numeric(24, 8), nullable=False, server_default="0"),
        sa.Column("opened_at", sa.DateTime(timezone=True), nullable=False, server_default=_NOW),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=_NOW),
        sa.UniqueConstraint("account_id", "pair", name="uq_panda_positions_account_pair"),
    )
    op.create_index("idx_panda_positions_panda", "panda_positions", ["panda_id"])

    op.create_table(
        "order_intents",
        sa.Column("id", _UUID, **_PK),
        sa.Column("panda_id", _UUID, sa.ForeignKey("pandas.id", ondelete="CASCADE"), nullable=False),
        sa.Column("vault_id", _UUID, sa.ForeignKey("panda_vaults.id"), nullable=True),
        sa.Column("policy_id", _UUID, sa.ForeignKey("trading_policies.id"), nullable=True),
        sa.Column("policy_version", sa.Integer(), nullable=False),
        sa.Column("mode", sa.Text(), nullable=False),
        sa.Column("pair", sa.Text(), nullable=False),
        sa.Column("side", sa.Text(), nullable=False),
        sa.Column("notional", sa.Numeric(24, 8), nullable=False, server_default="0"),
        sa.Column("reference_price", sa.Numeric(24, 8), nullable=False, server_default="0"),
        sa.Column("max_slippage_bps", sa.Numeric(10, 4)),
        sa.Column("final_score", sa.Numeric(8, 6)),
        sa.Column("reason", sa.Text()),
        sa.Column("decision_hash", sa.Text(), nullable=False),
        sa.Column("proof_eligible", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("proof_requested", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("proof_request_source", sa.Text()),
        sa.Column("proof_key", sa.Text()),
        sa.Column("status", sa.Text(), nullable=False, server_default="DECIDED"),
        sa.Column("market_snapshot", _JSONB, nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("decision_snapshot", _JSONB, nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("policy_snapshot", _JSONB, nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("rejection_reason", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=_NOW),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=_NOW),
    )
    op.create_index("idx_order_intents_panda_created", "order_intents", ["panda_id", sa.text("created_at DESC")])
    op.create_index("idx_order_intents_status", "order_intents", ["status"])
    op.create_index("idx_order_intents_decision_hash", "order_intents", ["decision_hash"], unique=True)
    op.create_index(
        "idx_order_intents_proof_key",
        "order_intents",
        ["proof_key"],
        unique=True,
        postgresql_where=sa.text("proof_key IS NOT NULL"),
    )

    op.create_table(
        "ledger_entries",
        sa.Column("id", _UUID, **_PK),
        sa.Column("panda_id", _UUID, sa.ForeignKey("pandas.id", ondelete="CASCADE"), nullable=False),
        sa.Column("account_id", _UUID, sa.ForeignKey("panda_accounts.id", ondelete="CASCADE"), nullable=False),
        sa.Column("order_intent_id", _UUID, sa.ForeignKey("order_intents.id"), nullable=True),
        sa.Column("trade_fact_id", _UUID, nullable=True),
        sa.Column("entry_type", sa.Text(), nullable=False),
        sa.Column("asset", sa.Text(), nullable=False),
        sa.Column("amount", sa.Numeric(24, 8), nullable=False),
        sa.Column("price", sa.Numeric(24, 8)),
        sa.Column("cash_after", sa.Numeric(24, 8)),
        sa.Column("debt_after", sa.Numeric(24, 8)),
        sa.Column("equity_after", sa.Numeric(24, 8)),
        sa.Column("metadata", _JSONB, nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=_NOW),
    )
    op.create_index("idx_ledger_entries_panda_created", "ledger_entries", ["panda_id", sa.text("created_at DESC")])
    op.create_index("idx_ledger_entries_intent", "ledger_entries", ["order_intent_id"])

    op.create_table(
        "trade_facts",
        sa.Column("id", _UUID, **_PK),
        sa.Column("panda_id", _UUID, sa.ForeignKey("pandas.id", ondelete="CASCADE"), nullable=False),
        sa.Column("order_intent_id", _UUID, sa.ForeignKey("order_intents.id"), nullable=False),
        sa.Column("pair", sa.Text(), nullable=False),
        sa.Column("side", sa.Text(), nullable=False),
        sa.Column("mode", sa.Text(), nullable=False),
        sa.Column("opened_at", sa.DateTime(timezone=True), nullable=False, server_default=_NOW),
        sa.Column("closed_at", sa.DateTime(timezone=True)),
        sa.Column("market_snapshot", _JSONB, nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("decision_snapshot", _JSONB, nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("policy_snapshot", _JSONB, nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("ledger_snapshot_before", _JSONB, nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("execution_snapshot", _JSONB, nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("ledger_snapshot_after", _JSONB, nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("outcome", _JSONB, nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("realized_pnl", sa.Numeric(24, 8)),
        sa.Column("realized_pnl_pct", sa.Numeric(12, 8)),
        sa.Column("review_status", sa.Text(), nullable=False, server_default="pending"),
        sa.Column("proof_status", sa.Text(), nullable=False, server_default="not_requested"),
        sa.Column("proof_key", sa.Text()),
        sa.Column("chain_execution_log_id", _UUID, nullable=True),
        sa.Column("skill_version_before", sa.Integer()),
        sa.Column("skill_version_after", sa.Integer()),
        sa.Column("fact_hash", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=_NOW),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=_NOW),
    )
    op.create_index("idx_trade_facts_panda_created", "trade_facts", ["panda_id", sa.text("created_at DESC")])
    op.create_index("idx_trade_facts_review_status", "trade_facts", ["review_status"])
    op.create_index("idx_trade_facts_proof_status", "trade_facts", ["proof_status"])
    op.create_index("idx_trade_facts_hash", "trade_facts", ["fact_hash"], unique=True)
    op.create_index(
        "idx_trade_facts_proof_key",
        "trade_facts",
        ["proof_key"],
        unique=True,
        postgresql_where=sa.text("proof_key IS NOT NULL"),
    )

    op.create_table(
        "trade_reviews",
        sa.Column("id", _UUID, **_PK),
        sa.Column("panda_id", _UUID, sa.ForeignKey("pandas.id", ondelete="CASCADE"), nullable=False),
        sa.Column(
            "trade_fact_id",
            _UUID,
            sa.ForeignKey("trade_facts.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        ),
        sa.Column("verdict", sa.Text(), nullable=False),
        sa.Column("reason_summary", sa.Text(), nullable=False),
        sa.Column("evidence", _JSONB, nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("hypotheses", _JSONB, nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("reviewer", sa.Text(), nullable=False, server_default="agent"),
        sa.Column("review_hash", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=_NOW),
    )
    op.create_index("idx_trade_reviews_panda_created", "trade_reviews", ["panda_id", sa.text("created_at DESC")])

    op.create_table(
        "skill_memories",
        sa.Column("id", _UUID, **_PK),
        sa.Column("panda_id", _UUID, sa.ForeignKey("pandas.id", ondelete="CASCADE"), nullable=False),
        sa.Column("scope", sa.Text(), nullable=False),
        sa.Column("pair", sa.Text()),
        sa.Column("market_regime", sa.Text()),
        sa.Column("rule_text", sa.Text(), nullable=False),
        sa.Column("confidence", sa.Numeric(8, 6), nullable=False, server_default="0"),
        sa.Column("status", sa.Text(), nullable=False, server_default="proposed"),
        sa.Column("evidence_trade_fact_ids", _JSONB, nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("memory_hash", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=_NOW),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=_NOW),
    )
    op.create_index("idx_skill_memories_panda_status", "skill_memories", ["panda_id", "status"])
    op.create_index(
        "idx_skill_memories_pair",
        "skill_memories",
        ["pair"],
        postgresql_where=sa.text("pair IS NOT NULL"),
    )

    op.create_table(
        "skill_versions",
        sa.Column("id", _UUID, **_PK),
        sa.Column("panda_id", _UUID, sa.ForeignKey("pandas.id", ondelete="CASCADE"), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("skill_hash", sa.Text(), nullable=False),
        sa.Column("walrus_blob_id", sa.Text()),
        sa.Column("submitted_tx_digest", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=_NOW),
        sa.UniqueConstraint("panda_id", "version", name="uq_skill_versions_panda_version"),
    )
    op.create_index("idx_skill_versions_panda_latest", "skill_versions", ["panda_id", sa.text("version DESC")])

    op.create_table(
        "chain_execution_logs",
        sa.Column("id", _UUID, **_PK),
        sa.Column("panda_id", _UUID, sa.ForeignKey("pandas.id", ondelete="CASCADE"), nullable=False),
        sa.Column("order_intent_id", _UUID, sa.ForeignKey("order_intents.id"), nullable=True),
        sa.Column("trade_fact_id", _UUID, sa.ForeignKey("trade_facts.id"), nullable=True),
        sa.Column("network", sa.Text(), nullable=False, server_default="testnet"),
        sa.Column("tx_digest", sa.Text(), nullable=False),
        sa.Column("event_type", sa.Text()),
        sa.Column("event_payload", _JSONB, nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("policy_version", sa.Integer()),
        sa.Column("decision_hash", sa.Text()),
        sa.Column("proof_key", sa.Text()),
        sa.Column("proof_source", sa.Text()),
        sa.Column("manual_requested_by", _UUID, sa.ForeignKey("users.id"), nullable=True),
        sa.Column("status", sa.Text(), nullable=False),
        sa.Column("error_message", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=_NOW),
    )
    op.create_index(
        "idx_chain_execution_logs_panda_created",
        "chain_execution_logs",
        ["panda_id", sa.text("created_at DESC")],
    )
    op.create_index("idx_chain_execution_logs_digest", "chain_execution_logs", ["tx_digest"], unique=True)
    op.create_index(
        "idx_chain_execution_logs_proof_key",
        "chain_execution_logs",
        ["proof_key"],
        unique=True,
        postgresql_where=sa.text("proof_key IS NOT NULL"),
    )

    op.create_table(
        "async_jobs",
        sa.Column("id", _UUID, **_PK),
        sa.Column("job_type", sa.Text(), nullable=False),
        sa.Column("status", sa.Text(), nullable=False, server_default="pending"),
        sa.Column("priority", sa.Integer(), nullable=False, server_default="100"),
        sa.Column("run_at", sa.DateTime(timezone=True), nullable=False, server_default=_NOW),
        sa.Column("locked_at", sa.DateTime(timezone=True)),
        sa.Column("locked_by", sa.Text()),
        sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("max_attempts", sa.Integer(), nullable=False, server_default="5"),
        sa.Column("idempotency_key", sa.Text(), nullable=False),
        sa.Column("payload", _JSONB, nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("last_error", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=_NOW),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=_NOW),
    )
    op.create_index("idx_async_jobs_due", "async_jobs", ["status", "run_at", "priority"])
    op.create_index("idx_async_jobs_idempotency", "async_jobs", ["idempotency_key"], unique=True)

    op.create_table(
        "outbox_events",
        sa.Column("id", _UUID, **_PK),
        sa.Column("aggregate_type", sa.Text(), nullable=False),
        sa.Column("aggregate_id", _UUID, nullable=False),
        sa.Column("event_type", sa.Text(), nullable=False),
        sa.Column("redis_channel", sa.Text()),
        sa.Column("payload", _JSONB, nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("status", sa.Text(), nullable=False, server_default="pending"),
        sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_error", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=_NOW),
        sa.Column("published_at", sa.DateTime(timezone=True)),
    )


def downgrade() -> None:
    op.drop_table("outbox_events")
    op.drop_table("async_jobs")
    op.drop_table("chain_execution_logs")
    op.drop_table("skill_versions")
    op.drop_table("skill_memories")
    op.drop_table("trade_reviews")
    op.drop_table("trade_facts")
    op.drop_table("ledger_entries")
    op.drop_table("order_intents")
    op.drop_table("panda_positions")
    op.drop_table("panda_accounts")
    op.drop_table("trading_policies")
    op.drop_table("panda_vaults")
    op.drop_column("pandas", "active_skill_version")
    op.drop_column("pandas", "active_policy_id")
    op.drop_column("pandas", "active_vault_id")
