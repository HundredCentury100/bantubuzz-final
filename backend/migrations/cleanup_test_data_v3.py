"""
Final Database Cleanup Script with Proper Foreign Key Handling
Purpose: Remove all test data except admin user
Date: 2026-01-26
"""

from app import create_app, db
from sqlalchemy import text

def cleanup():
    """Remove all users except admin and all related test data"""
    app = create_app()
    with app.app_context():
        try:
            print("🧹 Starting database cleanup...")

            # Get admin user ID
            admin_result = db.session.execute(text("""
                SELECT id FROM users WHERE email LIKE '%admin%' OR user_type = 'admin' LIMIT 1
            """))
            admin_user = admin_result.fetchone()
            admin_id = admin_user[0] if admin_user else None

            if admin_id:
                print(f"✅ Admin user ID: {admin_id}")
            else:
                print("⚠️  Warning: No admin user found.")
                return

            # Delete in correct order respecting foreign keys
            # Order matters: children before parents
            tables_to_clean = [
                # Level 1: Delete most dependent tables first
                ("notifications", f"user_id != {admin_id}"),
                ("messages", f"sender_id != {admin_id}"),
                ("reviews", "1=1"),
                ("wallet_transactions", "1=1"),  # Must be before collaborations and cashout_requests

                # Level 2: Delete after wallet_transactions
                ("cashout_requests", "1=1"),
                ("collaborations", "1=1"),  # Now can delete after wallet_transactions
                ("payments", "1=1"),  # Must be before bookings

                # Level 3: Delete after collaborations and payments
                ("bookings", "1=1"),  # Now can delete after payments
                ("campaign_applications", "1=1"),  # Now can delete after collaborations
                ("campaign_packages", "1=1"),

                # Level 4: Delete after campaign_applications
                ("campaigns", "1=1"),  # Now can delete after campaign_applications
                ("packages", "1=1"),  # Now can delete after bookings

                # Level 5: Other tables
                ("saved_creators", "1=1"),

                # Level 6: Delete profiles after all dependent data
                ("creator_profiles", f"user_id != {admin_id}"),  # Now can delete after packages
                ("brand_profiles", f"user_id != {admin_id}"),  # Now can delete after campaigns

                # Level 7: Finally delete users
                ("users", f"id != {admin_id}"),
            ]

            for table_name, condition in tables_to_clean:
                try:
                    result = db.session.execute(text(f"DELETE FROM {table_name} WHERE {condition}"))
                    db.session.commit()
                    print(f"   ✓ Deleted {result.rowcount} rows from {table_name}")
                except Exception as e:
                    db.session.rollback()
                    if "does not exist" in str(e):
                        print(f"   - Skipped {table_name} (table doesn't exist)")
                    else:
                        print(f"   ⚠ Error deleting from {table_name}: {str(e)[:100]}")

            print("\n✅ Database cleanup completed!")
            print("🎯 Platform is now ready for fresh testing")

            # Show remaining data
            print("\n📊 Remaining data:")
            users_count = db.session.execute(text("SELECT COUNT(*) FROM users")).scalar()
            bookings_count = db.session.execute(text("SELECT COUNT(*) FROM bookings")).scalar()
            campaigns_count = db.session.execute(text("SELECT COUNT(*) FROM campaigns")).scalar()
            print(f"   Users: {users_count} (should be 1 - admin only)")
            print(f"   Bookings: {bookings_count} (should be 0)")
            print(f"   Campaigns: {campaigns_count} (should be 0)")

        except Exception as e:
            db.session.rollback()
            print(f"\n❌ Fatal error during cleanup: {str(e)}")
            raise

if __name__ == '__main__':
    cleanup()
