"""Remove deliverable foreign key constraint from post_metrics

Revision ID: 202603171051
Revises: 202603161030
Create Date: 2026-03-17 10:51:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '202603171051'
down_revision = '202603161030'
branch_labels = None
depends_on = None


def upgrade():
    # Drop the foreign key constraint that only references milestone_deliverables
    # We use a polymorphic approach with deliverable_type to support both milestone and package deliverables
    with op.batch_alter_table('post_metrics', schema=None) as batch_op:
        batch_op.drop_constraint('post_metrics_deliverable_id_fkey', type_='foreignkey')


def downgrade():
    # Re-add the foreign key constraint (only for milestone deliverables)
    with op.batch_alter_table('post_metrics', schema=None) as batch_op:
        batch_op.create_foreign_key(
            'post_metrics_deliverable_id_fkey',
            'milestone_deliverables',
            ['deliverable_id'],
            ['id']
        )
