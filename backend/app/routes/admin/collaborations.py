"""
Admin Collaboration Management routes - Payments, cancellations, and collaboration oversight
"""
from flask import jsonify, request
from datetime import datetime
from sqlalchemy import cast, String
from app import db
from app.models import (
    Collaboration, Payment, Wallet, WalletTransaction,
    User, CreatorProfile, BrandProfile, Notification
)
from app.decorators.admin import admin_required, role_required
from . import bp


@bp.route('/collaborations', methods=['GET'])
@admin_required
def get_collaborations():
    """
    Get list of all collaborations with filtering
    Query params:
        - status: in_progress, completed, cancelled
        - payment_status: pending, paid, released
        - search: search by brand/creator name
        - page, per_page: pagination
    """
    try:
        status = request.args.get('status')
        payment_status = request.args.get('payment_status')
        search = request.args.get('search', '')
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)

        # Base query with joins
        query = Collaboration.query.join(
            BrandProfile, Collaboration.brand_id == BrandProfile.id
        ).join(
            CreatorProfile, Collaboration.creator_id == CreatorProfile.id
        )

        # Apply filters
        if status:
            query = query.filter(Collaboration.status == status)

        if search:
            query = query.join(
                User, db.or_(
                    BrandProfile.user_id == User.id,
                    CreatorProfile.user_id == User.id
                )
            ).filter(
                db.or_(
                    User.email.ilike(f'%{search}%'),
                    CreatorProfile.username.ilike(f'%{search}%'),
                    BrandProfile.company_name.ilike(f'%{search}%')
                )
            )

        # Order by creation date
        query = query.order_by(Collaboration.created_at.desc())

        # Paginate
        paginated = query.paginate(page=page, per_page=per_page, error_out=False)

        collabs_data = []
        for collab in paginated.items:
            collab_dict = collab.to_dict()
            collab_dict['brand'] = {
                'id': collab.brand.id,
                'company_name': collab.brand.company_name,
                'email': collab.brand.user.email
            }
            collab_dict['creator'] = {
                'id': collab.creator.id,
                'username': collab.creator.username,
                'email': collab.creator.user.email
            }
            collabs_data.append(collab_dict)

        return jsonify({
            'success': True,
            'data': {
                'collaborations': collabs_data,
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
            'error': 'Failed to fetch collaborations',
            'message': str(e)
        }), 500


@bp.route('/collaborations/<int:collaboration_id>', methods=['GET'])
@admin_required
def get_collaboration_details(collaboration_id):
    """Get detailed information about a specific collaboration"""
    try:
        collab = Collaboration.query.get(collaboration_id)
        if not collab:
            return jsonify({'error': 'Collaboration not found'}), 404

        data = collab.to_dict()
        data['brand'] = collab.brand.to_dict()
        data['creator'] = collab.creator.to_dict()

        # Get payment information
        payment = Payment.query.filter_by(
            collaboration_id=collaboration_id
        ).first()
        if payment:
            data['payment'] = payment.to_dict()

        return jsonify({
            'success': True,
            'data': data
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Failed to fetch collaboration details',
            'message': str(e)
        }), 500


@bp.route('/collaborations/<int:collaboration_id>/payment', methods=['PUT'])
@role_required('super_admin', 'finance')
def update_collaboration_payment(collaboration_id):
    """
    Update payment information for a collaboration
    Body: { payment_status, notes }
    """
    try:
        data = request.get_json()
        payment_status = data.get('payment_status')
        notes = data.get('notes', '')

        collab = Collaboration.query.get(collaboration_id)
        if not collab:
            return jsonify({'error': 'Collaboration not found'}), 404

        # Find or create payment record
        payment = Payment.query.filter_by(
            collaboration_id=collaboration_id
        ).first()

        if not payment:
            # Get the brand's user_id for the payment record
            payment = Payment(
                collaboration_id=collaboration_id,
                user_id=collab.brand.user_id,  # Brand user_id is required
                amount=collab.amount,
                status=payment_status or 'pending'
            )
            db.session.add(payment)
        else:
            if payment_status:
                payment.status = payment_status

        if notes:
            payment.notes = notes

        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Payment information updated',
            'data': payment.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': 'Failed to update payment',
            'message': str(e)
        }), 500


@bp.route('/collaborations/<int:collaboration_id>/escrow/release', methods=['POST'])
@role_required('super_admin', 'finance')
def release_escrow(collaboration_id):
    """
    Release escrow funds to creator's wallet
    This should be done when collaboration is completed and approved
    """
    try:
        collab = Collaboration.query.get(collaboration_id)
        if not collab:
            return jsonify({'error': 'Collaboration not found'}), 404

        if collab.status != 'completed':
            return jsonify({
                'error': 'Cannot release escrow',
                'message': 'Collaboration must be completed first'
            }), 400

        # Get creator's wallet
        creator_wallet = Wallet.query.filter_by(
            user_id=collab.creator.user_id
        ).first()

        if not creator_wallet:
            return jsonify({'error': 'Creator wallet not found'}), 404

        # Add funds to wallet
        creator_wallet.balance += collab.amount
        creator_wallet.total_earned = (creator_wallet.total_earned or 0) + collab.amount

        # Create transaction record
        transaction = WalletTransaction(
            wallet_id=creator_wallet.id,
            type='credit',
            amount=collab.amount,
            description=f'Payment for collaboration: {collab.title}',
            status='completed',
            collaboration_id=collaboration_id
        )
        db.session.add(transaction)

        # Update payment record
        payment = Payment.query.filter_by(
            collaboration_id=collaboration_id
        ).first()
        if payment:
            payment.status = 'released'
            payment.released_at = datetime.utcnow()

        db.session.commit()

        # Send notification to creator
        notification = Notification(
            user_id=collab.creator.user_id,
            title='Payment Received',
            message=f'You have received ${collab.amount} for the collaboration "{collab.title}"',
            type='success'
        )
        db.session.add(notification)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': f'Escrow released: ${collab.amount} transferred to creator wallet',
            'data': {
                'collaboration_id': collaboration_id,
                'amount': float(collab.amount),
                'creator_new_balance': float(creator_wallet.balance)
            }
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': 'Failed to release escrow',
            'message': str(e)
        }), 500


@bp.route('/collaborations/cancellations', methods=['GET'])
@admin_required
def get_cancellation_requests():
    """Get all pending collaboration cancellation requests"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)

        # Query collaborations with pending cancellation requests
        query = Collaboration.query.filter(
            Collaboration.cancellation_request.isnot(None),
            cast(Collaboration.cancellation_request['status'], String) == 'pending'
        ).order_by(Collaboration.updated_at.desc())

        paginated = query.paginate(page=page, per_page=per_page, error_out=False)

        requests_data = []
        for collab in paginated.items:
            data = {
                'collaboration': collab.to_dict(),
                'brand': {
                    'id': collab.brand.id,
                    'company_name': collab.brand.company_name,
                    'email': collab.brand.user.email
                },
                'creator': {
                    'id': collab.creator.id,
                    'username': collab.creator.username,
                    'email': collab.creator.user.email
                },
                'cancellation_request': collab.cancellation_request
            }
            requests_data.append(data)

        return jsonify({
            'success': True,
            'data': {
                'requests': requests_data,
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
            'error': 'Failed to fetch cancellation requests',
            'message': str(e)
        }), 500


@bp.route('/collaborations/<int:collaboration_id>/cancellation/approve', methods=['PUT'])
@admin_required
def approve_cancellation(collaboration_id):
    """
    Approve a collaboration cancellation request
    Handles refunds based on collaboration progress
    """
    try:
        data = request.get_json()
        admin_notes = data.get('admin_notes', '')

        collab = Collaboration.query.get(collaboration_id)
        if not collab:
            return jsonify({'error': 'Collaboration not found'}), 404

        if not collab.cancellation_request:
            return jsonify({'error': 'No cancellation request found'}), 404

        if collab.cancellation_request.get('status') != 'pending':
            return jsonify({'error': 'Cancellation request already processed'}), 400

        # Calculate refund based on progress
        progress = collab.progress_percentage or 0
        total_amount = collab.amount

        if progress == 0:
            # No work done - full refund to brand
            brand_refund = total_amount
            creator_payment = 0
        elif progress < 50:
            # Less than 50% done - 75% refund to brand, 25% to creator
            brand_refund = total_amount * 0.75
            creator_payment = total_amount * 0.25
        else:
            # 50% or more done - 25% refund to brand, 75% to creator
            brand_refund = total_amount * 0.25
            creator_payment = total_amount * 0.75

        # Get wallets
        brand_wallet = Wallet.query.filter_by(user_id=collab.brand.user_id).first()
        creator_wallet = Wallet.query.filter_by(user_id=collab.creator.user_id).first()

        # Refund brand
        if brand_refund > 0 and brand_wallet:
            brand_wallet.balance += brand_refund
            brand_transaction = WalletTransaction(
                wallet_id=brand_wallet.id,
                type='credit',
                amount=brand_refund,
                description=f'Refund for cancelled collaboration: {collab.title}',
                status='completed',
                collaboration_id=collaboration_id
            )
            db.session.add(brand_transaction)

        # Pay creator for work done
        if creator_payment > 0 and creator_wallet:
            creator_wallet.balance += creator_payment
            creator_wallet.total_earned = (creator_wallet.total_earned or 0) + creator_payment
            creator_transaction = WalletTransaction(
                wallet_id=creator_wallet.id,
                type='credit',
                amount=creator_payment,
                description=f'Partial payment for cancelled collaboration: {collab.title}',
                status='completed',
                collaboration_id=collaboration_id
            )
            db.session.add(creator_transaction)

        # Update collaboration
        collab.status = 'cancelled'
        cancellation_request = collab.cancellation_request.copy()
        cancellation_request['status'] = 'approved'
        cancellation_request['approved_at'] = datetime.utcnow().isoformat()
        cancellation_request['admin_notes'] = admin_notes
        cancellation_request['brand_refund'] = float(brand_refund)
        cancellation_request['creator_payment'] = float(creator_payment)
        collab.cancellation_request = cancellation_request

        db.session.commit()

        # Send notifications
        brand_notification = Notification(
            user_id=collab.brand.user_id,
            title='Cancellation Approved',
            message=f'Collaboration "{collab.title}" has been cancelled. You received a refund of ${brand_refund:.2f}',
            type='info'
        )
        db.session.add(brand_notification)

        creator_notification = Notification(
            user_id=collab.creator.user_id,
            title='Cancellation Approved',
            message=f'Collaboration "{collab.title}" has been cancelled. You received ${creator_payment:.2f} for work completed.',
            type='info'
        )
        db.session.add(creator_notification)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Cancellation approved and funds distributed',
            'data': {
                'collaboration_id': collaboration_id,
                'brand_refund': float(brand_refund),
                'creator_payment': float(creator_payment),
                'status': 'cancelled'
            }
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': 'Failed to approve cancellation',
            'message': str(e)
        }), 500


@bp.route('/collaborations/<int:collaboration_id>/cancellation/reject', methods=['PUT'])
@admin_required
def reject_cancellation(collaboration_id):
    """Reject a collaboration cancellation request"""
    try:
        data = request.get_json()
        admin_notes = data.get('admin_notes', 'Cancellation request denied by admin')

        collab = Collaboration.query.get(collaboration_id)
        if not collab:
            return jsonify({'error': 'Collaboration not found'}), 404

        if not collab.cancellation_request:
            return jsonify({'error': 'No cancellation request found'}), 404

        if collab.cancellation_request.get('status') != 'pending':
            return jsonify({'error': 'Cancellation request already processed'}), 400

        # Update cancellation request
        cancellation_request = collab.cancellation_request.copy()
        cancellation_request['status'] = 'rejected'
        cancellation_request['rejected_at'] = datetime.utcnow().isoformat()
        cancellation_request['admin_notes'] = admin_notes
        collab.cancellation_request = cancellation_request

        db.session.commit()

        # Send notification to requester
        requester_id = collab.brand.user_id if cancellation_request.get('requested_by') == 'brand' else collab.creator.user_id
        notification = Notification(
            user_id=requester_id,
            title='Cancellation Request Rejected',
            message=f'Your cancellation request for "{collab.title}" has been rejected. Reason: {admin_notes}',
            type='warning'
        )
        db.session.add(notification)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Cancellation request rejected',
            'data': collab.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': 'Failed to reject cancellation',
            'message': str(e)
        }), 500
