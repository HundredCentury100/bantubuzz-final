"""Check collaboration 20 payment details"""
from app import create_app, db
from app.models import Collaboration, Payment, Booking, WalletTransaction

app = create_app()
with app.app_context():
    collab = Collaboration.query.get(20)

    if not collab:
        print("Collaboration 20 not found!")
        exit()

    print(f"\n=== COLLABORATION 20 DETAILS ===")
    print(f"ID: {collab.id}")
    print(f"Title: {collab.title if hasattr(collab, 'title') else 'N/A'}")
    print(f"Status: {collab.status}")
    print(f"Booking ID: {collab.booking_id}")
    print(f"Collaboration Type: {collab.collaboration_type if hasattr(collab, 'collaboration_type') else 'N/A'}")

    # Check booking
    if collab.booking_id:
        booking = Booking.query.get(collab.booking_id)
        print(f"\n=== BOOKING {booking.id} ===")
        print(f"Amount: ${booking.total_price if hasattr(booking, 'total_price') else booking.amount}")
        print(f"Payment Status: {booking.payment_status}")
        print(f"Escrow Status: {booking.escrow_status if hasattr(booking, 'escrow_status') else 'N/A'}")

        # Check payment
        payment = Payment.query.filter_by(booking_id=booking.id).first()
        if payment:
            print(f"\n=== PAYMENT RECORD ===")
            print(f"Payment ID: {payment.id}")
            print(f"Amount: ${payment.amount}")
            print(f"Status: {payment.status}")
            print(f"Payment Method: {payment.payment_method}")
            print(f"Payment Type: {payment.payment_type}")
            print(f"Escrow Status: {payment.escrow_status}")
            print(f"Verified At: {payment.verified_at}")
            print(f"Completed At: {payment.completed_at}")
        else:
            print(f"\n=== PAYMENT: NOT FOUND ===")

    # Check wallet transaction
    transaction = WalletTransaction.query.filter_by(collaboration_id=collab.id).first()
    if transaction:
        print(f"\n=== WALLET TRANSACTION ===")
        print(f"ID: {transaction.id}")
        print(f"Amount: ${transaction.amount}")
        print(f"Status: {transaction.status}")
    else:
        print(f"\n=== WALLET TRANSACTION: NOT FOUND ===")
        print("\nThis is the problem - wallet transaction should have been created!")
