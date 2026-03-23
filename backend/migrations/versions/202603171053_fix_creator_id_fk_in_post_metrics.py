"""Fix creator_id foreign key in post_metrics

Revision ID: 202603171053
Revises: 202603171051
Create Date: 2026-03-17 10:53:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '202603171053'
down_revision = '202603171051'
branch_labels = None
depends_on = None


def upgrade():
    # Drop the incorrect FK that references users table
    with op.batch_alter_table('post_metrics', schema=None) as batch_op:
        batch_op.drop_constraint('post_metrics_creator_id_fkey', type_='foreignkey')

        # Create the correct FK that references creator_profiles table
        batch_op.create_foreign_key(
            'post_metrics_creator_id_fkey',
            'creator_profiles',
            ['creator_id'],
            ['id']
        )


def downgrade():
    # Revert to the incorrect FK that references users table
    with op.batch_alter_table('post_metrics', schema=None) as batch_op:
        batch_op.drop_constraint('post_metrics_creator_id_fkey', type_='foreignkey')

        batch_op.create_foreign_key(
            'post_metrics_creator_id_fkey',
            'users',
            ['creator_id'],
            ['id']
        )
