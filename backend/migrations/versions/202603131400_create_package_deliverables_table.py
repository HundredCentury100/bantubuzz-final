"""create package_deliverables table

Revision ID: 202603131400
Revises: 202603131300
Create Date: 2026-03-13 14:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '202603131400'
down_revision = '202603131300'
branch_labels = None
depends_on = None


def upgrade():
    """
    Create package_deliverables table to replace JSON storage in collaborations.submitted_deliverables

    This enables:
    1. Unified analytics system for both milestone and package collaborations
    2. Foreign key relationships with PostMetrics table
    3. Proper data integrity and indexing
    4. Efficient querying and filtering
    """
    op.create_table(
        'package_deliverables',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('collaboration_id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('url', sa.Text(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='pending_review'),
        sa.Column('submitted_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('approved_at', sa.DateTime(), nullable=True),
        sa.Column('revision_notes', sa.Text(), nullable=True),
        sa.Column('revision_requested_at', sa.DateTime(), nullable=True),

        # Post tracking fields (Phase 1: Analytics Integration)
        sa.Column('post_platform', sa.String(length=50), nullable=True),
        sa.Column('post_id', sa.String(length=255), nullable=True),
        sa.Column('thunzi_post_id', sa.Integer(), nullable=True),
        sa.Column('post_url_validated', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('url_submitted_at', sa.DateTime(), nullable=True),

        # Constraints
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['collaboration_id'], ['collaborations.id'], ondelete='CASCADE')
    )

    # Create indexes for performance
    op.create_index('ix_package_deliverables_collaboration_id', 'package_deliverables', ['collaboration_id'])
    op.create_index('ix_package_deliverables_status', 'package_deliverables', ['status'])
    op.create_index('ix_package_deliverables_post_url_validated', 'package_deliverables', ['post_url_validated'])


def downgrade():
    """Revert package_deliverables table creation"""
    op.drop_index('ix_package_deliverables_post_url_validated', table_name='package_deliverables')
    op.drop_index('ix_package_deliverables_status', table_name='package_deliverables')
    op.drop_index('ix_package_deliverables_collaboration_id', table_name='package_deliverables')
    op.drop_table('package_deliverables')
