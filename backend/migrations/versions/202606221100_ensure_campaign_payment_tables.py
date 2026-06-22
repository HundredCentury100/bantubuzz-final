"""Ensure campaign payment tables exist.

Revision ID: 202606221100
Revises: 202606181300
Create Date: 2026-06-22 11:00:00
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = '202606221100'
down_revision = '202606181300'
branch_labels = None
depends_on = None


def _inspector():
    return sa.inspect(op.get_bind())


def _has_table(table_name):
    return _inspector().has_table(table_name)


def _has_column(table_name, column_name):
    if not _has_table(table_name):
        return False
    return column_name in [column['name'] for column in _inspector().get_columns(table_name)]


def _create_index_if_missing(index_name, table_name, columns):
    indexes = {index['name'] for index in _inspector().get_indexes(table_name)}
    if index_name not in indexes:
        op.create_index(index_name, table_name, columns)


def upgrade():
    if not _has_table('campaign_payments'):
        op.create_table(
            'campaign_payments',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('campaign_id', sa.Integer(), nullable=False),
            sa.Column('brand_user_id', sa.Integer(), nullable=False),
            sa.Column('workspace_id', sa.Integer(), nullable=True),
            sa.Column('payment_type', sa.String(length=20), nullable=False),
            sa.Column('total_amount', sa.Numeric(10, 2), nullable=False),
            sa.Column('platform_fee', sa.Numeric(10, 2), nullable=True, server_default='0'),
            sa.Column('net_amount', sa.Numeric(10, 2), nullable=False),
            sa.Column('payment_method', sa.String(length=50), nullable=True, server_default='paynow'),
            sa.Column('payment_reference', sa.String(length=100), nullable=True),
            sa.Column('paynow_poll_url', sa.String(length=500), nullable=True),
            sa.Column('status', sa.String(length=20), nullable=False, server_default='pending'),
            sa.Column('initiated_at', sa.DateTime(), nullable=True, server_default=sa.text('CURRENT_TIMESTAMP')),
            sa.Column('completed_at', sa.DateTime(), nullable=True),
            sa.Column('failed_reason', sa.Text(), nullable=True),
            sa.Column('payment_metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=True, server_default=sa.text('CURRENT_TIMESTAMP')),
            sa.Column('updated_at', sa.DateTime(), nullable=True, server_default=sa.text('CURRENT_TIMESTAMP')),
            sa.ForeignKeyConstraint(['brand_user_id'], ['users.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['campaign_id'], ['campaigns.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['workspace_id'], ['client_workspaces.id'], ondelete='SET NULL'),
            sa.PrimaryKeyConstraint('id'),
        )
    else:
        if not _has_column('campaign_payments', 'workspace_id'):
            op.add_column('campaign_payments', sa.Column('workspace_id', sa.Integer(), nullable=True))
            op.create_foreign_key(
                'fk_campaign_payments_workspace_id',
                'campaign_payments',
                'client_workspaces',
                ['workspace_id'],
                ['id'],
                ondelete='SET NULL',
            )
        if not _has_column('campaign_payments', 'payment_metadata'):
            op.add_column('campaign_payments', sa.Column('payment_metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=True))

    if not _has_table('campaign_payment_items'):
        op.create_table(
            'campaign_payment_items',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('campaign_payment_id', sa.Integer(), nullable=False),
            sa.Column('collaboration_id', sa.Integer(), nullable=False),
            sa.Column('creator_user_id', sa.Integer(), nullable=False),
            sa.Column('amount', sa.Numeric(10, 2), nullable=False),
            sa.Column('platform_fee', sa.Numeric(10, 2), nullable=True, server_default='0'),
            sa.Column('net_amount', sa.Numeric(10, 2), nullable=False),
            sa.Column('status', sa.String(length=20), nullable=False, server_default='pending'),
            sa.Column('paid_at', sa.DateTime(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=True, server_default=sa.text('CURRENT_TIMESTAMP')),
            sa.Column('updated_at', sa.DateTime(), nullable=True, server_default=sa.text('CURRENT_TIMESTAMP')),
            sa.ForeignKeyConstraint(['campaign_payment_id'], ['campaign_payments.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['collaboration_id'], ['collaborations.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['creator_user_id'], ['users.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('campaign_payment_id', 'collaboration_id', name='uq_campaign_payment_item_collaboration'),
        )

    if _has_table('campaign_payments'):
        _create_index_if_missing('idx_campaign_payments_campaign', 'campaign_payments', ['campaign_id'])
        _create_index_if_missing('idx_campaign_payments_brand', 'campaign_payments', ['brand_user_id'])
        _create_index_if_missing('idx_campaign_payments_status', 'campaign_payments', ['status'])
        _create_index_if_missing('idx_campaign_payments_type', 'campaign_payments', ['payment_type'])
        _create_index_if_missing('idx_campaign_payments_reference', 'campaign_payments', ['payment_reference'])
        _create_index_if_missing('ix_campaign_payments_workspace_id', 'campaign_payments', ['workspace_id'])

    if _has_table('campaign_payment_items'):
        _create_index_if_missing('idx_payment_items_payment', 'campaign_payment_items', ['campaign_payment_id'])
        _create_index_if_missing('idx_payment_items_collaboration', 'campaign_payment_items', ['collaboration_id'])
        _create_index_if_missing('idx_payment_items_creator', 'campaign_payment_items', ['creator_user_id'])
        _create_index_if_missing('idx_payment_items_status', 'campaign_payment_items', ['status'])

    if not _has_column('collaborations', 'payment_status'):
        op.add_column('collaborations', sa.Column('payment_status', sa.String(length=20), nullable=True, server_default='unpaid'))
    if not _has_column('collaborations', 'payment_id'):
        op.add_column('collaborations', sa.Column('payment_id', sa.Integer(), nullable=True))
        op.create_foreign_key(
            'fk_collaborations_payment_id',
            'collaborations',
            'campaign_payments',
            ['payment_id'],
            ['id'],
            ondelete='SET NULL',
        )
    _create_index_if_missing('idx_collaborations_payment_status', 'collaborations', ['payment_status'])
    _create_index_if_missing('idx_collaborations_payment_id', 'collaborations', ['payment_id'])


def downgrade():
    if _has_column('collaborations', 'payment_id'):
        op.drop_constraint('fk_collaborations_payment_id', 'collaborations', type_='foreignkey')
        op.drop_column('collaborations', 'payment_id')
    if _has_column('collaborations', 'payment_status'):
        op.drop_column('collaborations', 'payment_status')
    if _has_table('campaign_payment_items'):
        op.drop_table('campaign_payment_items')
    if _has_table('campaign_payments'):
        op.drop_table('campaign_payments')
