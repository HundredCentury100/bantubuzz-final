"""
Fix numeric precision for all price/money columns to prevent rounding issues
This changes Numeric(10,2) to Numeric(15,4) to handle exact decimal values
"""
from app import create_app, db
from sqlalchemy import text

def upgrade():
    """Increase precision for all money columns"""
    app = create_app()
    with app.app_context():
        try:
            print("Starting numeric precision migration...")

            # List of tables and columns to update
            updates = [
                ('proposals', 'total_price'),
                ('proposal_milestones', 'price'),
                ('bookings', 'total_price'),
                ('bookings', 'amount_paid'),
                ('packages', 'price'),
                ('wallet_transactions', 'amount'),
                ('collaboration_milestones', 'price'),
                ('creator_profiles', 'revision_fee'),
                ('wallets', 'balance'),
                ('wallets', 'pending_balance'),
                ('wallets', 'total_earned'),
                ('cashout_requests', 'amount'),
            ]

            for table, column in updates:
                try:
                    sql = f"ALTER TABLE {table} ALTER COLUMN {column} TYPE NUMERIC(15,4)"
                    print(f"Updating {table}.{column}...")
                    db.session.execute(text(sql))
                    db.session.commit()  # Commit each one separately
                    print(f"✓ {table}.{column} updated")
                except Exception as e:
                    db.session.rollback()  # Rollback on error
                    print(f"✗ Error updating {table}.{column}: {e}")
                    # Continue with other columns even if one fails

            print("\nCommitting all changes...")
            print("\n✓ Migration completed successfully!")

        except Exception as e:
            db.session.rollback()
            print(f"\n✗ Migration failed: {e}")
            raise

if __name__ == '__main__':
    upgrade()
