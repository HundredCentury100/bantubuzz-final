"""
Migration: Add payment_method column to bookings table
This allows tracking whether payment was made via Paynow or Bank Transfer
"""

from app import create_app, db
from sqlalchemy import text

def migrate():
    app = create_app()
    with app.app_context():
        try:
            # Check if column already exists
            result = db.session.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='bookings' AND column_name='payment_method'
            """)).fetchone()
            
            if result:
                print("✓ payment_method column already exists")
                return
            
            # Add payment_method column
            print("Adding payment_method column to bookings table...")
            db.session.execute(text("""
                ALTER TABLE bookings 
                ADD COLUMN payment_method VARCHAR(20)
            """))
            
            # Update existing bookings that have proof_of_payment to bank_transfer
            print("Setting payment_method for existing bank transfer bookings...")
            db.session.execute(text("""
                UPDATE bookings 
                SET payment_method = 'bank_transfer' 
                WHERE proof_of_payment IS NOT NULL AND proof_of_payment != ''
            """))
            
            # Update existing bookings with paynow references
            print("Setting payment_method for existing paynow bookings...")
            db.session.execute(text("""
                UPDATE bookings 
                SET payment_method = 'paynow' 
                WHERE payment_reference LIKE 'PAYNOW-%' OR paynow_poll_url IS NOT NULL
            """))
            
            db.session.commit()
            
            print("✅ Migration completed successfully!")
            print("   - Added payment_method column")
            print("   - Updated existing bookings with correct payment methods")
            
        except Exception as e:
            db.session.rollback()
            print(f"❌ Migration failed: {e}")
            raise

if __name__ == '__main__':
    migrate()
