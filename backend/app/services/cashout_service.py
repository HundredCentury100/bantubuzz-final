"""
Cashout Service - Handles creator cashout requests
"""
from datetime import datetime
import random
from app import db
from app.models import CashoutRequest, Wallet, WalletTransaction, User, CreatorProfile
from app.services.wallet_service import get_or_create_wallet, calculate_wallet_balances
from app.utils.email_service import send_cashout_request_notification_to_admin, send_cashout_completed_notification


def submit_cashout_request(user_id, cashout_data):
    """Creator requests to cash out available funds"""
    wallet = get_or_create_wallet(user_id)
    creator = CreatorProfile.query.filter_by(user_id=user_id).first()

    if not creator:
        raise ValueError("Creator profile not found")

    amount = float(cashout_data['amount'])

    # Validate amount
    if amount < 10:
        raise ValueError("Minimum cashout amount is $10")

    if amount > float(wallet.available_balance):
        raise ValueError(f"Insufficient balance. Available: ${wallet.available_balance}")

    # Check for pending cashouts
    pending = CashoutRequest.query.filter_by(
        user_id=user_id,
        status='pending'
    ).first()

    if pending:
        raise ValueError("You already have a pending cashout request")

    # Generate reference
    reference = f"CR-{datetime.utcnow().strftime('%Y%m%d')}-{user_id}-{random.randint(1000, 9999)}"

    # Calculate fees
    cashout_fee = 0.00
    net_amount = amount - cashout_fee

    # Create cashout request
    cashout = CashoutRequest(
        request_reference=reference,
        user_id=user_id,
        creator_id=creator.id,
        wallet_id=wallet.id,
        amount=amount,
        currency='USD',
        payment_method=cashout_data['payment_method'],
        payment_details=cashout_data['payment_details'],
        status='pending',
        creator_notes=cashout_data.get('notes'),
        cashout_fee=cashout_fee,
        net_amount=net_amount,
        requested_at=datetime.utcnow()
    )
    db.session.add(cashout)
    db.session.flush()

    # Lock amount in wallet
    wallet.available_balance = float(wallet.available_balance) - amount
    wallet.updated_at = datetime.utcnow()

    # Create transaction record
    transaction = WalletTransaction(
        wallet_id=wallet.id,
        user_id=user_id,
        transaction_type='cashout',
        amount=-amount,
        status='pending',
        clearance_required=False,
        cashout_request_id=cashout.id,
        description=f"Cashout request {reference}",
        transaction_metadata={
            'cashout_request_id': cashout.id,
            'payment_method': cashout_data['payment_method']
        }
    )
    db.session.add(transaction)

    db.session.commit()

    # Send email notification to admin
    try:
        send_cashout_request_notification_to_admin(cashout)
    except Exception as e:
        # Log error but don't fail the request
        print(f"Failed to send cashout email notification: {str(e)}")

    return cashout


def process_cashout_complete(cashout_id, admin_user_id, completion_data):
    """Admin marks cashout as completed"""
    cashout = CashoutRequest.query.get(cashout_id)
    if not cashout:
        raise ValueError("Cashout request not found")

    if cashout.status not in ['pending', 'processing']:
        raise ValueError("Cashout already processed or cancelled")

    wallet = cashout.wallet

    # Update cashout
    cashout.status = 'completed'
    cashout.processed_by = admin_user_id
    cashout.processed_at = datetime.utcnow()
    cashout.completed_at = datetime.utcnow()
    cashout.transaction_reference = completion_data.get('transaction_reference')
    cashout.admin_notes = completion_data.get('notes')
    cashout.payment_proof_url = completion_data.get('proof_url')

    # Update transaction
    transaction = WalletTransaction.query.filter_by(
        cashout_request_id=cashout.id
    ).first()

    if transaction:
        transaction.status = 'completed'
        transaction.updated_at = datetime.utcnow()

    # Update wallet stats
    wallet.withdrawn_total = float(wallet.withdrawn_total or 0) + float(cashout.amount)
    wallet.updated_at = datetime.utcnow()

    db.session.commit()

    # Send email notification to creator
    try:
        user = User.query.get(cashout.user_id)
        if user and user.email:
            send_cashout_completed_notification(cashout, user.email)
    except Exception as e:
        # Log error but don't fail the completion
        print(f"Failed to send cashout completion email: {str(e)}")

    return cashout


def cancel_cashout_request(cashout_id, cancelled_by_user_id, reason):
    """Cancel a cashout request"""
    cashout = CashoutRequest.query.get(cashout_id)
    if not cashout:
        raise ValueError("Cashout request not found")

    if cashout.status != 'pending':
        raise ValueError("Can only cancel pending requests")

    wallet = cashout.wallet

    # Update cashout
    cashout.status = 'cancelled'
    cashout.cancelled_at = datetime.utcnow()
    cashout.cancelled_by = cancelled_by_user_id
    cashout.cancellation_reason = reason

    # Refund to wallet
    wallet.available_balance = float(wallet.available_balance) + float(cashout.amount)
    wallet.updated_at = datetime.utcnow()

    # Update transaction
    transaction = WalletTransaction.query.filter_by(
        cashout_request_id=cashout.id
    ).first()

    if transaction:
        transaction.status = 'cancelled'
        transaction.updated_at = datetime.utcnow()

    db.session.commit()
    return cashout


def assign_cashout_to_admin(cashout_id, admin_user_id):
    """Assign cashout to specific admin"""
    cashout = CashoutRequest.query.get(cashout_id)
    if not cashout:
        raise ValueError("Cashout request not found")

    cashout.assigned_to = admin_user_id
    cashout.assigned_at = datetime.utcnow()
    cashout.status = 'processing'

    db.session.commit()
    return cashout


def get_pending_cashouts():
    """Get all pending cashout requests for admin"""
    cashouts = CashoutRequest.query.filter_by(
        status='pending'
    ).order_by(CashoutRequest.requested_at.asc()).all()

    return [c.to_dict(include_relations=True) for c in cashouts]


def get_all_cashouts(status=None, limit=50, offset=0):
    """Get all cashout requests with optional filtering"""
    query = CashoutRequest.query

    if status:
        query = query.filter_by(status=status)

    total = query.count()

    cashouts = query.order_by(
        CashoutRequest.requested_at.desc()
    ).limit(limit).offset(offset).all()

    return {
        'cashouts': [c.to_dict(include_relations=True) for c in cashouts],
        'total': total,
        'limit': limit,
        'offset': offset
    }


def get_creator_cashouts(user_id, limit=50, offset=0):
    """Get cashout history for a creator"""
    query = CashoutRequest.query.filter_by(user_id=user_id)

    total = query.count()

    cashouts = query.order_by(
        CashoutRequest.requested_at.desc()
    ).limit(limit).offset(offset).all()

    return {
        'cashouts': [c.to_dict() for c in cashouts],
        'total': total,
        'limit': limit,
        'offset': offset
    }


def get_cashout_statistics():
    """Get cashout statistics for admin dashboard"""
    from sqlalchemy import func

    pending_count = CashoutRequest.query.filter_by(status='pending').count()
    processing_count = CashoutRequest.query.filter_by(status='processing').count()
    completed_count = CashoutRequest.query.filter_by(status='completed').count()

    total_amount = db.session.query(
        func.coalesce(func.sum(CashoutRequest.amount), 0)
    ).filter(CashoutRequest.status == 'completed').scalar()

    pending_amount = db.session.query(
        func.coalesce(func.sum(CashoutRequest.amount), 0)
    ).filter(CashoutRequest.status == 'pending').scalar()

    return {
        'pending_count': pending_count,
        'processing_count': processing_count,
        'completed_count': completed_count,
        'total_amount': float(total_amount),
        'pending_amount': float(pending_amount)
    }


def notify_admins_cashout_request(cashout):
    """Send notifications to all admins about new cashout (to be implemented with email service)"""
    # Get all admin users
    admins = User.query.filter_by(is_admin=True, is_active=True).all()

    # This will be implemented when we create the notification service
    # For now, return the list of admins who should be notified
    return [admin.email for admin in admins]
