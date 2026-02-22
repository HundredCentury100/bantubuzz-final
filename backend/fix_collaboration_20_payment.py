"""Fix Collaboration 20 by creating missing Payment record"""
from app import create_app, db
from app.models import Collaboration, Payment, PaymentVerification, Booking, BrandProfile
from datetime import datetime

app = create_app()
with app.app_context():
    collab = Collaboration.query.get(20)

    if not collab:
        print("Collaboration 20 not found!")
        exit(1)

    print(f"\n=== COLLABORATION 20 ===")
    print(f"ID: {collab.id}")
    print(f"Booking ID: {collab.booking_id}")
    print(f"Status: {collab.status}")

    if not collab.booking_id:
        print("ERROR: No booking_id found")
        exit(1)

    # Get booking
    booking = Booking.query.get(collab.booking_id)
    if not booking:
        print(f"ERROR: Booking {collab.booking_id} not found")
        exit(1)

    print(f"\n=== BOOKING {booking.id} ===")
    print(f"Amount: ${booking.total_price if hasattr(booking, 'total_price') else booking.amount}")
    print(f"Payment Status: {booking.payment_status}")
    print(f"Payment Method: {booking.payment_method}")

    # Check if Payment record exists
    existing_payment = Payment.query.filter_by(booking_id=booking.id).first()

    if existing_payment:
        print(f"\n✓ Payment record already exists (ID: {existing_payment.id})")
        print(f"Status: {existing_payment.status}")
        print(f"Escrow Status: {existing_payment.escrow_status}")
        exit(0)

    # Get brand profile
    brand = BrandProfile.query.get(booking.brand_id)
    if not brand:
        print("ERROR: Brand profile not found")
        exit(1)

    # Create Payment record
    print(f"\n→ Creating Payment record for booking {booking.id}")

    amount = float(booking.total_price if hasattr(booking, 'total_price') else booking.amount)

    payment = Payment(
        booking_id=booking.id,
        user_id=brand.user_id,
        amount=amount,
        currency='USD',
        payment_method=booking.payment_method or 'manual',
        payment_type='manual',
        status='completed',
        verified_at=booking.created_at,
        completed_at=booking.created_at,
        escrow_status='escrowed',
        held_amount=amount
    )

    db.session.add(payment)
    db.session.flush()

    print(f"✓ Payment record created (ID: {payment.id})")
    print(f"  Amount: ${payment.amount}")
    print(f"  Status: {payment.status}")
    print(f"  Escrow Status: {payment.escrow_status}")

    # Create PaymentVerification record
    # Get first admin user for verified_by
    from app.models import User
    admin_user = User.query.filter_by(is_admin=True).first()
    admin_id = admin_user.id if admin_user else 1  # Fallback to user ID 1

    verification = PaymentVerification(
        payment_id=payment.id,
        booking_id=booking.id,
        verified_by=admin_id,
        verified_at=booking.created_at,
        amount_verified=amount,
        payment_method=booking.payment_method or 'manual',
        verification_notes='Retroactive payment record created for old collaboration'
    )

    db.session.add(verification)

    print(f"✓ PaymentVerification record created (verified by user {admin_id})")

    db.session.commit()

    print(f"\n✓ Successfully fixed Collaboration 20!")
    print(f"\nNow you can mark the collaboration as complete and the wallet transaction will be created.")
