"""Add agency client workspaces

Revision ID: 202606021000
Revises: 202605271015
Create Date: 2026-06-02 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = '202606021000'
down_revision = '202605271015'
branch_labels = None
depends_on = None


def _has_table(table_name):
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return inspector.has_table(table_name)


def upgrade():
    op.add_column('brand_profiles', sa.Column('account_type', sa.String(length=20), nullable=False, server_default='brand'))
    op.add_column('brand_profiles', sa.Column('expected_workspace_count', sa.Integer(), nullable=True))
    op.add_column('brand_profiles', sa.Column('report_brand_color', sa.String(length=20), nullable=True, server_default='#B5E61D'))

    op.create_table(
        'client_workspaces',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('agency_brand_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=160), nullable=False),
        sa.Column('slug', sa.String(length=180), nullable=False),
        sa.Column('logo', sa.String(length=255), nullable=True),
        sa.Column('industry', sa.String(length=100), nullable=True),
        sa.Column('website', sa.String(length=255), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('billing_email', sa.String(length=120), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['agency_brand_id'], ['brand_profiles.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('agency_brand_id', 'slug', name='uq_client_workspace_agency_slug'),
    )
    op.create_index('ix_client_workspaces_agency_brand_id', 'client_workspaces', ['agency_brand_id'])

    op.create_table(
        'workspace_member_permissions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('workspace_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('role', sa.String(length=30), nullable=False, server_default='viewer'),
        sa.Column('permissions', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['workspace_id'], ['client_workspaces.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('workspace_id', 'user_id', name='uq_workspace_member_user'),
    )
    op.create_index('ix_workspace_member_permissions_user_id', 'workspace_member_permissions', ['user_id'])
    op.create_index('ix_workspace_member_permissions_workspace_id', 'workspace_member_permissions', ['workspace_id'])

    op.create_table(
        'workspace_invitations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('workspace_id', sa.Integer(), nullable=False),
        sa.Column('invited_by_user_id', sa.Integer(), nullable=True),
        sa.Column('email', sa.String(length=120), nullable=False),
        sa.Column('role', sa.String(length=30), nullable=False, server_default='viewer'),
        sa.Column('permissions', sa.JSON(), nullable=True),
        sa.Column('token', sa.String(length=120), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='pending'),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('accepted_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['invited_by_user_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['workspace_id'], ['client_workspaces.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_workspace_invitations_email', 'workspace_invitations', ['email'])
    op.create_index('ix_workspace_invitations_token', 'workspace_invitations', ['token'], unique=True)
    op.create_index('ix_workspace_invitations_workspace_id', 'workspace_invitations', ['workspace_id'])

    op.create_table(
        'workspace_addons',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('workspace_id', sa.Integer(), nullable=False),
        sa.Column('subscription_id', sa.Integer(), nullable=True),
        sa.Column('billing_cycle', sa.String(length=20), nullable=False, server_default='monthly'),
        sa.Column('amount', sa.Numeric(10, 2), nullable=False, server_default='30.00'),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='pending'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('activated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['subscription_id'], ['subscriptions.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['workspace_id'], ['client_workspaces.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_workspace_addons_workspace_id', 'workspace_addons', ['workspace_id'])

    op.add_column('campaigns', sa.Column('workspace_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_campaigns_workspace_id', 'campaigns', 'client_workspaces', ['workspace_id'], ['id'], ondelete='SET NULL')
    op.create_index('ix_campaigns_workspace_id', 'campaigns', ['workspace_id'])

    op.add_column('bookings', sa.Column('workspace_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_bookings_workspace_id', 'bookings', 'client_workspaces', ['workspace_id'], ['id'], ondelete='SET NULL')
    op.create_index('ix_bookings_workspace_id', 'bookings', ['workspace_id'])

    op.add_column('collaborations', sa.Column('workspace_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_collaborations_workspace_id', 'collaborations', 'client_workspaces', ['workspace_id'], ['id'], ondelete='SET NULL')
    op.create_index('ix_collaborations_workspace_id', 'collaborations', ['workspace_id'])

    op.add_column('briefs', sa.Column('workspace_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_briefs_workspace_id', 'briefs', 'client_workspaces', ['workspace_id'], ['id'], ondelete='SET NULL')
    op.create_index('ix_briefs_workspace_id', 'briefs', ['workspace_id'])

    if _has_table('campaign_payments'):
        op.add_column('campaign_payments', sa.Column('workspace_id', sa.Integer(), nullable=True))
        op.create_foreign_key('fk_campaign_payments_workspace_id', 'campaign_payments', 'client_workspaces', ['workspace_id'], ['id'], ondelete='SET NULL')
        op.create_index('ix_campaign_payments_workspace_id', 'campaign_payments', ['workspace_id'])

    if _has_table('saved_creators'):
        op.add_column('saved_creators', sa.Column('workspace_id', sa.Integer(), nullable=True))
        op.create_foreign_key('fk_saved_creators_workspace_id', 'saved_creators', 'client_workspaces', ['workspace_id'], ['id'], ondelete='SET NULL')
        op.create_index('ix_saved_creators_workspace_id', 'saved_creators', ['workspace_id'])
        op.drop_constraint('unique_brand_creator', 'saved_creators', type_='unique')
        op.create_unique_constraint('unique_brand_workspace_creator', 'saved_creators', ['brand_id', 'workspace_id', 'creator_id'])


def downgrade():
    op.drop_column('brand_profiles', 'expected_workspace_count')
    op.drop_column('brand_profiles', 'account_type')
    op.drop_column('brand_profiles', 'report_brand_color')

    if _has_table('saved_creators'):
        op.drop_constraint('unique_brand_workspace_creator', 'saved_creators', type_='unique')
        op.create_unique_constraint('unique_brand_creator', 'saved_creators', ['brand_id', 'creator_id'])
        op.drop_index('ix_saved_creators_workspace_id', table_name='saved_creators')
        op.drop_constraint('fk_saved_creators_workspace_id', 'saved_creators', type_='foreignkey')
        op.drop_column('saved_creators', 'workspace_id')

    if _has_table('campaign_payments'):
        op.drop_index('ix_campaign_payments_workspace_id', table_name='campaign_payments')
        op.drop_constraint('fk_campaign_payments_workspace_id', 'campaign_payments', type_='foreignkey')
        op.drop_column('campaign_payments', 'workspace_id')

    op.drop_index('ix_briefs_workspace_id', table_name='briefs')
    op.drop_constraint('fk_briefs_workspace_id', 'briefs', type_='foreignkey')
    op.drop_column('briefs', 'workspace_id')

    op.drop_index('ix_collaborations_workspace_id', table_name='collaborations')
    op.drop_constraint('fk_collaborations_workspace_id', 'collaborations', type_='foreignkey')
    op.drop_column('collaborations', 'workspace_id')

    op.drop_index('ix_bookings_workspace_id', table_name='bookings')
    op.drop_constraint('fk_bookings_workspace_id', 'bookings', type_='foreignkey')
    op.drop_column('bookings', 'workspace_id')

    op.drop_index('ix_campaigns_workspace_id', table_name='campaigns')
    op.drop_constraint('fk_campaigns_workspace_id', 'campaigns', type_='foreignkey')
    op.drop_column('campaigns', 'workspace_id')

    op.drop_index('ix_workspace_addons_workspace_id', table_name='workspace_addons')
    op.drop_table('workspace_addons')
    op.drop_index('ix_workspace_invitations_workspace_id', table_name='workspace_invitations')
    op.drop_index('ix_workspace_invitations_token', table_name='workspace_invitations')
    op.drop_index('ix_workspace_invitations_email', table_name='workspace_invitations')
    op.drop_table('workspace_invitations')
    op.drop_index('ix_workspace_member_permissions_workspace_id', table_name='workspace_member_permissions')
    op.drop_index('ix_workspace_member_permissions_user_id', table_name='workspace_member_permissions')
    op.drop_table('workspace_member_permissions')
    op.drop_index('ix_client_workspaces_agency_brand_id', table_name='client_workspaces')
    op.drop_table('client_workspaces')
