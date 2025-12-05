"""
Database migration: Add featured creator fields to creator_profiles table

Run this migration with:
    python migrations/add_featured_creators.py

This adds the following fields to creator_profiles:
- is_featured: BOOLEAN (default FALSE) - Whether creator is featured on homepage
- featured_order: INTEGER (default 0) - Display order of featured creators
- featured_since: TIMESTAMP - When creator was first featured
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app, db
from sqlalchemy import text

def run_migration():
    """Run the migration to add featured creator fields"""
    app = create_app()

    with app.app_context():
        try:
            print("Starting migration: add_featured_creators")
            print("-" * 50)

            # Check if columns already exist
            check_query = text("""
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name = 'creator_profiles'
                AND column_name IN ('is_featured', 'featured_order', 'featured_since')
            """)

            result = db.session.execute(check_query)
            existing_columns = [row[0] for row in result]

            if len(existing_columns) == 3:
                print("✓ All featured creator columns already exist")
                print("  Migration not needed")
                return

            print(f"Found {len(existing_columns)} of 3 columns")
            print(f"Existing columns: {existing_columns}")
            print("\nAdding missing columns...")

            # Add is_featured column if it doesn't exist
            if 'is_featured' not in existing_columns:
                print("  Adding is_featured column...")
                db.session.execute(text("""
                    ALTER TABLE creator_profiles
                    ADD COLUMN is_featured BOOLEAN DEFAULT FALSE
                """))
                print("  ✓ is_featured column added")

            # Add featured_order column if it doesn't exist
            if 'featured_order' not in existing_columns:
                print("  Adding featured_order column...")
                db.session.execute(text("""
                    ALTER TABLE creator_profiles
                    ADD COLUMN featured_order INTEGER DEFAULT 0
                """))
                print("  ✓ featured_order column added")

            # Add featured_since column if it doesn't exist
            if 'featured_since' not in existing_columns:
                print("  Adding featured_since column...")
                db.session.execute(text("""
                    ALTER TABLE creator_profiles
                    ADD COLUMN featured_since TIMESTAMP
                """))
                print("  ✓ featured_since column added")

            # Create index for better performance
            print("\n  Creating index on is_featured...")
            try:
                db.session.execute(text("""
                    CREATE INDEX idx_creator_profiles_featured
                    ON creator_profiles(is_featured, featured_order)
                """))
                print("  ✓ Index created")
            except Exception as e:
                if 'already exists' in str(e):
                    print("  ✓ Index already exists")
                else:
                    raise

            # Commit all changes
            db.session.commit()

            print("\n" + "=" * 50)
            print("✓ Migration completed successfully!")
            print("=" * 50)
            print("\nFeatured creator fields added to creator_profiles:")
            print("  - is_featured (BOOLEAN, default FALSE)")
            print("  - featured_order (INTEGER, default 0)")
            print("  - featured_since (TIMESTAMP)")
            print("\nYou can now use the featured creators feature in the admin dashboard.")

        except Exception as e:
            print(f"\n✗ Migration failed: {str(e)}")
            db.session.rollback()
            raise


def rollback_migration():
    """Rollback the migration (remove featured creator fields)"""
    app = create_app()

    with app.app_context():
        try:
            print("Rolling back migration: add_featured_creators")
            print("-" * 50)

            # Drop index
            print("  Dropping index...")
            try:
                db.session.execute(text("""
                    DROP INDEX IF EXISTS idx_creator_profiles_featured
                """))
                print("  ✓ Index dropped")
            except Exception as e:
                print(f"  Warning: {str(e)}")

            # Drop columns
            print("  Removing is_featured column...")
            db.session.execute(text("""
                ALTER TABLE creator_profiles
                DROP COLUMN IF EXISTS is_featured
            """))

            print("  Removing featured_order column...")
            db.session.execute(text("""
                ALTER TABLE creator_profiles
                DROP COLUMN IF EXISTS featured_order
            """))

            print("  Removing featured_since column...")
            db.session.execute(text("""
                ALTER TABLE creator_profiles
                DROP COLUMN IF EXISTS featured_since
            """))

            db.session.commit()

            print("\n✓ Rollback completed successfully!")

        except Exception as e:
            print(f"\n✗ Rollback failed: {str(e)}")
            db.session.rollback()
            raise


if __name__ == '__main__':
    import argparse

    parser = argparse.ArgumentParser(description='Manage featured creators migration')
    parser.add_argument(
        '--rollback',
        action='store_true',
        help='Rollback the migration (remove featured creator fields)'
    )

    args = parser.parse_args()

    if args.rollback:
        confirm = input("Are you sure you want to rollback this migration? (yes/no): ")
        if confirm.lower() == 'yes':
            rollback_migration()
        else:
            print("Rollback cancelled")
    else:
        run_migration()
