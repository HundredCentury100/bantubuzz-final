"""
Database Cleanup Script
Purpose: Remove all test data except admin user to start fresh testing
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

            # Get admin user ID (assuming admin email or user_type = 'admin')
            admin_result = db.session.execute(text("""
                SELECT id FROM users WHERE email LIKE '%admin%' OR user_type = 'admin' LIMIT 1
            """))
            admin_user = admin_result.fetchone()
            admin_id = admin_user[0] if admin_user else None

            if not admin_id:
                print("⚠️  Warning: No admin user found. Creating admin exclusion based on user_type='admin'")
            else:
                print(f"✅ Admin user ID: {admin_id}")

            # Delete in correct order to respect foreign key constraints

            # 1. Delete notifications (depends on users)
            result = db.session.execute(text("DELETE FROM notifications WHERE user_id != :admin_id OR :admin_id IS NULL"),
                                       {"admin_id": admin_id})
            print(f"   Deleted {result.rowcount} notifications")

            # 2. Delete messages (depends on users)
            result = db.session.execute(text("DELETE FROM messages WHERE sender_id != :admin_id OR :admin_id IS NULL"),
                                       {"admin_id": admin_id})
            print(f"   Deleted {result.rowcount} messages")

            # 3. Delete conversations (depends on users) - skip if table doesn't exist
            try:
                result = db.session.execute(text("DELETE FROM conversations WHERE brand_id NOT IN (SELECT id FROM brand_profiles WHERE user_id = :admin_id) OR :admin_id IS NULL"),
                                           {"admin_id": admin_id})
                print(f"   Deleted {result.rowcount} conversations")
            except Exception:
                print(f"   Skipped conversations (table doesn't exist)")

            # 4. Delete reviews (depends on bookings and users)
            result = db.session.execute(text("DELETE FROM reviews"))
            print(f"   Deleted {result.rowcount} reviews")

            # 5. Delete deliverables (depends on collaborations)
            result = db.session.execute(text("DELETE FROM deliverables"))
            print(f"   Deleted {result.rowcount} deliverables")

            # 6. Delete collaborations (depends on brands, creators, campaigns)
            result = db.session.execute(text("DELETE FROM collaborations"))
            print(f"   Deleted {result.rowcount} collaborations")

            # 7. Delete bookings (depends on brands, creators, packages)
            result = db.session.execute(text("DELETE FROM bookings"))
            print(f"   Deleted {result.rowcount} bookings")

            # 8. Delete campaign applications (depends on campaigns, creators)
            result = db.session.execute(text("DELETE FROM campaign_applications"))
            print(f"   Deleted {result.rowcount} campaign applications")

            # 9. Delete campaign_packages association (depends on campaigns, packages)
            result = db.session.execute(text("DELETE FROM campaign_packages"))
            print(f"   Deleted {result.rowcount} campaign_packages associations")

            # 10. Delete campaigns (depends on brands)
            result = db.session.execute(text("DELETE FROM campaigns"))
            print(f"   Deleted {result.rowcount} campaigns")

            # 11. Delete packages (depends on creators)
            result = db.session.execute(text("DELETE FROM packages"))
            print(f"   Deleted {result.rowcount} packages")

            # 12. Delete saved_creators (depends on brands, creators)
            result = db.session.execute(text("DELETE FROM saved_creators"))
            print(f"   Deleted {result.rowcount} saved_creators")

            # 13. Delete cashout requests (depends on creators)
            result = db.session.execute(text("DELETE FROM cashout_requests"))
            print(f"   Deleted {result.rowcount} cashout requests")

            # 14. Delete wallet transactions (depends on wallets)
            result = db.session.execute(text("DELETE FROM wallet_transactions"))
            print(f"   Deleted {result.rowcount} wallet transactions")

            # 15. Delete creator wallets (depends on creators)
            result = db.session.execute(text("DELETE FROM creator_wallets"))
            print(f"   Deleted {result.rowcount} creator wallets")

            # 16. Delete brand wallets (depends on brands)
            result = db.session.execute(text("DELETE FROM brand_wallets"))
            print(f"   Deleted {result.rowcount} brand wallets")

            # 17. Delete creator profiles (depends on users)
            result = db.session.execute(text("DELETE FROM creator_profiles WHERE user_id != :admin_id OR :admin_id IS NULL"),
                                       {"admin_id": admin_id})
            print(f"   Deleted {result.rowcount} creator profiles")

            # 18. Delete brand profiles (depends on users)
            result = db.session.execute(text("DELETE FROM brand_profiles WHERE user_id != :admin_id OR :admin_id IS NULL"),
                                       {"admin_id": admin_id})
            print(f"   Deleted {result.rowcount} brand profiles")

            # 19. Delete OTP codes (depends on users)
            result = db.session.execute(text("DELETE FROM otp_codes WHERE user_id != :admin_id OR :admin_id IS NULL"),
                                       {"admin_id": admin_id})
            print(f"   Deleted {result.rowcount} OTP codes")

            # 20. Finally, delete users (keep only admin)
            if admin_id:
                result = db.session.execute(text("DELETE FROM users WHERE id != :admin_id"),
                                           {"admin_id": admin_id})
                print(f"   Deleted {result.rowcount} users (kept admin)")
            else:
                result = db.session.execute(text("DELETE FROM users WHERE user_type != 'admin'"))
                print(f"   Deleted {result.rowcount} users (kept admin by user_type)")

            # Commit all deletions
            db.session.commit()

            print("\n✅ Database cleanup completed successfully!")
            print("🎯 Platform is now ready for fresh testing")

            # Show remaining data
            print("\n📊 Remaining data:")
            users_count = db.session.execute(text("SELECT COUNT(*) FROM users")).scalar()
            print(f"   Users: {users_count} (should be 1 - admin only)")

        except Exception as e:
            db.session.rollback()
            print(f"\n❌ Error during cleanup: {str(e)}")
            raise

if __name__ == '__main__':
    cleanup()
