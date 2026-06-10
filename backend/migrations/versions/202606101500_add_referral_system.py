"""Add referral attribution, rewards, and account credits.

Revision ID: 202606101500
Revises: 202606101000
Create Date: 2026-06-10 15:00:00
"""
from alembic import op
import sqlalchemy as sa


revision = '202606101500'
down_revision = '202606101000'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'referral_codes',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('code', sa.String(length=20), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('user_id'),
        sa.UniqueConstraint('code'),
    )
    op.create_index('ix_referral_codes_user_id', 'referral_codes', ['user_id'])
    op.create_index('ix_referral_codes_code', 'referral_codes', ['code'])

    op.create_table(
        'referral_clicks',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('referral_code_id', sa.Integer(), nullable=False),
        sa.Column('visitor_hash', sa.String(length=64)),
        sa.Column('referrer_url', sa.String(length=500)),
        sa.Column('user_agent', sa.String(length=500)),
        sa.Column('source', sa.String(length=80)),
        sa.Column('clicked_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['referral_code_id'], ['referral_codes.id'], ondelete='CASCADE'),
    )
    op.create_index('ix_referral_clicks_referral_code_id', 'referral_clicks', ['referral_code_id'])
    op.create_index('ix_referral_clicks_visitor_hash', 'referral_clicks', ['visitor_hash'])
    op.create_index('ix_referral_clicks_clicked_at', 'referral_clicks', ['clicked_at'])

    op.create_table(
        'referrals',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('referral_code_id', sa.Integer(), nullable=False),
        sa.Column('referrer_user_id', sa.Integer(), nullable=False),
        sa.Column('referred_user_id', sa.Integer(), nullable=False),
        sa.Column('referred_user_type', sa.String(length=20), nullable=False),
        sa.Column('status', sa.String(length=30), nullable=False, server_default='signed_up'),
        sa.Column('signed_up_at', sa.DateTime(), nullable=False),
        sa.Column('activated_at', sa.DateTime()),
        sa.Column('qualification_due_at', sa.DateTime()),
        sa.Column('qualified_at', sa.DateTime()),
        sa.Column('first_paid_at', sa.DateTime()),
        sa.Column('first_paid_plan_slug', sa.String(length=80)),
        sa.Column('disqualification_reason', sa.String(length=255)),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['referral_code_id'], ['referral_codes.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['referrer_user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['referred_user_id'], ['users.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('referred_user_id'),
    )
    for column in ('referral_code_id', 'referrer_user_id', 'referred_user_id', 'status', 'qualification_due_at'):
        op.create_index(f'ix_referrals_{column}', 'referrals', [column])

    op.create_table(
        'referral_rewards',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('referral_id', sa.Integer()),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('reward_key', sa.String(length=100), nullable=False),
        sa.Column('reward_type', sa.String(length=40), nullable=False),
        sa.Column('amount', sa.Numeric(10, 2)),
        sa.Column('value', sa.String(length=100)),
        sa.Column('status', sa.String(length=30), nullable=False, server_default='active'),
        sa.Column('starts_at', sa.DateTime()),
        sa.Column('ends_at', sa.DateTime()),
        sa.Column('metadata_json', sa.JSON()),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['referral_id'], ['referrals.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('user_id', 'reward_key', name='uq_referral_reward_user_key'),
    )
    op.create_index('ix_referral_rewards_referral_id', 'referral_rewards', ['referral_id'])
    op.create_index('ix_referral_rewards_user_id', 'referral_rewards', ['user_id'])

    op.create_table(
        'account_credit_transactions',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('referral_reward_id', sa.Integer()),
        sa.Column('amount', sa.Numeric(10, 2), nullable=False),
        sa.Column('transaction_type', sa.String(length=30), nullable=False),
        sa.Column('status', sa.String(length=30), nullable=False, server_default='available'),
        sa.Column('reference', sa.String(length=120), unique=True),
        sa.Column('description', sa.String(length=255)),
        sa.Column('metadata_json', sa.JSON()),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['referral_reward_id'], ['referral_rewards.id'], ondelete='SET NULL'),
    )
    op.create_index('ix_account_credit_transactions_user_id', 'account_credit_transactions', ['user_id'])
    op.create_index('ix_account_credit_transactions_referral_reward_id', 'account_credit_transactions', ['referral_reward_id'])
    op.create_index('ix_account_credit_transactions_created_at', 'account_credit_transactions', ['created_at'])

    op.create_table(
        'referral_fulfillment_tasks',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('referral_reward_id', sa.Integer(), nullable=False),
        sa.Column('task_type', sa.String(length=50), nullable=False),
        sa.Column('status', sa.String(length=30), nullable=False, server_default='requested'),
        sa.Column('notes', sa.Text()),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('completed_at', sa.DateTime()),
        sa.ForeignKeyConstraint(['referral_reward_id'], ['referral_rewards.id'], ondelete='CASCADE'),
    )
    op.create_index('ix_referral_fulfillment_tasks_referral_reward_id', 'referral_fulfillment_tasks', ['referral_reward_id'])


def downgrade():
    op.drop_table('referral_fulfillment_tasks')
    op.drop_table('account_credit_transactions')
    op.drop_table('referral_rewards')
    op.drop_table('referrals')
    op.drop_table('referral_clicks')
    op.drop_table('referral_codes')
