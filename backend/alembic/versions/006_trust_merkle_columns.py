"""Merkle root Trade Fact metadata columns (Epic 9).

Revision ID: 006_trust_merkle_columns
Revises: 005_chain_proof_idempotency
Create Date: 2026-06-17
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "006_trust_merkle_columns"
down_revision: Union[str, None] = "005_chain_proof_idempotency"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "merkle_roots",
        sa.Column("root_type", sa.Text(), nullable=False, server_default="trade_facts"),
    )
    op.add_column("merkle_roots", sa.Column("start_fact_id", sa.UUID(), nullable=True))
    op.add_column("merkle_roots", sa.Column("end_fact_id", sa.UUID(), nullable=True))


def downgrade() -> None:
    op.drop_column("merkle_roots", "end_fact_id")
    op.drop_column("merkle_roots", "start_fact_id")
    op.drop_column("merkle_roots", "root_type")
