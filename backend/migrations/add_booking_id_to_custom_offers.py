"""
Add booking_id column to custom_package_offers table
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app, db
from sqlalchemy import text

def run_migration():
    app = create_app()

    with app.app_context():
        print("Adding booking_id column to custom_package_offers table...")

        try:
            # Add booking_id column
            db.session.execute(text("""
                ALTER TABLE custom_package_offers
                ADD COLUMN IF NOT EXISTS booking_id INTEGER REFERENCES bookings(id);
            """))

            # Create index
            db.session.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_custom_offers_booking
                ON custom_package_offers(booking_id);
            """))

            db.session.commit()
            print("✅ booking_id column added successfully!")

            # Verify the column was added
            result = db.session.execute(text("""
                SELECT column_name, data_type
                FROM information_schema.columns
                WHERE table_name = 'custom_package_offers'
                AND column_name = 'booking_id';
            """))

            column = result.fetchone()
            if column:
                print(f"✅ Verified: booking_id column exists (type: {column[1]})")
            else:
                print("⚠️ Warning: Column not found after migration")

        except Exception as e:
            print(f"❌ Error: {e}")
            db.session.rollback()
            raise

if __name__ == '__main__':
    run_migration()
