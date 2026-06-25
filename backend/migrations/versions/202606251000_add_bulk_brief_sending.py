"""Add bulk brief sending.

Revision ID: 202606251000
Revises: 202606241000
Create Date: 2026-06-25 10:00:00
"""
from alembic import op
import sqlalchemy as sa


revision = '202606251000'
down_revision = '202606241000'
branch_labels = None
depends_on = None


def _inspector():
    return sa.inspect(op.get_bind())


def _has_table(table_name):
    return _inspector().has_table(table_name)


def _create_index_if_missing(index_name, table_name, columns):
    indexes = {index['name'] for index in _inspector().get_indexes(table_name)}
    if index_name not in indexes:
        op.create_index(index_name, table_name, columns)


def upgrade():
    if not _has_table('bulk_brief_sends'):
        op.create_table(
            'bulk_brief_sends',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('brief_id', sa.Integer(), nullable=False),
            sa.Column('brand_id', sa.Integer(), nullable=False),
            sa.Column('workspace_id', sa.Integer(), nullable=True),
            sa.Column('subject', sa.String(length=200), nullable=False),
            sa.Column('message_template', sa.Text(), nullable=False),
            sa.Column('schedule_mode', sa.String(length=20), nullable=False, server_default='now'),
            sa.Column('scheduled_start_at', sa.DateTime(), nullable=True),
            sa.Column('spread_hours', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('status', sa.String(length=20), nullable=False, server_default='scheduled'),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.Column('updated_at', sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(['brief_id'], ['briefs.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['brand_id'], ['brand_profiles.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['workspace_id'], ['client_workspaces.id'], ondelete='SET NULL'),
            sa.PrimaryKeyConstraint('id'),
        )
    if not _has_table('bulk_brief_recipients'):
        op.create_table(
            'bulk_brief_recipients',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('bulk_send_id', sa.Integer(), nullable=False),
            sa.Column('creator_id', sa.Integer(), nullable=False),
            sa.Column('creator_user_id', sa.Integer(), nullable=False),
            sa.Column('rendered_subject', sa.String(length=200), nullable=False),
            sa.Column('rendered_message', sa.Text(), nullable=False),
            sa.Column('status', sa.String(length=20), nullable=False, server_default='scheduled'),
            sa.Column('scheduled_at', sa.DateTime(), nullable=False),
            sa.Column('sent_at', sa.DateTime(), nullable=True),
            sa.Column('opened_at', sa.DateTime(), nullable=True),
            sa.Column('responded_at', sa.DateTime(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.Column('updated_at', sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(['bulk_send_id'], ['bulk_brief_sends.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['creator_id'], ['creator_profiles.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['creator_user_id'], ['users.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('bulk_send_id', 'creator_id', name='uq_bulk_brief_recipient_creator'),
        )

    for table, columns in {
        'bulk_brief_sends': ['brief_id', 'brand_id', 'workspace_id'],
        'bulk_brief_recipients': ['bulk_send_id', 'creator_id', 'creator_user_id', 'scheduled_at'],
    }.items():
        for column in columns:
            _create_index_if_missing(f'ix_{table}_{column}', table, [column])


def downgrade():
    if _has_table('bulk_brief_recipients'):
        op.drop_table('bulk_brief_recipients')
    if _has_table('bulk_brief_sends'):
        op.drop_table('bulk_brief_sends')
