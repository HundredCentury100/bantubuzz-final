"""Add live campaign analytics history and sentiment comments.

Revision ID: 202606091000
Revises: 202606051530
Create Date: 2026-06-09 10:00:00
"""
from alembic import op
import sqlalchemy as sa


revision = '202606091000'
down_revision = '202606051530'
branch_labels = None
depends_on = None


def _inspector():
    return sa.inspect(op.get_bind())


def _has_table(table_name):
    return table_name in _inspector().get_table_names()


def _has_column(table_name, column_name):
    if not _has_table(table_name):
        return False
    return column_name in {
        column['name'] for column in _inspector().get_columns(table_name)
    }


def upgrade():
    if not _has_column('post_metrics', 'clicks'):
        op.add_column('post_metrics', sa.Column('clicks', sa.Integer(), server_default='0', nullable=True))
    if not _has_column('post_metrics', 'conversions'):
        op.add_column('post_metrics', sa.Column('conversions', sa.Integer(), server_default='0', nullable=True))

    if not _has_table('post_metrics_snapshots'):
        op.create_table(
            'post_metrics_snapshots',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('post_metrics_id', sa.Integer(), nullable=False),
            sa.Column('reach', sa.BigInteger(), server_default='0'),
            sa.Column('impressions', sa.BigInteger(), server_default='0'),
            sa.Column('video_views', sa.BigInteger(), server_default='0'),
            sa.Column('likes', sa.Integer(), server_default='0'),
            sa.Column('comments', sa.Integer(), server_default='0'),
            sa.Column('shares', sa.Integer(), server_default='0'),
            sa.Column('saves', sa.Integer(), server_default='0'),
            sa.Column('clicks', sa.Integer(), server_default='0'),
            sa.Column('conversions', sa.Integer(), server_default='0'),
            sa.Column('total_engagement', sa.Integer(), server_default='0'),
            sa.Column('positive_comments', sa.Integer(), server_default='0'),
            sa.Column('negative_comments', sa.Integer(), server_default='0'),
            sa.Column('neutral_comments', sa.Integer(), server_default='0'),
            sa.Column('captured_at', sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(['post_metrics_id'], ['post_metrics.id'], ondelete='CASCADE'),
        )
        op.create_index('ix_post_metrics_snapshots_post_metrics_id', 'post_metrics_snapshots', ['post_metrics_id'])
        op.create_index('ix_post_metrics_snapshots_captured_at', 'post_metrics_snapshots', ['captured_at'])

    if not _has_table('post_sentiment_comments'):
        op.create_table(
            'post_sentiment_comments',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('post_metrics_id', sa.Integer(), nullable=False),
            sa.Column('external_id', sa.String(length=255), nullable=False),
            sa.Column('platform', sa.String(length=50)),
            sa.Column('author', sa.String(length=255)),
            sa.Column('content', sa.Text(), nullable=False),
            sa.Column('sentiment', sa.String(length=20), nullable=False, server_default='neutral'),
            sa.Column('sentiment_score', sa.Numeric(6, 3)),
            sa.Column('language', sa.String(length=20), server_default='unknown'),
            sa.Column('likes', sa.Integer(), server_default='0'),
            sa.Column('views', sa.Integer(), server_default='0'),
            sa.Column('themes', sa.JSON()),
            sa.Column('published_at', sa.DateTime()),
            sa.Column('created_at', sa.DateTime()),
            sa.Column('updated_at', sa.DateTime()),
            sa.ForeignKeyConstraint(['post_metrics_id'], ['post_metrics.id'], ondelete='CASCADE'),
            sa.UniqueConstraint('post_metrics_id', 'external_id', name='uq_post_sentiment_comment_external'),
        )
        op.create_index('ix_post_sentiment_comments_post_metrics_id', 'post_sentiment_comments', ['post_metrics_id'])
        op.create_index('ix_post_sentiment_comments_sentiment', 'post_sentiment_comments', ['sentiment'])


def downgrade():
    if _has_table('post_sentiment_comments'):
        op.drop_index('ix_post_sentiment_comments_sentiment', table_name='post_sentiment_comments')
        op.drop_index('ix_post_sentiment_comments_post_metrics_id', table_name='post_sentiment_comments')
        op.drop_table('post_sentiment_comments')
    if _has_table('post_metrics_snapshots'):
        op.drop_index('ix_post_metrics_snapshots_captured_at', table_name='post_metrics_snapshots')
        op.drop_index('ix_post_metrics_snapshots_post_metrics_id', table_name='post_metrics_snapshots')
        op.drop_table('post_metrics_snapshots')
    if _has_column('post_metrics', 'conversions'):
        op.drop_column('post_metrics', 'conversions')
    if _has_column('post_metrics', 'clicks'):
        op.drop_column('post_metrics', 'clicks')
