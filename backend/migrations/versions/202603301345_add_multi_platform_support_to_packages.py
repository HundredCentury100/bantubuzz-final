"""add multi-platform support to packages

Revision ID: 202603301345
Revises:
Create Date: 2026-03-30 13:45:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '202603301345'
down_revision = '202603262152'
branch_labels = None
depends_on = None


def upgrade():
    # Add new columns for multi-platform support
    op.add_column('packages', sa.Column('is_multi_platform', sa.Boolean(), server_default='false', nullable=False))
    op.add_column('packages', sa.Column('platforms', postgresql.JSON(astext_type=sa.Text()), nullable=True))

    # Add comment for clarity
    op.execute("""
        COMMENT ON COLUMN packages.is_multi_platform IS 'Whether this package covers multiple platforms';
        COMMENT ON COLUMN packages.platforms IS 'Array of platform types when is_multi_platform is true. Format: ["instagram", "tiktok", "youtube"]';
    """)


def downgrade():
    # Remove the new columns
    op.drop_column('packages', 'platforms')
    op.drop_column('packages', 'is_multi_platform')
