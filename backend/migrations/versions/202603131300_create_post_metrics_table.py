"""create_post_metrics_table

Revision ID: 202603131300
Revises: 202603121500
Create Date: 2026-03-13 13:00:00

Description:
    Creates post_metrics table for storing social media post performance data fetched from ThunziAI.
    Part of: Brand Analytics Implementation - Phase 2
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '202603131300'
down_revision = '202603121500'
branch_labels = None
depends_on = None


def upgrade():
    # Create post_metrics table
    op.create_table('post_metrics',
        sa.Column('id', sa.Integer(), nullable=False),

        # Links to BantuBuzz entities
        sa.Column('collaboration_id', sa.Integer(), nullable=False),
        sa.Column('deliverable_id', sa.Integer(), nullable=False),
        sa.Column('creator_id', sa.Integer(), nullable=False),

        # ThunziAI IDs
        sa.Column('thunzi_platform_id', sa.Integer(), nullable=True),
        sa.Column('thunzi_post_id', sa.String(length=255), nullable=True),

        # Post Information
        sa.Column('post_url', sa.Text(), nullable=False),
        sa.Column('post_platform', sa.String(length=50), nullable=False),
        sa.Column('post_id', sa.String(length=255), nullable=False),
        sa.Column('post_title', sa.Text(), nullable=True),
        sa.Column('post_description', sa.Text(), nullable=True),
        sa.Column('published_at', sa.DateTime(), nullable=True),

        # Core Performance Metrics
        sa.Column('reach', sa.BigInteger(), server_default='0', nullable=False),
        sa.Column('impressions', sa.BigInteger(), server_default='0', nullable=False),
        sa.Column('likes', sa.Integer(), server_default='0', nullable=False),
        sa.Column('comments', sa.Integer(), server_default='0', nullable=False),
        sa.Column('shares', sa.Integer(), server_default='0', nullable=False),
        sa.Column('saves', sa.Integer(), server_default='0', nullable=False),

        # Calculated Metrics
        sa.Column('total_engagement', sa.Integer(), server_default='0', nullable=False),
        sa.Column('engagement_rate', sa.Numeric(precision=5, scale=2), server_default='0', nullable=False),

        # Sentiment Analysis
        sa.Column('sentiment', sa.String(length=50), nullable=True),
        sa.Column('sentiment_score', sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column('positive_comments', sa.Integer(), server_default='0', nullable=False),
        sa.Column('negative_comments', sa.Integer(), server_default='0', nullable=False),
        sa.Column('neutral_comments', sa.Integer(), server_default='0', nullable=False),

        # Video-specific metrics
        sa.Column('video_views', sa.BigInteger(), server_default='0', nullable=False),
        sa.Column('video_duration', sa.Integer(), nullable=True),
        sa.Column('average_watch_time', sa.Integer(), nullable=True),
        sa.Column('completion_rate', sa.Numeric(precision=5, scale=2), nullable=True),

        # Sync metadata
        sa.Column('last_synced_at', sa.DateTime(), nullable=True),
        sa.Column('sync_status', sa.String(length=50), server_default='pending', nullable=False),
        sa.Column('sync_error', sa.Text(), nullable=True),

        # Timestamps
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),

        # Constraints
        sa.ForeignKeyConstraint(['collaboration_id'], ['collaborations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['deliverable_id'], ['milestone_deliverables.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['creator_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('deliverable_id', name='uq_post_metrics_deliverable_id')
    )

    # Create indexes for better query performance
    op.create_index('idx_post_metrics_collaboration', 'post_metrics', ['collaboration_id'], unique=False)
    op.create_index('idx_post_metrics_creator', 'post_metrics', ['creator_id'], unique=False)
    op.create_index('idx_post_metrics_platform', 'post_metrics', ['post_platform'], unique=False)
    op.create_index('idx_post_metrics_post_id', 'post_metrics', ['post_id'], unique=False)
    op.create_index('idx_post_metrics_published_at', 'post_metrics', ['published_at'], unique=False)
    op.create_index('idx_post_metrics_sync_status', 'post_metrics', ['sync_status'], unique=False)


def downgrade():
    # Drop indexes
    op.drop_index('idx_post_metrics_sync_status', table_name='post_metrics')
    op.drop_index('idx_post_metrics_published_at', table_name='post_metrics')
    op.drop_index('idx_post_metrics_post_id', table_name='post_metrics')
    op.drop_index('idx_post_metrics_platform', table_name='post_metrics')
    op.drop_index('idx_post_metrics_creator', table_name='post_metrics')
    op.drop_index('idx_post_metrics_collaboration', table_name='post_metrics')

    # Drop table
    op.drop_table('post_metrics')
