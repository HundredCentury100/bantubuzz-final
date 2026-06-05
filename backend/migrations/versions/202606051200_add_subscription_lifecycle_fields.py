"""Add subscription lifecycle fields.

Revision ID: 202606051200
Revises: 202606051000
Create Date: 2026-06-05 12:00:00
"""
from alembic import op
import sqlalchemy as sa


revision = '202606051200'
down_revision = '202606051000'
branch_labels = None
depends_on = None


def _has_column(table_name, column_name):
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return column_name in [column['name'] for column in inspector.get_columns(table_name)]


def upgrade():
    columns = [
        ('auto_renew', sa.Column('auto_renew', sa.Boolean(), nullable=True, server_default=sa.text('true'))),
        ('renewal_reminder_sent_at', sa.Column('renewal_reminder_sent_at', sa.DateTime(), nullable=True)),
        ('retry_count', sa.Column('retry_count', sa.Integer(), nullable=True, server_default='0')),
        ('next_retry_at', sa.Column('next_retry_at', sa.DateTime(), nullable=True)),
        ('last_retry_at', sa.Column('last_retry_at', sa.DateTime(), nullable=True)),
        ('failed_at', sa.Column('failed_at', sa.DateTime(), nullable=True)),
        ('pending_plan_id', sa.Column('pending_plan_id', sa.Integer(), nullable=True)),
        ('pending_billing_cycle', sa.Column('pending_billing_cycle', sa.String(length=20), nullable=True)),
        ('pending_change_type', sa.Column('pending_change_type', sa.String(length=20), nullable=True)),
        ('pending_proration_amount', sa.Column('pending_proration_amount', sa.Numeric(10, 2), nullable=True)),
        ('pending_change_effective_at', sa.Column('pending_change_effective_at', sa.DateTime(), nullable=True)),
        ('pending_change_created_at', sa.Column('pending_change_created_at', sa.DateTime(), nullable=True)),
    ]

    for column_name, column in columns:
        if not _has_column('subscriptions', column_name):
            op.add_column('subscriptions', column)

    bind = op.get_bind()
    inspector = sa.inspect(bind)
    fk_names = {fk['name'] for fk in inspector.get_foreign_keys('subscriptions')}
    if 'fk_subscriptions_pending_plan_id' not in fk_names:
        op.create_foreign_key(
            'fk_subscriptions_pending_plan_id',
            'subscriptions',
            'subscription_plans',
            ['pending_plan_id'],
            ['id'],
            ondelete='SET NULL',
        )


def downgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    fk_names = {fk['name'] for fk in inspector.get_foreign_keys('subscriptions')}
    if 'fk_subscriptions_pending_plan_id' in fk_names:
        op.drop_constraint('fk_subscriptions_pending_plan_id', 'subscriptions', type_='foreignkey')

    for column_name in [
        'pending_change_created_at',
        'pending_change_effective_at',
        'pending_proration_amount',
        'pending_change_type',
        'pending_billing_cycle',
        'pending_plan_id',
        'failed_at',
        'last_retry_at',
        'next_retry_at',
        'retry_count',
        'renewal_reminder_sent_at',
        'auto_renew',
    ]:
        if _has_column('subscriptions', column_name):
            op.drop_column('subscriptions', column_name)
