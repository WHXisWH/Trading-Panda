"""Add training_budget to panda_vaults (Agent Wallet setup).

Revision ID: 007_training_budget_on_vault
Revises: 006_trust_merkle_columns
Create Date: 2026-06-18
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "007_training_budget_on_vault"
down_revision: Union[str, None] = "006_trust_merkle_columns"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "panda_vaults",
        sa.Column(
            "training_budget",
            sa.Numeric(24, 8),
            nullable=False,
            server_default="10000",
        ),
    )


def downgrade() -> None:
    op.drop_column("panda_vaults", "training_budget")
