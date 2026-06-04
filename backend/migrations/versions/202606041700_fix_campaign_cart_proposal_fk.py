"""Point campaign cart applications at campaign proposals.

Revision ID: 202606041700
Revises: 202606041500
Create Date: 2026-06-04 17:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = '202606041700'
down_revision = '202606041500'
branch_labels = None
depends_on = None


def _has_table(table_name):
    inspector = sa.inspect(op.get_bind())
    return table_name in inspector.get_table_names()


def _foreign_keys(table_name):
    inspector = sa.inspect(op.get_bind())
    return inspector.get_foreign_keys(table_name)


def _drop_proposal_fk():
    for fk in _foreign_keys('campaign_cart_items'):
        if fk.get('constrained_columns') == ['proposal_id']:
            op.drop_constraint(fk['name'], 'campaign_cart_items', type_='foreignkey')


def upgrade():
    if not _has_table('campaign_cart_items') or not _has_table('campaign_proposals'):
        return

    bind = op.get_bind()
    _drop_proposal_fk()

    bind.execute(sa.text("""
        UPDATE campaign_cart_items cci
        SET proposal_id = NULL
        WHERE cci.proposal_id IS NOT NULL
          AND cci.item_type = 'application'
          AND NOT EXISTS (
              SELECT 1
              FROM campaign_proposals cp
              WHERE cp.id = cci.proposal_id
          )
    """))

    op.create_foreign_key(
        'fk_campaign_cart_items_campaign_proposal_id',
        'campaign_cart_items',
        'campaign_proposals',
        ['proposal_id'],
        ['id'],
        ondelete='CASCADE'
    )


def downgrade():
    if not _has_table('campaign_cart_items') or not _has_table('proposals'):
        return

    _drop_proposal_fk()
    op.create_foreign_key(
        'fk_campaign_cart_items_proposal_id',
        'campaign_cart_items',
        'proposals',
        ['proposal_id'],
        ['id'],
        ondelete='CASCADE'
    )
