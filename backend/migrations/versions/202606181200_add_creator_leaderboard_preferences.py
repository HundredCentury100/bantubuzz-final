"""Add creator leaderboard display preferences.

Revision ID: 202606181200
Revises: 202606181000
Create Date: 2026-06-18 12:00:00
"""
from alembic import op
import sqlalchemy as sa


revision = '202606181200'
down_revision = '202606181000'
branch_labels = None
depends_on = None


def _has_column(table_name, column_name):
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return column_name in [column['name'] for column in inspector.get_columns(table_name)]


def upgrade():
    if not _has_column('creator_profiles', 'leaderboard_show_score'):
        op.add_column(
            'creator_profiles',
            sa.Column('leaderboard_show_score', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        )
    if not _has_column('creator_profiles', 'leaderboard_badges'):
        op.add_column('creator_profiles', sa.Column('leaderboard_badges', sa.JSON(), nullable=True))
    if not _has_column('creator_profiles', 'leaderboard_notified_at'):
        op.add_column('creator_profiles', sa.Column('leaderboard_notified_at', sa.DateTime(), nullable=True))


def downgrade():
    for column_name in ['leaderboard_notified_at', 'leaderboard_badges', 'leaderboard_show_score']:
        if _has_column('creator_profiles', column_name):
            op.drop_column('creator_profiles', column_name)
