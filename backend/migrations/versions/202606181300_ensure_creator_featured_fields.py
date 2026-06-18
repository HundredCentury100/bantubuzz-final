"""Ensure creator featured fields exist.

Revision ID: 202606181300
Revises: 202606181200
Create Date: 2026-06-18 13:00:00
"""
from alembic import op
import sqlalchemy as sa


revision = '202606181300'
down_revision = '202606181200'
branch_labels = None
depends_on = None


def _has_column(table_name, column_name):
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return column_name in [column['name'] for column in inspector.get_columns(table_name)]


def upgrade():
    if not _has_column('creator_profiles', 'is_featured'):
        op.add_column(
            'creator_profiles',
            sa.Column('is_featured', sa.Boolean(), nullable=True, server_default=sa.text('false')),
        )
    if not _has_column('creator_profiles', 'featured_type'):
        op.add_column('creator_profiles', sa.Column('featured_type', sa.String(length=20), nullable=True))
    if not _has_column('creator_profiles', 'featured_order'):
        op.add_column(
            'creator_profiles',
            sa.Column('featured_order', sa.Integer(), nullable=True, server_default='0'),
        )
    if not _has_column('creator_profiles', 'featured_since'):
        op.add_column('creator_profiles', sa.Column('featured_since', sa.DateTime(), nullable=True))


def downgrade():
    for column_name in ['featured_since', 'featured_order', 'featured_type', 'is_featured']:
        if _has_column('creator_profiles', column_name):
            op.drop_column('creator_profiles', column_name)
