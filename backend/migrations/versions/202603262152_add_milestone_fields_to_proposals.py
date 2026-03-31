"""Add milestone fields to campaign proposals

Revision ID: 202603262152
Revises: 202603261000
Create Date: 2026-03-26 21:52:00

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB


# revision identifiers, used by Alembic.
revision = '202603262152'
down_revision = '202603261000'
branch_labels = None
depends_on = None


def upgrade():
    # Add pricing_mode column
    op.add_column('campaign_proposals', sa.Column('pricing_mode', sa.String(20), server_default='total'))

    # Add milestones JSONB column
    op.add_column('campaign_proposals', sa.Column('milestones', JSONB, server_default='[]'))


def downgrade():
    op.drop_column('campaign_proposals', 'milestones')
    op.drop_column('campaign_proposals', 'pricing_mode')
