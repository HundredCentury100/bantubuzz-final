"""Add admin account controls

Revision ID: 202607131500
Revises: 202606251000
Create Date: 2026-07-13 15:00:00
"""
from alembic import op
import sqlalchemy as sa


revision = '202607131500'
down_revision = '202606251000'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if not inspector.has_table('account_fee_overrides'):
        op.create_table(
            'account_fee_overrides',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
            sa.Column('override_type', sa.String(length=40), nullable=False),
            sa.Column('percentage', sa.Numeric(5, 2), nullable=False),
            sa.Column('starts_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
            sa.Column('ends_at', sa.DateTime(), nullable=True),
            sa.Column('reason', sa.Text(), nullable=True),
            sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
            sa.Column('created_by_admin_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
            sa.Column('updated_at', sa.DateTime(), nullable=True),
        )
        op.create_index('ix_account_fee_overrides_user_type', 'account_fee_overrides', ['user_id', 'override_type'])
        op.create_index('ix_account_fee_overrides_active', 'account_fee_overrides', ['is_active'])

    bind.execute(sa.text("""
        UPDATE subscription_plans
        SET name = 'Creator Pro'
        WHERE user_type = 'creator' AND name = 'Pro Creator'
    """))
    bind.execute(sa.text("""
        UPDATE subscription_plans
        SET badge_label = 'Creator Pro'
        WHERE user_type = 'creator' AND badge_label = 'Pro Creator'
    """))


def downgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if inspector.has_table('account_fee_overrides'):
        op.drop_index('ix_account_fee_overrides_active', table_name='account_fee_overrides')
        op.drop_index('ix_account_fee_overrides_user_type', table_name='account_fee_overrides')
        op.drop_table('account_fee_overrides')

    bind.execute(sa.text("""
        UPDATE subscription_plans
        SET name = 'Pro Creator'
        WHERE user_type = 'creator' AND slug = 'pro-creator'
    """))
    bind.execute(sa.text("""
        UPDATE subscription_plans
        SET badge_label = 'Pro Creator'
        WHERE user_type = 'creator' AND slug = 'pro-creator'
    """))
