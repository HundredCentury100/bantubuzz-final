"""
Admin Cashout Management routes - Manage cashout requests
"""
from flask import jsonify, request
from datetime import datetime
from app import db
from app.models import CashoutRequest, Wallet, WalletTransaction, User, CreatorProfile, Notification
from app.decorators.admin import admin_required, role_required
from . import bp


@bp.route('/cashouts', methods=['GET'])
@admin_required
def get_cashouts():
    """
    Get list of all cashout requests with filtering
    Query params:
        - status: pending, approved, rejected, completed
        - search: search by creator name/email
        - page, per_page: pagination
    """
    try:
        status = request.args.get('status')
        search = request.args.get('search', '')
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)

        # Simple query - just get cashouts
        query = CashoutRequest.query

        # Apply status filter
        if status:
            query = query.filter(CashoutRequest.status == status)

        # Order by creation date
        query = query.order_by(CashoutRequest.created_at.desc())

        # Paginate
        paginated = query.paginate(page=page, per_page=per_page, error_out=False)

        cashouts_data = []
        for cashout in paginated.items:
            # Get user and creator separately
            user = User.query.get(cashout.wallet.user_id) if cashout.wallet else None
            creator = CreatorProfile.query.filter_by(user_id=user.id).first() if user else None

            # Apply search filter
            if search:
                if not user:
                    continue
                search_match = search.lower() in user.email.lower()
                if creator and creator.username:
                    search_match = search_match or search.lower() in creator.username.lower()
                if not search_match:
                    continue

            cashouts_data.append({
                **cashout.to_dict(),
                'creator': {
                    'id': creator.id if creator else None,
                    'name': creator.username if creator else (user.email if user else 'Unknown'),
                    'email': user.email if user else None,
                    'profile_picture': creator.profile_picture if creator else None
                },
                'wallet_balance': float(cashout.wallet.available_balance) if cashout.wallet else 0
            })

        return jsonify({
            'success': True,
            'data': {
                'cashouts': cashouts_data,
                'pagination': {
                    'page': page,
                    'per_page': per_page,
                    'total': paginated.total,
                    'pages': paginated.pages
                }
            }
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Failed to fetch cashouts',
            'message': str(e)
        }), 500


@bp.route('/cashouts/<int:cashout_id>', methods=['GET'])
@admin_required
def get_cashout_details(cashout_id):
    """Get detailed information about a specific cashout request"""
    try:
        cashout = CashoutRequest.query.get(cashout_id)
        if not cashout:
            return jsonify({'error': 'Cashout request not found'}), 404

        # Get user and creator separately
        user = User.query.get(cashout.wallet.user_id) if cashout.wallet else None
        creator = CreatorProfile.query.filter_by(user_id=user.id).first() if user else None

        data = {
            **cashout.to_dict(),
            'creator': {
                'id': creator.id if creator else None,
                'name': creator.username if creator else (user.email if user else 'Unknown'),
                'email': user.email if user else None,
                'profile_picture': creator.profile_picture if creator else None,
                'bio': creator.bio if creator else None
            },
            'wallet': {
                'available_balance': float(cashout.wallet.available_balance) if cashout.wallet else 0,
                'pending_clearance': float(cashout.wallet.pending_clearance or 0) if cashout.wallet else 0,
                'total_earned': float(cashout.wallet.total_earned or 0) if cashout.wallet else 0,
                'withdrawn_total': float(cashout.wallet.withdrawn_total or 0) if cashout.wallet else 0
            }
        }

        return jsonify({
            'success': True,
            'data': data
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Failed to fetch cashout details',
            'message': str(e)
        }), 500


@bp.route('/cashouts/<int:cashout_id>/approve', methods=['PUT'])
@admin_required
def approve_cashout(cashout_id):
    """Approve a cashout request and deduct from available balance"""
    try:
        cashout = CashoutRequest.query.get(cashout_id)
        if not cashout:
            return jsonify({'error': 'Cashout request not found'}), 404

        if cashout.status != 'pending':
            return jsonify({'error': f'Cannot approve cashout with status: {cashout.status}'}), 400

        # Get the wallet
        wallet = cashout.wallet
        if not wallet:
            return jsonify({'error': 'Wallet not found for this cashout request'}), 404

        # Check if wallet has sufficient balance
        if wallet.available_balance < cashout.amount:
            return jsonify({'error': f'Insufficient balance. Available: ${wallet.available_balance}, Requested: ${cashout.amount}'}), 400

        # Deduct amount from available balance
        wallet.available_balance -= cashout.amount

        # Update cashout status
        cashout.status = 'approved'
        cashout.approved_at = datetime.utcnow()

        # Create withdrawal transaction record
        transaction = WalletTransaction(
            wallet_id=wallet.id,
            user_id=wallet.user_id,
            transaction_type='withdrawal',
            amount=cashout.amount,
            description=f'Cashout approved - Reference: {cashout.request_reference}',
            status='withdrawn',
            cashout_request_id=cashout.id,
            transaction_metadata={'cashout_reference': cashout.request_reference}
        )
        db.session.add(transaction)
        db.session.commit()

        # Send notification
        notification = Notification(
            user_id=cashout.wallet.user_id,
            title='Cashout Approved',
            message=f'Your cashout request for ${cashout.amount} has been approved and deducted from your balance. Payment will be processed within 2-3 business days.',
            type='success'
        )
        db.session.add(notification)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Cashout request approved',
            'data': cashout.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': 'Failed to approve cashout',
            'message': str(e)
        }), 500


@bp.route('/cashouts/<int:cashout_id>/reject', methods=['PUT'])
@admin_required
def reject_cashout(cashout_id):
    """Reject a cashout request"""
    try:
        data = request.get_json()
        reason = data.get('reason', 'No reason provided')

        cashout = CashoutRequest.query.get(cashout_id)
        if not cashout:
            return jsonify({'error': 'Cashout request not found'}), 404

        if cashout.status != 'pending':
            return jsonify({'error': f'Cannot reject cashout with status: {cashout.status}'}), 400

        cashout.status = 'rejected'
        cashout.admin_notes = reason
        db.session.commit()

        # Send notification
        notification = Notification(
            user_id=cashout.wallet.user_id,
            title='Cashout Request Rejected',
            message=f'Your cashout request for ${cashout.amount} was rejected. Reason: {reason}',
            type='error'
        )
        db.session.add(notification)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Cashout request rejected',
            'data': cashout.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': 'Failed to reject cashout',
            'message': str(e)
        }), 500


@bp.route('/cashouts/<int:cashout_id>/complete', methods=['PUT'])
@admin_required
def complete_cashout(cashout_id):
    """Mark cashout as completed (funds transferred)"""
    try:
        data = request.get_json()
        transaction_reference = data.get('transaction_reference', '')

        cashout = CashoutRequest.query.get(cashout_id)
        if not cashout:
            return jsonify({'error': 'Cashout request not found'}), 404

        if cashout.status not in ['pending', 'approved']:
            return jsonify({'error': f'Cannot complete cashout with status: {cashout.status}'}), 400

        # Update cashout
        cashout.status = 'completed'
        cashout.completed_at = datetime.utcnow()
        cashout.transaction_reference = transaction_reference
        if transaction_reference:
            cashout.admin_notes = f'{cashout.admin_notes or ""}\nTransaction Ref: {transaction_reference}'

        # Update wallet
        wallet = cashout.wallet
        wallet.withdrawn_total = (wallet.withdrawn_total or 0) + cashout.amount

        # Update the existing withdrawal transaction to completed status
        # The transaction was already created when cashout was approved
        if cashout.status == 'approved':
            # Find and update existing transaction
            existing_transaction = WalletTransaction.query.filter_by(
                cashout_request_id=cashout.id
            ).first()
            if existing_transaction:
                existing_transaction.status = 'completed'
                if transaction_reference:
                    existing_transaction.description += f' - Completed: {transaction_reference}'

        db.session.commit()

        # Send notification
        notification = Notification(
            user_id=wallet.user_id,
            title='Cashout Completed',
            message=f'Your cashout of ${cashout.amount} has been completed successfully!',
            type='success'
        )
        db.session.add(notification)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Cashout marked as completed',
            'data': cashout.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': 'Failed to complete cashout',
            'message': str(e)
        }), 500
