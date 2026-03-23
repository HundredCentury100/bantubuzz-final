"""Add bantubuzz_id to thunzi_accounts

Revision ID: 202603161030
Revises: 202603161015
Create Date: 2026-03-16 10:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '202603161030'
down_revision = '202603161015'
branch_labels = None
depends_on = None


def upgrade():
    # Add bantubuzz_id column to thunzi_accounts table
    with op.batch_alter_table('thunzi_accounts', schema=None) as batch_op:
        batch_op.add_column(sa.Column('bantubuzz_id', sa.String(255), nullable=True))


def downgrade():
    # Remove bantubuzz_id column from thunzi_accounts table
    with op.batch_alter_table('thunzi_accounts', schema=None) as batch_op:
        batch_op.drop_column('bantubuzz_id')
