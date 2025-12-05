"""
Migration: Add collaboration_id column to payments table
This allows payments to be linked to collaborations in addition to bookings
"""
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app, db
from sqlalchemy import text

def migrate():
    """Add collaboration_id column and make booking_id nullable"""
    app = create_app()

    with app.app_context():
        try:
            # Check if column already exists
            result = db.session.execute(text("""
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name='payments' AND column_name='collaboration_id'
            """))

            if result.fetchone():
                print("✓ Column 'collaboration_id' already exists in payments table")
                return

            # Add collaboration_id column
            print("Adding collaboration_id column to payments table...")
            db.session.execute(text("""
                ALTER TABLE payments
                ADD COLUMN collaboration_id INTEGER REFERENCES collaborations(id)
            """))

            # Make booking_id nullable (it was NOT NULL before)
            print("Making booking_id nullable...")
            db.session.execute(text("""
                ALTER TABLE payments
                ALTER COLUMN booking_id DROP NOT NULL
            """))

            db.session.commit()

            print("✓ Successfully added collaboration_id column to payments")
            print("✓ Made booking_id nullable")
            print("  Payments can now be linked to either bookings OR collaborations")

        except Exception as e:
            db.session.rollback()
            print(f"✗ Migration failed: {str(e)}")
            raise

if __name__ == '__main__':
    migrate()
