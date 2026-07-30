"""
Payment Service - Handles payment verification and management
"""
from datetime import datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP
from app import db
from app.models import Payment, PaymentVerification, Booking, WalletTransaction, Collaboration, User, BrandProfile, Subscription, CampaignPaymentItem
from app.services.wallet_service import get_or_create_wallet
from app.utils.email_service import send_payment_verified_notification
from app.utils.bank_details import get_bank_transfer_details


class PaymentService:
    """Service for handling payment operations including Paynow integration"""

    @staticmethod
    def get_brand_platform_fee(brand_id):
        """Get platform fee percentage for a brand based on their subscription tier"""
        try:
            brand = BrandProfile.query.get(brand_id)
            if not brand:
                return 10.00  # Default to 10% if brand not found

            # Get brand's active subscription
            active_subscription = Subscription.query.filter_by(
                user_id=brand.user_id,
                status='active'
            ).first()

            if not active_subscription or not active_subscription.plan:
                return 10.00  # Default to 10% for Free tier

            # Return the platform fee from the subscription plan
            return float(active_subscription.plan.platform_fee_percentage or 10.00)

        except Exception as e:
            print(f"Error getting brand platform fee: {str(e)}")
            return 10.00  # Default to 10% on error

    @staticmethod
    def initiate_paynow_payment(amount, email, reference, description):
        """Initiate a Paynow payment"""
        import os
        from paynow import Paynow
        from flask import current_app

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

        try:
            # Create payment
            payment = paynow.create_payment(reference, email)
            payment.add(description, amount)

            # Send payment to Paynow
            response = paynow.send(payment)

            if response.success:
                poll_url = response.poll_url
                redirect_url = response.redirect_url
                payment_hash = str(response.hash) if response.hash and response.hash is not True else poll_url.split('guid=')[-1] if '?guid=' in poll_url else None

                return {
                    'success': True,
                    'message': 'Payment initiated successfully',
                    'redirect_url': redirect_url,
                    'poll_url': poll_url,
                    'reference': payment_hash
                }
            else:
                error_msg = 'Unknown error'
                if hasattr(response, 'errors') and response.errors:
                    error_msg = str(response.errors)
                elif hasattr(response, 'status') and response.status:
                    error_msg = f"Paynow Status: {response.status}"

                return {
                    'success': False,
                    'message': error_msg
                }

        except Exception as e:
            return {
                'success': False,
                'message': str(e)
            }

    @staticmethod
    def check_paynow_status(poll_url):
        """Check payment status using Paynow poll URL"""
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

            # Check status
            status = paynow.check_transaction_status(poll_url)

            if status.paid:
                return {'status': 'paid', 'paid': True}
            elif hasattr(status, 'status') and status.status.lower() in ['cancelled', 'failed']:
                return {'status': 'cancelled', 'paid': False}
            else:
                return {'status': 'pending', 'paid': False}

        except Exception as e:
            print(f"Error checking Paynow status: {str(e)}")
            return {'status': 'error', 'paid': False, 'message': str(e)}


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
    bank_details = get_bank_transfer_details(reference)
    account_lines = []
    for account in bank_details["accounts"]:
        account_lines.append(
            "\n".join(
                line for line in [
                    f"Bank: {account['bank_name']}",
                    f"Account Name: {account['account_name']}",
                    f"Account Number: {account['account_number']}",
                    f"Currency: {account.get('currency')}" if account.get('currency') else None,
                    f"Account Type: {account.get('account_type')}" if account.get('account_type') else None,
                    f"Branch: {account.get('branch')}" if account.get('branch') else None,
                    f"Branch Code: {account.get('branch_code')}" if account.get('branch_code') else None,
                    f"Swift Code: {account.get('swift_code')}" if account.get('swift_code') else None,
                ]
                if line
            )
        )
    instructions = f"""
Please complete payment of ${amount:.2f}:

**Bank Transfer:**
{chr(10).join(account_lines)}

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


def release_escrow_to_wallet(collaboration_id, platform_fee_percentage=None):
    """
    Release money to creator wallet with 24-hour clearance
    Works with both booking-based and collaboration-based payments

    Payment Flow:
    1. Brand pays: collaboration_price + upfront_platform_fee (based on their subscription tier)
    2. On release: Take 15% commission from collaboration_price
    3. Creator receives: collaboration_price - 15%

    Example: $50 collaboration, Brand on Free tier (10% upfront fee)
    - Brand pays: $50 + ($50 × 10%) = $55 total
    - Platform gets upfront from brand: $5
    - On release, platform commission from creator: $50 × 15% = $7.50
    - Creator receives: $50 - $7.50 = $42.50
    - Total platform revenue: $5 + $7.50 = $12.50
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

    if platform_fee_percentage is None:
        platform_fee_percentage = get_creator_commission_percentage(collaboration.creator.user_id)

    original_collab_price = _money(payment.held_amount or collaboration.amount)
    platform_commission = _money(original_collab_price * _money(platform_fee_percentage) / Decimal("100"))
    creator_amount = _money(original_collab_price - platform_commission)

    creator = collaboration.creator

    # Get or create wallet
    wallet = get_or_create_wallet(creator.user_id)

    # Set timestamps for 24-hour clearance
    completed_at = datetime.utcnow()
    available_at = completed_at + timedelta(days=1)  # 24 hours for testing

    # Build description and metadata. Agency-owned collaborations should show
    # the client workspace brand to creators, not the agency parent account.
    display_brand_name = _display_brand_name_for_collaboration(collaboration)
    description = f"Earnings from collaboration with {display_brand_name}"
    metadata = {
        'brand_name': display_brand_name,
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
        amount=creator_amount,
        status='pending_clearance',
        clearance_required=True,
        clearance_days=1,  # 24 hours
        completed_at=completed_at,
        available_at=available_at,
        collaboration_id=collaboration.id,
        booking_id=booking.id if booking else None,
        gross_amount=original_collab_price,
        platform_fee=platform_commission,
        platform_fee_percentage=platform_fee_percentage,
        net_amount=creator_amount,
        description=description,
        transaction_metadata={
            **metadata,
            'creator_commission_pct': float(platform_fee_percentage),
            'breakdown': f'Escrow gross ${original_collab_price:.2f}. Platform takes ${platform_commission:.2f} commission. Creator receives ${creator_amount:.2f}.'
        }
    )
    db.session.add(transaction)

    # Update payment escrow status to released
    payment.escrow_status = 'released'
    payment.released_at = datetime.utcnow()

    # Update booking if it exists
    if booking:
        booking.escrow_status = 'released'

    # Update wallet balances
    wallet.pending_clearance = float(wallet.pending_clearance or 0) + float(creator_amount)
    wallet.total_earned = float(wallet.total_earned or 0) + float(creator_amount)
    wallet.updated_at = datetime.utcnow()

    # Commit all changes
    db.session.commit()

    # Send email notification to creator asynchronously
    try:
        from app.tasks.email_tasks import send_payment_release_notification
        send_payment_release_notification.delay(
            creator_user_id=creator.user_id,
            amount=float(creator_amount),
            collaboration_id=collaboration.id
        )
    except Exception as email_error:
        print(f"Failed to queue payment release notification: {str(email_error)}")

    return transaction


def _money(value):
    return Decimal(str(value or 0)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def get_creator_commission_percentage(creator_user_id):
    """Get creator-side commission from the active creator subscription plan."""
    from app.models import Subscription
    from app.services.account_fee_override_service import get_active_fee_override

    subscription = Subscription.query.filter_by(
        user_id=creator_user_id,
        status='active'
    ).first()

    plan_rate = subscription.get_commission_rate() if subscription and subscription.plan else 15.0
    admin_override = get_active_fee_override(creator_user_id, 'creator_commission')
    if admin_override:
        return float(admin_override.percentage)

    from app.services.referral_service import effective_creator_commission
    return effective_creator_commission(creator_user_id, plan_rate)


def _find_payment_for_collaboration(collaboration):
    payment = Payment.query.filter_by(collaboration_id=collaboration.id).first()
    if not payment and collaboration.booking_id:
        payment = Payment.query.filter_by(booking_id=collaboration.booking_id).first()
    if not payment:
        campaign_item = CampaignPaymentItem.query.filter_by(
            collaboration_id=collaboration.id,
            status='paid'
        ).order_by(CampaignPaymentItem.paid_at.desc()).first()
        campaign_payment = campaign_item.payment if campaign_item else None
        if campaign_item and campaign_payment and campaign_payment.status == 'completed':
            payment = Payment(
                collaboration_id=collaboration.id,
                user_id=campaign_payment.brand_user_id,
                amount=campaign_item.amount,
                payment_method=campaign_payment.payment_method,
                payment_type='campaign_cart',
                status='completed',
                payment_reference=campaign_payment.payment_reference,
                escrow_status='escrowed',
                held_amount=campaign_item.amount,
                completed_at=campaign_payment.completed_at or campaign_item.paid_at or datetime.utcnow(),
            )
            db.session.add(payment)
            db.session.flush()
    return payment


def _display_brand_name_for_collaboration(collaboration):
    if getattr(collaboration, 'workspace', None):
        return collaboration.workspace.name or 'brand'
    if getattr(collaboration, 'brand', None):
        return collaboration.brand.company_name or collaboration.brand.display_name or 'brand'
    return 'brand'


def _has_open_dispute(collaboration_id):
    from app.models.dispute import Dispute

    return Dispute.query.filter(
        Dispute.collaboration_id == collaboration_id,
        Dispute.status.in_(['open', 'under_review'])
    ).first() is not None


def release_collaboration_escrow(collaboration_id, payout_percentage=100, reason='approved', clearance_days=1):
    """
    Final escrow release helper used by manual approval, auto-release, and dispute mediation.
    payout_percentage controls how much of the held collaboration amount is treated as earned by
    the creator before their creator-tier commission is deducted.
    """
    collaboration = Collaboration.query.get(collaboration_id)
    if not collaboration:
        raise ValueError("Collaboration not found")

    if payout_percentage is None:
        payout_percentage = 100

    payout_percentage = _money(payout_percentage)
    if payout_percentage < 0 or payout_percentage > 100:
        raise ValueError("payout_percentage must be between 0 and 100")

    if _has_open_dispute(collaboration_id) and reason != 'dispute_resolution':
        raise ValueError("Escrow cannot be released while a dispute is open")

    if collaboration.status != 'completed':
        raise ValueError("Collaboration must be completed before releasing funds")

    existing_transaction = WalletTransaction.query.filter_by(
        collaboration_id=collaboration_id,
        transaction_type='earning'
    ).first()
    if existing_transaction:
        raise ValueError("Funds already released to wallet")

    payment = _find_payment_for_collaboration(collaboration)
    if not payment:
        raise ValueError("No payment found for this collaboration")

    if payment.status not in ['paid', 'completed']:
        raise ValueError(f"Payment not ready - status is '{payment.status}', expected 'paid' or 'completed'")

    if payment.escrow_status not in ['escrowed', 'pending']:
        raise ValueError(f"Payment escrow status invalid - '{payment.escrow_status}'")

    held_amount = _money(payment.held_amount or collaboration.amount)
    creator_gross = _money(held_amount * payout_percentage / Decimal("100"))
    refund_amount = _money(held_amount - creator_gross)

    transaction = None
    if creator_gross > 0:
        creator = collaboration.creator
        commission_percentage = get_creator_commission_percentage(creator.user_id)
        platform_commission = _money(creator_gross * _money(commission_percentage) / Decimal("100"))
        creator_amount = _money(creator_gross - platform_commission)

        wallet = get_or_create_wallet(creator.user_id)
        completed_at = datetime.utcnow()
        available_at = completed_at + timedelta(days=clearance_days)

        booking = collaboration.booking if hasattr(collaboration, 'booking') and collaboration.booking else None
        display_brand_name = _display_brand_name_for_collaboration(collaboration)
        description = f"Earnings from collaboration with {display_brand_name}"
        transaction = WalletTransaction(
            wallet_id=wallet.id,
            user_id=creator.user_id,
            transaction_type='earning',
            amount=creator_amount,
            status='pending_clearance',
            clearance_required=True,
            clearance_days=clearance_days,
            completed_at=completed_at,
            available_at=available_at,
            collaboration_id=collaboration.id,
            booking_id=booking.id if booking else None,
            gross_amount=creator_gross,
            platform_fee=platform_commission,
            platform_fee_percentage=commission_percentage,
            net_amount=creator_amount,
            description=description,
            transaction_metadata={
                'brand_name': display_brand_name,
                'collaboration_id': collaboration.id,
                'collaboration_title': collaboration.title,
                'creator_commission_pct': commission_percentage,
                'escrow_held_amount': float(held_amount),
                'payout_percentage': float(payout_percentage),
                'release_reason': reason,
                'breakdown': f'Escrow gross ${creator_gross:.2f}. Platform takes ${platform_commission:.2f} commission. Creator receives ${creator_amount:.2f}.'
            }
        )
        db.session.add(transaction)

        wallet.pending_clearance = float(wallet.pending_clearance or 0) + float(creator_amount)
        wallet.total_earned = float(wallet.total_earned or 0) + float(creator_amount)
        wallet.updated_at = datetime.utcnow()

    refund_transaction = None
    if refund_amount > 0:
        refund_transaction = refund_collaboration_escrow_to_brand(
            collaboration_id,
            reason=f'Escrow refund after {reason}',
            amount=refund_amount,
            commit=False
        )

    payment.escrow_status = 'partial_released' if refund_amount > 0 and creator_gross > 0 else 'released'
    payment.released_at = datetime.utcnow() if creator_gross > 0 else payment.released_at
    payment.refunded_at = datetime.utcnow() if refund_amount > 0 else payment.refunded_at
    collaboration.escrow_status = payment.escrow_status
    collaboration.auto_complete_eligible_at = None

    if collaboration.booking:
        collaboration.booking.escrow_status = payment.escrow_status

    db.session.commit()

    if transaction:
        try:
            from app.tasks.email_tasks import send_payment_release_notification
            send_payment_release_notification.delay(
                creator_user_id=collaboration.creator.user_id,
                amount=float(transaction.amount),
                collaboration_id=collaboration.id
            )
        except Exception as email_error:
            print(f"Failed to queue payment release notification: {str(email_error)}")

    return {
        'creator_transaction': transaction,
        'refund_transaction': refund_transaction,
        'payout_percentage': float(payout_percentage),
        'creator_gross': float(creator_gross),
        'refund_amount': float(refund_amount)
    }


def refund_collaboration_escrow_to_brand(collaboration_id, reason, amount=None, commit=True):
    """Refund held collaboration escrow to the brand wallet."""
    from app.services.brand_wallet_service import get_or_create_brand_wallet

    collaboration = Collaboration.query.get(collaboration_id)
    if not collaboration:
        raise ValueError("Collaboration not found")

    brand = collaboration.brand
    if not brand:
        raise ValueError("Brand not found")

    payment = _find_payment_for_collaboration(collaboration)
    if not payment:
        raise ValueError("No payment found for this collaboration")

    if payment.escrow_status not in ['escrowed', 'pending', 'partial_released']:
        raise ValueError(f"Payment escrow status invalid - '{payment.escrow_status}'")

    refund_amount = _money(amount if amount is not None else (payment.held_amount or collaboration.amount))
    if refund_amount <= 0:
        raise ValueError("Refund amount must be greater than zero")

    wallet = get_or_create_brand_wallet(brand.user_id)
    transaction = WalletTransaction(
        wallet_id=wallet.id,
        user_id=brand.user_id,
        transaction_type='refund',
        amount=refund_amount,
        status='available',
        clearance_required=False,
        collaboration_id=collaboration.id,
        booking_id=collaboration.booking_id,
        description=reason,
        transaction_metadata={
            'collaboration_id': collaboration.id,
            'creator_id': collaboration.creator_id,
            'original_amount': float(payment.held_amount or collaboration.amount),
            'refund_reason': reason
        }
    )
    db.session.add(transaction)

    wallet.available_balance = float(wallet.available_balance or 0) + float(refund_amount)
    wallet.updated_at = datetime.utcnow()

    if amount is None or refund_amount >= _money(payment.held_amount or collaboration.amount):
        payment.status = 'refunded'
        payment.escrow_status = 'refunded'
        payment.refunded_at = datetime.utcnow()
        collaboration.escrow_status = 'refunded'
        collaboration.refund_processed = True
        if collaboration.booking:
            collaboration.booking.escrow_status = 'refunded'

    if commit:
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

            # Update booking with Paynow reference (if booking has this attribute)
            if hasattr(booking, 'payment_reference'):
                booking.payment_reference = f'PAYNOW-{response.hash}'

            # Create or update payment record (only for real DB bookings with integer IDs)
            payment_hash = str(response.hash) if response.hash and response.hash is not True else poll_url.split('guid=')[-1] if '?guid=' in poll_url else None

            booking_id_int = booking.id if isinstance(booking.id, int) else None
            if booking_id_int:
                payment_record = Payment.query.filter_by(booking_id=booking_id_int).first()
                if not payment_record:
                    payment_record = Payment(
                        booking_id=booking_id_int,
                        user_id=booking.brand.user_id,
                        amount=booking.amount,
                        payment_method='paynow',
                        payment_type='automated',
                        status='pending',
                        escrow_status='pending'
                    )
                    db.session.add(payment_record)

                payment_record.paynow_poll_url = poll_url
                payment_record.paynow_reference = payment_hash
                payment_record.external_reference = f'BOOKING-{booking_id_int}'

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

            # Update collaboration payment status ONLY (NOT escrow)
            collaboration = Collaboration.query.filter_by(booking_id=booking.id).first()
            if collaboration:
                collaboration.payment_status = 'paid'
                # Do NOT set escrow_status - escrow only triggers on collaboration completion
                # Do NOT change collaboration.status - brand controls workflow

            db.session.commit()
            if collaboration:
                try:
                    from app.services.product_notifications import notify_collaboration_active
                    notify_collaboration_active(collaboration)
                except Exception as notification_error:
                    print(f"Failed to send payment confirmation notification: {notification_error}")

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

            collaboration = None

            # Update booking
            booking = Booking.query.get(payment_record.booking_id)
            if booking:
                booking.payment_status = 'paid'
                booking.escrow_status = 'escrowed'
                booking.escrowed_at = datetime.utcnow()

                # Update collaboration payment status ONLY (NOT escrow)
                collaboration = Collaboration.query.filter_by(booking_id=booking.id).first()
                if collaboration:
                    collaboration.payment_status = 'paid'
                    # Do NOT set escrow_status - escrow only triggers on collaboration completion
                    # Do NOT change collaboration.status - brand controls workflow

            db.session.commit()
            if booking and collaboration:
                try:
                    from app.services.product_notifications import notify_collaboration_active
                    notify_collaboration_active(collaboration)
                except Exception as notification_error:
                    print(f"Failed to send payment confirmation notification: {notification_error}")
            return True
        else:
            # Update status but don't mark as paid
            payment_record.payment_reference = f'PAYNOW-{paynow_reference}' if paynow_reference else payment_record.payment_reference
            db.session.commit()
            return True

    except Exception as e:
        print(f"Webhook processing error: {str(e)}")
        return False


def release_milestone_escrow(milestone_id, platform_fee_percentage=15):
    """
    Release escrow for a specific completed milestone to creator wallet
    Only releases the portion allocated to this milestone
    """
    from app.models import CollaborationMilestone, Collaboration, Transaction, WalletTransaction
    from datetime import timedelta

    milestone = CollaborationMilestone.query.get(milestone_id)
    if not milestone:
        raise ValueError(f"Milestone {milestone_id} not found")

    if milestone.status != 'completed':
        raise ValueError("Milestone must be completed before releasing escrow")

    collaboration = Collaboration.query.get(milestone.collaboration_id)
    if not collaboration:
        raise ValueError(f"Collaboration not found for milestone {milestone_id}")

    # Check if wallet transaction already exists for this milestone
    existing_transaction = WalletTransaction.query.filter_by(
        milestone_id=milestone_id,
        transaction_type='milestone_earning'
    ).first()

    if existing_transaction:
        raise ValueError("Funds already released for this milestone")

    # Calculate amounts
    milestone_amount = float(milestone.price)
    platform_fee = milestone_amount * (platform_fee_percentage / 100)
    creator_amount = milestone_amount - platform_fee

    # Get or create wallet
    wallet = get_or_create_wallet(collaboration.creator.user_id)

    # Create wallet transaction with 30-day release countdown
    transaction = WalletTransaction(
        wallet_id=wallet.id,
        user_id=collaboration.creator.user_id,
        transaction_type='milestone_earning',
        amount=creator_amount,
        status='pending_clearance',
        clearance_required=True,
        clearance_days=30,
        completed_at=datetime.utcnow(),
        available_at=(datetime.utcnow() + timedelta(days=14)),
        collaboration_id=collaboration.id,
        milestone_id=milestone.id,
        gross_amount=milestone_amount,
        platform_fee=platform_fee,
        platform_fee_percentage=platform_fee_percentage,
        net_amount=creator_amount,
        description=f"Milestone payment: {milestone.title}",
        transaction_metadata={
            'milestone_title': milestone.title,
            'milestone_number': milestone.milestone_number,
            'collaboration_title': collaboration.title,
            'brand_name': _display_brand_name_for_collaboration(collaboration)
        }
    )
    db.session.add(transaction)

    # Update wallet pending clearance
    wallet.pending_clearance = float(wallet.pending_clearance or 0) + creator_amount
    wallet.total_earned = float(wallet.total_earned or 0) + creator_amount
    wallet.updated_at = datetime.utcnow()

    db.session.commit()

    return transaction


def initiate_subscription_payment(subscription, user_email, plan_name, amount, billing_cycle):
    """Initiate Paynow payment for subscription"""
    import os
    from paynow import Paynow
    from flask import current_app

    # Get Paynow credentials from environment
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

    try:
        # Create payment
        payment_ref = f'SUB-{subscription.id}-{datetime.utcnow().strftime("%Y%m%d%H%M%S")}'
        payment = paynow.create_payment(payment_ref, user_email)

        # Add items to the payment
        description = f'{plan_name} Subscription - {billing_cycle.capitalize()}'
        payment.add(description, amount)

        # Send payment to Paynow
        response = paynow.send(payment)

        if response.success:
            # Get poll URL for checking payment status
            poll_url = response.poll_url
            redirect_url = response.redirect_url
            payment_hash = str(response.hash) if response.hash and response.hash is not True else poll_url.split('guid=')[-1] if '?guid=' in poll_url else None

            # Store payment reference in subscription
            subscription.payment_method = 'paynow'
            subscription.payment_reference = payment_hash
            subscription.paynow_poll_url = poll_url

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


def check_subscription_payment_status(subscription):
    """Check Paynow payment status for subscription"""
    import os
    from paynow import Paynow
    from flask import current_app

    # Check if subscription payment is already confirmed
    if subscription.status == 'active' and subscription.last_payment_date:
        return {
            'status': 'paid',
            'paid': True,
            'message': 'Payment already confirmed'
        }

    if not subscription.paynow_poll_url:
        return {
            'status': 'pending',
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
        status = paynow.check_transaction_status(subscription.paynow_poll_url)

        if status.paid:
            from app.services.subscription_lifecycle_service import apply_paid_subscription, subscription_amount_due

            apply_paid_subscription(
                subscription,
                payment_method='paynow',
                payment_reference=subscription.payment_reference,
                amount=subscription_amount_due(subscription, subscription.billing_cycle),
                billing_cycle=subscription.billing_cycle,
            )
            db.session.commit()

            return {
                'status': 'paid',
                'paid': True,
                'message': 'Payment confirmed and subscription activated'
            }
        else:
            return {
                'status': status.status if hasattr(status, 'status') else 'pending',
                'paid': False,
                'message': 'Payment not yet completed'
            }

    except Exception as e:
        print(f"Error checking subscription payment status: {str(e)}")
        return {
            'status': 'pending',
            'paid': False,
            'message': f'Error checking status: {str(e)}'
        }


def process_payment_with_wallet(booking, user_id, payment_source='wallet'):
    """
    Process payment using brand wallet balance

    Args:
        booking: Booking object
        user_id: Brand user ID
        payment_source: 'wallet_only', 'wallet_partial', or 'paynow'

    Returns:
        dict with success status and details
    """
    from app.services import brand_wallet_service

    try:
        amount = float(booking.amount)

        if payment_source == 'wallet_only':
            # Pay entirely from wallet
            if not brand_wallet_service.check_sufficient_balance(user_id, amount):
                return {
                    'success': False,
                    'error': 'Insufficient wallet balance',
                    'message': 'Your wallet balance is insufficient for this booking'
                }

            # Deduct from wallet
            transaction = brand_wallet_service.deduct_from_brand_wallet(
                user_id=user_id,
                amount=amount,
                collaboration_id=None,  # Will be set when collaboration is created
                description=f'Payment for booking #{booking.id}',
                metadata={
                    'booking_id': booking.id,
                    'package_id': booking.package_id,
                    'creator_id': booking.creator_id
                }
            )

            # Update booking payment status
            booking.payment_status = 'paid'
            booking.payment_method = 'wallet'
            booking.payment_reference = f'WALLET-{transaction.id}'
            booking.escrow_status = 'escrowed'
            booking.escrowed_at = datetime.utcnow()

            # Create payment record
            payment = Payment(
                booking_id=booking.id,
                user_id=user_id,
                amount=amount,
                payment_method='wallet',
                payment_type='wallet',
                status='completed',
                completed_at=datetime.utcnow(),
                escrow_status='escrowed',
                held_amount=amount,
                payment_reference=f'WALLET-{transaction.id}'
            )
            db.session.add(payment)

            # Update collaboration if exists
            if hasattr(booking, 'collaboration') and booking.collaboration:
                booking.collaboration.payment_status = 'paid'
                # Update the transaction with collaboration_id
                transaction.collaboration_id = booking.collaboration.id

            db.session.commit()

            return {
                'success': True,
                'message': 'Payment completed successfully using wallet',
                'payment_method': 'wallet',
                'amount_paid': amount,
                'transaction_id': transaction.id
            }

        elif payment_source == 'wallet_partial':
            # Not implemented yet - would use wallet + Paynow
            return {
                'success': False,
                'error': 'Partial wallet payment not yet implemented',
                'message': 'Please use wallet-only or Paynow payment'
            }

        else:  # paynow
            # Use existing Paynow flow
            return {
                'success': False,
                'error': 'Invalid payment source',
                'message': 'Use initiate_payment for Paynow payments'
            }

    except Exception as e:
        db.session.rollback()
        return {
            'success': False,
            'error': str(e),
            'message': f'Payment failed: {str(e)}'
        }


# Create singleton instance
payment_service = PaymentService()
