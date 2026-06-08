"""Add escrow release audit fields.

Revision ID: 202606051430
Revises: 202606051200
Create Date: 2026-06-05 14:30:00
"""
from alembic import op
import sqlalchemy as sa


revision = '202606051430'
down_revision = '202606051200'
branch_labels = None
depends_on = None


def _has_column(table_name, column_name):
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return column_name in [column['name'] for column in inspector.get_columns(table_name)]


def upgrade():
    if not _has_column('payments', 'release_due_at'):
        op.add_column('payments', sa.Column('release_due_at', sa.DateTime(), nullable=True))

    if not _has_column('payments', 'released_at'):
        op.add_column('payments', sa.Column('released_at', sa.DateTime(), nullable=True))

    if not _has_column('payments', 'refunded_at'):
        op.add_column('payments', sa.Column('refunded_at', sa.DateTime(), nullable=True))


def downgrade():
    if _has_column('payments', 'refunded_at'):
        op.drop_column('payments', 'refunded_at')

    if _has_column('payments', 'released_at'):
        op.drop_column('payments', 'released_at')

    if _has_column('payments', 'release_due_at'):
        op.drop_column('payments', 'release_due_at')
