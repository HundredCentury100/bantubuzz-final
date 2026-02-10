"""
Migration: Add platforms, city, and country columns to creator_profiles
"""
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app, db
from sqlalchemy import text

app = create_app()

def upgrade():
    """Add platforms array, city, and country columns to creator_profiles"""
    with app.app_context():
        try:
            # Add platforms column (JSON array)
            db.session.execute(text("""
                ALTER TABLE creator_profiles
                ADD COLUMN IF NOT EXISTS platforms JSON DEFAULT '[]'::json;
            """))

            # Add city column
            db.session.execute(text("""
                ALTER TABLE creator_profiles
                ADD COLUMN IF NOT EXISTS city VARCHAR(100);
            """))

            # Add country column (2-letter country code)
            db.session.execute(text("""
                ALTER TABLE creator_profiles
                ADD COLUMN IF NOT EXISTS country VARCHAR(2);
            """))

            db.session.commit()
            print("✅ Successfully added platforms, city, and country columns")

        except Exception as e:
            db.session.rollback()
            print(f"❌ Error: {e}")
            raise

def downgrade():
    """Remove platforms, city, and country columns"""
    with app.app_context():
        try:
            db.session.execute(text("""
                ALTER TABLE creator_profiles
                DROP COLUMN IF EXISTS platforms,
                DROP COLUMN IF EXISTS city,
                DROP COLUMN IF EXISTS country;
            """))

            db.session.commit()
            print("✅ Successfully removed platforms, city, and country columns")

        except Exception as e:
            db.session.rollback()
            print(f"❌ Error: {e}")
            raise

if __name__ == '__main__':
    print("Running migration: Add platforms, city, and country columns")
    upgrade()
    print("Migration completed!")
