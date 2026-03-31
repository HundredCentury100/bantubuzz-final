"""Add escrow_status to collaborations

Revision ID: 202603301347
Revises: 202603301345
Create Date: 2026-03-30 13:47:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '202603301347'
down_revision = '202603301345'
branch_labels = None
depends_on = None


def upgrade():
    # Add escrow_status column to collaborations table
    op.add_column('collaborations', sa.Column('escrow_status', sa.String(length=20), nullable=True))


def downgrade():
    # Remove escrow_status column from collaborations table
    op.drop_column('collaborations', 'escrow_status')
