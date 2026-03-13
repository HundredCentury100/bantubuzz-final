"""add_post_tracking_fields

Revision ID: 202603121500
Revises: 202603041500
Create Date: 2026-03-12 15:00:00

Description:
    Adds post tracking fields to milestone_deliverables table for ThunziAI analytics integration.
    - post_platform: Platform name (instagram, facebook, youtube, tiktok, twitter)
    - post_id: Native platform post ID extracted from URL
    - thunzi_post_id: ThunziAI's internal post ID for metrics fetching
    - post_url_validated: Whether URL was successfully parsed
    - url_submitted_at: Timestamp when URL was submitted

Part of: Brand Analytics Implementation - Phase 1
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '202603121500'
down_revision = '05a90a92435c'  # Updated to match current production head
branch_labels = None
depends_on = None


def upgrade():
    # Add new columns to milestone_deliverables
    with op.batch_alter_table('milestone_deliverables', schema=None) as batch_op:
        batch_op.add_column(sa.Column('post_platform', sa.String(length=50), nullable=True))
        batch_op.add_column(sa.Column('post_id', sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column('thunzi_post_id', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('post_url_validated', sa.Boolean(), server_default='false', nullable=False))
        batch_op.add_column(sa.Column('url_submitted_at', sa.DateTime(), nullable=True))

    # Create indexes for better query performance
    with op.batch_alter_table('milestone_deliverables', schema=None) as batch_op:
        batch_op.create_index(
            'idx_milestone_deliverables_post_id',
            ['post_id'],
            unique=False
        )
        batch_op.create_index(
            'idx_milestone_deliverables_thunzi_post_id',
            ['thunzi_post_id'],
            unique=False
        )
        batch_op.create_index(
            'idx_milestone_deliverables_platform',
            ['post_platform'],
            unique=False
        )


def downgrade():
    # Remove indexes
    with op.batch_alter_table('milestone_deliverables', schema=None) as batch_op:
        batch_op.drop_index('idx_milestone_deliverables_platform')
        batch_op.drop_index('idx_milestone_deliverables_thunzi_post_id')
        batch_op.drop_index('idx_milestone_deliverables_post_id')

    # Remove columns
    with op.batch_alter_table('milestone_deliverables', schema=None) as batch_op:
        batch_op.drop_column('url_submitted_at')
        batch_op.drop_column('post_url_validated')
        batch_op.drop_column('thunzi_post_id')
        batch_op.drop_column('post_id')
        batch_op.drop_column('post_platform')
