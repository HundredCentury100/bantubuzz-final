"""
Wallet Service - Handles all wallet-related operations
"""
from datetime import datetime, timedelta
from sqlalchemy import func
from app import db
from app.models import (
    Wallet, WalletTransaction, CreatorProfile,
    Collaboration, CashoutRequest
)


def get_or_create_wallet(user_id):
    """Get existing wallet or create new one for user"""
    wallet = Wallet.query.filter_by(user_id=user_id).first()

    if not wallet:
        wallet = Wallet(user_id=user_id)
        db.session.add(wallet)
        db.session.commit()

    return wallet


def calculate_wallet_balances(user_id):
    """Calculate and update all wallet balances for a user"""
    wallet = get_or_create_wallet(user_id)

    # Calculate pending clearance
    pending_clearance = db.session.query(
        func.coalesce(func.sum(WalletTransaction.amount), 0)
    ).filter(
        WalletTransaction.user_id == user_id,
        WalletTransaction.status == 'pending_clearance',
        WalletTransaction.available_at > datetime.utcnow()
    ).scalar()

    # Calculate available balance
    available_balance = db.session.query(
        func.coalesce(func.sum(WalletTransaction.amount), 0)
    ).filter(
        WalletTransaction.user_id == user_id,
        WalletTransaction.status == 'available'
    ).scalar()

    # Calculate total withdrawn
    withdrawn_total = db.session.query(
        func.coalesce(func.sum(CashoutRequest.amount), 0)
    ).filter(
        CashoutRequest.user_id == user_id,
        CashoutRequest.status == 'completed'
    ).scalar()

    # Calculate total earned (lifetime, NET after fees)
    total_earned = db.session.query(
        func.coalesce(func.sum(WalletTransaction.net_amount), 0)
    ).filter(
        WalletTransaction.user_id == user_id,
        WalletTransaction.transaction_type == 'earning'
    ).scalar()

    # Update wallet
    wallet.pending_clearance = float(pending_clearance)
    wallet.available_balance = float(available_balance)
    wallet.withdrawn_total = float(withdrawn_total)
    wallet.total_earned = float(total_earned)
    wallet.updated_at = datetime.utcnow()

    db.session.commit()

    return wallet


def get_pending_clearance_transactions(user_id):
    """Get all transactions in pending clearance with progress"""
    transactions = WalletTransaction.query.filter(
        WalletTransaction.user_id == user_id,
        WalletTransaction.status == 'pending_clearance',
        WalletTransaction.available_at > datetime.utcnow()
    ).order_by(WalletTransaction.available_at.asc()).all()

    result = []
    for txn in transactions:
        # Calculate days remaining
        days_total = txn.clearance_days or 30
        days_elapsed = (datetime.utcnow() - txn.completed_at).days if txn.completed_at else 0
        days_remaining = max(0, days_total - days_elapsed)
        progress_percentage = min(100, (days_elapsed / days_total) * 100)

        txn_dict = txn.to_dict()
        txn_dict['days_remaining'] = days_remaining
        txn_dict['progress_percentage'] = round(progress_percentage, 1)

        # Add collaboration/booking details if available
        if txn.collaboration_id:
            collab = Collaboration.query.get(txn.collaboration_id)
            if collab:
                txn_dict['collaboration'] = {
                    'id': collab.id,
                    'brand_name': collab.brand.company_name if collab.brand else 'Unknown'
                }

        result.append(txn_dict)

    return result


def get_wallet_statistics(user_id):
    """Get comprehensive wallet statistics"""
    wallet = get_or_create_wallet(user_id)

    # Get transaction counts
    total_transactions = WalletTransaction.query.filter_by(user_id=user_id).count()

    earnings_count = WalletTransaction.query.filter(
        WalletTransaction.user_id == user_id,
        WalletTransaction.transaction_type == 'earning'
    ).count()

    # Get total fees paid
    total_fees = db.session.query(
        func.coalesce(func.sum(WalletTransaction.platform_fee), 0)
    ).filter(
        WalletTransaction.user_id == user_id,
        WalletTransaction.transaction_type == 'earning'
    ).scalar()

    # Calculate average transaction
    avg_earning = db.session.query(
        func.coalesce(func.avg(WalletTransaction.amount), 0)
    ).filter(
        WalletTransaction.user_id == user_id,
        WalletTransaction.transaction_type == 'earning'
    ).scalar()

    return {
        'wallet': wallet.to_dict(),
        'total_transactions': total_transactions,
        'earnings_count': earnings_count,
        'total_fees_paid': float(total_fees),
        'average_earning': float(avg_earning)
    }


def clear_pending_transactions():
    """
    Scheduled job: Clear transactions that have passed 30-day period
    Should be run daily
    """
    now = datetime.utcnow()

    # Find all transactions ready to clear
    ready_transactions = WalletTransaction.query.filter(
        WalletTransaction.status == 'pending_clearance',
        WalletTransaction.available_at <= now
    ).all()

    cleared_count = 0
    for transaction in ready_transactions:
        # Update transaction status
        transaction.status = 'available'
        transaction.cleared_at = now

        # Recalculate wallet balances
        calculate_wallet_balances(transaction.user_id)

        cleared_count += 1

    db.session.commit()

    return cleared_count


def get_transaction_history(user_id, limit=50, offset=0, transaction_type=None):
    """Get paginated transaction history"""
    query = WalletTransaction.query.filter_by(user_id=user_id)

    if transaction_type:
        query = query.filter_by(transaction_type=transaction_type)

    total = query.count()

    transactions = query.order_by(
        WalletTransaction.created_at.desc()
    ).limit(limit).offset(offset).all()

    return {
        'transactions': [t.to_dict() for t in transactions],
        'total': total,
        'limit': limit,
        'offset': offset
    }


def credit_brand_wallet(user_id, amount, transaction_type, description, metadata=None):
    """
    Credit a brand's wallet with refunded amount
    Used when bookings are rejected or collaborations are cancelled
    """
    wallet = get_or_create_wallet(user_id)

    # Create credit transaction
    transaction = WalletTransaction(
        wallet_id=wallet.id,
        user_id=user_id,
        transaction_type=transaction_type,  # 'refund' or 'credit'
        amount=amount,
        status='available',  # Immediately available
        clearance_required=False,
        description=description,
        transaction_metadata=metadata or {}
    )
    db.session.add(transaction)

    # Update wallet balance
    wallet.available_balance = float(wallet.available_balance or 0) + float(amount)
    wallet.updated_at = datetime.utcnow()

    db.session.commit()
    return transaction


def get_wallet_transactions(user_id, page=1, per_page=20):
    """
    Get paginated wallet transactions with details
    Helper function for API endpoints
    """
    offset = (page - 1) * per_page
    return get_transaction_history(user_id, limit=per_page, offset=offset)
