"""unified campaign system

Revision ID: 202603201400
Revises: 202603171100
Create Date: 2026-03-20 14:00:00.000000

This migration enhances the Campaign model with:
1. Structured Campaign Brief fields
2. Participation modes (packages vs proposals)
3. Enhanced targeting and timeline fields
4. Campaign Milestones table

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '202603201400'
down_revision = '202603171100'
branch_labels = None
depends_on = None


def upgrade():
    # ========================================
    # 1. Add Campaign Brief fields to campaigns table
    # ========================================

    # Campaign Objective (Required)
    op.add_column('campaigns', sa.Column('campaign_objective', sa.Text(), nullable=True))

    # Target Audience (JSON)
    op.add_column('campaigns', sa.Column('target_audience', postgresql.JSON(astext_type=sa.Text()), nullable=True))

    # Key Message (Required)
    op.add_column('campaigns', sa.Column('key_message', sa.Text(), nullable=True))

    # Required Mentions (JSON)
    op.add_column('campaigns', sa.Column('required_mentions', postgresql.JSON(astext_type=sa.Text()), nullable=True))

    # Content Guidelines
    op.add_column('campaigns', sa.Column('content_guidelines', sa.Text(), nullable=True))

    # ========================================
    # 2. Add Participation Mode fields
    # ========================================

    # Participation mode: 'packages' or 'proposals'
    op.add_column('campaigns', sa.Column('participation_mode', sa.String(length=20), nullable=True))

    # Whether campaign accepts applications/proposals
    op.add_column('campaigns', sa.Column('allows_applications', sa.Boolean(), nullable=True, server_default='true'))

    # ========================================
    # 3. Add Budget fields for proposal mode
    # ========================================

    # Budget range for proposals (keep existing 'budget' for packages mode)
    op.add_column('campaigns', sa.Column('budget_min', sa.Numeric(precision=10, scale=2), nullable=True))
    op.add_column('campaigns', sa.Column('budget_max', sa.Numeric(precision=10, scale=2), nullable=True))

    # ========================================
    # 4. Add Timeline fields
    # ========================================

    # How long creators have to deliver (in days)
    op.add_column('campaigns', sa.Column('timeline_days', sa.Integer(), nullable=True))

    # ========================================
    # 5. Add Targeting fields (from Briefs)
    # ========================================

    # Target categories
    op.add_column('campaigns', sa.Column('target_categories', postgresql.JSON(astext_type=sa.Text()), nullable=True))

    # Follower range
    op.add_column('campaigns', sa.Column('target_min_followers', sa.Integer(), nullable=True))
    op.add_column('campaigns', sa.Column('target_max_followers', sa.Integer(), nullable=True))

    # Target locations
    op.add_column('campaigns', sa.Column('target_locations', postgresql.JSON(astext_type=sa.Text()), nullable=True))

    # ========================================
    # 6. Enhance existing Campaign Milestones table
    # ========================================

    # Note: campaign_milestones table already exists from Brief implementation
    # We'll add due_date and updated_at columns if they don't exist

    # Check and add due_date column (milestones need due dates for tracking)
    try:
        op.add_column('campaign_milestones', sa.Column('due_date', sa.DateTime(), nullable=True))
    except:
        pass  # Column may already exist

    # Check and add updated_at column
    try:
        op.add_column('campaign_milestones', sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True))
    except:
        pass  # Column may already exist

    # Rename 'title' to 'name' for consistency
    try:
        op.alter_column('campaign_milestones', 'title', new_column_name='name', existing_type=sa.String(length=200))
    except:
        pass  # May have been renamed already

    # Rename 'expected_deliverables' to 'deliverables' for consistency
    try:
        op.alter_column('campaign_milestones', 'expected_deliverables', new_column_name='deliverables', existing_type=postgresql.JSON(astext_type=sa.Text()))
    except:
        pass  # May have been renamed already

    # ========================================
    # 7. Rename campaign_applications to campaign_proposals
    # ========================================

    op.rename_table('campaign_applications', 'campaign_proposals')

    # Rename columns for clarity
    op.alter_column('campaign_proposals', 'application_message',
                    new_column_name='proposal_message',
                    existing_type=sa.Text())

    # Add delivery_timeline_days field
    op.add_column('campaign_proposals', sa.Column('delivery_timeline_days', sa.Integer(), nullable=True))

    # Add brand notes and review fields
    op.add_column('campaign_proposals', sa.Column('brand_notes', sa.Text(), nullable=True))
    op.add_column('campaign_proposals', sa.Column('reviewed_at', sa.DateTime(), nullable=True))

    # ========================================
    # 8. Set default values for existing campaigns
    # ========================================

    # Update existing campaigns to have participation_mode
    op.execute("""
        UPDATE campaigns
        SET participation_mode = 'packages',
            allows_applications = false,
            campaign_objective = description,
            key_message = description
        WHERE participation_mode IS NULL
    """)


def downgrade():
    # ========================================
    # Reverse all changes
    # ========================================

    # Revert campaign milestones changes (but don't drop table - it existed before)
    try:
        op.alter_column('campaign_milestones', 'deliverables', new_column_name='expected_deliverables', existing_type=postgresql.JSON(astext_type=sa.Text()))
    except:
        pass

    try:
        op.alter_column('campaign_milestones', 'name', new_column_name='title', existing_type=sa.String(length=200))
    except:
        pass

    try:
        op.drop_column('campaign_milestones', 'updated_at')
    except:
        pass

    try:
        op.drop_column('campaign_milestones', 'due_date')
    except:
        pass

    # Remove proposal fields
    op.drop_column('campaign_proposals', 'reviewed_at')
    op.drop_column('campaign_proposals', 'brand_notes')
    op.drop_column('campaign_proposals', 'delivery_timeline_days')

    # Rename back to applications
    op.alter_column('campaign_proposals', 'proposal_message',
                    new_column_name='application_message',
                    existing_type=sa.Text())
    op.rename_table('campaign_proposals', 'campaign_applications')

    # Remove targeting fields
    op.drop_column('campaigns', 'target_locations')
    op.drop_column('campaigns', 'target_max_followers')
    op.drop_column('campaigns', 'target_min_followers')
    op.drop_column('campaigns', 'target_categories')

    # Remove timeline fields
    op.drop_column('campaigns', 'timeline_days')

    # Remove budget fields
    op.drop_column('campaigns', 'budget_max')
    op.drop_column('campaigns', 'budget_min')

    # Remove participation mode fields
    op.drop_column('campaigns', 'allows_applications')
    op.drop_column('campaigns', 'participation_mode')

    # Remove campaign brief fields
    op.drop_column('campaigns', 'content_guidelines')
    op.drop_column('campaigns', 'required_mentions')
    op.drop_column('campaigns', 'key_message')
    op.drop_column('campaigns', 'target_audience')
    op.drop_column('campaigns', 'campaign_objective')
