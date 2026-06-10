"""Add internal creator scores and rankings.

Revision ID: 202606101700
Revises: 202606101500
Create Date: 2026-06-10 17:00:00
"""
from alembic import op
import sqlalchemy as sa


revision = '202606101700'
down_revision = '202606101500'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('connected_platforms', sa.Column('average_engagement_rate', sa.Numeric(8, 4)))
    op.add_column('connected_platforms', sa.Column('average_sentiment_score', sa.Numeric(8, 4)))
    op.add_column('connected_platforms', sa.Column('average_views', sa.BigInteger()))
    op.add_column('connected_platforms', sa.Column('average_reach', sa.BigInteger()))
    op.add_column('connected_platforms', sa.Column('analytics_synced_at', sa.DateTime()))

    op.create_table(
        'creator_scores',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('creator_profile_id', sa.Integer(), nullable=False),
        sa.Column('engagement_score', sa.Numeric(6, 3), nullable=False, server_default='0'),
        sa.Column('reach_score', sa.Numeric(6, 3), nullable=False, server_default='0'),
        sa.Column('follower_score', sa.Numeric(6, 3), nullable=False, server_default='0'),
        sa.Column('sentiment_score', sa.Numeric(6, 3), nullable=False, server_default='0'),
        sa.Column('activity_score', sa.Numeric(6, 3), nullable=False, server_default='0'),
        sa.Column('profile_quality_score', sa.Numeric(6, 3), nullable=False, server_default='0'),
        sa.Column('final_score', sa.Numeric(6, 3), nullable=False, server_default='0'),
        sa.Column('input_snapshot', sa.JSON(), nullable=False),
        sa.Column('data_quality', sa.JSON(), nullable=False),
        sa.Column('formula_version', sa.String(length=20), nullable=False, server_default='1.0'),
        sa.Column('calculated_at', sa.DateTime(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['creator_profile_id'], ['creator_profiles.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('creator_profile_id'),
    )
    op.create_index('ix_creator_scores_creator_profile_id', 'creator_scores', ['creator_profile_id'])
    op.create_index('ix_creator_scores_final_score', 'creator_scores', ['final_score'])
    op.create_index('ix_creator_scores_calculated_at', 'creator_scores', ['calculated_at'])

    op.create_table(
        'creator_score_history',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('creator_profile_id', sa.Integer(), nullable=False),
        sa.Column('engagement_score', sa.Numeric(6, 3), nullable=False),
        sa.Column('reach_score', sa.Numeric(6, 3), nullable=False),
        sa.Column('follower_score', sa.Numeric(6, 3), nullable=False),
        sa.Column('sentiment_score', sa.Numeric(6, 3), nullable=False),
        sa.Column('activity_score', sa.Numeric(6, 3), nullable=False),
        sa.Column('profile_quality_score', sa.Numeric(6, 3), nullable=False),
        sa.Column('final_score', sa.Numeric(6, 3), nullable=False),
        sa.Column('input_snapshot', sa.JSON(), nullable=False),
        sa.Column('formula_version', sa.String(length=20), nullable=False),
        sa.Column('calculated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['creator_profile_id'], ['creator_profiles.id'], ondelete='CASCADE'),
    )
    op.create_index('ix_creator_score_history_creator_profile_id', 'creator_score_history', ['creator_profile_id'])
    op.create_index('ix_creator_score_history_calculated_at', 'creator_score_history', ['calculated_at'])

    op.create_table(
        'creator_rankings',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('creator_profile_id', sa.Integer(), nullable=False),
        sa.Column('ranking_type', sa.String(length=20), nullable=False),
        sa.Column('context_key', sa.String(length=100), nullable=False, server_default=''),
        sa.Column('position', sa.Integer(), nullable=False),
        sa.Column('previous_position', sa.Integer()),
        sa.Column('calculated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['creator_profile_id'], ['creator_profiles.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('creator_profile_id', 'ranking_type', 'context_key', name='uq_creator_ranking_context'),
    )
    for column in ('creator_profile_id', 'ranking_type', 'context_key', 'position'):
        op.create_index(f'ix_creator_rankings_{column}', 'creator_rankings', [column])

    op.create_table(
        'user_sessions',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('login_method', sa.String(length=30), nullable=False, server_default='password'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    )
    op.create_index('ix_user_sessions_user_id', 'user_sessions', ['user_id'])
    op.create_index('ix_user_sessions_created_at', 'user_sessions', ['created_at'])


def downgrade():
    op.drop_table('user_sessions')
    op.drop_table('creator_rankings')
    op.drop_table('creator_score_history')
    op.drop_table('creator_scores')
    for column in (
        'analytics_synced_at',
        'average_reach',
        'average_views',
        'average_sentiment_score',
        'average_engagement_rate',
    ):
        op.drop_column('connected_platforms', column)
