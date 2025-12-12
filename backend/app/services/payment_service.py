"""
Payment Service - Handles payment verification and management
"""
from datetime import datetime, timedelta
from app import db
from app.models import Payment, PaymentVerification, Booking, WalletTransaction, Collaboration, User
from app.services.wallet_service import get_or_create_wallet
from app.utils.email_service import send_payment_verified_notification


def create_payment_record(booking_id, user_id, amount, payment_method='paynow', payment_type='automated'):
    """Create initial payment record when booking is created"""
    payment = Payment(
        booking_id=booking_id,
        user_id=user_id,
        amount=amount,
        payment_method=payment_method,
        payment_type=payment_type,
        status='pending',
        escrow_status='pending'
    )

    if payment_type == 'manual':
        payment.payment_instructions = generate_payment_instructions(booking_id, amount)

    db.session.add(payment)
    db.session.commit()
    return payment


def generate_payment_instructions(booking_id, amount):
    """Generate payment instructions for brands"""
    reference = f"BP-{datetime.utcnow().strftime('%Y%m%d')}-{booking_id}"
    instructions = f"""
Please complete payment of ${amount:.2f}:

**Bank Transfer:**
Bank: CBZ Bank | Account: 1234567890
Branch: Harare | Reference: {reference}

**EcoCash:** +263771234567
**OneMoney:** +263771234567
Reference: {reference}

Upload proof after payment.
"""
    return instructions.strip()


def verify_manual_payment(payment_id, admin_user_id, verification_data):
    """Admin verifies manual payment"""
    payment = Payment.query.get(payment_id)
    if not payment:
        raise ValueError("Payment not found")
    if payment.status == 'completed':
        raise ValueError("Already verified")

    booking = Booking.query.get(payment.booking_id)

    payment.status = 'completed'
    payment.payment_type = 'manual'
    payment.payment_method = verification_data.get('payment_method', 'bank_transfer')
    payment.payment_reference = verification_data.get('transaction_reference')
    payment.verified_by = admin_user_id
    payment.verified_at = datetime.utcnow()
    payment.completed_at = datetime.utcnow()
    payment.verification_notes = verification_data.get('notes', '')
    payment.escrow_status = 'escrowed'
    payment.held_amount = payment.amount

    if verification_data.get('proof_url'):
        payment.payment_proof_url = verification_data['proof_url']

    booking.payment_status = 'paid'
    booking.escrow_status = 'escrowed'
    booking.escrowed_at = datetime.utcnow()

    verification = PaymentVerification(
        payment_id=payment.id,
        booking_id=booking.id,
        verified_by=admin_user_id,
        verified_at=datetime.utcnow(),
        amount_verified=verification_data.get('amount', payment.amount),
        payment_method=verification_data.get('payment_method', 'bank_transfer'),
        transaction_reference=verification_data.get('transaction_reference'),
        payment_date=verification_data.get('payment_date'),
        proof_url=verification_data.get('proof_url'),
        verification_notes=verification_data.get('notes', '')
    )
    db.session.add(verification)
    db.session.commit()

    # Send email notification to creator
    try:
        # Get creator email from booking
        if booking.creator_id:
            creator_user = User.query.filter_by(id=booking.creator_id).first()
            if creator_user and creator_user.email:
                send_payment_verified_notification(payment, creator_user.email)
    except Exception as e:
        # Log error but don't fail the verification
        print(f"Failed to send payment verified email: {str(e)}")

    return payment


def add_manual_payment(admin_user_id, payment_data):
    """Admin adds offline payment"""
    booking = Booking.query.get(payment_data['booking_id'])
    if not booking:
        raise ValueError("Booking not found")
    if booking.payment_status == 'paid':
        raise ValueError("Already paid")

    # Get the brand's user_id from the brand profile
    from app.models import BrandProfile
    brand = BrandProfile.query.get(booking.brand_id)
    if not brand:
        raise ValueError("Brand profile not found")

    payment = Payment(
        booking_id=booking.id,
        user_id=brand.user_id,  # Use brand's user_id instead of brand_id
        amount=payment_data['amount'],
        currency=payment_data.get('currency', 'USD'),
        payment_method=payment_data['payment_method'],
        payment_type='admin_added',
        payment_reference=payment_data.get('transaction_reference'),
        external_reference=payment_data.get('external_reference'),
        status='completed',
        verified_by=admin_user_id,
        verified_at=datetime.utcnow(),
        completed_at=datetime.utcnow(),
        verification_notes=payment_data.get('notes', ''),
        escrow_status='escrowed',
        held_amount=payment_data['amount']
    )

    if payment_data.get('proof_url'):
        payment.payment_proof_url = payment_data['proof_url']

    db.session.add(payment)
    db.session.flush()

    booking.payment_status = 'paid'
    booking.escrow_status = 'escrowed'
    booking.escrowed_at = datetime.utcnow()

    verification = PaymentVerification(
        payment_id=payment.id,
        booking_id=booking.id,
        verified_by=admin_user_id,
        verified_at=datetime.utcnow(),
        amount_verified=payment_data['amount'],
        payment_method=payment_data['payment_method'],
        transaction_reference=payment_data.get('transaction_reference'),
        payment_date=payment_data.get('payment_date', datetime.utcnow().date()),
        proof_url=payment_data.get('proof_url'),
        verification_notes=payment_data.get('notes', '')
    )
    db.session.add(verification)
    db.session.commit()
    return payment


def release_escrow_to_wallet(collaboration_id, platform_fee_percentage=15):
    """
    Release money to creator wallet with 24-hour clearance
    Works with both booking-based and collaboration-based payments
    """
    collaboration = Collaboration.query.get(collaboration_id)
    if not collaboration:
        raise ValueError("Collaboration not found")

    if collaboration.status != 'completed':
        raise ValueError("Collaboration must be completed before releasing funds")

    # Check if wallet transaction already exists for this collaboration
    existing_transaction = WalletTransaction.query.filter_by(
        collaboration_id=collaboration_id,
        transaction_type='earning'
    ).first()

    if existing_transaction:
        raise ValueError("Funds already released to wallet")

    # Find payment - try collaboration_id first, then booking_id
    payment = Payment.query.filter_by(collaboration_id=collaboration_id).first()

    if not payment:
        # Try finding by booking_id if collaboration has a booking
        booking = collaboration.booking if hasattr(collaboration, 'booking') else None
        if booking:
            payment = Payment.query.filter_by(booking_id=booking.id).first()

    if not payment:
        raise ValueError("No payment found for this collaboration")

    # Check payment status - accept both 'paid' (admin-added) and 'completed' (paynow)
    if payment.status not in ['paid', 'completed']:
        raise ValueError(f"Payment not ready - status is '{payment.status}', expected 'paid' or 'completed'")

    if payment.escrow_status not in ['escrowed', 'pending']:
        raise ValueError(f"Payment escrow status invalid - '{payment.escrow_status}'")

    # Calculate amounts
    creator = collaboration.creator
    gross_amount = float(payment.amount)
    platform_fee = gross_amount * (platform_fee_percentage / 100)
    net_amount = gross_amount - platform_fee

    # Get or create wallet
    wallet = get_or_create_wallet(creator.user_id)

    # Set timestamps for 24-hour clearance
    completed_at = datetime.utcnow()
    available_at = completed_at + timedelta(days=1)  # 24 hours for testing

    # Build description and metadata
    description = f"Earnings from collaboration with {collaboration.brand.company_name if collaboration.brand else 'brand'}"
    metadata = {
        'brand_name': collaboration.brand.company_name if collaboration.brand else 'Unknown',
        'collaboration_id': collaboration.id,
        'collaboration_title': collaboration.title if hasattr(collaboration, 'title') else 'Collaboration'
    }

    # Add booking info if available
    booking = collaboration.booking if hasattr(collaboration, 'booking') and collaboration.booking else None
    if booking:
        metadata['booking_id'] = booking.id
        # Safely access package name
        try:
            if hasattr(booking, 'package') and booking.package and hasattr(booking.package, 'name'):
                metadata['package_name'] = booking.package.name
                description = f"Earnings from {booking.package.name}"
        except Exception:
            pass  # Skip package name if it's not available

    # Create wallet transaction
    transaction = WalletTransaction(
        wallet_id=wallet.id,
        user_id=creator.user_id,
        transaction_type='earning',
        amount=net_amount,
        status='pending_clearance',
        clearance_required=True,
        clearance_days=1,  # 24 hours
        completed_at=completed_at,
        available_at=available_at,
        collaboration_id=collaboration.id,
        booking_id=booking.id if booking else None,
        gross_amount=gross_amount,
        platform_fee=platform_fee,
        platform_fee_percentage=platform_fee_percentage,
        net_amount=net_amount,
        description=description,
        transaction_metadata=metadata
    )
    db.session.add(transaction)

    # Update payment escrow status to released
    payment.escrow_status = 'released'

    # Update booking if it exists
    if booking:
        booking.escrow_status = 'released'

    # Update wallet balances
    wallet.pending_clearance = float(wallet.pending_clearance or 0) + net_amount
    wallet.total_earned = float(wallet.total_earned or 0) + net_amount  # Fixed: Use net_amount instead of gross
    wallet.updated_at = datetime.utcnow()

    # Commit all changes
    db.session.commit()

    return transaction


def get_pending_payments_for_admin():
    """Get all payments pending verification"""
    payments = Payment.query.filter(
        Payment.status == 'pending',
        Payment.payment_type.in_(['manual', 'admin_added'])
    ).order_by(Payment.created_at.desc()).all()

    return [p.to_dict(include_relations=True) for p in payments]


def get_payment_statistics():
    """Get payment statistics for admin"""
    from sqlalchemy import func

    total_payments = Payment.query.filter_by(status='completed').count()
    pending_verifications = Payment.query.filter_by(status='pending').count()

    total_amount = db.session.query(
        func.coalesce(func.sum(Payment.amount), 0)
    ).filter(Payment.status == 'completed').scalar()

    escrowed_amount = db.session.query(
        func.coalesce(func.sum(Payment.held_amount), 0)
    ).filter(Payment.escrow_status == 'escrowed').scalar()

    return {
        'total_payments': total_payments,
        'pending_verifications': pending_verifications,
        'total_amount': float(total_amount),
        'escrowed_amount': float(escrowed_amount)
    }


def initiate_payment(booking, user_email, package_title):
    """Initiate Paynow payment"""
    import os
    from paynow import Paynow
    from flask import current_app

    # Get Paynow credentials from environment
    # Use current_app.config if available, otherwise fall back to os.getenv
    try:
        integration_id = current_app.config.get('PAYNOW_INTEGRATION_ID') or os.getenv('PAYNOW_INTEGRATION_ID')
        integration_key = current_app.config.get('PAYNOW_INTEGRATION_KEY') or os.getenv('PAYNOW_INTEGRATION_KEY')
        return_url = current_app.config.get('PAYNOW_RETURN_URL') or os.getenv('PAYNOW_RETURN_URL')
        result_url = current_app.config.get('PAYNOW_RESULT_URL') or os.getenv('PAYNOW_RESULT_URL')
    except RuntimeError:
        # No app context, use os.getenv directly
        integration_id = os.getenv('PAYNOW_INTEGRATION_ID')
        integration_key = os.getenv('PAYNOW_INTEGRATION_KEY')
        return_url = os.getenv('PAYNOW_RETURN_URL')
        result_url = os.getenv('PAYNOW_RESULT_URL')

    # Initialize Paynow
    paynow = Paynow(
        integration_id=integration_id,
        integration_key=integration_key,
        return_url=return_url,
        result_url=result_url
    )

    try:
        # Create payment
        payment = paynow.create_payment(f'BOOKING-{booking.id}', user_email)

        # Add items to the payment
        payment.add(package_title, booking.amount)

        # Send payment to Paynow
        response = paynow.send(payment)

        if response.success:
            # Get poll URL for checking payment status
            poll_url = response.poll_url
            redirect_url = response.redirect_url

            # Update booking with Paynow reference
            booking.payment_reference = f'PAYNOW-{response.hash}'

            # Create or update payment record
            payment_record = Payment.query.filter_by(booking_id=booking.id).first()
            if not payment_record:
                payment_record = Payment(
                    booking_id=booking.id,
                    user_id=booking.brand.user_id,
                    amount=booking.amount,
                    payment_method='paynow',
                    payment_type='automated',
                    status='pending',
                    escrow_status='pending'
                )
                db.session.add(payment_record)

            payment_record.paynow_poll_url = poll_url
            # response.hash might be boolean True instead of string, so convert it
            payment_hash = str(response.hash) if response.hash and response.hash != True else poll_url.split('guid=')[-1] if '?guid=' in poll_url else None
            payment_record.paynow_reference = payment_hash
            payment_record.external_reference = f'BOOKING-{booking.id}'

            db.session.commit()

            return {
                'success': True,
                'message': 'Payment initiated successfully',
                'redirect_url': redirect_url,
                'poll_url': poll_url,
                'payment_reference': payment_hash
            }
        else:
            # Get error details
            error_msg = 'Unknown error'
            if hasattr(response, 'errors') and response.errors:
                error_msg = str(response.errors)
            elif hasattr(response, 'status') and response.status:
                error_msg = f"Paynow Status: {response.status}"

            return {
                'success': False,
                'error': 'Failed to initiate payment',
                'message': error_msg,
                'paynow_status': getattr(response, 'status', None)
            }

    except Exception as e:
        return {
            'success': False,
            'error': 'Payment initialization failed',
            'message': str(e)
        }


def check_payment_status(booking):
    """Check Paynow payment status"""
    import os
    from paynow import Paynow
    from flask import current_app

    # First check if already paid in database
    if booking.payment_status == 'paid':
        return {
            'status': 'paid',
            'paid': True,
            'message': 'Payment already confirmed'
        }

    # Get payment record
    payment_record = Payment.query.filter_by(booking_id=booking.id).first()

    if not payment_record or not payment_record.paynow_poll_url:
        return {
            'status': booking.payment_status,
            'paid': False,
            'message': 'No payment initiated'
        }

    try:
        # Get Paynow credentials
        try:
            integration_id = current_app.config.get('PAYNOW_INTEGRATION_ID') or os.getenv('PAYNOW_INTEGRATION_ID')
            integration_key = current_app.config.get('PAYNOW_INTEGRATION_KEY') or os.getenv('PAYNOW_INTEGRATION_KEY')
            return_url = current_app.config.get('PAYNOW_RETURN_URL') or os.getenv('PAYNOW_RETURN_URL')
            result_url = current_app.config.get('PAYNOW_RESULT_URL') or os.getenv('PAYNOW_RESULT_URL')
        except RuntimeError:
            integration_id = os.getenv('PAYNOW_INTEGRATION_ID')
            integration_key = os.getenv('PAYNOW_INTEGRATION_KEY')
            return_url = os.getenv('PAYNOW_RETURN_URL')
            result_url = os.getenv('PAYNOW_RESULT_URL')

        # Initialize Paynow
        paynow = Paynow(
            integration_id=integration_id,
            integration_key=integration_key,
            return_url=return_url,
            result_url=result_url
        )

        # Check status from Paynow
        status = paynow.check_transaction_status(payment_record.paynow_poll_url)

        if status.paid:
            # Update booking and payment status
            booking.payment_status = 'paid'
            booking.escrow_status = 'escrowed'
            booking.escrowed_at = datetime.utcnow()

            payment_record.status = 'completed'
            payment_record.completed_at = datetime.utcnow()
            payment_record.escrow_status = 'escrowed'
            payment_record.held_amount = booking.amount

            # NEW: Auto-sync collaboration if exists
            collaboration = Collaboration.query.filter_by(booking_id=booking.id).first()
            if collaboration:
                collaboration.payment_status = 'paid'
                collaboration.escrow_status = 'escrowed'
                if collaboration.status == 'pending':
                    collaboration.status = 'in_progress'  # Activate collaboration

            db.session.commit()

            return {
                'status': 'paid',
                'paid': True,
                'message': 'Payment confirmed'
            }
        else:
            return {
                'status': status.status if hasattr(status, 'status') else 'pending',
                'paid': False,
                'message': 'Payment not yet completed'
            }

    except Exception as e:
        print(f"Error checking payment status: {str(e)}")
        return {
            'status': booking.payment_status,
            'paid': False,
            'message': f'Error checking status: {str(e)}'
        }


def process_payment_webhook(data):
    """Process Paynow payment webhook/IPN"""
    import os
    from paynow import Paynow
    from flask import current_app

    try:
        # Get Paynow credentials
        try:
            integration_id = current_app.config.get('PAYNOW_INTEGRATION_ID') or os.getenv('PAYNOW_INTEGRATION_ID')
            integration_key = current_app.config.get('PAYNOW_INTEGRATION_KEY') or os.getenv('PAYNOW_INTEGRATION_KEY')
            return_url = current_app.config.get('PAYNOW_RETURN_URL') or os.getenv('PAYNOW_RETURN_URL')
            result_url = current_app.config.get('PAYNOW_RESULT_URL') or os.getenv('PAYNOW_RESULT_URL')
        except RuntimeError:
            integration_id = os.getenv('PAYNOW_INTEGRATION_ID')
            integration_key = os.getenv('PAYNOW_INTEGRATION_KEY')
            return_url = os.getenv('PAYNOW_RETURN_URL')
            result_url = os.getenv('PAYNOW_RESULT_URL')

        # Initialize Paynow
        paynow = Paynow(
            integration_id=integration_id,
            integration_key=integration_key,
            return_url=return_url,
            result_url=result_url
        )

        # Parse webhook data
        reference = data.get('reference')
        paynow_reference = data.get('paynowreference')
        status = data.get('status')
        amount = data.get('amount')

        # Find payment by reference
        payment_record = Payment.query.filter_by(paynow_reference=paynow_reference).first()

        if not payment_record:
            # Try to find by external reference
            external_ref = data.get('merchantreference') or data.get('reference')
            if external_ref and 'BOOKING-' in external_ref:
                booking_id = int(external_ref.replace('BOOKING-', ''))
                payment_record = Payment.query.filter_by(booking_id=booking_id).first()

        if not payment_record:
            print(f"Payment not found for webhook data: {data}")
            return False

        # Update payment status based on Paynow status
        if status and status.lower() in ['paid', 'delivered', 'awaiting delivery']:
            payment_record.status = 'completed'
            payment_record.completed_at = datetime.utcnow()
            payment_record.escrow_status = 'escrowed'
            payment_record.held_amount = payment_record.amount

            # Update booking
            booking = Booking.query.get(payment_record.booking_id)
            if booking:
                booking.payment_status = 'paid'
                booking.escrow_status = 'escrowed'
                booking.escrowed_at = datetime.utcnow()

                # NEW: Auto-sync collaboration if exists
                collaboration = Collaboration.query.filter_by(booking_id=booking.id).first()
                if collaboration:
                    collaboration.payment_status = 'paid'
                    collaboration.escrow_status = 'escrowed'
                    if collaboration.status == 'pending':
                        collaboration.status = 'in_progress'  # Activate collaboration

            db.session.commit()
            return True
        else:
            # Update status but don't mark as paid
            payment_record.payment_reference = f'PAYNOW-{paynow_reference}' if paynow_reference else payment_record.payment_reference
            db.session.commit()
            return True

    except Exception as e:
        print(f"Webhook processing error: {str(e)}")
        return False
