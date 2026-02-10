"""
Admin Payment Management Routes
Handles verification, viewing, and management of all payments and bookings
"""

from flask import jsonify, request
from datetime import datetime, timedelta
from app import db
from app.models import Payment, Booking, User, BrandProfile, CreatorProfile, PaymentVerification
from app.decorators.admin import admin_required
from flask_jwt_extended import get_jwt_identity
from . import bp


@bp.route('/payments', methods=['GET'])
@admin_required
def get_all_payments():
    """
    Get all payments with optional filters
    Query params: status, payment_method, payment_type, start_date, end_date, limit, offset
    """
    try:
        # Get query parameters
        status = request.args.get('status')  # pending, completed, failed, etc.
        payment_method = request.args.get('payment_method')
        payment_type = request.args.get('payment_type')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        limit = request.args.get('limit', 50, type=int)
        offset = request.args.get('offset', 0, type=int)

        # Build query
        query = Payment.query

        if status:
            query = query.filter_by(status=status)
        if payment_method:
            query = query.filter_by(payment_method=payment_method)
        if payment_type:
            query = query.filter_by(payment_type=payment_type)
        if start_date:
            query = query.filter(Payment.created_at >= datetime.fromisoformat(start_date))
        if end_date:
            query = query.filter(Payment.created_at <= datetime.fromisoformat(end_date))

        # Get total count
        total = query.count()

        # Get paginated results
        payments = query.order_by(Payment.created_at.desc()).limit(limit).offset(offset).all()

        return jsonify({
            'success': True,
            'payments': [payment.to_dict(include_relations=True) for payment in payments],
            'total': total,
            'limit': limit,
            'offset': offset
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@bp.route('/payments/pending', methods=['GET'])
@admin_required
def get_pending_payments():
    """
    Get all payments pending verification
    These are manual payments (bank_transfer, etc.) waiting for admin approval
    """
    try:
        # Get payments that are pending or pending_verification
        payments = Payment.query.filter(
            Payment.payment_method.in_(['bank_transfer', 'ecocash', 'onemoney', 'cash', 'other']),
            Payment.status.in_(['pending', 'pending_verification'])
        ).order_by(Payment.created_at.desc()).all()

        # Also get bookings with pending payment status and proof uploaded
        bookings_with_proof = Booking.query.filter(
            Booking.payment_status == 'pending',
            Booking.proof_of_payment.isnot(None),
            Booking.payment_method.in_(['bank_transfer', 'manual'])
        ).all()

        # Format payment data with user information
        payments_data = []
        for payment in payments:
            payment_dict = payment.to_dict()

            # Add user information
            if payment.user:
                payment_dict['user_name'] = payment.user.name if hasattr(payment.user, 'name') else payment.user.email
                payment_dict['user_email'] = payment.user.email

            # Add booking information if available
            if payment.booking:
                payment_dict['booking'] = payment.booking.to_dict(include_relations=True)

            payments_data.append(payment_dict)

        # Format booking data as payments
        for booking in bookings_with_proof:
            brand_user = User.query.join(BrandProfile).filter(BrandProfile.id == booking.brand_id).first()
            creator = CreatorProfile.query.get(booking.creator_id)

            payments_data.append({
                'id': f'booking_{booking.id}',
                'booking_id': booking.id,
                'user_id': brand_user.id if brand_user else None,
                'user_name': brand_user.name if brand_user and hasattr(brand_user, 'name') else (brand_user.email if brand_user else 'Unknown'),
                'user_email': brand_user.email if brand_user else 'unknown@email.com',
                'amount': booking.amount,
                'payment_method': booking.payment_method,
                'payment_proof_url': booking.proof_of_payment,
                'status': 'pending_verification',
                'payment_category': booking.payment_category if hasattr(booking, 'payment_category') else 'package',
                'booking_type': booking.booking_type if hasattr(booking, 'booking_type') else 'direct',
                'created_at': booking.created_at.isoformat(),
                'creator_name': creator.username if creator else 'Unknown',
                'creator_email': creator.user.email if creator and creator.user else 'unknown@email.com'
            })

        return jsonify({
            'success': True,
            'payments': payments_data
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@bp.route('/payments/statistics', methods=['GET'])
@admin_required
def get_payment_statistics():
    """
    Get payment statistics for admin dashboard
    """
    try:
        today = datetime.utcnow().date()
        month_start = datetime(today.year, today.month, 1)

        # Pending payments
        pending_payments = Payment.query.filter_by(status='pending').all()
        pending_count = len(pending_payments)
        pending_amount = sum(float(p.amount) for p in pending_payments)

        # Also count bookings with pending proof
        pending_bookings = Booking.query.filter(
            Booking.payment_status == 'pending',
            Booking.proof_of_payment.isnot(None)
        ).all()
        pending_count += len(pending_bookings)
        pending_amount += sum(float(b.amount) for b in pending_bookings)

        # Verified today
        verified_today = Payment.query.filter(
            Payment.verified_at >= datetime.combine(today, datetime.min.time()),
            Payment.status == 'completed'
        ).all()
        verified_today_count = len(verified_today)
        verified_today_amount = sum(float(p.amount) for p in verified_today)

        # This month
        month_payments = Payment.query.filter(
            Payment.created_at >= month_start,
            Payment.status == 'completed'
        ).all()
        month_count = len(month_payments)
        month_amount = sum(float(p.amount) for p in month_payments)

        # Total verified
        total_verified = Payment.query.filter_by(status='completed').all()
        total_verified_count = len(total_verified)
        total_verified_amount = sum(float(p.amount) for p in total_verified)

        return jsonify({
            'success': True,
            'statistics': {
                'pending_count': pending_count,
                'pending_amount': pending_amount,
                'verified_today_count': verified_today_count,
                'verified_today_amount': verified_today_amount,
                'month_count': month_count,
                'month_amount': month_amount,
                'total_verified_count': total_verified_count,
                'total_verified_amount': total_verified_amount
            }
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@bp.route('/payments/<int:payment_id>', methods=['GET'])
@admin_required
def get_payment_details(payment_id):
    """
    Get detailed information about a specific payment
    """
    try:
        payment = Payment.query.get(payment_id)
        if not payment:
            return jsonify({
                'success': False,
                'error': 'Payment not found'
            }), 404

        return jsonify({
            'success': True,
            'payment': payment.to_dict(include_relations=True)
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@bp.route('/payments/<int:payment_id>/verify', methods=['PUT'])
@admin_required
def verify_payment(payment_id):
    """
    Verify a manual payment
    Body: amount, payment_method, transaction_reference, payment_date, proof_url, notes
    """
    try:
        admin_id = int(get_jwt_identity())
        payment = Payment.query.get(payment_id)

        if not payment:
            return jsonify({
                'success': False,
                'error': 'Payment not found'
            }), 404

        data = request.get_json()

        # Create payment verification record
        verification = PaymentVerification(
            payment_id=payment.id,
            booking_id=payment.booking_id,
            verified_by=admin_id,
            amount_verified=data.get('amount', payment.amount),
            payment_method=data.get('payment_method', payment.payment_method),
            transaction_reference=data.get('transaction_reference'),
            payment_date=datetime.fromisoformat(data['payment_date']) if data.get('payment_date') else None,
            proof_url=data.get('proof_url'),
            verification_notes=data.get('notes')
        )

        # Update payment status
        payment.status = 'completed'
        payment.verified_by = admin_id
        payment.verified_at = datetime.utcnow()
        payment.verification_notes = data.get('notes')
        payment.completed_at = datetime.utcnow()

        # If payment has a booking, update booking status
        if payment.booking:
            payment.booking.payment_status = 'verified'

        db.session.add(verification)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Payment verified successfully',
            'payment': payment.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@bp.route('/payments/<int:payment_id>/reject', methods=['PUT'])
@admin_required
def reject_payment(payment_id):
    """
    Reject a manual payment
    Body: notes (required)
    """
    try:
        admin_id = int(get_jwt_identity())
        payment = Payment.query.get(payment_id)

        if not payment:
            return jsonify({
                'success': False,
                'error': 'Payment not found'
            }), 404

        data = request.get_json()
        notes = data.get('notes')

        if not notes:
            return jsonify({
                'success': False,
                'error': 'Rejection notes are required'
            }), 400

        # Update payment status
        payment.status = 'failed'
        payment.verified_by = admin_id
        payment.verified_at = datetime.utcnow()
        payment.verification_notes = f"REJECTED: {notes}"

        # If payment has a booking, update booking status
        if payment.booking:
            payment.booking.payment_status = 'failed'

        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Payment rejected',
            'payment': payment.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@bp.route('/payments/manual', methods=['POST'])
@admin_required
def add_manual_payment():
    """
    Admin adds a manual payment (e.g., cash payment received directly)
    Body: booking_id, amount, payment_method, transaction_reference, payment_date, proof_url, notes
    """
    try:
        admin_id = int(get_jwt_identity())
        data = request.get_json()

        booking_id = data.get('booking_id')
        if not booking_id:
            return jsonify({
                'success': False,
                'error': 'Booking ID is required'
            }), 400

        booking = Booking.query.get(booking_id)
        if not booking:
            return jsonify({
                'success': False,
                'error': 'Booking not found'
            }), 404

        # Get brand user from booking
        brand = BrandProfile.query.get(booking.brand_id)
        if not brand:
            return jsonify({
                'success': False,
                'error': 'Brand not found'
            }), 404

        # Create payment record
        payment = Payment(
            booking_id=booking_id,
            user_id=brand.user_id,
            amount=data.get('amount', booking.amount),
            payment_method=data.get('payment_method', 'cash'),
            payment_type='admin_added',
            status='completed',
            payment_reference=data.get('transaction_reference'),
            verified_by=admin_id,
            verified_at=datetime.utcnow(),
            verification_notes=data.get('notes', 'Manual payment added by admin'),
            completed_at=datetime.utcnow()
        )

        # Create verification record
        verification = PaymentVerification(
            payment=payment,
            booking_id=booking_id,
            verified_by=admin_id,
            amount_verified=payment.amount,
            payment_method=payment.payment_method,
            transaction_reference=data.get('transaction_reference'),
            payment_date=datetime.fromisoformat(data['payment_date']) if data.get('payment_date') else datetime.utcnow(),
            proof_url=data.get('proof_url'),
            verification_notes=data.get('notes')
        )

        # Update booking payment status
        booking.payment_status = 'verified'
        booking.payment_method = payment.payment_method

        db.session.add(payment)
        db.session.add(verification)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Manual payment added successfully',
            'payment': payment.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@bp.route('/bookings', methods=['GET'])
@admin_required
def get_all_bookings():
    """
    Get all bookings with optional filters
    Query params: payment_status, payment_category, booking_type, start_date, end_date, limit, offset
    """
    try:
        # Get query parameters
        payment_status = request.args.get('payment_status')
        payment_category = request.args.get('payment_category')
        booking_type = request.args.get('booking_type')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        limit = request.args.get('limit', 50, type=int)
        offset = request.args.get('offset', 0, type=int)

        # Build query
        query = Booking.query

        if payment_status:
            query = query.filter_by(payment_status=payment_status)
        if payment_category and hasattr(Booking, 'payment_category'):
            query = query.filter_by(payment_category=payment_category)
        if booking_type and hasattr(Booking, 'booking_type'):
            query = query.filter_by(booking_type=booking_type)
        if start_date:
            query = query.filter(Booking.created_at >= datetime.fromisoformat(start_date))
        if end_date:
            query = query.filter(Booking.created_at <= datetime.fromisoformat(end_date))

        # Get total count
        total = query.count()

        # Get paginated results
        bookings = query.order_by(Booking.created_at.desc()).limit(limit).offset(offset).all()

        # Format bookings with full details
        bookings_data = []
        for booking in bookings:
            booking_dict = booking.to_dict(include_relations=True)

            # Add payment type display
            payment_category = booking.payment_category if hasattr(booking, 'payment_category') else 'package'
            booking_type_val = booking.booking_type if hasattr(booking, 'booking_type') else 'direct'

            payment_type_map = {
                'direct-package': 'Package Purchase',
                'campaign_application-campaign': 'Campaign Application Accepted',
                'campaign_package-package': 'Package Added to Campaign',
                'direct-revision': 'Paid Revision',
                'brief_proposal-brief': 'Brief Proposal Accepted'
            }

            key = f'{booking_type_val}-{payment_category}'
            booking_dict['payment_type_display'] = payment_type_map.get(key, 'Payment')

            bookings_data.append(booking_dict)

        return jsonify({
            'success': True,
            'bookings': bookings_data,
            'total': total,
            'limit': limit,
            'offset': offset
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@bp.route('/bookings/<int:booking_id>', methods=['GET'])
@admin_required
def get_booking_details(booking_id):
    """
    Get detailed information about a specific booking
    """
    try:
        booking = Booking.query.get(booking_id)
        if not booking:
            return jsonify({
                'success': False,
                'error': 'Booking not found'
            }), 404

        booking_dict = booking.to_dict(include_relations=True)

        # Get associated payments
        payments = Payment.query.filter_by(booking_id=booking_id).all()
        booking_dict['payments'] = [p.to_dict() for p in payments]

        # Add payment type display
        payment_category = booking.payment_category if hasattr(booking, 'payment_category') else 'package'
        booking_type_val = booking.booking_type if hasattr(booking, 'booking_type') else 'direct'

        payment_type_map = {
            'direct-package': 'Package Purchase',
            'campaign_application-campaign': 'Campaign Application Accepted',
            'campaign_package-package': 'Package Added to Campaign',
            'direct-revision': 'Paid Revision',
            'brief_proposal-brief': 'Brief Proposal Accepted'
        }

        key = f'{booking_type_val}-{payment_category}'
        booking_dict['payment_type_display'] = payment_type_map.get(key, 'Payment')

        return jsonify({
            'success': True,
            'booking': booking_dict
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
