"""Rebuild campaign system from scratch

Revision ID: 202603261000
Revises: 202603251500
Create Date: 2026-03-26 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '202603261000'
down_revision = '202603251500'
branch_labels = None
depends_on = None


def upgrade():
    """Drop old campaign tables and create new ones with proper schema"""

    # Drop old tables (CASCADE to handle foreign keys)
    print("Dropping old campaign tables...")
    op.execute("DROP TABLE IF EXISTS campaign_milestones CASCADE")
    op.execute("DROP TABLE IF EXISTS campaign_proposals CASCADE")
    op.execute("DROP TABLE IF EXISTS campaign_packages CASCADE")
    op.execute("DROP TABLE IF EXISTS campaigns CASCADE")

    print("Creating new campaigns table...")
    # Create new campaigns table with proper NULL handling
    op.create_table('campaigns',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('brand_id', sa.Integer(), nullable=False),
        sa.Column('brief_id', sa.Integer(), nullable=True),

        # Basic Info
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('category', sa.String(length=100), nullable=True),

        # Campaign Brief Fields
        sa.Column('campaign_objective', sa.String(length=100), nullable=True),
        sa.Column('target_audience', sa.Text(), nullable=True),
        sa.Column('content_guidelines', sa.Text(), nullable=True),

        # Participation Mode
        sa.Column('participation_mode', sa.String(length=20), nullable=False, server_default='proposals'),
        sa.Column('allows_applications', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('allows_packages', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('requires_milestones', sa.Boolean(), nullable=False, server_default='true'),

        # Budget - CRITICAL: NULL handling based on participation_mode
        sa.Column('budget', sa.Numeric(precision=12, scale=2), nullable=True),  # NULL for proposals mode
        sa.Column('budget_min', sa.Numeric(precision=12, scale=2), nullable=True),  # NULL for packages mode
        sa.Column('budget_max', sa.Numeric(precision=12, scale=2), nullable=True),  # NULL for packages mode

        # Timeline
        sa.Column('start_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('end_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('application_deadline', sa.DateTime(timezone=True), nullable=True),
        sa.Column('timeline_days', sa.Integer(), nullable=True),

        # Targeting
        sa.Column('target_categories', postgresql.ARRAY(sa.Text()), server_default='{}'),
        sa.Column('target_locations', postgresql.ARRAY(sa.Text()), server_default='{}'),
        sa.Column('target_min_followers', sa.Integer(), nullable=True),
        sa.Column('target_max_followers', sa.Integer(), nullable=True),

        # Status
        sa.Column('status', sa.String(length=20), nullable=False, server_default='draft'),

        # Timestamps
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),

        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['brand_id'], ['brand_profiles.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['brief_id'], ['briefs.id'], ondelete='SET NULL')
    )

    # Create indexes
    op.create_index('idx_campaigns_brand_id', 'campaigns', ['brand_id'])
    op.create_index('idx_campaigns_status', 'campaigns', ['status'])
    op.create_index('idx_campaigns_participation_mode', 'campaigns', ['participation_mode'])

    print("Creating new campaign_milestones table...")
    # Create campaign_milestones table
    op.create_table('campaign_milestones',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('campaign_id', sa.Integer(), nullable=False),
        sa.Column('milestone_number', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('deliverables', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='[]'),
        sa.Column('budget_allocation', sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column('duration_days', sa.Integer(), nullable=True),
        sa.Column('due_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),

        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['campaign_id'], ['campaigns.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('campaign_id', 'milestone_number', name='uq_campaign_milestone_number')
    )

    op.create_index('idx_campaign_milestones_campaign_id', 'campaign_milestones', ['campaign_id'])

    print("Creating new campaign_proposals table...")
    # Create campaign_proposals table
    op.create_table('campaign_proposals',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('campaign_id', sa.Integer(), nullable=False),
        sa.Column('creator_id', sa.Integer(), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='pending'),
        sa.Column('proposed_price', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('proposal_message', sa.Text(), nullable=True),
        sa.Column('deliverables', sa.Text(), nullable=True),
        sa.Column('delivery_timeline_days', sa.Integer(), nullable=True),
        sa.Column('brand_notes', sa.Text(), nullable=True),
        sa.Column('booking_id', sa.Integer(), nullable=True),
        sa.Column('applied_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('reviewed_at', sa.DateTime(timezone=True), nullable=True),

        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['campaign_id'], ['campaigns.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['creator_id'], ['creator_profiles.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['booking_id'], ['bookings.id'], ondelete='SET NULL'),
        sa.UniqueConstraint('campaign_id', 'creator_id', name='uq_campaign_creator_proposal')
    )

    op.create_index('idx_campaign_proposals_campaign_id', 'campaign_proposals', ['campaign_id'])
    op.create_index('idx_campaign_proposals_creator_id', 'campaign_proposals', ['creator_id'])
    op.create_index('idx_campaign_proposals_status', 'campaign_proposals', ['status'])

    print("Creating new campaign_packages association table...")
    # Create campaign_packages association table
    op.create_table('campaign_packages',
        sa.Column('campaign_id', sa.Integer(), nullable=False),
        sa.Column('package_id', sa.Integer(), nullable=False),
        sa.Column('booking_id', sa.Integer(), nullable=True),
        sa.Column('added_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),

        sa.PrimaryKeyConstraint('campaign_id', 'package_id'),
        sa.ForeignKeyConstraint(['campaign_id'], ['campaigns.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['package_id'], ['packages.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['booking_id'], ['bookings.id'], ondelete='SET NULL')
    )

    op.create_index('idx_campaign_packages_campaign_id', 'campaign_packages', ['campaign_id'])
    op.create_index('idx_campaign_packages_package_id', 'campaign_packages', ['package_id'])

    print("✅ Campaign system rebuild complete!")


def downgrade():
    """Rollback the campaign system rebuild"""
    print("Rolling back campaign system rebuild...")

    op.drop_table('campaign_packages')
    op.drop_table('campaign_proposals')
    op.drop_table('campaign_milestones')
    op.drop_table('campaigns')

    print("⏪ Rollback complete")
