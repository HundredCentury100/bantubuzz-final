"""
Database Migration Script - Phase 4: Admin Moderation System

This script creates the necessary database tables for the admin moderation dashboard:
1. user_violations - Track enforcement actions against users
2. admin_activity_log - Log all admin moderation actions
3. Update users table - Add messaging/account restriction fields

Created: March 10, 2026
"""

import os
import sys
from datetime import datetime

# Add parent directory to path to import app
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from sqlalchemy import text

def run_migration():
    """Execute all migration SQL statements"""
    app = create_app()

    with app.app_context():
        print("=" * 60)
        print("PHASE 4: ADMIN MODERATION SYSTEM - DATABASE MIGRATION")
        print("=" * 60)
        print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print()

        try:
            # 1. Create user_violations table
            print("1. Creating user_violations table...")
            db.session.execute(text("""
                CREATE TABLE IF NOT EXISTS user_violations (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

                    -- Violation Details
                    violation_type VARCHAR(50) NOT NULL,
                    severity VARCHAR(20) NOT NULL,
                    description TEXT NOT NULL,

                    -- Source (what triggered this action)
                    source_type VARCHAR(50),
                    source_id INTEGER,

                    -- Enforcement Action
                    action_taken VARCHAR(100) NOT NULL,
                    action_duration_days INTEGER,
                    action_expires_at TIMESTAMP,

                    -- Admin
                    issued_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
                    notes TEXT,

                    -- Status
                    status VARCHAR(30) DEFAULT 'active',

                    -- Timestamps
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    expired_at TIMESTAMP
                )
            """))
            print("   ✓ user_violations table created")

            # 2. Create indexes for user_violations
            print("2. Creating indexes for user_violations...")
            db.session.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_violations_user
                ON user_violations(user_id)
            """))
            db.session.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_violations_status
                ON user_violations(status)
            """))
            db.session.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_violations_type
                ON user_violations(violation_type)
            """))
            db.session.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_violations_expires
                ON user_violations(action_expires_at)
            """))
            print("   ✓ Indexes created for user_violations")

            # 3. Create admin_activity_log table
            print("3. Creating admin_activity_log table...")
            db.session.execute(text("""
                CREATE TABLE IF NOT EXISTS admin_activity_log (
                    id SERIAL PRIMARY KEY,
                    admin_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

                    -- Action Details
                    action_type VARCHAR(50) NOT NULL,
                    target_type VARCHAR(50),
                    target_id INTEGER,

                    -- Action Data (JSON for flexibility)
                    action_data JSONB,

                    -- Metadata
                    ip_address VARCHAR(45),
                    user_agent TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """))
            print("   ✓ admin_activity_log table created")

            # 4. Create indexes for admin_activity_log
            print("4. Creating indexes for admin_activity_log...")
            db.session.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_admin_activity_admin
                ON admin_activity_log(admin_id)
            """))
            db.session.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_admin_activity_type
                ON admin_activity_log(action_type)
            """))
            db.session.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_admin_activity_target
                ON admin_activity_log(target_type, target_id)
            """))
            db.session.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_admin_activity_created
                ON admin_activity_log(created_at DESC)
            """))
            print("   ✓ Indexes created for admin_activity_log")

            # 5. Update users table - Add restriction fields
            print("5. Updating users table with restriction fields...")

            # Check if columns already exist before adding
            check_column = db.session.execute(text("""
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name='users' AND column_name='is_messaging_restricted'
            """)).fetchone()

            if not check_column:
                db.session.execute(text("""
                    ALTER TABLE users
                        ADD COLUMN is_messaging_restricted BOOLEAN DEFAULT FALSE,
                        ADD COLUMN messaging_restricted_until TIMESTAMP,
                        ADD COLUMN is_account_suspended BOOLEAN DEFAULT FALSE,
                        ADD COLUMN account_suspended_until TIMESTAMP
                """))
                print("   ✓ Restriction fields added to users table")
            else:
                print("   ℹ Restriction fields already exist in users table (skipping)")

            # 6. Create indexes for user restrictions
            print("6. Creating indexes for user restrictions...")
            db.session.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_users_messaging_restricted
                ON users(is_messaging_restricted)
            """))
            db.session.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_users_account_suspended
                ON users(is_account_suspended)
            """))
            print("   ✓ Indexes created for user restrictions")

            # 7. Update message_reports table - Ensure action fields exist
            print("7. Verifying message_reports table structure...")

            check_action_notes = db.session.execute(text("""
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name='message_reports' AND column_name='action_notes'
            """)).fetchone()

            if not check_action_notes:
                db.session.execute(text("""
                    ALTER TABLE message_reports
                        ADD COLUMN IF NOT EXISTS action_notes TEXT,
                        ADD COLUMN IF NOT EXISTS action_taken_at TIMESTAMP
                """))
                print("   ✓ Action fields added to message_reports table")
            else:
                print("   ℹ Action fields already exist in message_reports table")

            # Commit all changes
            db.session.commit()
            print()
            print("=" * 60)
            print("✅ MIGRATION COMPLETED SUCCESSFULLY!")
            print("=" * 60)
            print()
            print("Tables created:")
            print("  • user_violations")
            print("  • admin_activity_log")
            print()
            print("Tables updated:")
            print("  • users (restriction fields)")
            print("  • message_reports (verified)")
            print()
            print("All indexes created successfully.")
            print()
            print(f"Completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
            print()

            return True

        except Exception as e:
            db.session.rollback()
            print()
            print("=" * 60)
            print("❌ MIGRATION FAILED!")
            print("=" * 60)
            print(f"Error: {str(e)}")
            print()
            print("Rolling back changes...")
            print()
            return False

if __name__ == '__main__':
    print()
    success = run_migration()
    sys.exit(0 if success else 1)
