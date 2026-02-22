"""Manually release escrow to wallet for Collaboration 20"""
from app import create_app, db
from app.services.payment_service import release_escrow_to_wallet

app = create_app()
with app.app_context():
    try:
        print("Attempting to release escrow for Collaboration 20...")
        transaction = release_escrow_to_wallet(collaboration_id=20, platform_fee_percentage=15)

        print(f"\n✅ SUCCESS!")
        print(f"\n=== WALLET TRANSACTION CREATED ===")
        print(f"Transaction ID: {transaction.id}")
        print(f"Amount: ${transaction.amount}")
        print(f"Gross Amount: ${transaction.gross_amount}")
        print(f"Platform Fee: ${transaction.platform_fee} ({transaction.platform_fee_percentage}%)")
        print(f"Net Amount: ${transaction.net_amount}")
        print(f"Status: {transaction.status}")
        print(f"Clearance Days: {transaction.clearance_days}")
        print(f"Available At: {transaction.available_at}")
        print(f"\n💰 Creator's wallet now has ${transaction.net_amount} pending clearance!")

    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        exit(1)
