from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from werkzeug.utils import secure_filename
import os
from app import db
from app.models import (
    Booking, Package, Campaign, BrandProfile, CreatorProfile, User, Collaboration,
    Proposal, CollaborationMilestone, Subscription, SubscriptionPlan
)
from app.services.payment_service import initiate_payment, check_payment_status, process_payment_webhook
from app.utils.notifications import notify_new_booking, notify_booking_status

bp = Blueprint('bookings', __name__)

# Configuration for file uploads
UPLOAD_FOLDER = os.path.join(os.getcwd(), 'uploads', 'proof_of_payment')
ALLOWED_EXTENSIONS = {'pdf', 'jpg', 'jpeg', 'png', 'gif'}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


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

        # Check subscription limits
        subscription = Subscription.query.filter_by(
            user_id=user_id,
            status='active'
        ).first()

        if subscription and subscription.plan:
            # Get bookings count for current month for this brand
            from datetime import datetime
            from dateutil.relativedelta import relativedelta
            start_of_month = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)

            current_month_bookings = Booking.query.filter(
                Booking.brand_id == brand.id,
                Booking.created_at >= start_of_month
            ).count()

            max_bookings = subscription.plan.max_bookings_per_month

            # Check if user has reached their monthly booking limit (-1 means unlimited)
            if max_bookings != -1 and current_month_bookings >= max_bookings:
                return jsonify({
                    'error': f'Monthly booking limit reached. Your {subscription.plan.name} plan allows {max_bookings} bookings per month.',
                    'limit_reached': True,
                    'current_count': current_month_bookings,
                    'max_allowed': max_bookings,
                    'upgrade_required': True
                }), 403

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

        # Don't initiate payment here - let the user choose payment method on payment page
        # Payment method and initiation will happen when user visits /bookings/{id}/payment page

        return jsonify({
            'message': 'Booking created successfully',
            'booking': booking.to_dict()
        }), 201

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
            # IMPORTANT: Check if payment has been made before allowing collaboration
            if booking.payment_status not in ['paid', 'verified']:
                return jsonify({
                    'error': 'Payment must be completed before accepting the booking',
                    'payment_status': booking.payment_status
                }), 400

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


@bp.route('/<int:booking_id>/initiate-payment', methods=['POST'])
@jwt_required()
def initiate_booking_payment(booking_id):
    """Initiate Paynow payment for a booking"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        booking = Booking.query.get(booking_id)

        if not booking:
            return jsonify({'error': 'Booking not found'}), 404

        # Check if user is authorized (brand who made the booking)
        brand = BrandProfile.query.filter_by(user_id=user_id).first()
        if not brand or booking.brand_id != brand.id:
            return jsonify({'error': 'Unauthorized'}), 403

        # Check if payment already exists
        if booking.payment_status == 'paid':
            return jsonify({'error': 'Booking already paid'}), 400

        # Get package title for payment description
        package = Package.query.get(booking.package_id)
        package_title = package.title if package else f'Booking {booking_id}'

        # Initiate payment
        payment_result = initiate_payment(booking, user.email, package_title)

        if payment_result['success']:
            return jsonify({
                'success': True,
                'payment_url': payment_result['redirect_url'],
                'redirect_url': payment_result['redirect_url'],
                'poll_url': payment_result['poll_url'],
                'payment_reference': payment_result.get('payment_reference')
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': payment_result.get('error', 'Payment initiation failed'),
                'message': payment_result.get('message', 'Unknown error')
            }), 400

    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"Error initiating payment: {error_trace}")
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


@bp.route('/cart/checkout', methods=['POST'])
@jwt_required()
def cart_checkout():
    """
    Cart checkout: create all bookings then initiate ONE combined Paynow payment.
    Body: { package_ids: [1, 2, ...] }
    Returns: { booking_ids, redirect_url, poll_url, payment_reference, total }
    """
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        brand = BrandProfile.query.filter_by(user_id=user_id).first()

        if not brand or not user:
            return jsonify({'error': 'Brand profile not found'}), 404

        data = request.get_json()
        package_ids = data.get('package_ids', [])
        if not package_ids:
            return jsonify({'error': 'No packages provided'}), 400

        # Check subscription limits
        subscription = Subscription.query.filter_by(
            user_id=user_id,
            status='active'
        ).first()

        if subscription and subscription.plan:
            # Get bookings count for current month for this brand
            start_of_month = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)

            current_month_bookings = Booking.query.filter(
                Booking.brand_id == brand.id,
                Booking.created_at >= start_of_month
            ).count()

            max_bookings = subscription.plan.max_bookings_per_month
            new_bookings_count = len(package_ids)

            # Check if adding these bookings would exceed the limit (-1 means unlimited)
            if max_bookings != -1 and (current_month_bookings + new_bookings_count) > max_bookings:
                remaining = max_bookings - current_month_bookings
                return jsonify({
                    'error': f'Monthly booking limit exceeded. Your {subscription.plan.name} plan allows {max_bookings} bookings per month. You have {remaining} remaining.',
                    'limit_reached': True,
                    'current_count': current_month_bookings,
                    'max_allowed': max_bookings,
                    'remaining': remaining,
                    'upgrade_required': True
                }), 403

        # --- 1. Create all bookings ---
        bookings = []
        total = 0.0
        for pkg_id in package_ids:
            package = Package.query.get(pkg_id)
            if not package:
                return jsonify({'error': f'Package {pkg_id} not found'}), 404

            booking = Booking(
                package_id=package.id,
                creator_id=package.creator_id,
                brand_id=brand.id,
                amount=package.price,
                total_price=package.price,
            )
            db.session.add(booking)
            db.session.flush()  # get booking.id before commit
            bookings.append((booking, package))
            total += float(package.price)

        db.session.commit()

        # Notify creators
        for booking, package in bookings:
            db.session.refresh(booking)
            creator_user = User.query.get(package.creator.user_id)
            if creator_user:
                notify_new_booking(
                    creator_id=creator_user.id,
                    brand_name=brand.company_name or user.email,
                    booking_id=booking.id
                )

        # --- 2. Initiate ONE combined Paynow payment ---
        import os
        from paynow import Paynow
        from flask import current_app

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

        booking_ids = [b.id for b, _ in bookings]
        cart_ref = f"CART-{'_'.join(str(i) for i in booking_ids)}"

        paynow = Paynow(
            integration_id=integration_id,
            integration_key=integration_key,
            return_url=return_url,
            result_url=result_url
        )

        payment = paynow.create_payment(cart_ref, user.email)
        for booking, package in bookings:
            payment.add(package.title, float(package.price))

        response = paynow.send(payment)

        if not response.success:
            # Roll back bookings if Paynow fails
            db.session.rollback()
            error_msg = str(getattr(response, 'errors', None) or getattr(response, 'status', 'Unknown error'))
            return jsonify({'success': False, 'error': 'Paynow failed', 'message': error_msg}), 400

        poll_url = response.poll_url
        redirect_url = response.redirect_url
        payment_hash = str(response.hash) if response.hash and response.hash is not True else (
            poll_url.split('guid=')[-1] if '?guid=' in poll_url else None
        )

        # Store payment reference on all bookings
        from app.models import Payment as PaymentModel
        for booking, package in bookings:
            booking.payment_method = 'paynow'
            booking.payment_reference = f'PAYNOW-{payment_hash}'

            pay_rec = PaymentModel(
                booking_id=booking.id,
                user_id=brand.user_id,
                amount=float(package.price),
                payment_method='paynow',
                payment_type='automated',
                status='pending',
                escrow_status='pending',
                paynow_poll_url=poll_url,
                paynow_reference=payment_hash,
                external_reference=cart_ref,
            )
            db.session.add(pay_rec)

        db.session.commit()

        return jsonify({
            'success': True,
            'booking_ids': booking_ids,
            'total': total,
            'redirect_url': redirect_url,
            'poll_url': poll_url,
            'payment_reference': payment_hash,
            'cart_ref': cart_ref,
        }), 200

    except Exception as e:
        db.session.rollback()
        import traceback
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500


@bp.route('/cart/status', methods=['POST'])
@jwt_required()
def cart_payment_status():
    """
    Poll Paynow status for a cart (multiple booking IDs).
    Body: { booking_ids: [1,2,...], poll_url: '...' }
    Marks all bookings paid + creates collaborations when confirmed.
    """
    try:
        import os
        from paynow import Paynow
        from flask import current_app
        from datetime import timedelta

        user_id = int(get_jwt_identity())
        data = request.get_json()
        booking_ids = data.get('booking_ids', [])
        poll_url = data.get('poll_url', '')

        if not booking_ids:
            return jsonify({'error': 'No booking IDs provided'}), 400

        # Check if already paid
        all_paid = all(
            Booking.query.get(bid).payment_status in ('paid', 'verified')
            for bid in booking_ids
            if Booking.query.get(bid)
        )
        if all_paid:
            return jsonify({'paid': True, 'status': 'paid'}), 200

        # Poll Paynow
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

        paynow = Paynow(
            integration_id=integration_id,
            integration_key=integration_key,
            return_url=return_url,
            result_url=result_url
        )

        status_response = paynow.check_transaction_status(poll_url)
        paynow_paid = getattr(status_response, 'paid', False)
        paynow_status = getattr(status_response, 'status', 'pending')

        if paynow_paid:
            # Mark all bookings paid and create collaborations
            for bid in booking_ids:
                booking = Booking.query.get(bid)
                if not booking or booking.payment_status == 'paid':
                    continue

                booking.payment_status = 'paid'
                booking.escrow_status = 'escrowed'
                booking.escrowed_at = datetime.utcnow()
                booking.status = 'accepted'

                # Create collaboration for each booking
                existing_collab = Collaboration.query.filter_by(booking_id=booking.id).first()
                if not existing_collab:
                    package = Package.query.get(booking.package_id)
                    start_date = datetime.utcnow()
                    expected_completion = None
                    if package and package.duration_days:
                        expected_completion = start_date + timedelta(days=package.duration_days)

                    collab = Collaboration(
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
                    db.session.add(collab)

            db.session.commit()
            return jsonify({'paid': True, 'status': 'paid'}), 200

        return jsonify({'paid': False, 'status': paynow_status}), 200

    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500


@bp.route('/cart/upload-pop', methods=['POST'])
@jwt_required()
def cart_upload_pop():
    """
    Bank transfer POP upload for a cart (multiple bookings).
    Multipart form: file + booking_ids (JSON array as string)
    """
    try:
        import json
        user_id = int(get_jwt_identity())
        brand = BrandProfile.query.filter_by(user_id=user_id).first()
        if not brand:
            return jsonify({'error': 'Brand profile not found'}), 404

        booking_ids = json.loads(request.form.get('booking_ids', '[]'))
        if not booking_ids:
            return jsonify({'error': 'No booking IDs provided'}), 400

        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400

        if not allowed_file(file.filename):
            return jsonify({'error': 'File type not allowed. Only PDF, JPG, JPEG, PNG, GIF'}), 400

        file.seek(0, os.SEEK_END)
        file_size = file.tell()
        file.seek(0)
        if file_size > 20 * 1024 * 1024:
            return jsonify({'error': 'File size exceeds 20MB limit'}), 400

        os.makedirs(UPLOAD_FOLDER, exist_ok=True)
        timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
        original_filename = secure_filename(file.filename)
        filename = f"cart_{'_'.join(str(i) for i in booking_ids)}_{timestamp}_{original_filename}"
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        file.save(filepath)

        for bid in booking_ids:
            booking = Booking.query.get(bid)
            if not booking or booking.brand_id != brand.id:
                continue
            booking.proof_of_payment = filepath
            booking.payment_method = 'bank_transfer'
            booking.payment_status = 'pending'

        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Proof of payment uploaded for all bookings. Awaiting admin verification.',
            'booking_ids': booking_ids,
        }), 200

    except Exception as e:
        db.session.rollback()
        import traceback
        print(traceback.format_exc())
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


@bp.route('/<int:booking_id>/upload-pop', methods=['POST'])
@jwt_required()
def upload_proof_of_payment(booking_id):
    """Upload proof of payment for bank transfer"""
    try:
        booking = Booking.query.get(booking_id)
        if not booking:
            return jsonify({'error': 'Booking not found'}), 404

        # Check if user is authorized (brand who made the booking)
        user_id = int(get_jwt_identity())
        brand = BrandProfile.query.filter_by(user_id=user_id).first()
        if not brand or booking.brand_id != brand.id:
            return jsonify({'error': 'Unauthorized'}), 403

        # Check if file is in request
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400

        # Validate file
        if not allowed_file(file.filename):
            return jsonify({'error': 'File type not allowed. Only PDF, JPG, JPEG, PNG, GIF'}), 400

        # Check file size
        file.seek(0, os.SEEK_END)
        file_size = file.tell()
        file.seek(0)
        if file_size > MAX_FILE_SIZE:
            return jsonify({'error': 'File size exceeds 5MB limit'}), 400

        # Create uploads directory if it doesn't exist
        os.makedirs(UPLOAD_FOLDER, exist_ok=True)

        # Generate secure filename
        timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
        original_filename = secure_filename(file.filename)
        filename = f"booking_{booking_id}_{timestamp}_{original_filename}"
        filepath = os.path.join(UPLOAD_FOLDER, filename)

        # Save file
        file.save(filepath)

        # Update booking record
        booking.proof_of_payment = filepath
        booking.payment_method = 'bank_transfer'
        booking.payment_status = 'pending'  # Admin needs to verify
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Proof of payment uploaded successfully',
            'filename': filename,
            'status': 'Pending admin verification'
        }), 200

    except Exception as e:
        db.session.rollback()
        import traceback
        error_trace = traceback.format_exc()
        print(f"Error uploading proof of payment: {error_trace}")
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:booking_id>/download-pop', methods=['GET'])
@jwt_required()
def download_proof_of_payment(booking_id):
    """Download proof of payment file (admin, brand, or creator)"""
    try:
        booking = Booking.query.get(booking_id)
        if not booking:
            return jsonify({'error': 'Booking not found'}), 404

        if not booking.proof_of_payment:
            return jsonify({'error': 'No proof of payment uploaded'}), 404

        # Check if user is authorized
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        is_admin = user.is_admin if hasattr(user, 'is_admin') else False
        is_brand = BrandProfile.query.filter_by(user_id=user_id, id=booking.brand_id).first() is not None
        is_creator = CreatorProfile.query.filter_by(user_id=user_id, id=booking.creator_id).first() is not None

        if not (is_admin or is_brand or is_creator):
            return jsonify({'error': 'Unauthorized'}), 403

        # Check if file exists
        if not os.path.exists(booking.proof_of_payment):
            return jsonify({'error': 'File not found on server'}), 404

        # Send file
        return send_file(
            booking.proof_of_payment,
            as_attachment=True,
            download_name=os.path.basename(booking.proof_of_payment)
        )

    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"Error downloading proof of payment: {error_trace}")
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:booking_id>/verify-payment', methods=['POST'])
@jwt_required()
def verify_bank_transfer_payment(booking_id):
    """Verify bank transfer payment (admin only)"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        # Check if user is admin
        if not user or not (hasattr(user, 'is_admin') and user.is_admin):
            return jsonify({'error': 'Unauthorized. Admin access required'}), 403

        booking = Booking.query.get(booking_id)
        if not booking:
            return jsonify({'error': 'Booking not found'}), 404

        if booking.payment_method != 'bank_transfer':
            return jsonify({'error': 'This booking is not a bank transfer'}), 400

        if not booking.proof_of_payment:
            return jsonify({'error': 'No proof of payment uploaded'}), 400

        # Update payment status
        booking.payment_status = 'verified'
        booking.escrow_status = 'escrowed'
        booking.escrowed_at = datetime.utcnow()

        # CREATE PAYMENT RECORD - This is what was missing!
        from app.models import Payment, PaymentVerification

        # Check if payment record already exists
        existing_payment = Payment.query.filter_by(booking_id=booking.id).first()

        if not existing_payment:
            # Get brand user_id for the payment record
            brand = BrandProfile.query.get(booking.brand_id)
            if not brand:
                db.session.rollback()
                return jsonify({'error': 'Brand profile not found'}), 404

            # Create Payment record
            payment = Payment(
                booking_id=booking.id,
                user_id=brand.user_id,
                amount=booking.total_price if hasattr(booking, 'total_price') else booking.amount,
                currency='USD',
                payment_method='bank_transfer',
                payment_type='manual',
                status='completed',
                verified_by=user_id,
                verified_at=datetime.utcnow(),
                completed_at=datetime.utcnow(),
                escrow_status='escrowed',
                held_amount=booking.total_price if hasattr(booking, 'total_price') else booking.amount,
                payment_proof_url=booking.proof_of_payment
            )
            db.session.add(payment)
            db.session.flush()  # Get payment ID

            # Create PaymentVerification record
            verification = PaymentVerification(
                payment_id=payment.id,
                booking_id=booking.id,
                verified_by=user_id,
                verified_at=datetime.utcnow(),
                amount_verified=booking.total_price if hasattr(booking, 'total_price') else booking.amount,
                payment_method='bank_transfer',
                proof_url=booking.proof_of_payment,
                verification_notes='Manual bank transfer verification by admin'
            )
            db.session.add(verification)
        else:
            # Update existing payment if it exists
            existing_payment.status = 'completed'
            existing_payment.completed_at = datetime.utcnow()
            existing_payment.escrow_status = 'escrowed'
            existing_payment.held_amount = booking.total_price if hasattr(booking, 'total_price') else booking.amount

        # Handle different booking types after payment verification
        if booking.booking_type == 'campaign_application':
            # For campaign applications: Update application status to 'accepted'
            from app.models import CampaignApplication
            application = CampaignApplication.query.filter_by(booking_id=booking.id).first()

            if application:
                application.status = 'accepted'
                application.updated_at = datetime.utcnow()

                # Check if collaboration already exists
                existing_collab = Collaboration.query.filter_by(
                    campaign_application_id=application.id
                ).first()

                if not existing_collab:
                    # Create collaboration from application
                    # Campaign already imported at top
                    campaign = Campaign.query.get(application.campaign_id)

                    collaboration = Collaboration(
                        collaboration_type='campaign',
                        campaign_application_id=application.id,
                        brand_id=booking.brand_id,
                        creator_id=booking.creator_id,
                        title=campaign.title if campaign else 'Campaign Collaboration',
                        description=campaign.description if campaign else '',
                        amount=application.proposed_price,
                        deliverables=application.deliverables,
                        start_date=campaign.start_date if campaign else datetime.utcnow(),
                        expected_completion_date=campaign.end_date if campaign else None,
                        status='in_progress',
                        progress_percentage=0
                    )
                    db.session.add(collaboration)

                # Notify creator of acceptance
                creator_user = User.query.get(application.creator.user_id)
                campaign = Campaign.query.get(application.campaign_id)
                if creator_user and campaign:
                    from app.utils.notifications import notify_campaign_status
                    notify_campaign_status(
                        user_id=creator_user.id,
                        status='accepted',
                        campaign_name=campaign.title,
                        campaign_id=campaign.id
                    )

        elif booking.booking_type == 'brief':
            # For briefs: Create collaboration with milestones
            # Find the accepted proposal by creator and brand
            from app.models import Brief
            proposal = None

            # Try to find proposal by matching creator and booking details
            brief_query = Brief.query.filter_by(brand_id=booking.brand_id, status='closed')
            for brief in brief_query.all():
                proposal = Proposal.query.filter_by(
                    brief_id=brief.id,
                    creator_id=booking.creator_id,
                    status='accepted'
                ).first()
                if proposal:
                    break

            if not proposal:
                db.session.rollback()
                return jsonify({'error': 'Accepted proposal not found'}), 404

            # Check if collaboration already exists
            existing_collab = Collaboration.query.filter_by(
                brief_id=proposal.brief_id,
                creator_id=booking.creator_id
            ).first()

            if not existing_collab:
                # Create collaboration from proposal
                from datetime import timedelta
                start_date = datetime.utcnow()
                expected_completion = start_date + timedelta(days=proposal.timeline_days)

                collaboration = Collaboration(
                    collaboration_type='package',  # Brief creates package-like collab
                    booking_id=booking.id,
                    brand_id=booking.brand_id,
                    creator_id=booking.creator_id,
                    brief_id=proposal.brief_id,
                    source_type='brief',
                    source_id=proposal.brief_id,
                    has_milestones=True,
                    milestone_pricing_type=proposal.pricing_type,
                    title=proposal.brief.title,
                    description=proposal.brief.description,
                    amount=float(proposal.total_price),
                    start_date=start_date,
                    expected_completion_date=expected_completion,
                    status='in_progress',
                    progress_percentage=0
                )
                db.session.add(collaboration)
                db.session.flush()

                # Create collaboration milestones from proposal milestones
                from app.utils.milestone_helper import calculate_milestone_pricing

                proposal_milestones = proposal.milestones.order_by('milestone_number').all()

                for prop_milestone in proposal_milestones:
                    # Calculate milestone price
                    if proposal.pricing_type == 'total':
                        milestone_price = float(proposal.total_price) / len(proposal_milestones)
                    else:
                        milestone_price = float(prop_milestone.price) if prop_milestone.price else 0

                    # Calculate due date
                    if prop_milestone.milestone_number == 1:
                        due_date = start_date + timedelta(days=prop_milestone.duration_days)
                    else:
                        prev_milestone = CollaborationMilestone.query.filter_by(
                            collaboration_id=collaboration.id,
                            milestone_number=prop_milestone.milestone_number - 1
                        ).first()
                        due_date = prev_milestone.due_date + timedelta(days=prop_milestone.duration_days)

                    collab_milestone = CollaborationMilestone(
                        collaboration_id=collaboration.id,
                        milestone_number=prop_milestone.milestone_number,
                        title=prop_milestone.title,
                        description=prop_milestone.notes,
                        expected_deliverables=prop_milestone.deliverables,
                        price=milestone_price,
                        due_date=due_date.date(),
                        status='in_progress' if prop_milestone.milestone_number == 1 else 'pending'
                    )
                    db.session.add(collab_milestone)

            # Update booking status
            booking.status = 'confirmed'

            # Notify creator
            creator_user = User.query.get(booking.creator.user_id)
            if creator_user:
                from app.utils.notifications import create_notification
                create_notification(
                    user_id=creator_user.id,
                    notification_type='collaboration_started',
                    title='Collaboration Started!',
                    message=f'Payment verified for "{proposal.brief.title}"',
                    action_url=f'/creator/collaborations/{collaboration.id if not existing_collab else existing_collab.id}'
                )

        elif booking.booking_type == 'campaign_package':
            # For campaign packages: Add package to campaign
            from app.models.campaign import campaign_packages

            # Check if package is already in campaign
            existing_entry = db.session.execute(
                campaign_packages.select().where(
                    campaign_packages.c.campaign_id == booking.campaign_id,
                    campaign_packages.c.package_id == booking.package_id
                )
            ).fetchone()

            if not existing_entry:
                # Add package to campaign
                db.session.execute(
                    campaign_packages.insert().values(
                        campaign_id=booking.campaign_id,
                        package_id=booking.package_id,
                        booking_id=booking.id
                    )
                )

            # Check if collaboration already exists
            existing_collab = Collaboration.query.filter_by(
                brand_id=booking.brand_id,
                creator_id=booking.creator_id
            ).filter(
                Collaboration.title.like(f"%{booking.package.title if booking.package else ''}%")
            ).first()

            if not existing_collab and booking.package:
                # Create collaboration for package in campaign
                # Campaign already imported at top
                campaign = Campaign.query.get(booking.campaign_id)

                collaboration = Collaboration(
                    collaboration_type='package',
                    booking_id=booking.id,
                    brand_id=booking.brand_id,
                    creator_id=booking.creator_id,
                    title=f"{campaign.title if campaign else 'Campaign'} - {booking.package.title}",
                    description=booking.package.description,
                    amount=booking.package.price,
                    deliverables=booking.package.deliverables or [],
                    start_date=campaign.start_date if campaign else datetime.utcnow(),
                    expected_completion_date=campaign.end_date if campaign else None,
                    status='in_progress',
                    progress_percentage=0
                )
                db.session.add(collaboration)

            # Update booking status
            booking.status = 'confirmed'

        else:
            # For regular package bookings (direct bookings)
            # Auto-accept booking and create collaboration when payment is verified
            if booking.status == 'pending':
                booking.status = 'accepted'

                # Check if collaboration already exists for this booking
                existing_collaboration = Collaboration.query.filter_by(booking_id=booking.id).first()

                if not existing_collaboration:
                    # Load package
                    # Package already imported at top
                    package = Package.query.get(booking.package_id)

                    # Calculate expected completion date based on package duration
                    from datetime import timedelta
                    start_date = datetime.utcnow()
                    expected_completion = None
                    if package and package.duration_days:
                        expected_completion = start_date + timedelta(days=package.duration_days)

                    # Create collaboration
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

        # Notify brand
        brand_user = User.query.get(booking.brand.user_id)
        if brand_user:
            notify_booking_status(brand_user.id, 'payment_verified', booking.id)

        # Notify creator
        creator_user = User.query.get(booking.creator.user_id)
        if creator_user:
            notify_booking_status(creator_user.id, 'payment_verified', booking.id)

        return jsonify({
            'message': 'Payment verified successfully. Collaboration created.',
            'booking': booking.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        import traceback
        error_trace = traceback.format_exc()
        print(f"Error verifying payment: {error_trace}")
        return jsonify({'error': str(e)}), 500
