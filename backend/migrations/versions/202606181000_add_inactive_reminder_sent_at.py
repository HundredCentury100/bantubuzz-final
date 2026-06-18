"""Add inactive reminder sent timestamp.

Revision ID: 202606181000
Revises: 202606161000
Create Date: 2026-06-18 10:00:00
"""
from alembic import op
import sqlalchemy as sa


revision = '202606181000'
down_revision = '202606161000'
branch_labels = None
depends_on = None


def _has_column(table_name, column_name):
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return column_name in [column['name'] for column in inspector.get_columns(table_name)]


def upgrade():
    if not _has_column('users', 'inactive_reminder_sent_at'):
        op.add_column('users', sa.Column('inactive_reminder_sent_at', sa.DateTime(), nullable=True))


def downgrade():
    if _has_column('users', 'inactive_reminder_sent_at'):
        op.drop_column('users', 'inactive_reminder_sent_at')
