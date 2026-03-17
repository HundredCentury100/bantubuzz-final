"""add critical_comments to post_metrics

Revision ID: 202603171100
Revises: 202603171053
Create Date: 2026-03-17 11:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '202603171100'
down_revision = '202603171053'
branch_labels = None
depends_on = None


def upgrade():
    # Add critical_comments column to post_metrics table
    # ThunziAI provides this data via /api/posts/:postId/insights endpoint
    op.add_column('post_metrics', sa.Column('critical_comments', sa.Integer(), nullable=True, server_default='0'))


def downgrade():
    op.drop_column('post_metrics', 'critical_comments')
