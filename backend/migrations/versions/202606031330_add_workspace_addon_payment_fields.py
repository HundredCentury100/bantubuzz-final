"""Add workspace addon payment fields.

Revision ID: 202606031330
Revises: 202606031200
Create Date: 2026-06-03 13:30:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = '202606031330'
down_revision = '202606031200'
branch_labels = None
depends_on = None


def _has_column(table_name, column_name):
    inspector = sa.inspect(op.get_bind())
    return any(column['name'] == column_name for column in inspector.get_columns(table_name))


def upgrade():
    if not _has_column('workspace_addons', 'payment_method'):
        op.add_column('workspace_addons', sa.Column('payment_method', sa.String(length=30), nullable=True))
    if not _has_column('workspace_addons', 'payment_status'):
        op.add_column('workspace_addons', sa.Column('payment_status', sa.String(length=30), nullable=True))
    if not _has_column('workspace_addons', 'payment_proof_path'):
        op.add_column('workspace_addons', sa.Column('payment_proof_path', sa.String(length=255), nullable=True))
    if not _has_column('workspace_addons', 'payment_reference'):
        op.add_column('workspace_addons', sa.Column('payment_reference', sa.String(length=120), nullable=True))
    if not _has_column('workspace_addons', 'smilepay_order_reference'):
        op.add_column('workspace_addons', sa.Column('smilepay_order_reference', sa.String(length=100), nullable=True))


def downgrade():
    if _has_column('workspace_addons', 'smilepay_order_reference'):
        op.drop_column('workspace_addons', 'smilepay_order_reference')
    if _has_column('workspace_addons', 'payment_reference'):
        op.drop_column('workspace_addons', 'payment_reference')
    if _has_column('workspace_addons', 'payment_proof_path'):
        op.drop_column('workspace_addons', 'payment_proof_path')
    if _has_column('workspace_addons', 'payment_status'):
        op.drop_column('workspace_addons', 'payment_status')
    if _has_column('workspace_addons', 'payment_method'):
        op.drop_column('workspace_addons', 'payment_method')
