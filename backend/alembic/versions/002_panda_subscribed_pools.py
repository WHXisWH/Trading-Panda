"""Add pandas.subscribed_pools for Epic 4 pool selection."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = "002_panda_subscribed_pools"
down_revision = "001_initial_core"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "pandas",
        sa.Column("subscribed_pools", JSONB, nullable=True),
    )


def downgrade() -> None:
    op.drop_column("pandas", "subscribed_pools")
