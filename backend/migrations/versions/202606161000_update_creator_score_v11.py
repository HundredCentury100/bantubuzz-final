"""Update creator score fields for v1.1.

Revision ID: 202606161000
Revises: 202606101700
Create Date: 2026-06-16 10:00:00
"""
from alembic import op
import sqlalchemy as sa


revision = '202606161000'
down_revision = '202606101700'
branch_labels = None
depends_on = None


SCORE_COLUMNS = (
    'order_completion_score',
    'response_rate_score',
    'on_time_delivery_score',
    'marketplace_reliability_score',
    'review_score',
    'profile_trust_score',
)


def upgrade():
    for table in ('creator_scores', 'creator_score_history'):
        for column in SCORE_COLUMNS:
            op.add_column(
                table,
                sa.Column(column, sa.Numeric(6, 3), nullable=False, server_default='0'),
            )

    op.execute("UPDATE creator_scores SET formula_version = '1.1'")


def downgrade():
    for table in ('creator_score_history', 'creator_scores'):
        for column in reversed(SCORE_COLUMNS):
            op.drop_column(table, column)

