"""Add workspace scoping to messages

Revision ID: 202607291000
Revises: 202607151000
Create Date: 2026-07-29 10:00:00.000000
"""
from alembic import op
import sqlalchemy as sa


revision = '202607291000'
down_revision = '202607151000'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if 'messages' not in inspector.get_table_names():
        return

    columns = {column['name'] for column in inspector.get_columns('messages')}
    if 'workspace_id' not in columns:
        op.add_column('messages', sa.Column('workspace_id', sa.Integer(), nullable=True))
        op.create_foreign_key(
            'fk_messages_workspace_id',
            'messages',
            'client_workspaces',
            ['workspace_id'],
            ['id'],
            ondelete='SET NULL'
        )

    indexes = {index['name'] for index in inspector.get_indexes('messages')}
    if 'ix_messages_workspace_id' not in indexes:
        op.create_index('ix_messages_workspace_id', 'messages', ['workspace_id'])


def downgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if 'messages' not in inspector.get_table_names():
        return

    indexes = {index['name'] for index in inspector.get_indexes('messages')}
    if 'ix_messages_workspace_id' in indexes:
        op.drop_index('ix_messages_workspace_id', table_name='messages')

    columns = {column['name'] for column in inspector.get_columns('messages')}
    if 'workspace_id' in columns:
        op.drop_constraint('fk_messages_workspace_id', 'messages', type_='foreignkey')
        op.drop_column('messages', 'workspace_id')
