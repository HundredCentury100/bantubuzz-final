"""Add Trust & Safety Phase 1 tables

Revision ID: 202603091200_trust_safety_phase1
Revises: (previous_migration_id)
Create Date: 2026-03-09 12:00:00.000000

Phase 1 Tables:
- user_blocks: Block relationships between users
- message_risk_signals: Risk scoring per user
- message_safety_warnings: Safety warning logs
- message_reports: Message reporting system

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '202603091200_trust_safety_phase1'
down_revision = None  # TODO: Update with your latest migration ID
branch_labels = None
depends_on = None


def upgrade():
    """Create Phase 1 Trust & Safety tables"""

    # 1. User Blocks Table
    op.create_table(
        'user_blocks',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('blocker_user_id', sa.Integer(), nullable=False),
        sa.Column('blocked_user_id', sa.Integer(), nullable=False),
        sa.Column('reason', sa.String(length=100), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('unblocked_at', sa.DateTime(), nullable=True),

        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['blocker_user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['blocked_user_id'], ['users.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('blocker_user_id', 'blocked_user_id', name='unique_block_pair')
    )

    # Indexes for user_blocks
    op.create_index('idx_user_blocks_blocker', 'user_blocks', ['blocker_user_id'])
    op.create_index('idx_user_blocks_blocked', 'user_blocks', ['blocked_user_id'])
    op.create_index('idx_user_blocks_active', 'user_blocks', ['is_active'])


    # 2. Message Risk Signals Table
    op.create_table(
        'message_risk_signals',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),

        # Risk Signals
        sa.Column('blocks_received_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('harassment_reports_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('contact_sharing_attempts_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('flagged_messages_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('false_reports_count', sa.Integer(), nullable=False, server_default='0'),

        # Risk Score (calculated)
        sa.Column('risk_score', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('risk_level', sa.String(length=20), nullable=False, server_default='low'),

        # Tracking Period
        sa.Column('tracking_period_start', sa.Date(), nullable=False, server_default=sa.text('CURRENT_DATE')),
        sa.Column('last_signal_detected_at', sa.DateTime(), nullable=True),

        # Metadata
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),

        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('user_id', name='unique_user_risk_signals')
    )

    # Indexes for message_risk_signals
    op.create_index('idx_risk_signals_user', 'message_risk_signals', ['user_id'])
    op.create_index('idx_risk_signals_level', 'message_risk_signals', ['risk_level'])
    op.create_index('idx_risk_signals_score', 'message_risk_signals', ['risk_score'])


    # 3. Message Safety Warnings Table
    op.create_table(
        'message_safety_warnings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('conversation_id', sa.String(length=100), nullable=False),

        # Warning Details
        sa.Column('warning_type', sa.String(length=50), nullable=False),
        sa.Column('message_content', sa.Text(), nullable=True),
        sa.Column('detected_patterns', postgresql.JSONB(astext_type=sa.Text()), nullable=True),

        # User Action
        sa.Column('user_action', sa.String(length=30), nullable=True),
        sa.Column('final_message_sent', sa.Text(), nullable=True),

        # Timestamps
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),

        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE')
    )

    # Indexes for message_safety_warnings
    op.create_index('idx_safety_warnings_user', 'message_safety_warnings', ['user_id'])
    op.create_index('idx_safety_warnings_type', 'message_safety_warnings', ['warning_type'])
    op.create_index('idx_safety_warnings_created', 'message_safety_warnings', ['created_at'])


    # 4. Message Reports Table
    op.create_table(
        'message_reports',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('report_number', sa.String(length=20), nullable=False),

        # Reporter & Reported
        sa.Column('reporter_id', sa.Integer(), nullable=False),
        sa.Column('reported_user_id', sa.Integer(), nullable=False),

        # Message Details
        sa.Column('conversation_id', sa.String(length=100), nullable=False),
        sa.Column('message_id', sa.String(length=100), nullable=False),
        sa.Column('message_content', sa.Text(), nullable=True),
        sa.Column('message_context', postgresql.JSONB(astext_type=sa.Text()), nullable=True),

        # Report Details
        sa.Column('report_category', sa.String(length=50), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),

        # Status
        sa.Column('status', sa.String(length=30), nullable=False, server_default='pending'),
        sa.Column('reviewed_by', sa.Integer(), nullable=True),

        # Safety Flags
        sa.Column('is_emergency', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('auto_escalated', sa.Boolean(), nullable=False, server_default='false'),

        # Actions Taken
        sa.Column('action_taken', sa.String(length=100), nullable=True),
        sa.Column('action_notes', sa.Text(), nullable=True),

        # Timestamps
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('reviewed_at', sa.DateTime(), nullable=True),
        sa.Column('action_taken_at', sa.DateTime(), nullable=True),

        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('report_number', name='unique_report_number'),
        sa.ForeignKeyConstraint(['reporter_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['reported_user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['reviewed_by'], ['users.id'], ondelete='SET NULL')
    )

    # Indexes for message_reports
    op.create_index('idx_message_reports_reporter', 'message_reports', ['reporter_id'])
    op.create_index('idx_message_reports_reported', 'message_reports', ['reported_user_id'])
    op.create_index('idx_message_reports_status', 'message_reports', ['status'])
    op.create_index('idx_message_reports_emergency', 'message_reports', ['is_emergency'])
    op.create_index('idx_message_reports_conversation', 'message_reports', ['conversation_id'])
    op.create_index('idx_message_reports_created', 'message_reports', ['created_at'])

    print("✅ Phase 1 Trust & Safety tables created successfully")


def downgrade():
    """Drop Phase 1 Trust & Safety tables"""

    # Drop tables in reverse order
    op.drop_table('message_reports')
    op.drop_table('message_safety_warnings')
    op.drop_table('message_risk_signals')
    op.drop_table('user_blocks')

    print("✅ Phase 1 Trust & Safety tables dropped successfully")
