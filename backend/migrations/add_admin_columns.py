"""
Add is_admin and admin_role columns to existing users table
"""
import sys
import os
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app import db, create_app
from sqlalchemy import text

def add_admin_columns():
    """Add admin columns to users table"""
    print("\nAdding admin columns to users table...")
    print("=" * 60)

    app = create_app()

    with app.app_context():
        try:
            # Check if columns already exist
            result = db.session.execute(text("""
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name='users' AND column_name IN ('is_admin', 'admin_role')
            """))
            existing_columns = [row[0] for row in result]

            if 'is_admin' in existing_columns and 'admin_role' in existing_columns:
                print("✓ Admin columns already exist in users table")
                return

            # Add is_admin column if it doesn't exist
            if 'is_admin' not in existing_columns:
                print("\n1. Adding is_admin column...")
                db.session.execute(text("""
                    ALTER TABLE users
                    ADD COLUMN is_admin BOOLEAN DEFAULT FALSE
                """))
                print("   ✓ is_admin column added")

            # Add admin_role column if it doesn't exist
            if 'admin_role' not in existing_columns:
                print("\n2. Adding admin_role column...")
                db.session.execute(text("""
                    ALTER TABLE users
                    ADD COLUMN admin_role VARCHAR(20)
                """))
                print("   ✓ admin_role column added")

            db.session.commit()

            print("\n" + "=" * 60)
            print("✓ Admin columns added successfully!")
            print("=" * 60)

        except Exception as e:
            db.session.rollback()
            print(f"\n✗ Error adding admin columns: {str(e)}")
            raise

if __name__ == '__main__':
    add_admin_columns()
