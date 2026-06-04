"""Add white-label report settings.

Revision ID: 202606041000
Revises: 202606031330
Create Date: 2026-06-04 10:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = '202606041000'
down_revision = '202606031330'
branch_labels = None
depends_on = None


def _has_column(table_name, column_name):
    inspector = sa.inspect(op.get_bind())
    return any(column['name'] == column_name for column in inspector.get_columns(table_name))


def upgrade():
    if not _has_column('brand_profiles', 'report_logo'):
        op.add_column('brand_profiles', sa.Column('report_logo', sa.String(length=255), nullable=True))
    if not _has_column('brand_profiles', 'report_logo_sizes'):
        op.add_column('brand_profiles', sa.Column('report_logo_sizes', sa.JSON(), nullable=True))
    if not _has_column('brand_profiles', 'report_secondary_color'):
        op.add_column('brand_profiles', sa.Column('report_secondary_color', sa.String(length=20), server_default='#1F2937', nullable=True))
    if not _has_column('brand_profiles', 'report_email_signature'):
        op.add_column('brand_profiles', sa.Column('report_email_signature', sa.Text(), nullable=True))
    if not _has_column('brand_profiles', 'report_sender_name'):
        op.add_column('brand_profiles', sa.Column('report_sender_name', sa.String(length=120), nullable=True))
    if not _has_column('brand_profiles', 'report_reply_to_email'):
        op.add_column('brand_profiles', sa.Column('report_reply_to_email', sa.String(length=120), nullable=True))


def downgrade():
    for column_name in [
        'report_reply_to_email',
        'report_sender_name',
        'report_email_signature',
        'report_secondary_color',
        'report_logo_sizes',
        'report_logo',
    ]:
        if _has_column('brand_profiles', column_name):
            op.drop_column('brand_profiles', column_name)
