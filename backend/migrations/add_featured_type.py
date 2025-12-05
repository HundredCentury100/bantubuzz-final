"""
Migration: Add featured_type column to creator_profiles table
This allows distinguishing between general, TikTok, and Instagram featured creators
"""
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app, db
from sqlalchemy import text

def migrate():
    """Add featured_type column to creator_profiles"""
    app = create_app()

    with app.app_context():
        try:
            # Check if column already exists
            result = db.session.execute(text("""
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name='creator_profiles' AND column_name='featured_type'
            """))

            if result.fetchone():
                print("✓ Column 'featured_type' already exists in creator_profiles table")
                return

            # Add featured_type column
            print("Adding featured_type column to creator_profiles table...")
            db.session.execute(text("""
                ALTER TABLE creator_profiles
                ADD COLUMN featured_type VARCHAR(20)
            """))
            db.session.commit()

            print("✓ Successfully added featured_type column to creator_profiles")
            print("  Possible values: 'general', 'tiktok', 'instagram'")

        except Exception as e:
            db.session.rollback()
            print(f"✗ Migration failed: {str(e)}")
            raise

if __name__ == '__main__':
    migrate()
