"""Add scopes to connected platforms

Revision ID: 202605271015
Revises: 202603301420
Create Date: 2026-05-27 10:15:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = '202605271015'
down_revision = '202603301420'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('connected_platforms', schema=None) as batch_op:
        batch_op.add_column(sa.Column('scopes', sa.JSON(), nullable=True))


def downgrade():
    with op.batch_alter_table('connected_platforms', schema=None) as batch_op:
        batch_op.drop_column('scopes')
