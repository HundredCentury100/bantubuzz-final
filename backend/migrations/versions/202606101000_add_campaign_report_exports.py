"""Add campaign report schedules and public share links.

Revision ID: 202606101000
Revises: 202606091000
Create Date: 2026-06-10 10:00:00
"""
from alembic import op
import sqlalchemy as sa


revision = '202606101000'
down_revision = '202606091000'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'campaign_report_schedules',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('campaign_id', sa.Integer(), nullable=False),
        sa.Column('brand_user_id', sa.Integer(), nullable=False),
        sa.Column('frequency', sa.String(length=20), nullable=False),
        sa.Column('recipients', sa.JSON(), nullable=False),
        sa.Column('subject', sa.String(length=180)),
        sa.Column('date_range_mode', sa.String(length=20), nullable=False, server_default='last_30_days'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('next_run_at', sa.DateTime(), nullable=False),
        sa.Column('last_run_at', sa.DateTime()),
        sa.Column('last_status', sa.String(length=20)),
        sa.Column('last_error', sa.Text()),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['campaign_id'], ['campaigns.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['brand_user_id'], ['users.id'], ondelete='CASCADE'),
    )
    op.create_index('ix_campaign_report_schedules_campaign_id', 'campaign_report_schedules', ['campaign_id'])
    op.create_index('ix_campaign_report_schedules_brand_user_id', 'campaign_report_schedules', ['brand_user_id'])
    op.create_index('ix_campaign_report_schedules_next_run_at', 'campaign_report_schedules', ['next_run_at'])

    op.create_table(
        'campaign_report_shares',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('campaign_id', sa.Integer(), nullable=False),
        sa.Column('brand_user_id', sa.Integer(), nullable=False),
        sa.Column('token', sa.String(length=96), nullable=False),
        sa.Column('label', sa.String(length=120)),
        sa.Column('start_date', sa.Date()),
        sa.Column('end_date', sa.Date()),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('revoked_at', sa.DateTime()),
        sa.Column('last_viewed_at', sa.DateTime()),
        sa.Column('view_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['campaign_id'], ['campaigns.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['brand_user_id'], ['users.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('token', name='uq_campaign_report_share_token'),
    )
    op.create_index('ix_campaign_report_shares_campaign_id', 'campaign_report_shares', ['campaign_id'])
    op.create_index('ix_campaign_report_shares_brand_user_id', 'campaign_report_shares', ['brand_user_id'])
    op.create_index('ix_campaign_report_shares_token', 'campaign_report_shares', ['token'], unique=True)
    op.create_index('ix_campaign_report_shares_expires_at', 'campaign_report_shares', ['expires_at'])


def downgrade():
    op.drop_table('campaign_report_shares')
    op.drop_table('campaign_report_schedules')
