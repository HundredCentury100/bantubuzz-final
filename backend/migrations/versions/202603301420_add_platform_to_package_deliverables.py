"""Add platform field to package_deliverables and make url nullable

Revision ID: 202603301420
Revises: 202603301347
Create Date: 2026-03-30 14:20:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '202603301420'
down_revision = '202603301347'
branch_labels = None
depends_on = None


def upgrade():
    # Add platform column to package_deliverables table
    op.add_column('package_deliverables', sa.Column('platform', sa.String(length=50), nullable=True))

    # Make url column nullable (it gets filled when creator submits it)
    op.alter_column('package_deliverables', 'url',
                    existing_type=sa.Text(),
                    nullable=True)


def downgrade():
    # Make url column not nullable again
    op.alter_column('package_deliverables', 'url',
                    existing_type=sa.Text(),
                    nullable=False)

    # Remove platform column from package_deliverables table
    op.drop_column('package_deliverables', 'platform')
