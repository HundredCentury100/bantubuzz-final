"""
Migration to add live_urls_submitted_at field to collaborations table.
This tracks when creator submits live post URLs (for both YES and NO track).
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
        print("Starting migration: add_live_urls_submitted_at")

        try:
            # Check if column already exists
            result = db.session.execute(text("""
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name='collaborations' AND column_name='live_urls_submitted_at'
            """))

            if result.fetchone():
                print("Column 'live_urls_submitted_at' already exists. Skipping migration.")
                return

            # Add the column
            print("Adding 'live_urls_submitted_at' column to collaborations table...")
            db.session.execute(text("""
                ALTER TABLE collaborations
                ADD COLUMN live_urls_submitted_at TIMESTAMP
            """))

            db.session.commit()
            print("Migration completed successfully!")

        except Exception as e:
            print(f"Error during migration: {str(e)}")
            db.session.rollback()
            raise

if __name__ == '__main__':
    run_migration()
