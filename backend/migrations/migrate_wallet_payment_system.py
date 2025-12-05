"""
Migration: Create Wallet and Payment System Tables
Creates: wallets, wallet_transactions, payments, payment_verifications, cashout_requests
"""
import sys
import os
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app import db, create_app
from sqlalchemy import text

def create_wallet_payment_tables():
    """Create all wallet and payment system tables"""
    print("\n" + "=" * 60)
    print("Creating Wallet & Payment System Tables...")
    print("=" * 60)

    app = create_app()

    with app.app_context():
        try:
            print("\n1. Creating tables...")

            # Import models to ensure they're registered
            from app.models import (
                Wallet, WalletTransaction, Payment,
                PaymentVerification, CashoutRequest
            )

            # Create all tables
            db.create_all()

            print("   [OK] wallets table created")
            print("   [OK] wallet_transactions table created")
            print("   [OK] payments table created")
            print("   [OK] payment_verifications table created")
            print("   [OK] cashout_requests table created")

            # Update bookings table with escrow fields
            print("\n2. Updating bookings table...")
            try:
                db.session.execute(text("""
                    ALTER TABLE bookings
                    ADD COLUMN IF NOT EXISTS escrow_status VARCHAR(20) DEFAULT 'pending'
                """))
                db.session.execute(text("""
                    ALTER TABLE bookings
                    ADD COLUMN IF NOT EXISTS escrowed_at TIMESTAMP
                """))
                print("   [OK] Added escrow_status column to bookings")
                print("   [OK] Added escrowed_at column to bookings")
            except Exception as e:
                print(f"   Note: Booking columns might already exist: {str(e)}")

            # Update collaborations table
            print("\n3. Updating collaborations table...")
            try:
                db.session.execute(text("""
                    ALTER TABLE collaborations
                    ADD COLUMN IF NOT EXISTS payment_released BOOLEAN DEFAULT FALSE
                """))
                db.session.execute(text("""
                    ALTER TABLE collaborations
                    ADD COLUMN IF NOT EXISTS payment_released_at TIMESTAMP
                """))
                db.session.execute(text("""
                    ALTER TABLE collaborations
                    ADD COLUMN IF NOT EXISTS escrow_amount NUMERIC(10,2)
                """))
                print("   [OK] Added payment_released column to collaborations")
                print("   [OK] Added payment_released_at column to collaborations")
                print("   [OK] Added escrow_amount column to collaborations")
            except Exception as e:
                print(f"   Note: Collaboration columns might already exist: {str(e)}")

            db.session.commit()

            print("\n" + "=" * 60)
            print("[SUCCESS] Migration completed successfully!")
            print("=" * 60)

            print("\nTables created:")
            print("  • wallets - Creator wallet balances")
            print("  • wallet_transactions - All money movements")
            print("  • payments - Brand payment records")
            print("  • payment_verifications - Admin verification audit")
            print("  • cashout_requests - Creator cashout requests")

            print("\nNext steps:")
            print("  1. Wallets will be created automatically when creators earn money")
            print("  2. Admins can verify payments via admin dashboard")
            print("  3. Creators can request cashouts after 30-day clearance")

        except Exception as e:
            db.session.rollback()
            print(f"\n[ERROR] Error during migration: {str(e)}")
            raise

if __name__ == '__main__':
    create_wallet_payment_tables()
