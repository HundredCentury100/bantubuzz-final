#!/usr/bin/env python3
"""
Scheduled job to clear funds from pending to available
Should run hourly via cron
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app, db
from app.services.wallet_service import clear_pending_transactions

def main():
    """Clear all transactions ready to be released"""
    app = create_app('production')

    with app.app_context():
        try:
            print(f"[{datetime.now()}] Starting escrow clearance job...")

            cleared_count = clear_pending_transactions()

            print(f"[{datetime.now()}] Cleared {cleared_count} transactions successfully")

            return 0
        except Exception as e:
            print(f"[{datetime.now()}] ERROR: {str(e)}")
            import traceback
            traceback.print_exc()
            return 1

if __name__ == '__main__':
    from datetime import datetime
    exit(main())
