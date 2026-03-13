"""update post_metrics to support both deliverable types

Revision ID: 202603131405
Revises: 202603131400
Create Date: 2026-03-13 14:05:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '202603131405'
down_revision = '202603131400'
branch_labels = None
depends_on = None


def upgrade():
    """
    Modify post_metrics table to support both milestone and package deliverables

    Changes:
    1. Make deliverable_id nullable
    2. Add deliverable_type column ('milestone' or 'package')
    3. Add composite unique constraint to prevent duplicate metrics

    This allows PostMetrics to track analytics for both collaboration types.
    """
    # Drop existing unique constraint on deliverable_id
    op.drop_constraint('post_metrics_deliverable_id_key', 'post_metrics', type_='unique')

    # Make deliverable_id nullable (so we can use it for both types)
    op.alter_column('post_metrics', 'deliverable_id',
                    existing_type=sa.INTEGER(),
                    nullable=True)

    # Add deliverable_type column
    op.add_column('post_metrics', sa.Column('deliverable_type', sa.String(length=20), nullable=True))

    # Set existing records to 'milestone' type
    op.execute("UPDATE post_metrics SET deliverable_type = 'milestone' WHERE deliverable_id IS NOT NULL")

    # Make deliverable_type non-nullable now that we've backfilled
    op.alter_column('post_metrics', 'deliverable_type',
                    existing_type=sa.String(length=20),
                    nullable=False)

    # Create composite unique constraint (one metrics record per deliverable, regardless of type)
    op.create_unique_constraint('uq_post_metrics_deliverable', 'post_metrics', ['deliverable_id', 'deliverable_type'])

    # Add index for efficient queries
    op.create_index('ix_post_metrics_deliverable_type', 'post_metrics', ['deliverable_type'])


def downgrade():
    """Revert post_metrics changes"""
    op.drop_index('ix_post_metrics_deliverable_type', table_name='post_metrics')
    op.drop_constraint('uq_post_metrics_deliverable', 'post_metrics', type_='unique')

    # Remove deliverable_type column
    op.drop_column('post_metrics', 'deliverable_type')

    # Make deliverable_id non-nullable again
    op.alter_column('post_metrics', 'deliverable_id',
                    existing_type=sa.INTEGER(),
                    nullable=False)

    # Restore original unique constraint
    op.create_unique_constraint('post_metrics_deliverable_id_key', 'post_metrics', ['deliverable_id'])
