"""
Admin Collaboration Management routes - Payments, cancellations, and collaboration oversight
"""
from flask import jsonify, request
from datetime import datetime
from decimal import Decimal
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
                'id': collab.brand.id if collab.brand else None,
                'company_name': collab.brand.company_name if collab.brand else 'Unknown Brand',
                'email': collab.brand.user.email if collab.brand and collab.brand.user else None
            } if collab.brand else {'id': None, 'company_name': 'Unknown Brand', 'email': None}
            collab_dict['creator'] = {
                'id': collab.creator.id if collab.creator else None,
                'username': collab.creator.username if collab.creator else 'Unknown Creator',
                'email': collab.creator.user.email if collab.creator and collab.creator.user else None
            } if collab.creator else {'id': None, 'username': 'Unknown Creator', 'email': None}

            # Include payment information for admin
            payment = Payment.query.filter_by(collaboration_id=collab.id).first()
            if payment:
                collab_dict['payment'] = payment.to_dict()
            else:
                collab_dict['payment'] = None

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
        data['brand'] = collab.brand.to_dict() if collab.brand else None
        data['creator'] = collab.creator.to_dict() if collab.creator else None

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
@role_required('super_admin', 'finance', 'admin')
def update_collaboration_payment(collaboration_id):
    """
    Update payment information for a collaboration and credit wallet
    Body: { payment_status, notes, auto_release }
    """
    try:
        from app.services.payment_service import release_escrow_to_wallet
        from flask_jwt_extended import get_jwt_identity

        data = request.get_json()
        payment_status = data.get('payment_status')
        notes = data.get('notes', '')
        auto_release = data.get('auto_release', True)  # Auto credit wallet when marking as paid

        collab = Collaboration.query.get(collaboration_id)
        if not collab:
            return jsonify({'error': 'Collaboration not found'}), 404

        # Get admin user ID for verification tracking
        admin_user_id = get_jwt_identity()

        # Find or create payment record
        payment = Payment.query.filter_by(
            collaboration_id=collaboration_id
        ).first()

        if not payment:
            # Create new payment record
            payment = Payment(
                collaboration_id=collaboration_id,
                user_id=collab.brand.user_id,  # Brand user_id is required
                amount=collab.amount,
                status=payment_status or 'pending',
                payment_method='manual',
                payment_type='admin_added'
            )
            db.session.add(payment)
        else:
            # Update existing payment
            if payment_status:
                payment.status = payment_status
                payment.payment_type = 'admin_added'

        # Set verification notes (not 'notes')
        if notes:
            payment.verification_notes = notes

        # If marking as paid, set verification details and timestamps
        if payment_status == 'paid':
            payment.verified_by = admin_user_id
            payment.verified_at = datetime.utcnow()
            payment.completed_at = datetime.utcnow()
            payment.escrow_status = 'escrowed'

        # Commit the payment update first
        db.session.commit()

        # If payment is paid and collaboration is completed, ensure wallet transaction exists
        # This handles both new payments and existing payments that were marked as paid before fix
        if payment.status == 'paid' and collab.status == 'completed' and auto_release:
            # Check if wallet transaction already exists for this collaboration
            existing_transaction = WalletTransaction.query.filter_by(
                collaboration_id=collaboration_id,
                transaction_type='earning'
            ).first()

            if not existing_transaction:
                # No wallet transaction exists - create it now
                try:
                    transaction = release_escrow_to_wallet(collaboration_id)
                    return jsonify({
                        'success': True,
                        'message': 'Payment verified and funds added to creator wallet (24hr pending)',
                        'data': {
                            'payment': payment.to_dict(),
                            'wallet_transaction': transaction.to_dict()
                        }
                    }), 200
                except Exception as wallet_error:
                    # Payment updated but wallet credit failed
                    return jsonify({
                        'success': True,
                        'message': f'Payment updated but wallet credit failed: {str(wallet_error)}',
                        'data': payment.to_dict(),
                        'warning': 'Manual wallet credit may be required'
                    }), 200
            else:
                # Wallet transaction already exists
                return jsonify({
                    'success': True,
                    'message': 'Payment information updated (wallet already credited)',
                    'data': {
                        'payment': payment.to_dict(),
                        'wallet_transaction': existing_transaction.to_dict()
                    }
                }), 200

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


@bp.route('/collaborations/<int:collaboration_id>/status', methods=['PUT'])
@admin_required
def update_collaboration_status(collaboration_id):
    """
    Admin override for collaboration status.
    Used by support/admins to complete stuck collaborations from the admin panel.
    """
    try:
        data = request.get_json() or {}
        new_status = data.get('status')
        notes = (data.get('notes') or '').strip()
        allowed_statuses = {'pending', 'in_progress', 'completed', 'cancelled'}

        if new_status not in allowed_statuses:
            return jsonify({'error': 'Invalid collaboration status'}), 400

        collab = Collaboration.query.get(collaboration_id)
        if not collab:
            return jsonify({'error': 'Collaboration not found'}), 404

        previous_status = collab.status
        collab.status = new_status
        collab.updated_at = datetime.utcnow()
        if notes:
            note = f"\n\n[ADMIN STATUS UPDATE - {datetime.utcnow().isoformat()}]\n{notes}"
            collab.notes = (collab.notes or '') + note

        if new_status == 'completed':
            collab.actual_completion_date = collab.actual_completion_date or datetime.utcnow()
            collab.progress_percentage = 100
            collab.last_update = 'Your collaboration is complete'
            collab.last_update_date = datetime.utcnow()
            if collab.escrow_status not in ['released', 'failed']:
                collab.escrow_status = 'escrowed'

            if collab.booking_id:
                from app.models import Booking
                booking = Booking.query.get(collab.booking_id)
                if booking and booking.status != 'completed':
                    booking.status = 'completed'
                    booking.completion_date = datetime.utcnow()
                    booking.escrow_status = booking.escrow_status or 'escrowed'
                    booking.escrowed_at = booking.escrowed_at or datetime.utcnow()

            try:
                from app.services.campaign_completion_service import update_campaign_completion_for_collaboration
                update_campaign_completion_for_collaboration(collab)
            except Exception as campaign_error:
                print(f"[ADMIN_COLLAB_STATUS] Campaign completion update failed: {campaign_error}")

        db.session.commit()
        escrow_release_result = None
        escrow_release_warning = None

        if new_status == 'completed' and previous_status != 'completed':
            try:
                from app.services.payment_service import release_collaboration_escrow
                escrow_release_result = release_collaboration_escrow(
                    collaboration_id,
                    payout_percentage=100,
                    reason='admin_completed',
                    clearance_days=1
                )
            except Exception as escrow_error:
                escrow_release_warning = str(escrow_error)
                if escrow_release_warning != 'Funds already released to wallet':
                    print(f"[ADMIN_COLLAB_STATUS] Escrow release failed: {escrow_release_warning}")

            try:
                from app.services.product_notifications import notify_collaboration_completed
                notify_collaboration_completed(collab, auto_completed=False)
            except Exception as notification_error:
                print(f"[ADMIN_COLLAB_STATUS] Completion notification failed: {notification_error}")

        return jsonify({
            'success': True,
            'message': f'Collaboration status updated to {new_status}',
            'data': collab.to_dict(),
            'escrow_release': {
                'released': bool(escrow_release_result),
                'warning': escrow_release_warning,
            } if new_status == 'completed' else None
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': 'Failed to update collaboration status',
            'message': str(e)
        }), 500


@bp.route('/collaborations/<int:collaboration_id>/escrow/release', methods=['POST'])
@role_required('super_admin', 'finance', 'admin')
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

        from app.services.payment_service import release_collaboration_escrow

        result = release_collaboration_escrow(
            collaboration_id,
            payout_percentage=100,
            reason='admin_release',
            clearance_days=1
        )
        transaction = result.get('creator_transaction')

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
                'creator_pending_clearance': float(transaction.wallet.pending_clearance or 0) if transaction else 0
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
        total_amount = Decimal(str(collab.amount or 0))

        if progress == 0:
            # No work done - full refund to brand
            brand_refund = total_amount
            creator_payment = 0
        elif progress < 50:
            # Less than 50% done - 75% refund to brand, 25% to creator
            brand_refund = total_amount * Decimal('0.75')
            creator_payment = total_amount * Decimal('0.25')
        else:
            # 50% or more done - 25% refund to brand, 75% to creator
            brand_refund = total_amount * Decimal('0.25')
            creator_payment = total_amount * Decimal('0.75')

        # Get wallets
        brand_wallet = Wallet.query.filter_by(user_id=collab.brand.user_id).first()
        creator_wallet = Wallet.query.filter_by(user_id=collab.creator.user_id).first()

        # Refund brand
        if brand_refund > 0 and brand_wallet:
            brand_wallet.available_balance = Decimal(str(brand_wallet.available_balance or 0)) + brand_refund
            brand_wallet.updated_at = datetime.utcnow()
            brand_transaction = WalletTransaction(
                wallet_id=brand_wallet.id,
                user_id=collab.brand.user_id,
                transaction_type='refund',
                amount=brand_refund,
                description=f'Refund for cancelled collaboration: {collab.title}',
                status='available',
                clearance_required=False,
                collaboration_id=collaboration_id,
            )
            db.session.add(brand_transaction)

        # Pay creator for work done
        if creator_payment > 0 and creator_wallet:
            creator_wallet.pending_clearance = Decimal(str(creator_wallet.pending_clearance or 0)) + creator_payment
            creator_wallet.total_earned = Decimal(str(creator_wallet.total_earned or 0)) + creator_payment
            creator_wallet.updated_at = datetime.utcnow()
            creator_transaction = WalletTransaction(
                wallet_id=creator_wallet.id,
                user_id=collab.creator.user_id,
                transaction_type='earning',
                amount=creator_payment,
                description=f'Partial payment for cancelled collaboration: {collab.title}',
                status='pending_clearance',
                clearance_required=True,
                clearance_days=1,
                completed_at=datetime.utcnow(),
                collaboration_id=collaboration_id,
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
