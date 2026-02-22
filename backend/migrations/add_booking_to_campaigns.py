"""
Migration: Add booking_id to campaign_applications and campaign_packages tables
Date: 2026-01-26
Purpose: Link payments/bookings to campaign applications and packages
"""

from app import create_app, db
from sqlalchemy import text

def upgrade():
    """Add booking_id columns to campaign tables"""
    app = create_app()
    with app.app_context():
        # Add booking_id to campaign_applications
        db.session.execute(text("""
            ALTER TABLE campaign_applications
            ADD COLUMN IF NOT EXISTS booking_id INTEGER REFERENCES bookings(id)
        """))

        # Add booking_id to campaign_packages
        db.session.execute(text("""
            ALTER TABLE campaign_packages
            ADD COLUMN IF NOT EXISTS booking_id INTEGER REFERENCES bookings(id)
        """))

        db.session.commit()
        print("✅ Migration completed: Added booking_id to campaign tables")

def downgrade():
    """Remove booking_id columns from campaign tables"""
    app = create_app()
    with app.app_context():
        db.session.execute(text("ALTER TABLE campaign_applications DROP COLUMN IF EXISTS booking_id"))
        db.session.execute(text("ALTER TABLE campaign_packages DROP COLUMN IF EXISTS booking_id"))
        db.session.commit()
        print("✅ Migration rolled back: Removed booking_id from campaign tables")

if __name__ == '__main__':
    upgrade()
