"""Add creator team access

Revision ID: 202607151000
Revises: 202607131500
Create Date: 2026-07-15 10:00:00.000000
"""
from alembic import op
import sqlalchemy as sa


revision = '202607151000'
down_revision = '202607131500'
branch_labels = None
depends_on = None


def _has_table(table_name):
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return inspector.has_table(table_name)


def upgrade():
    if not _has_table('creator_team_members'):
        op.create_table(
            'creator_team_members',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('creator_id', sa.Integer(), nullable=False),
            sa.Column('user_id', sa.Integer(), nullable=False),
            sa.Column('role', sa.String(length=30), nullable=False),
            sa.Column('permissions', sa.JSON(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.Column('updated_at', sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(['creator_id'], ['creator_profiles.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('creator_id', 'user_id', name='uq_creator_team_member_user'),
        )
        op.create_index(op.f('ix_creator_team_members_creator_id'), 'creator_team_members', ['creator_id'], unique=False)
        op.create_index(op.f('ix_creator_team_members_user_id'), 'creator_team_members', ['user_id'], unique=False)

    if not _has_table('creator_team_invitations'):
        op.create_table(
            'creator_team_invitations',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('creator_id', sa.Integer(), nullable=False),
            sa.Column('invited_by_user_id', sa.Integer(), nullable=True),
            sa.Column('email', sa.String(length=120), nullable=False),
            sa.Column('role', sa.String(length=30), nullable=False),
            sa.Column('permissions', sa.JSON(), nullable=True),
            sa.Column('token', sa.String(length=120), nullable=False),
            sa.Column('status', sa.String(length=20), nullable=False),
            sa.Column('expires_at', sa.DateTime(), nullable=False),
            sa.Column('accepted_at', sa.DateTime(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.Column('updated_at', sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(['creator_id'], ['creator_profiles.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['invited_by_user_id'], ['users.id'], ondelete='SET NULL'),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('token'),
        )
        op.create_index(op.f('ix_creator_team_invitations_creator_id'), 'creator_team_invitations', ['creator_id'], unique=False)
        op.create_index(op.f('ix_creator_team_invitations_email'), 'creator_team_invitations', ['email'], unique=False)
        op.create_index(op.f('ix_creator_team_invitations_token'), 'creator_team_invitations', ['token'], unique=True)

    if not _has_table('creator_team_audit_logs'):
        op.create_table(
            'creator_team_audit_logs',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('creator_id', sa.Integer(), nullable=False),
            sa.Column('actor_user_id', sa.Integer(), nullable=True),
            sa.Column('target_user_id', sa.Integer(), nullable=True),
            sa.Column('target_email', sa.String(length=120), nullable=False),
            sa.Column('action', sa.String(length=50), nullable=False),
            sa.Column('role', sa.String(length=30), nullable=True),
            sa.Column('details', sa.JSON(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(['actor_user_id'], ['users.id'], ondelete='SET NULL'),
            sa.ForeignKeyConstraint(['creator_id'], ['creator_profiles.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['target_user_id'], ['users.id'], ondelete='SET NULL'),
            sa.PrimaryKeyConstraint('id'),
        )
        op.create_index(op.f('ix_creator_team_audit_logs_actor_user_id'), 'creator_team_audit_logs', ['actor_user_id'], unique=False)
        op.create_index(op.f('ix_creator_team_audit_logs_creator_id'), 'creator_team_audit_logs', ['creator_id'], unique=False)
        op.create_index(op.f('ix_creator_team_audit_logs_target_email'), 'creator_team_audit_logs', ['target_email'], unique=False)
        op.create_index(op.f('ix_creator_team_audit_logs_target_user_id'), 'creator_team_audit_logs', ['target_user_id'], unique=False)


def downgrade():
    if _has_table('creator_team_audit_logs'):
        op.drop_index(op.f('ix_creator_team_audit_logs_target_user_id'), table_name='creator_team_audit_logs')
        op.drop_index(op.f('ix_creator_team_audit_logs_target_email'), table_name='creator_team_audit_logs')
        op.drop_index(op.f('ix_creator_team_audit_logs_creator_id'), table_name='creator_team_audit_logs')
        op.drop_index(op.f('ix_creator_team_audit_logs_actor_user_id'), table_name='creator_team_audit_logs')
        op.drop_table('creator_team_audit_logs')
    if _has_table('creator_team_invitations'):
        op.drop_index(op.f('ix_creator_team_invitations_token'), table_name='creator_team_invitations')
        op.drop_index(op.f('ix_creator_team_invitations_email'), table_name='creator_team_invitations')
        op.drop_index(op.f('ix_creator_team_invitations_creator_id'), table_name='creator_team_invitations')
        op.drop_table('creator_team_invitations')
    if _has_table('creator_team_members'):
        op.drop_index(op.f('ix_creator_team_members_user_id'), table_name='creator_team_members')
        op.drop_index(op.f('ix_creator_team_members_creator_id'), table_name='creator_team_members')
        op.drop_table('creator_team_members')
