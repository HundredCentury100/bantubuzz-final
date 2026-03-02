"""add brief_id to campaigns

Revision ID: 202603020923
Revises: 4ee82e693cdb
Create Date: 2026-03-02 09:23:05.611871

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '202603020923'
down_revision = '4ee82e693cdb'
branch_labels = None
depends_on = None


def upgrade():
    # Add brief_id column to campaigns table
    op.add_column('campaigns', sa.Column('brief_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_campaigns_brief_id', 'campaigns', 'briefs', ['brief_id'], ['id'])


def downgrade():
    # Remove foreign key and column
    op.drop_constraint('fk_campaigns_brief_id', 'campaigns', type_='foreignkey')
    op.drop_column('campaigns', 'brief_id')
