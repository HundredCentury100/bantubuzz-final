"""
Migration to add deliverable_type column to package_deliverables table.
This column distinguishes between draft submissions (YES track) and live posts (NO track).
"""

from datetime import datetime
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app, db
from sqlalchemy import text

def run_migration():
    app = create_app()

    with app.app_context():
        print("Starting migration: add_deliverable_type")

        try:
            # Check if column already exists
            result = db.session.execute(text("""
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name='package_deliverables' AND column_name='deliverable_type'
            """))

            if result.fetchone():
                print("Column 'deliverable_type' already exists. Skipping migration.")
                return

            # Add the column with default value 'draft'
            print("Adding 'deliverable_type' column to package_deliverables table...")
            db.session.execute(text("""
                ALTER TABLE package_deliverables
                ADD COLUMN deliverable_type VARCHAR(20) DEFAULT 'draft'
            """))

            db.session.commit()
            print("Migration completed successfully!")

        except Exception as e:
            print(f"Error during migration: {str(e)}")
            db.session.rollback()
            raise

if __name__ == '__main__':
    run_migration()
