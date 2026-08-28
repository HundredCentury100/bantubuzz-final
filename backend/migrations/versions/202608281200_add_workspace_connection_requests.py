"""Add explicit existing-brand agency connection requests.

Revision ID: 202608281200
Revises: 202608261000
Create Date: 2026-08-28 12:00:00.000000
"""
from alembic import op
import sqlalchemy as sa


revision = '202608281200'
down_revision = '202608261000'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if 'workspace_connection_requests' in inspector.get_table_names():
        return
    op.create_table(
        'workspace_connection_requests',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('workspace_id', sa.Integer(), sa.ForeignKey('client_workspaces.id', ondelete='CASCADE'), nullable=False, unique=True),
        sa.Column('client_brand_id', sa.Integer(), sa.ForeignKey('brand_profiles.id', ondelete='CASCADE'), nullable=False),
        sa.Column('requested_by_user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('token', sa.String(length=120), nullable=False, unique=True),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='pending'),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('responded_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
    )
    op.create_index('ix_workspace_connection_requests_client_brand_id', 'workspace_connection_requests', ['client_brand_id'])
    op.create_index('ix_workspace_connection_requests_status', 'workspace_connection_requests', ['status'])


def downgrade():
    op.drop_table('workspace_connection_requests')
