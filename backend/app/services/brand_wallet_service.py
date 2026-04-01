"""
Brand Wallet Service - Handles all brand wallet-related operations
"""
from datetime import datetime, timezone
from sqlalchemy import func
from app import db
from app.models import (
    Wallet, WalletTransaction, BrandProfile,
    Collaboration, DepositRequest, User
)
import uuid


def get_or_create_brand_wallet(user_id):
    """Get existing wallet or create new one for brand"""
    wallet = Wallet.query.filter_by(user_id=user_id).first()

    if not wallet:
        wallet = Wallet(
            user_id=user_id,
            user_type='brand'
        )
        db.session.add(wallet)
        db.session.commit()
    elif wallet.user_type != 'brand':
        # Update existing wallet to brand type
        wallet.user_type = 'brand'
        db.session.commit()

    return wallet


def calculate_brand_wallet_balance(user_id):
    """Calculate and update brand wallet balances"""
    wallet = get_or_create_brand_wallet(user_id)

    # Calculate available balance (deposits - payments)
    available_balance = db.session.query(
        func.coalesce(func.sum(WalletTransaction.amount), 0)
    ).filter(
        WalletTransaction.user_id == user_id,
        WalletTransaction.status == 'available'
    ).scalar()

    # Calculate total deposited
    total_deposited = db.session.query(
        func.coalesce(func.sum(WalletTransaction.amount), 0)
    ).filter(
        WalletTransaction.user_id == user_id,
        WalletTransaction.transaction_type.in_(['deposit', 'refund', 'credit'])
    ).scalar()

    # Calculate total spent
    total_spent = db.session.query(
        func.coalesce(func.sum(WalletTransaction.amount), 0)
    ).filter(
        WalletTransaction.user_id == user_id,
        WalletTransaction.transaction_type == 'payment'
    ).scalar()

    # Update wallet
    wallet.available_balance = float(available_balance)
    wallet.total_deposited = float(total_deposited)
    wallet.total_spent = abs(float(total_spent))  # Make positive for display
    wallet.updated_at = datetime.now(timezone.utc)

    db.session.commit()

    return wallet


def get_brand_wallet_transactions(user_id, page=1, per_page=20, transaction_type=None):
    """Get paginated wallet transactions for brand"""
    query = WalletTransaction.query.filter_by(user_id=user_id)

    if transaction_type:
        query = query.filter_by(transaction_type=transaction_type)

    total = query.count()
    offset = (page - 1) * per_page

    transactions = query.order_by(
        WalletTransaction.created_at.desc()
    ).limit(per_page).offset(offset).all()

    return {
        'transactions': [t.to_dict() for t in transactions],
        'total': total,
        'page': page,
        'per_page': per_page,
        'total_pages': (total + per_page - 1) // per_page
    }


def check_sufficient_balance(user_id, amount):
    """Check if brand has sufficient wallet balance"""
    wallet = get_or_create_brand_wallet(user_id)
    calculate_brand_wallet_balance(user_id)  # Ensure balance is up-to-date
    return float(wallet.available_balance) >= float(amount)


def deduct_from_brand_wallet(user_id, amount, collaboration_id, description, metadata=None):
    """
    Deduct amount from brand wallet for collaboration payment
    Returns transaction object if successful, raises ValueError if insufficient funds
    """
    if not check_sufficient_balance(user_id, amount):
        raise ValueError('Insufficient wallet balance')

    wallet = get_or_create_brand_wallet(user_id)

    # Create debit transaction (negative amount)
    transaction = WalletTransaction(
        wallet_id=wallet.id,
        user_id=user_id,
        transaction_type='payment',
        amount=-abs(float(amount)),  # Negative for deduction
        status='available',  # Immediate deduction
        clearance_required=False,
        collaboration_id=collaboration_id,
        description=description,
        transaction_metadata=metadata or {}
    )
    db.session.add(transaction)

    # Update wallet balance
    wallet.available_balance = float(wallet.available_balance) - abs(float(amount))
    wallet.total_spent = float(wallet.total_spent or 0) + abs(float(amount))
    wallet.updated_at = datetime.now(timezone.utc)

    db.session.commit()
    return transaction


def refund_to_brand_wallet(collaboration_id, reason):
    """
    Refund collaboration amount to brand wallet
    Called when creator declines collaboration
    """
    collaboration = Collaboration.query.get(collaboration_id)
    if not collaboration:
        raise ValueError('Collaboration not found')

    if collaboration.refund_processed:
        raise ValueError('Refund already processed for this collaboration')

    # Get brand user_id
    brand = BrandProfile.query.get(collaboration.brand_id)
    if not brand:
        raise ValueError('Brand not found')

    wallet = get_or_create_brand_wallet(brand.user_id)

    # Create refund transaction
    transaction = WalletTransaction(
        wallet_id=wallet.id,
        user_id=brand.user_id,
        transaction_type='refund',
        amount=float(collaboration.amount),
        status='available',  # Immediately available
        clearance_required=False,
        collaboration_id=collaboration_id,
        description=reason,
        transaction_metadata={
            'collaboration_id': collaboration_id,
            'creator_id': collaboration.creator_id,
            'original_amount': float(collaboration.amount)
        }
    )
    db.session.add(transaction)

    # Update wallet balance
    wallet.available_balance = float(wallet.available_balance or 0) + float(collaboration.amount)
    wallet.updated_at = datetime.now(timezone.utc)

    # Mark refund as processed
    collaboration.refund_processed = True

    db.session.commit()
    return transaction


def create_deposit_request(user_id, amount, payment_method, metadata=None):
    """
    Create a new deposit request for brand wallet
    Returns DepositRequest object
    """
    if float(amount) <= 0:
        raise ValueError('Deposit amount must be greater than zero')

    if payment_method not in ['paynow', 'bank_transfer']:
        raise ValueError('Invalid payment method')

    wallet = get_or_create_brand_wallet(user_id)

    # Generate unique reference
    deposit_reference = f'DEP-{uuid.uuid4().hex[:12].upper()}'

    deposit_request = DepositRequest(
        wallet_id=wallet.id,
        user_id=user_id,
        amount=amount,
        payment_method=payment_method,
        deposit_reference=deposit_reference,
        status='pending'
    )
    db.session.add(deposit_request)
    db.session.commit()

    return deposit_request


def confirm_deposit(deposit_id, admin_id=None, admin_notes=None):
    """
    Confirm deposit and credit brand wallet
    Called after Paynow payment success or admin verification of bank transfer
    """
    deposit = DepositRequest.query.get(deposit_id)
    if not deposit:
        raise ValueError('Deposit request not found')

    if deposit.status != 'pending':
        raise ValueError(f'Deposit already processed with status: {deposit.status}')

    wallet = Wallet.query.get(deposit.wallet_id)
    if not wallet:
        raise ValueError('Wallet not found')

    # Create credit transaction
    transaction = WalletTransaction(
        wallet_id=wallet.id,
        user_id=deposit.user_id,
        transaction_type='deposit',
        amount=float(deposit.amount),
        status='available',  # Immediately available
        clearance_required=False,
        description=f'Wallet deposit via {deposit.payment_method}',
        transaction_metadata={
            'deposit_request_id': deposit.id,
            'deposit_reference': deposit.deposit_reference,
            'payment_method': deposit.payment_method
        }
    )
    db.session.add(transaction)

    # Update wallet balance
    wallet.available_balance = float(wallet.available_balance or 0) + float(deposit.amount)
    wallet.total_deposited = float(wallet.total_deposited or 0) + float(deposit.amount)
    wallet.updated_at = datetime.now(timezone.utc)

    # Update deposit request
    deposit.status = 'completed'
    deposit.completed_at = datetime.now(timezone.utc)
    deposit.transaction_id = transaction.id
    if admin_id:
        deposit.verified_by = admin_id
        deposit.verified_at = datetime.now(timezone.utc)
    if admin_notes:
        deposit.admin_notes = admin_notes

    db.session.commit()
    return transaction


def get_brand_deposit_requests(user_id, page=1, per_page=20, status=None):
    """Get paginated deposit requests for brand"""
    query = DepositRequest.query.filter_by(user_id=user_id)

    if status:
        query = query.filter_by(status=status)

    total = query.count()
    offset = (page - 1) * per_page

    deposits = query.order_by(
        DepositRequest.requested_at.desc()
    ).limit(per_page).offset(offset).all()

    return {
        'deposits': [d.to_dict(include_relations=True) for d in deposits],
        'total': total,
        'page': page,
        'per_page': per_page,
        'total_pages': (total + per_page - 1) // per_page
    }


def cancel_deposit_request(deposit_id, user_id, reason=None):
    """Cancel a pending deposit request"""
    deposit = DepositRequest.query.get(deposit_id)
    if not deposit:
        raise ValueError('Deposit request not found')

    if deposit.user_id != user_id:
        raise ValueError('Unauthorized')

    if deposit.status != 'pending':
        raise ValueError(f'Cannot cancel deposit with status: {deposit.status}')

    deposit.status = 'cancelled'
    if reason:
        deposit.admin_notes = f'Cancelled by user: {reason}'
    deposit.updated_at = datetime.now(timezone.utc)

    db.session.commit()
    return deposit


def credit_brand_wallet(user_id, amount, description, metadata=None, admin_id=None):
    """
    Admin function to manually credit brand wallet
    Used for promotional credits, adjustments, etc.
    """
    wallet = get_or_create_brand_wallet(user_id)

    transaction = WalletTransaction(
        wallet_id=wallet.id,
        user_id=user_id,
        transaction_type='credit',
        amount=float(amount),
        status='available',
        clearance_required=False,
        description=description,
        transaction_metadata=metadata or {'credited_by_admin': admin_id}
    )
    db.session.add(transaction)

    # Update wallet balance
    wallet.available_balance = float(wallet.available_balance or 0) + float(amount)
    wallet.total_deposited = float(wallet.total_deposited or 0) + float(amount)
    wallet.updated_at = datetime.now(timezone.utc)

    db.session.commit()
    return transaction


def get_wallet_statistics(user_id):
    """Get comprehensive wallet statistics for brand"""
    wallet = get_or_create_brand_wallet(user_id)
    calculate_brand_wallet_balance(user_id)

    # Get transaction counts
    total_transactions = WalletTransaction.query.filter_by(user_id=user_id).count()

    deposit_count = WalletTransaction.query.filter(
        WalletTransaction.user_id == user_id,
        WalletTransaction.transaction_type == 'deposit'
    ).count()

    payment_count = WalletTransaction.query.filter(
        WalletTransaction.user_id == user_id,
        WalletTransaction.transaction_type == 'payment'
    ).count()

    refund_count = WalletTransaction.query.filter(
        WalletTransaction.user_id == user_id,
        WalletTransaction.transaction_type == 'refund'
    ).count()

    # Calculate average payment
    avg_payment = db.session.query(
        func.coalesce(func.avg(func.abs(WalletTransaction.amount)), 0)
    ).filter(
        WalletTransaction.user_id == user_id,
        WalletTransaction.transaction_type == 'payment'
    ).scalar()

    return {
        'wallet': wallet.to_dict(),
        'total_transactions': total_transactions,
        'deposit_count': deposit_count,
        'payment_count': payment_count,
        'refund_count': refund_count,
        'average_payment': float(avg_payment)
    }
