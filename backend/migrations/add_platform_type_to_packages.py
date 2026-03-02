"""Add platform_type and content_type to packages table

This migration adds platform categorization fields to support
package filtering by platform (Instagram, TikTok, YouTube, UGC, etc.)
"""

from sqlalchemy import text
from app import db


def upgrade():
    """Add platform_type and content_type columns to packages table"""
    print("Adding platform_type and content_type columns to packages table...")

    try:
        # Add platform_type column
        db.session.execute(text("""
            ALTER TABLE packages
            ADD COLUMN IF NOT EXISTS platform_type VARCHAR(50)
        """))

        # Add content_type column
        db.session.execute(text("""
            ALTER TABLE packages
            ADD COLUMN IF NOT EXISTS content_type VARCHAR(50)
        """))

        db.session.commit()
        print("✅ Successfully added platform_type and content_type columns")

    except Exception as e:
        db.session.rollback()
        print(f"❌ Error adding columns: {str(e)}")
        raise


def downgrade():
    """Remove platform_type and content_type columns from packages table"""
    print("Removing platform_type and content_type columns from packages table...")

    try:
        db.session.execute(text("""
            ALTER TABLE packages
            DROP COLUMN IF EXISTS platform_type
        """))

        db.session.execute(text("""
            ALTER TABLE packages
            DROP COLUMN IF EXISTS content_type
        """))

        db.session.commit()
        print("✅ Successfully removed platform_type and content_type columns")

    except Exception as e:
        db.session.rollback()
        print(f"❌ Error removing columns: {str(e)}")
        raise


if __name__ == '__main__':
    print("Running migration: Add platform_type and content_type to packages")
    upgrade()
    print("Migration completed successfully!")
