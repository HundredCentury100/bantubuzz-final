"""Add rich messaging and push notification fields.

Revision ID: 202606051000
Revises: 202606041700
Create Date: 2026-06-05 10:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = '202606051000'
down_revision = '202606041700'
branch_labels = None
depends_on = None


def _has_table(table_name):
    inspector = sa.inspect(op.get_bind())
    return table_name in inspector.get_table_names()


def _has_column(table_name, column_name):
    inspector = sa.inspect(op.get_bind())
    return any(column['name'] == column_name for column in inspector.get_columns(table_name))


def upgrade():
    if _has_table('messages'):
        columns = [
            ('read_at', sa.Column('read_at', sa.DateTime(), nullable=True)),
            ('attachment_type', sa.Column('attachment_type', sa.String(length=30), nullable=True)),
            ('attachment_name', sa.Column('attachment_name', sa.String(length=255), nullable=True)),
            ('attachment_mime_type', sa.Column('attachment_mime_type', sa.String(length=120), nullable=True)),
            ('attachment_size', sa.Column('attachment_size', sa.Integer(), nullable=True)),
            ('link_url', sa.Column('link_url', sa.Text(), nullable=True)),
            ('link_title', sa.Column('link_title', sa.String(length=255), nullable=True)),
            ('link_description', sa.Column('link_description', sa.Text(), nullable=True)),
            ('link_image', sa.Column('link_image', sa.Text(), nullable=True)),
        ]
        for column_name, column in columns:
            if not _has_column('messages', column_name):
                op.add_column('messages', column)

    if not _has_table('push_subscriptions'):
        op.create_table(
            'push_subscriptions',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('user_id', sa.Integer(), nullable=False),
            sa.Column('endpoint', sa.Text(), nullable=False),
            sa.Column('p256dh', sa.Text(), nullable=False),
            sa.Column('auth', sa.Text(), nullable=False),
            sa.Column('user_agent', sa.Text(), nullable=True),
            sa.Column('is_active', sa.Boolean(), server_default=sa.true(), nullable=False),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.Column('updated_at', sa.DateTime(), nullable=True),
            sa.Column('last_used_at', sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('endpoint', name='uq_push_subscriptions_endpoint')
        )
        op.create_index('ix_push_subscriptions_user_id', 'push_subscriptions', ['user_id'])


def downgrade():
    if _has_table('push_subscriptions'):
        op.drop_index('ix_push_subscriptions_user_id', table_name='push_subscriptions')
        op.drop_table('push_subscriptions')

    if _has_table('messages'):
        for column_name in [
            'link_image',
            'link_description',
            'link_title',
            'link_url',
            'attachment_size',
            'attachment_mime_type',
            'attachment_name',
            'attachment_type',
            'read_at',
        ]:
            if _has_column('messages', column_name):
                op.drop_column('messages', column_name)
