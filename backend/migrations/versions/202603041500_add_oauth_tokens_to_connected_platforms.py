"""Add OAuth token fields to connected_platforms table

Revision ID: 202603041500
Revises: 202603031030
Create Date: 2026-03-04 15:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

# revision identifiers
revision = '202603041500'
down_revision = '202603031030'
branch_labels = None
depends_on = None


def upgrade():
    """Add OAuth token fields to connected_platforms"""

    # Add new columns for OAuth tokens
    op.execute(text("""
        ALTER TABLE connected_platforms
        ADD COLUMN IF NOT EXISTS thunzi_platform_id INTEGER,
        ADD COLUMN IF NOT EXISTS refresh_token TEXT,
        ADD COLUMN IF NOT EXISTS token_expiry TIMESTAMP
    """))

    print("✓ Added OAuth token fields to connected_platforms table")


def downgrade():
    """Remove OAuth token fields"""

    op.execute(text("""
        ALTER TABLE connected_platforms
        DROP COLUMN IF EXISTS thunzi_platform_id,
        DROP COLUMN IF EXISTS refresh_token,
        DROP COLUMN IF EXISTS token_expiry
    """))

    print("✓ Removed OAuth token fields from connected_platforms table")
