"""Check wallet and collaboration status"""
from app import create_app, db
from app.models import Collaboration, WalletTransaction, Wallet, CreatorProfile, Payment, Booking

app = create_app()
with app.app_context():
    # Get completed collaborations
    completed = Collaboration.query.filter_by(status='completed').all()
    print(f'\n=== COMPLETED COLLABORATIONS ===')
    print(f'Total: {len(completed)}')

    for c in completed:
        print(f'\nCollab ID: {c.id}')
        print(f'  Title: {c.title if hasattr(c, "title") else "N/A"}')
        print(f'  Creator ID: {c.creator_id}')
        print(f'  Status: {c.status}')
        print(f'  Escrow Status: {c.escrow_status if hasattr(c, "escrow_status") else "N/A"}')
        print(f'  Booking ID: {c.booking_id if hasattr(c, "booking_id") else "N/A"}')

        # Check payment
        payment = Payment.query.filter_by(collaboration_id=c.id).first()
        if not payment and hasattr(c, 'booking_id') and c.booking_id:
            booking = Booking.query.get(c.booking_id)
            if booking:
                payment = Payment.query.filter_by(booking_id=booking.id).first()

        if payment:
            print(f'  Payment: FOUND (Status: {payment.status}, Escrow: {payment.escrow_status})')
        else:
            print(f'  Payment: NOT FOUND')

        # Check for wallet transaction
        transaction = WalletTransaction.query.filter_by(collaboration_id=c.id).first()
        if transaction:
            print(f'  Transaction: FOUND (ID: {transaction.id}, Amount: ${transaction.amount}, Status: {transaction.status})')
        else:
            print(f'  Transaction: NOT FOUND <<<--- THIS IS THE PROBLEM')

    # Check wallet balances
    print(f'\n=== CREATOR WALLETS ===')
    wallets = Wallet.query.all()
    for w in wallets:
        creator = CreatorProfile.query.filter_by(user_id=w.user_id).first()
        if creator:
            print(f'\nCreator ID: {creator.id} (User ID: {w.user_id})')
            print(f'  Pending Clearance: ${w.pending_clearance}')
            print(f'  Available Balance: ${w.available_balance}')
            print(f'  Total Earned: ${w.total_earned}')
