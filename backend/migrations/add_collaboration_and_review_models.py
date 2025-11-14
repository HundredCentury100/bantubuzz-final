"""
Migration script to add Collaboration and Review models,
and update CampaignApplication to a full model with pricing and deliverables
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

def upgrade():
    # Drop the old campaign_applications table if it exists
    # We'll recreate it as a proper model table
    op.execute('DROP TABLE IF EXISTS campaign_applications')

    # Create new campaign_applications table as a full model
    op.create_table(
        'campaign_applications',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('campaign_id', sa.Integer(), nullable=False),
        sa.Column('creator_id', sa.Integer(), nullable=False),
        sa.Column('status', sa.String(20), nullable=True, server_default='pending'),
        sa.Column('application_message', sa.Text(), nullable=True),
        sa.Column('proposed_price', sa.Float(), nullable=False),
        sa.Column('deliverables', sa.JSON(), nullable=True),
        sa.Column('applied_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['campaign_id'], ['campaigns.id'], ),
        sa.ForeignKeyConstraint(['creator_id'], ['creator_profiles.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # Create collaborations table
    op.create_table(
        'collaborations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('collaboration_type', sa.String(20), nullable=False),
        sa.Column('campaign_application_id', sa.Integer(), nullable=True),
        sa.Column('booking_id', sa.Integer(), nullable=True),
        sa.Column('brand_id', sa.Integer(), nullable=False),
        sa.Column('creator_id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('amount', sa.Float(), nullable=False),
        sa.Column('status', sa.String(20), nullable=True, server_default='in_progress'),
        sa.Column('progress_percentage', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('deliverables', sa.JSON(), nullable=True),
        sa.Column('submitted_deliverables', sa.JSON(), nullable=True),
        sa.Column('start_date', sa.DateTime(), nullable=False),
        sa.Column('expected_completion_date', sa.DateTime(), nullable=True),
        sa.Column('actual_completion_date', sa.DateTime(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('last_update', sa.Text(), nullable=True),
        sa.Column('last_update_date', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['campaign_application_id'], ['campaign_applications.id'], ),
        sa.ForeignKeyConstraint(['booking_id'], ['bookings.id'], ),
        sa.ForeignKeyConstraint(['brand_id'], ['brand_profiles.id'], ),
        sa.ForeignKeyConstraint(['creator_id'], ['creator_profiles.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # Create reviews table
    op.create_table(
        'reviews',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('brand_id', sa.Integer(), nullable=False),
        sa.Column('creator_id', sa.Integer(), nullable=False),
        sa.Column('collaboration_id', sa.Integer(), nullable=False),
        sa.Column('rating', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(200), nullable=True),
        sa.Column('comment', sa.Text(), nullable=False),
        sa.Column('communication_rating', sa.Integer(), nullable=True),
        sa.Column('quality_rating', sa.Integer(), nullable=True),
        sa.Column('professionalism_rating', sa.Integer(), nullable=True),
        sa.Column('timeliness_rating', sa.Integer(), nullable=True),
        sa.Column('would_recommend', sa.Boolean(), nullable=True, server_default='1'),
        sa.Column('creator_response', sa.Text(), nullable=True),
        sa.Column('creator_response_date', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['brand_id'], ['brand_profiles.id'], ),
        sa.ForeignKeyConstraint(['creator_id'], ['creator_profiles.id'], ),
        sa.ForeignKeyConstraint(['collaboration_id'], ['collaborations.id'], ),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade():
    # Drop the new tables
    op.drop_table('reviews')
    op.drop_table('collaborations')

    # Recreate old campaign_applications as association table
    op.execute('DROP TABLE IF EXISTS campaign_applications')
    op.create_table(
        'campaign_applications',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('campaign_id', sa.Integer(), nullable=False),
        sa.Column('creator_id', sa.Integer(), nullable=False),
        sa.Column('status', sa.String(20), nullable=True, server_default='pending'),
        sa.Column('application_message', sa.Text(), nullable=True),
        sa.Column('applied_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['campaign_id'], ['campaigns.id'], ),
        sa.ForeignKeyConstraint(['creator_id'], ['creator_profiles.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
