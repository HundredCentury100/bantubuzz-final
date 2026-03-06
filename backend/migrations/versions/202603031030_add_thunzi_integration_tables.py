"""add thunzi integration tables

Revision ID: 202603031030
Revises: 202603021009
Create Date: 2026-03-03 10:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '202603031030'
down_revision = '202603021009'
branch_labels = None
depends_on = None


def upgrade():
    # Create thunzi_accounts table
    op.create_table('thunzi_accounts',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('thunzi_user_id', sa.Integer(), nullable=True),
        sa.Column('thunzi_company_id', sa.Integer(), nullable=True),
        sa.Column('thunzi_email', sa.String(length=255), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id')
    )

    # Create connected_platforms table
    op.create_table('connected_platforms',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('thunzi_platform_id', sa.Integer(), nullable=True),
        sa.Column('platform', sa.String(length=20), nullable=False),
        sa.Column('account_name', sa.String(length=255), nullable=True),
        sa.Column('account_id', sa.String(length=255), nullable=True),
        sa.Column('account_id_secondary', sa.String(length=255), nullable=True),
        sa.Column('profile_url', sa.String(length=500), nullable=True),
        sa.Column('followers', sa.Integer(), nullable=True),
        sa.Column('posts', sa.Integer(), nullable=True),
        sa.Column('is_connected', sa.Boolean(), nullable=True),
        sa.Column('sync_status', sa.String(length=20), nullable=True),
        sa.Column('last_synced_at', sa.DateTime(), nullable=True),
        sa.Column('access_token', sa.Text(), nullable=True),
        sa.Column('refresh_token', sa.Text(), nullable=True),
        sa.Column('token_expiry', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade():
    op.drop_table('connected_platforms')
    op.drop_table('thunzi_accounts')
