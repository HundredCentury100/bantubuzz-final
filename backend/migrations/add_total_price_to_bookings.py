"""
Migration: Add total_price column to bookings table
This is an alias for amount for compatibility
"""
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app, db
from sqlalchemy import text

def migrate():
    """Add total_price column and populate from amount"""
    app = create_app()

    with app.app_context():
        try:
            # Check if column already exists
            result = db.session.execute(text("""
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name='bookings' AND column_name='total_price'
            """))

            if result.fetchone():
                print("✓ Column 'total_price' already exists in bookings table")
                return

            # Add total_price column
            print("Adding total_price column to bookings table...")
            db.session.execute(text("""
                ALTER TABLE bookings
                ADD COLUMN total_price DOUBLE PRECISION
            """))

            # Populate total_price with amount values
            print("Populating total_price from amount...")
            db.session.execute(text("""
                UPDATE bookings
                SET total_price = amount
                WHERE total_price IS NULL
            """))

            # Make it NOT NULL after populating
            print("Making total_price NOT NULL...")
            db.session.execute(text("""
                ALTER TABLE bookings
                ALTER COLUMN total_price SET NOT NULL
            """))

            db.session.commit()

            print("✓ Successfully added total_price column to bookings")
            print("  All existing bookings have total_price = amount")

        except Exception as e:
            db.session.rollback()
            print(f"✗ Migration failed: {str(e)}")
            raise

if __name__ == '__main__':
    migrate()
