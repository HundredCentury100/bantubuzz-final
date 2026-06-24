"""Add creator match feedback.

Revision ID: 202606241000
Revises: 202606221100
Create Date: 2026-06-24 10:00:00
"""
from alembic import op
import sqlalchemy as sa


revision = '202606241000'
down_revision = '202606221100'
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
    if not _has_table('creator_match_feedback'):
        op.create_table(
            'creator_match_feedback',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('brand_user_id', sa.Integer(), nullable=False),
            sa.Column('campaign_id', sa.Integer(), nullable=False),
            sa.Column('creator_id', sa.Integer(), nullable=False),
            sa.Column('feedback', sa.String(length=10), nullable=False),
            sa.Column('reason', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.Column('updated_at', sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(['brand_user_id'], ['users.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['campaign_id'], ['campaigns.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['creator_id'], ['creator_profiles.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('brand_user_id', 'campaign_id', 'creator_id', name='uq_creator_match_feedback'),
        )

    _create_index_if_missing('ix_creator_match_feedback_brand_user_id', 'creator_match_feedback', ['brand_user_id'])
    _create_index_if_missing('ix_creator_match_feedback_campaign_id', 'creator_match_feedback', ['campaign_id'])
    _create_index_if_missing('ix_creator_match_feedback_creator_id', 'creator_match_feedback', ['creator_id'])


def downgrade():
    if _has_table('creator_match_feedback'):
        op.drop_table('creator_match_feedback')
