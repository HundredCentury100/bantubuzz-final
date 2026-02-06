"""
Migration: Update payment_category for existing bookings based on booking_type
"""
from app import create_app, db
from sqlalchemy import text

app = create_app()

with app.app_context():
    print("Starting migration: Update payment_category based on booking_type")

    try:
        # Update briefs to 'brief'
        print("Updating brief bookings...")
        result = db.session.execute(text("""
            UPDATE bookings
            SET payment_category = 'brief'
            WHERE booking_type = 'brief' AND payment_category = 'package'
        """))
        print(f"✓ Updated {result.rowcount} brief bookings")
        db.session.commit()

        # Update campaigns to 'campaign'
        print("Updating campaign bookings...")
        result = db.session.execute(text("""
            UPDATE bookings
            SET payment_category = 'campaign'
            WHERE (booking_type = 'campaign' OR booking_type = 'campaign_application' OR campaign_id IS NOT NULL)
            AND payment_category = 'package'
        """))
        print(f"✓ Updated {result.rowcount} campaign bookings")
        db.session.commit()

        # Update revisions to 'revision'
        print("Updating revision bookings...")
        result = db.session.execute(text("""
            UPDATE bookings
            SET payment_category = 'revision'
            WHERE booking_type = 'paid_revision' AND payment_category = 'package'
        """))
        print(f"✓ Updated {result.rowcount} revision bookings")
        db.session.commit()

        # Show summary
        print("\nFinal category distribution:")
        result = db.session.execute(text("""
            SELECT payment_category, COUNT(*) as count
            FROM bookings
            GROUP BY payment_category
            ORDER BY count DESC
        """))
        for row in result:
            print(f"  {row[0]}: {row[1]} bookings")

        print("\n✅ Migration completed successfully!")

    except Exception as e:
        print(f"\n❌ Migration failed: {str(e)}")
        db.session.rollback()
        raise
