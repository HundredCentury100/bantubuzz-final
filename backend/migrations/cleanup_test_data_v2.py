"""
Simple Database Cleanup Script
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

            # Delete in correct order - each in its own transaction
            tables_to_clean = [
                ("notifications", f"user_id != {admin_id}"),
                ("messages", f"sender_id != {admin_id}"),
                ("reviews", "1=1"),
                ("deliverables", "1=1"),
                ("collaborations", "1=1"),
                ("bookings", "1=1"),
                ("campaign_applications", "1=1"),
                ("campaign_packages", "1=1"),
                ("campaigns", "1=1"),
                ("packages", "1=1"),
                ("saved_creators", "1=1"),
                ("cashout_requests", "1=1"),
                ("wallet_transactions", "1=1"),
                ("creator_wallets", "1=1"),
                ("brand_wallets", "1=1"),
                ("creator_profiles", f"user_id != {admin_id}"),
                ("brand_profiles", f"user_id != {admin_id}"),
                ("otp_codes", f"user_id != {admin_id}"),
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
                        print(f"   ⚠ Error deleting from {table_name}: {str(e)}")

            print("\n✅ Database cleanup completed!")
            print("🎯 Platform is now ready for fresh testing")

            # Show remaining data
            print("\n📊 Remaining data:")
            users_count = db.session.execute(text("SELECT COUNT(*) FROM users")).scalar()
            print(f"   Users: {users_count} (should be 1 - admin only)")

        except Exception as e:
            db.session.rollback()
            print(f"\n❌ Fatal error during cleanup: {str(e)}")
            raise

if __name__ == '__main__':
    cleanup()
