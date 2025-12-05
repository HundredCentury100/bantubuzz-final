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

        # Base query with joins
        query = CashoutRequest.query.join(Wallet).join(User).join(CreatorProfile)

        # Apply filters
        if status:
            query = query.filter(CashoutRequest.status == status)

        if search:
            query = query.filter(
                db.or_(
                    User.email.ilike(f'%{search}%'),
                    CreatorProfile.username.ilike(f'%{search}%')
                )
            )

        # Order by creation date
        query = query.order_by(CashoutRequest.created_at.desc())

        # Paginate
        paginated = query.paginate(page=page, per_page=per_page, error_out=False)

        cashouts_data = []
        for cashout in paginated.items:
            creator = cashout.wallet.user.creator_profile
            cashouts_data.append({
                **cashout.to_dict(),
                'creator': {
                    'id': creator.id,
                    'name': creator.username or cashout.wallet.user.email,
                    'email': cashout.wallet.user.email,
                    'profile_picture': creator.profile_picture
                },
                'wallet_balance': float(cashout.wallet.balance)
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

        creator = cashout.wallet.user.creator_profile
        data = {
            **cashout.to_dict(),
            'creator': {
                'id': creator.id,
                'name': creator.username or cashout.wallet.user.email,
                'email': cashout.wallet.user.email,
                'profile_picture': creator.profile_picture,
                'bio': creator.bio
            },
            'wallet': {
                'balance': float(cashout.wallet.balance),
                'total_earned': float(cashout.wallet.total_earned or 0),
                'total_withdrawn': float(cashout.wallet.total_withdrawn or 0)
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
@role_required('super_admin', 'finance')
def approve_cashout(cashout_id):
    """Approve a cashout request"""
    try:
        cashout = CashoutRequest.query.get(cashout_id)
        if not cashout:
            return jsonify({'error': 'Cashout request not found'}), 404

        if cashout.status != 'pending':
            return jsonify({'error': f'Cannot approve cashout with status: {cashout.status}'}), 400

        cashout.status = 'approved'
        cashout.approved_at = datetime.utcnow()
        db.session.commit()

        # Send notification
        notification = Notification(
            user_id=cashout.wallet.user_id,
            title='Cashout Approved',
            message=f'Your cashout request for ${cashout.amount} has been approved. Payment will be processed within 2-3 business days.',
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
@role_required('super_admin', 'finance')
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
        cashout.notes = reason
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
@role_required('super_admin', 'finance')
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
        if transaction_reference:
            cashout.notes = f'{cashout.notes or ""}\nTransaction Ref: {transaction_reference}'

        # Update wallet
        wallet = cashout.wallet
        wallet.total_withdrawn = (wallet.total_withdrawn or 0) + cashout.amount

        # Create transaction record
        transaction = WalletTransaction(
            wallet_id=wallet.id,
            type='withdrawal',
            amount=cashout.amount,
            description=f'Cashout completed - {transaction_reference}',
            status='completed'
        )
        db.session.add(transaction)
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
