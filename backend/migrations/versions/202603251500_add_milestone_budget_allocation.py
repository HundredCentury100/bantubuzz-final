"""Add budget_allocation to campaign_milestones

Revision ID: 202603251500
Revises: 202603251430
Create Date: 2026-03-25 15:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '202603251500'
down_revision = '202603251430'
branch_labels = None
depends_on = None


def upgrade():
    # Add budget_allocation to campaign_milestones table
    op.add_column('campaign_milestones', sa.Column('budget_allocation', sa.Numeric(precision=10, scale=2), nullable=True))

    print("✅ budget_allocation column added to campaign_milestones")


def downgrade():
    # Remove column if rolling back
    op.drop_column('campaign_milestones', 'budget_allocation')

    print("⏪ budget_allocation column removed from campaign_milestones")
