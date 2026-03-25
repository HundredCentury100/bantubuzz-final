"""Campaign improvements - add application_deadline, allows_packages, requires_milestones

Revision ID: 202603251430
Revises: 202603201400
Create Date: 2026-03-25 14:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '202603251430'
down_revision = '202603201400'
branch_labels = None
depends_on = None


def upgrade():
    # Add application_deadline to campaigns table
    op.add_column('campaigns', sa.Column('application_deadline', sa.DateTime(), nullable=True))

    # Add allows_packages to campaigns table (for "Both" mode)
    op.add_column('campaigns', sa.Column('allows_packages', sa.Boolean(), server_default='false', nullable=False))

    # Add requires_milestones to campaigns table
    op.add_column('campaigns', sa.Column('requires_milestones', sa.Boolean(), server_default='true', nullable=False))

    print("✅ Campaign improvement fields added successfully")


def downgrade():
    # Remove columns if rolling back
    op.drop_column('campaigns', 'requires_milestones')
    op.drop_column('campaigns', 'allows_packages')
    op.drop_column('campaigns', 'application_deadline')

    print("⏪ Campaign improvement fields removed")
