"""Add multi-size image fields to creator and brand profiles

Revision ID: 4ee82e693cdb
Revises: 8743c1603422
Create Date: 2025-12-17 13:59:48.745710

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '4ee82e693cdb'
down_revision = '8743c1603422'
branch_labels = None
depends_on = None


def upgrade():
    # Add multi-size image fields only
    with op.batch_alter_table('brand_profiles', schema=None) as batch_op:
        batch_op.add_column(sa.Column('logo_sizes', sa.JSON(), nullable=True))

    with op.batch_alter_table('creator_profiles', schema=None) as batch_op:
        batch_op.add_column(sa.Column('profile_picture_sizes', sa.JSON(), nullable=True))
        batch_op.add_column(sa.Column('gallery_images', sa.JSON(), nullable=True))


def downgrade():
    # Remove multi-size image fields
    with op.batch_alter_table('creator_profiles', schema=None) as batch_op:
        batch_op.drop_column('gallery_images')
        batch_op.drop_column('profile_picture_sizes')

    with op.batch_alter_table('brand_profiles', schema=None) as batch_op:
        batch_op.drop_column('logo_sizes')
