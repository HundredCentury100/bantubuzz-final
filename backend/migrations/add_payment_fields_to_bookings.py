"""
Migration: Add payment_method and proof_of_payment fields to bookings table
Date: 2026-01-23
"""

from app import create_app, db

def upgrade():
    """Add new payment-related fields to bookings table"""
    app = create_app()
    with app.app_context():
        # Add payment_method column
        db.session.execute("""
            ALTER TABLE bookings
            ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20) DEFAULT 'paynow'
        """)

        # Add proof_of_payment column
        db.session.execute("""
            ALTER TABLE bookings
            ADD COLUMN IF NOT EXISTS proof_of_payment VARCHAR(500)
        """)

        # Update payment_status to support 'verified' status
        db.session.execute("""
            COMMENT ON COLUMN bookings.payment_status IS
            'pending, paid, failed, refunded, verified'
        """)

        db.session.commit()
        print("✅ Migration completed: Added payment_method and proof_of_payment fields")

def downgrade():
    """Remove payment-related fields from bookings table"""
    app = create_app()
    with app.app_context():
        db.session.execute("ALTER TABLE bookings DROP COLUMN IF EXISTS payment_method")
        db.session.execute("ALTER TABLE bookings DROP COLUMN IF EXISTS proof_of_payment")
        db.session.commit()
        print("✅ Migration rolled back: Removed payment_method and proof_of_payment fields")

if __name__ == '__main__':
    upgrade()
