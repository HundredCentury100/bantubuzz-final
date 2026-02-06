"""
Migration: Add payment_category column to bookings table
"""
from app import create_app, db
from sqlalchemy import text

app = create_app()

with app.app_context():
    print("Starting migration: Add payment_category to bookings")

    try:
        # Add payment_category column
        print("Adding payment_category column...")
        db.session.execute(text("""
            ALTER TABLE bookings
            ADD COLUMN IF NOT EXISTS payment_category VARCHAR(50) DEFAULT 'package'
        """))
        db.session.commit()
        print("✓ payment_category column added")

        # Update existing records based on package_id, campaign_id, etc.
        print("Updating existing records...")

        # Set to 'campaign' where campaign_id is not null
        db.session.execute(text("""
            UPDATE bookings
            SET payment_category = 'campaign'
            WHERE campaign_id IS NOT NULL AND payment_category = 'package'
        """))

        # Set to 'brief' where booking_type indicates brief (if we have that pattern)
        # This is a placeholder - adjust based on your actual data patterns

        db.session.commit()
        print("✓ Existing records updated")

        print("\n✅ Migration completed successfully!")

    except Exception as e:
        print(f"\n❌ Migration failed: {str(e)}")
        db.session.rollback()
        raise
