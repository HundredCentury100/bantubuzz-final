"""Add creator_id to thunzi_accounts

Revision ID: 202603161015
Revises: 202603131405
Create Date: 2026-03-16 10:15:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '202603161015'
down_revision = '202603131410'
branch_labels = None
depends_on = None


def upgrade():
    # Add thunzi_creator_id column to thunzi_accounts table
    with op.batch_alter_table('thunzi_accounts', schema=None) as batch_op:
        batch_op.add_column(sa.Column('thunzi_creator_id', sa.Integer(), nullable=True))


def downgrade():
    # Remove thunzi_creator_id column from thunzi_accounts table
    with op.batch_alter_table('thunzi_accounts', schema=None) as batch_op:
        batch_op.drop_column('thunzi_creator_id')
