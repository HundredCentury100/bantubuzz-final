"""Add user login security fields.

Revision ID: 202606041300
Revises: 202606041000
Create Date: 2026-06-04 13:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = '202606041300'
down_revision = '202606041000'
branch_labels = None
depends_on = None


def _has_column(table_name, column_name):
    inspector = sa.inspect(op.get_bind())
    return any(column['name'] == column_name for column in inspector.get_columns(table_name))


def upgrade():
    if not _has_column('users', 'failed_login_attempts'):
        op.add_column('users', sa.Column('failed_login_attempts', sa.Integer(), server_default='0', nullable=False))
    if not _has_column('users', 'locked_until'):
        op.add_column('users', sa.Column('locked_until', sa.DateTime(), nullable=True))
    if not _has_column('users', 'two_factor_enabled'):
        op.add_column('users', sa.Column('two_factor_enabled', sa.Boolean(), server_default=sa.false(), nullable=False))


def downgrade():
    for column_name in ['two_factor_enabled', 'locked_until', 'failed_login_attempts']:
        if _has_column('users', column_name):
            op.drop_column('users', column_name)
