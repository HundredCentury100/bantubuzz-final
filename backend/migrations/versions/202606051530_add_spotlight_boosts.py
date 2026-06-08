"""Add spotlight boosts.

Revision ID: 202606051530
Revises: 202606051430
Create Date: 2026-06-05 15:30:00
"""
from alembic import op
import sqlalchemy as sa


revision = '202606051530'
down_revision = '202606051430'
branch_labels = None
depends_on = None


def _has_table(table_name):
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return table_name in inspector.get_table_names()


def upgrade():
    if not _has_table('spotlight_boosts'):
        op.create_table(
            'spotlight_boosts',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
            sa.Column('target_type', sa.String(length=20), nullable=False),
            sa.Column('target_id', sa.Integer(), nullable=False),
            sa.Column('duration_days', sa.Integer(), nullable=False),
            sa.Column('amount', sa.Numeric(10, 2), nullable=False),
            sa.Column('currency', sa.String(length=3), nullable=True, server_default='USD'),
            sa.Column('status', sa.String(length=20), nullable=False, server_default='active'),
            sa.Column('payment_method', sa.String(length=30), nullable=False, server_default='wallet'),
            sa.Column('payment_reference', sa.String(length=100), nullable=True),
            sa.Column('wallet_transaction_id', sa.Integer(), sa.ForeignKey('wallet_transactions.id'), nullable=True),
            sa.Column('starts_at', sa.DateTime(), nullable=False),
            sa.Column('ends_at', sa.DateTime(), nullable=False),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.Column('updated_at', sa.DateTime(), nullable=True),
        )
        op.create_index('ix_spotlight_boosts_user_id', 'spotlight_boosts', ['user_id'])
        op.create_index('ix_spotlight_boosts_target_id', 'spotlight_boosts', ['target_id'])
        op.create_index('ix_spotlight_boosts_target_active', 'spotlight_boosts', ['target_type', 'target_id', 'status', 'ends_at'])


def downgrade():
    if _has_table('spotlight_boosts'):
        op.drop_index('ix_spotlight_boosts_target_active', table_name='spotlight_boosts')
        op.drop_index('ix_spotlight_boosts_target_id', table_name='spotlight_boosts')
        op.drop_index('ix_spotlight_boosts_user_id', table_name='spotlight_boosts')
        op.drop_table('spotlight_boosts')
