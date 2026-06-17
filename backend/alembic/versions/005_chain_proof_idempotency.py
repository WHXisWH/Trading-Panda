"""Chain execution log idempotency + retryable flag.

Revision ID: 005_chain_proof_idempotency
Revises: 004_v31_agent_wallet
Create Date: 2026-06-17
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "005_chain_proof_idempotency"
down_revision: Union[str, None] = "004_v31_agent_wallet"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "chain_execution_logs",
        sa.Column("retryable", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )
    op.create_index(
        "idx_chain_execution_logs_idempotency",
        "chain_execution_logs",
        ["trade_fact_id", "policy_version", "decision_hash"],
        unique=True,
        postgresql_where=sa.text(
            "trade_fact_id IS NOT NULL AND policy_version IS NOT NULL AND decision_hash IS NOT NULL"
        ),
    )


def downgrade() -> None:
    op.drop_index("idx_chain_execution_logs_idempotency", table_name="chain_execution_logs")
    op.drop_column("chain_execution_logs", "retryable")
