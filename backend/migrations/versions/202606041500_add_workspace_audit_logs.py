"""Add workspace team audit logs and seven day invitations.

Revision ID: 202606041500
Revises: 202606041300
Create Date: 2026-06-04 15:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = '202606041500'
down_revision = '202606041300'
branch_labels = None
depends_on = None


def _has_table(table_name):
    inspector = sa.inspect(op.get_bind())
    return table_name in inspector.get_table_names()


def _has_index(table_name, index_name):
    inspector = sa.inspect(op.get_bind())
    return any(index['name'] == index_name for index in inspector.get_indexes(table_name))


def upgrade():
    if not _has_table('workspace_audit_logs'):
        op.create_table(
            'workspace_audit_logs',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('workspace_id', sa.Integer(), nullable=False),
            sa.Column('actor_user_id', sa.Integer(), nullable=True),
            sa.Column('target_user_id', sa.Integer(), nullable=True),
            sa.Column('target_email', sa.String(length=120), nullable=False),
            sa.Column('action', sa.String(length=50), nullable=False),
            sa.Column('role', sa.String(length=30), nullable=True),
            sa.Column('details', sa.JSON(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(['actor_user_id'], ['users.id'], ondelete='SET NULL'),
            sa.ForeignKeyConstraint(['target_user_id'], ['users.id'], ondelete='SET NULL'),
            sa.ForeignKeyConstraint(['workspace_id'], ['client_workspaces.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id'),
        )

    indexes = [
        ('ix_workspace_audit_logs_workspace_id', ['workspace_id']),
        ('ix_workspace_audit_logs_actor_user_id', ['actor_user_id']),
        ('ix_workspace_audit_logs_target_user_id', ['target_user_id']),
        ('ix_workspace_audit_logs_target_email', ['target_email']),
    ]
    for index_name, columns in indexes:
        if not _has_index('workspace_audit_logs', index_name):
            op.create_index(index_name, 'workspace_audit_logs', columns, unique=False)


def downgrade():
    if _has_table('workspace_audit_logs'):
        op.drop_table('workspace_audit_logs')
