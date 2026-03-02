"""add brief and proposal fields to bookings

Revision ID: 202603021009
Revises: 202603020923
Create Date: 2026-03-02 10:09:45.272389

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '202603021009'
down_revision = '202603020923'
branch_labels = None
depends_on = None


def upgrade():
    # Add brief_id, proposal_id, and duration_days to bookings table
    op.add_column('bookings', sa.Column('brief_id', sa.Integer(), nullable=True))
    op.add_column('bookings', sa.Column('proposal_id', sa.Integer(), nullable=True))
    op.add_column('bookings', sa.Column('duration_days', sa.Integer(), nullable=True))
    
    # Create foreign keys
    op.create_foreign_key('fk_bookings_brief_id', 'bookings', 'briefs', ['brief_id'], ['id'])
    op.create_foreign_key('fk_bookings_proposal_id', 'bookings', 'proposals', ['proposal_id'], ['id'])


def downgrade():
    # Remove foreign keys and columns
    op.drop_constraint('fk_bookings_proposal_id', 'bookings', type_='foreignkey')
    op.drop_constraint('fk_bookings_brief_id', 'bookings', type_='foreignkey')
    op.drop_column('bookings', 'duration_days')
    op.drop_column('bookings', 'proposal_id')
    op.drop_column('bookings', 'brief_id')
