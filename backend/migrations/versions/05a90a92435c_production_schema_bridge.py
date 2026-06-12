"""Bridge the production-only migration revision into source control.

Revision ID: 05a90a92435c
Revises: 202603041500
Create Date: 2026-03-12 14:59:00

The production database was stamped with this revision before
202603121500_add_post_tracking_fields was added. The original migration file
was never committed, but the production schema already contains its effects.
This no-op bridge restores a complete Alembic revision graph without replaying
unknown DDL against the migrated production database.
"""

revision = '05a90a92435c'
down_revision = '202603041500'
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
