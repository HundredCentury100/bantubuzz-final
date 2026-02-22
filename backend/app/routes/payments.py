from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from werkzeug.utils import secure_filename
import os
from app import db
from app.models import Collaboration, BrandProfile, User
from app.services.payment_service import initiate_payment

bp = Blueprint('payments', __name__)

# Configuration for file uploads
UPLOAD_FOLDER = os.path.join(os.getcwd(), 'uploads', 'proof_of_payment')
ALLOWED_EXTENSIONS = {'pdf', 'jpg', 'jpeg', 'png', 'gif'}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@bp.route('/revision', methods=['POST'])
@jwt_required()
def create_revision_payment():
    """
    Create payment for paid revision request.
    Follows same flow as booking payment.
    """
    try:
        user_id = int(get_jwt_identity())
        brand = BrandProfile.query.filter_by(user_id=user_id).first()

        if not brand:
            return jsonify({'error': 'Brand profile not found'}), 404

        data = request.get_json()

        # Validate required fields
        required_fields = ['collaboration_id', 'deliverable_id', 'amount', 'payment_method', 'notes']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'{field} is required'}), 400

        collaboration_id = data['collaboration_id']
        deliverable_id = data['deliverable_id']
        amount = float(data['amount'])
        payment_method = data['payment_method']
        notes = data['notes']

        # Verify collaboration exists and belongs to brand
        collaboration = Collaboration.query.get(collaboration_id)
        if not collaboration:
            return jsonify({'error': 'Collaboration not found'}), 404

        if collaboration.brand_id != brand.id:
            return jsonify({'error': 'Unauthorized'}), 403

        # Handle payment method
        if payment_method == 'paynow':
            # Initiate Paynow payment
            # Create a temporary payment reference
            payment_ref = f"REV_{collaboration_id}_{deliverable_id}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"

            # Build a simple object compatible with initiate_payment(booking, user_email, package_title)
            class RevisionPaymentObj:
                def __init__(self, _id, _amount, _ref):
                    self.id = _id
                    self.amount = _amount
                    self.payment_reference = _ref
                    self.brand = brand

            revision_obj = RevisionPaymentObj(
                f"REV-{collaboration_id}-{deliverable_id}",
                amount,
                payment_ref
            )

            # Use payment service to initiate payment
            payment_result = initiate_payment(
                revision_obj,
                brand.user.email,
                f"Revision fee for collaboration #{collaboration_id}"
            )

            if payment_result.get('success'):
                # Store pending revision request in collaboration metadata
                revision_requests = collaboration.revision_requests or []
                revision_requests.append({
                    'deliverable_id': deliverable_id,
                    'notes': notes,
                    'fee': amount,
                    'payment_ref': payment_ref,
                    'payment_status': 'pending',
                    'payment_method': 'paynow',
                    'requested_at': datetime.utcnow().isoformat(),
                    'status': 'pending_payment'
                })
                collaboration.revision_requests = revision_requests
                db.session.commit()

                return jsonify({
                    'success': True,
                    'payment_url': payment_result.get('redirect_url'),
                    'payment_ref': payment_ref,
                    'message': 'Redirecting to payment...'
                }), 200
            else:
                return jsonify({
                    'error': 'Failed to initiate payment',
                    'details': payment_result.get('error')
                }), 500

        elif payment_method == 'bank_transfer':
            # Handle bank transfer with proof of payment
            if 'proof_file' not in data:
                return jsonify({'error': 'Proof of payment file is required for bank transfer'}), 400

            # In a real implementation, the file would be uploaded separately
            # For now, we'll just store the metadata
            revision_requests = collaboration.revision_requests or []
            revision_requests.append({
                'deliverable_id': deliverable_id,
                'notes': notes,
                'fee': amount,
                'payment_status': 'pending_verification',
                'payment_method': 'bank_transfer',
                'requested_at': datetime.utcnow().isoformat(),
                'status': 'pending_payment'
            })
            collaboration.revision_requests = revision_requests
            db.session.commit()

            return jsonify({
                'success': True,
                'message': 'Proof of payment received. Awaiting admin verification.',
                'status': 'pending_verification'
            }), 200
        else:
            return jsonify({'error': 'Invalid payment method. Use paynow or bank_transfer'}), 400

    except Exception as e:
        db.session.rollback()
        import traceback
        error_trace = traceback.format_exc()
        print(f"Error creating revision payment: {error_trace}")
        return jsonify({'error': str(e)}), 500


@bp.route('/revision/<int:collaboration_id>/upload-pop', methods=['POST'])
@jwt_required()
def upload_revision_proof_of_payment(collaboration_id):
    """Upload proof of payment for revision bank transfer"""
    try:
        user_id = int(get_jwt_identity())
        brand = BrandProfile.query.filter_by(user_id=user_id).first()

        if not brand:
            return jsonify({'error': 'Brand profile not found'}), 404

        collaboration = Collaboration.query.get(collaboration_id)
        if not collaboration:
            return jsonify({'error': 'Collaboration not found'}), 404

        if collaboration.brand_id != brand.id:
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
        filename = f"revision_{collaboration_id}_{timestamp}_{original_filename}"
        filepath = os.path.join(UPLOAD_FOLDER, filename)

        # Save file
        file.save(filepath)

        # Get deliverable_id from form data
        deliverable_id = request.form.get('deliverable_id')
        notes = request.form.get('notes', '')

        # Update collaboration revision requests
        revision_requests = collaboration.revision_requests or []
        revision_requests.append({
            'deliverable_id': int(deliverable_id) if deliverable_id else None,
            'notes': notes,
            'fee': float(request.form.get('fee', 0)),
            'payment_status': 'pending_verification',
            'payment_method': 'bank_transfer',
            'proof_of_payment': filepath,
            'requested_at': datetime.utcnow().isoformat(),
            'status': 'pending_verification'
        })
        collaboration.revision_requests = revision_requests
        db.session.commit()

        return jsonify({
            'message': 'Proof of payment uploaded successfully',
            'filename': filename,
            'status': 'Pending admin verification'
        }), 200

    except Exception as e:
        db.session.rollback()
        import traceback
        error_trace = traceback.format_exc()
        print(f"Error uploading revision proof of payment: {error_trace}")
        return jsonify({'error': str(e)}), 500


@bp.route('/revision/<int:collaboration_id>/verify', methods=['POST'])
@jwt_required()
def verify_revision_payment(collaboration_id):
    """Verify revision payment and submit revision request (admin only)"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        # Check if user is admin
        if not user or not (hasattr(user, 'is_admin') and user.is_admin):
            return jsonify({'error': 'Unauthorized. Admin access required'}), 403

        collaboration = Collaboration.query.get(collaboration_id)
        if not collaboration:
            return jsonify({'error': 'Collaboration not found'}), 404

        data = request.get_json()
        revision_index = data.get('revision_index')

        if revision_index is None:
            return jsonify({'error': 'revision_index is required'}), 400

        revision_requests = collaboration.revision_requests or []
        if revision_index >= len(revision_requests):
            return jsonify({'error': 'Invalid revision index'}), 400

        # Update payment status
        revision_requests[revision_index]['payment_status'] = 'verified'
        revision_requests[revision_index]['status'] = 'submitted'
        revision_requests[revision_index]['verified_at'] = datetime.utcnow().isoformat()

        collaboration.revision_requests = revision_requests
        collaboration.paid_revisions = (collaboration.paid_revisions or 0) + 1

        db.session.commit()

        return jsonify({
            'message': 'Revision payment verified successfully',
            'collaboration': collaboration.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        import traceback
        error_trace = traceback.format_exc()
        print(f"Error verifying revision payment: {error_trace}")
        return jsonify({'error': str(e)}), 500


@bp.route('/campaign', methods=['POST'])
@jwt_required()
def create_campaign_payment():
    """
    Create payment for campaign application or package addition.
    This endpoint uses the existing booking created by campaigns API.
    """
    try:
        user_id = int(get_jwt_identity())
        brand = BrandProfile.query.filter_by(user_id=user_id).first()

        if not brand:
            return jsonify({'error': 'Brand profile not found'}), 404

        data = request.get_json()

        # Validate required fields
        required_fields = ['booking_id', 'payment_method', 'context']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'{field} is required'}), 400

        booking_id = data['booking_id']
        payment_method = data['payment_method']
        context = data['context']

        # Import here to avoid circular imports
        from app.models import Booking

        # Verify booking exists and belongs to brand
        booking = Booking.query.get(booking_id)
        if not booking:
            return jsonify({'error': 'Booking not found'}), 404

        if booking.brand_id != brand.id:
            return jsonify({'error': 'Unauthorized'}), 403

        # Handle payment method
        if payment_method == 'paynow':
            # Initiate Paynow payment
            payment_ref = f"CAMP_{booking_id}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"

            # Use payment service to initiate payment (booking object already available)
            payment_result = initiate_payment(
                booking,
                brand.user.email,
                f"Campaign booking #{booking_id}"
            )

            if payment_result.get('success'):
                # Update booking with payment method
                booking.payment_method = 'paynow'
                db.session.commit()

                return jsonify({
                    'success': True,
                    'payment_url': payment_result.get('redirect_url'),
                    'payment_ref': payment_ref,
                    'message': 'Redirecting to payment...'
                }), 200
            else:
                return jsonify({
                    'error': 'Failed to initiate payment',
                    'details': payment_result.get('error')
                }), 500

        elif payment_method == 'bank_transfer':
            # Bank transfer will be handled via upload proof of payment
            booking.payment_method = 'bank_transfer'
            booking.payment_status = 'pending'
            db.session.commit()

            return jsonify({
                'success': True,
                'message': 'Please upload proof of payment',
                'status': 'pending_upload'
            }), 200
        else:
            return jsonify({'error': 'Invalid payment method. Use paynow or bank_transfer'}), 400

    except Exception as e:
        db.session.rollback()
        import traceback
        error_trace = traceback.format_exc()
        print(f"Error creating campaign payment: {error_trace}")
        return jsonify({'error': str(e)}), 500


@bp.route('/campaign/<int:booking_id>/upload-pop', methods=['POST'])
@jwt_required()
def upload_campaign_proof_of_payment(booking_id):
    """Upload proof of payment for campaign booking bank transfer"""
    try:
        user_id = int(get_jwt_identity())
        brand = BrandProfile.query.filter_by(user_id=user_id).first()

        if not brand:
            return jsonify({'error': 'Brand profile not found'}), 404

        # Import here to avoid circular imports
        from app.models import Booking

        booking = Booking.query.get(booking_id)
        if not booking:
            return jsonify({'error': 'Booking not found'}), 404

        if booking.brand_id != brand.id:
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
        filename = f"campaign_{booking_id}_{timestamp}_{original_filename}"
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
        print(f"Error uploading campaign proof of payment: {error_trace}")
        return jsonify({'error': str(e)}), 500
