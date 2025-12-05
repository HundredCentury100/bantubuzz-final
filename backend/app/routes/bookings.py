from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from app import db
from app.models import Booking, Package, Campaign, BrandProfile, CreatorProfile, User, Collaboration
from app.services.payment_service import initiate_payment, check_payment_status, process_payment_webhook
from app.utils.notifications import notify_new_booking, notify_booking_status

bp = Blueprint('bookings', __name__)


@bp.route('/', methods=['GET'])
@jwt_required()
def get_bookings():
    """Get bookings for current user"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)

        if user.user_type == 'creator':
            creator = CreatorProfile.query.filter_by(user_id=user_id).first()
            query = Booking.query.filter_by(creator_id=creator.id)
        else:
            brand = BrandProfile.query.filter_by(user_id=user_id).first()
            query = Booking.query.filter_by(brand_id=brand.id)

        pagination = query.order_by(Booking.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        bookings = [booking.to_dict(include_relations=True) for booking in pagination.items]

        return jsonify({
            'bookings': bookings,
            'total': pagination.total,
            'pages': pagination.pages,
            'current_page': page
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:booking_id>', methods=['GET'])
@jwt_required()
def get_booking(booking_id):
    """Get a specific booking"""
    try:
        booking = Booking.query.get(booking_id)
        if not booking:
            return jsonify({'error': 'Booking not found'}), 404

        return jsonify(booking.to_dict(include_relations=True)), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/', methods=['POST'])
@jwt_required()
def create_booking():
    """Create a new booking (brands only)"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        brand = BrandProfile.query.filter_by(user_id=user_id).first()

        if not brand or not user:
            return jsonify({'error': 'Brand profile not found'}), 404

        data = request.get_json()
        if 'package_id' not in data:
            return jsonify({'error': 'Package ID is required'}), 400

        package = Package.query.get(data['package_id'])
        if not package:
            return jsonify({'error': 'Package not found'}), 404

        booking = Booking(
            package_id=package.id,
            campaign_id=data.get('campaign_id'),
            creator_id=package.creator_id,
            brand_id=brand.id,
            amount=package.price,
            total_price=package.price,
            notes=data.get('notes')
        )

        db.session.add(booking)
        db.session.commit()

        # Refresh booking to load relationships
        db.session.refresh(booking)

        # Notify creator of new booking
        creator_user = User.query.get(package.creator.user_id)
        if creator_user:
            notify_new_booking(
                creator_id=creator_user.id,
                brand_name=brand.company_name or user.email,
                booking_id=booking.id
            )

        # Initiate payment - pass email and package title explicitly
        payment_response = initiate_payment(booking, user.email, package.title)

        # Ensure payment_response is serializable
        if not isinstance(payment_response, dict):
            payment_response = {'success': False, 'error': 'Invalid payment response'}

        response_data = {
            'message': 'Booking created successfully',
            'booking': booking.to_dict(),
            'payment': payment_response
        }

        # Test serialization before returning
        import json
        try:
            json.dumps(response_data)
        except TypeError as te:
            print(f"Serialization error: {te}")
            print(f"Payment response: {payment_response}")
            print(f"Payment response type: {type(payment_response)}")
            # Return safe version
            return jsonify({
                'message': 'Booking created successfully',
                'booking': booking.to_dict(),
                'payment': {'success': False, 'error': 'Payment initialization error'}
            }), 201

        return jsonify(response_data), 201

    except Exception as e:
        db.session.rollback()
        import traceback
        error_trace = traceback.format_exc()
        print(f"Error creating booking: {error_trace}")
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:booking_id>/status', methods=['PUT'])
@jwt_required()
def update_booking_status(booking_id):
    """Update booking status"""
    try:
        booking = Booking.query.get(booking_id)
        if not booking:
            return jsonify({'error': 'Booking not found'}), 404

        data = request.get_json()
        new_status = data.get('status')

        if not new_status:
            return jsonify({'error': 'Status is required'}), 400

        booking.status = new_status

        if new_status == 'completed':
            booking.completion_date = datetime.utcnow()

        # Create collaboration when booking is accepted
        if new_status == 'accepted':
            # Check if collaboration already exists for this booking
            existing_collaboration = Collaboration.query.filter_by(
                booking_id=booking.id
            ).first()

            if not existing_collaboration:
                # Load package if not already loaded
                package = Package.query.get(booking.package_id)

                # Calculate expected completion date based on package duration
                from datetime import timedelta
                start_date = datetime.utcnow()
                expected_completion = None
                if package and package.duration_days:
                    expected_completion = start_date + timedelta(days=package.duration_days)

                # Create new collaboration with package deliverables
                collaboration = Collaboration(
                    collaboration_type='package',
                    booking_id=booking.id,
                    creator_id=booking.creator_id,
                    brand_id=booking.brand_id,
                    title=f"Collaboration for {package.title if package else 'Package'}",
                    description=package.description if package else '',
                    amount=booking.amount,
                    status='in_progress',
                    start_date=start_date,
                    expected_completion_date=expected_completion,
                    deliverables=package.deliverables if package and package.deliverables else [],
                    progress_percentage=0
                )
                db.session.add(collaboration)

        db.session.commit()

        # Notify the other party about status change
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if user.user_type == 'creator':
            # Creator updated status, notify brand
            brand_user = User.query.get(booking.brand.user_id)
            if brand_user:
                notify_booking_status(brand_user.id, new_status, booking.id)
        else:
            # Brand updated status, notify creator
            creator_user = User.query.get(booking.creator.user_id)
            if creator_user:
                notify_booking_status(creator_user.id, new_status, booking.id)

        return jsonify({
            'message': 'Booking status updated',
            'booking': booking.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        import traceback
        error_trace = traceback.format_exc()
        print(f"Error updating booking status: {error_trace}")
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:booking_id>/payment-status', methods=['GET'])
@jwt_required()
def get_payment_status(booking_id):
    """Check payment status for a booking"""
    try:
        booking = Booking.query.get(booking_id)
        if not booking:
            return jsonify({'error': 'Booking not found'}), 404

        status = check_payment_status(booking)
        return jsonify(status), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/payment-webhook', methods=['POST'])
def payment_webhook():
    """Handle Paynow payment webhook/IPN"""
    try:
        data = request.form.to_dict() or request.get_json()
        success = process_payment_webhook(data)

        if success:
            return jsonify({'status': 'success'}), 200
        else:
            return jsonify({'status': 'failed'}), 400

    except Exception as e:
        return jsonify({'error': str(e)}), 500
