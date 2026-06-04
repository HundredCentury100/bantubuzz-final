"""Add brand subscription payment verification fields.

Revision ID: 202606031200
Revises: 202606021000
Create Date: 2026-06-03 12:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = '202606031200'
down_revision = '202606021000'
branch_labels = None
depends_on = None


def _has_column(table_name, column_name):
    inspector = sa.inspect(op.get_bind())
    return any(column['name'] == column_name for column in inspector.get_columns(table_name))


def upgrade():
    if not _has_column('subscriptions', 'payment_status'):
        op.add_column('subscriptions', sa.Column('payment_status', sa.String(length=30), nullable=True))

    if not _has_column('subscriptions', 'payment_verified'):
        op.add_column('subscriptions', sa.Column('payment_verified', sa.Boolean(), server_default=sa.text('false'), nullable=True))

    if not _has_column('subscriptions', 'payment_proof_path'):
        op.add_column('subscriptions', sa.Column('payment_proof_path', sa.String(length=255), nullable=True))

    if not _has_column('subscriptions', 'smilepay_order_reference'):
        op.add_column('subscriptions', sa.Column('smilepay_order_reference', sa.String(length=100), nullable=True))


def downgrade():
    if _has_column('subscriptions', 'smilepay_order_reference'):
        op.drop_column('subscriptions', 'smilepay_order_reference')

    if _has_column('subscriptions', 'payment_proof_path'):
        op.drop_column('subscriptions', 'payment_proof_path')

    if _has_column('subscriptions', 'payment_verified'):
        op.drop_column('subscriptions', 'payment_verified')

    if _has_column('subscriptions', 'payment_status'):
        op.drop_column('subscriptions', 'payment_status')
