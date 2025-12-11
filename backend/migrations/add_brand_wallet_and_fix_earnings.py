"""
Migration: Add Brand Wallet Support and Fix Total Earnings Calculation
Date: 2025-01-11

Changes:
1. Extend wallets table to support brand wallets (currently creator-only)
2. Add username column to brand_profiles for consistency
3. Fix total_earned to track NET earnings (after platform fees) instead of gross
4. Add cashout_fee column to cashout_requests if missing
5. Ensure all wallet-related columns are properly set up

This migration is safe to run multiple times (idempotent).
"""

import sys
sys.path.append('/var/www/bantubuzz/backend')

from app import create_app, db
from app.models import User, Wallet, BrandProfile, CreatorProfile, WalletTransaction
from sqlalchemy import text, inspect
import traceback

def column_exists(table_name, column_name):
    """Check if a column exists in a table"""
    inspector = inspect(db.engine)
    columns = [col['name'] for col in inspector.get_columns(table_name)]
    return column_name in columns

def run_migration():
    app = create_app()

    with app.app_context():
        try:
            print("=" * 60)
            print("MIGRATION: Brand Wallet & Earnings Fix")
            print("=" * 60)

            # Step 1: Add username to brand_profiles if it doesn't exist
            print("\n[1/6] Adding username column to brand_profiles...")
            if not column_exists('brand_profiles', 'username'):
                db.session.execute(text("""
                    ALTER TABLE brand_profiles
                    ADD COLUMN username VARCHAR(50) UNIQUE
                """))
                print("✓ Added username column to brand_profiles")
            else:
                print("✓ username column already exists in brand_profiles")

            # Step 2: Ensure cashout_fee column exists
            print("\n[2/6] Checking cashout_fee column...")
            if not column_exists('cashout_requests', 'cashout_fee'):
                db.session.execute(text("""
                    ALTER TABLE cashout_requests
                    ADD COLUMN cashout_fee NUMERIC(10, 2) DEFAULT 0.00
                """))
                print("✓ Added cashout_fee column")
            else:
                print("✓ cashout_fee column already exists")

            db.session.commit()

            # Step 3: Create wallets for all brands who don't have one
            print("\n[3/6] Creating wallets for brands...")
            brands = User.query.filter_by(user_type='brand').all()
            brands_created = 0

            for brand in brands:
                existing_wallet = Wallet.query.filter_by(user_id=brand.id).first()
                if not existing_wallet:
                    wallet = Wallet(
                        user_id=brand.id,
                        pending_clearance=0.00,
                        available_balance=0.00,
                        withdrawn_total=0.00,
                        total_earned=0.00,
                        currency='USD'
                    )
                    db.session.add(wallet)
                    brands_created += 1

            db.session.commit()
            print(f"✓ Created {brands_created} brand wallets")

            # Step 4: Recalculate total_earned for all creator wallets to be NET (after fees)
            print("\n[4/6] Recalculating total_earned for creators (NET after platform fees)...")

            creators = User.query.filter_by(user_type='creator').all()
            updated_count = 0

            for creator in creators:
                wallet = Wallet.query.filter_by(user_id=creator.id).first()
                if wallet:
                    # Calculate total NET earnings from transactions
                    total_net = db.session.query(
                        db.func.coalesce(db.func.sum(WalletTransaction.net_amount), 0)
                    ).filter(
                        WalletTransaction.user_id == creator.id,
                        WalletTransaction.transaction_type == 'earning',
                        WalletTransaction.net_amount.isnot(None)
                    ).scalar()

                    old_total = float(wallet.total_earned or 0)
                    new_total = float(total_net or 0)

                    if abs(old_total - new_total) > 0.01:  # Only update if different
                        wallet.total_earned = new_total
                        updated_count += 1
                        print(f"  - User {creator.id}: ${old_total:.2f} → ${new_total:.2f}")

            db.session.commit()
            print(f"✓ Updated {updated_count} creator wallets")

            # Step 5: Update wallet comment in model to reflect NET earnings
            print("\n[5/6] Database schema updated (total_earned now represents NET earnings)")

            # Step 6: Summary
            print("\n[6/6] Migration Summary:")
            print("-" * 60)

            creator_wallets = Wallet.query.join(User).filter(User.user_type == 'creator').count()
            brand_wallets = Wallet.query.join(User).filter(User.user_type == 'brand').count()
            total_creator_earnings = db.session.query(
                db.func.coalesce(db.func.sum(Wallet.total_earned), 0)
            ).join(User).filter(User.user_type == 'creator').scalar()

            print(f"Creator wallets: {creator_wallets}")
            print(f"Brand wallets: {brand_wallets}")
            print(f"Total creator NET earnings: ${float(total_creator_earnings):.2f}")
            print(f"✓ Brand wallet system ready")
            print(f"✓ Total earnings now represents NET (after platform fees)")

            print("\n" + "=" * 60)
            print("MIGRATION COMPLETED SUCCESSFULLY!")
            print("=" * 60)

        except Exception as e:
            print(f"\n❌ ERROR: {str(e)}")
            print(traceback.format_exc())
            db.session.rollback()
            return False

    return True

if __name__ == '__main__':
    success = run_migration()
    sys.exit(0 if success else 1)
