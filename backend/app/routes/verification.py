"""
Creator Verification Routes
Handles creator verification applications and admin review
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import (
    CreatorProfile, VerificationApplication, User,
    CreatorSubscription, CreatorSubscriptionPlan
)
from datetime import datetime
import os
from werkzeug.utils import secure_filename

verification_bp = Blueprint('verification', __name__)

UPLOAD_FOLDER = '/var/www/bantubuzz/backend/uploads/verification'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'pdf'}


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@verification_bp.route('/api/creator/verification/apply', methods=['POST'])
@jwt_required()
def apply_for_verification():
    """Submit verification application"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)

        if not user or user.user_type != 'creator':
            return jsonify({'error': 'Creator account required'}), 403

        creator = CreatorProfile.query.filter_by(user_id=current_user_id).first()
        if not creator:
            return jsonify({'error': 'Creator profile not found'}), 404

        if creator.is_verified:
            return jsonify({'error': 'You are already verified'}), 400

        # Check if has active verification subscription
        verification_plan = CreatorSubscriptionPlan.query.filter_by(
            subscription_type='verification',
            is_active=True
        ).first()

        if not verification_plan:
            return jsonify({'error': 'Verification plan not available'}), 400

        active_subscription = CreatorSubscription.query.filter_by(
            creator_id=creator.id,
            plan_id=verification_plan.id,
            status='active',
            payment_verified=True
        ).filter(
            CreatorSubscription.end_date > datetime.utcnow()
        ).first()

        if not active_subscription:
            return jsonify({
                'error': 'Active verification subscription required. Please subscribe first.'
            }), 400

        # Check for existing pending application
        existing_app = VerificationApplication.query.filter_by(
            creator_id=creator.id,
            status='pending'
        ).first()

        if existing_app:
            return jsonify({'error': 'You already have a pending verification application'}), 400

        data = request.json

        # Validate required fields
        required_fields = ['real_name', 'id_type', 'id_number']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400

        # Create application
        application = VerificationApplication(
            creator_id=creator.id,
            subscription_id=active_subscription.id,
            status='pending',
            real_name=data['real_name'],
            id_type=data['id_type'],
            id_number=data['id_number'],
            reason=data.get('reason', ''),

            # Document paths (will be uploaded separately)
            id_document_front=data.get('id_document_front'),
            id_document_back=data.get('id_document_back'),
            selfie_with_id=data.get('selfie_with_id'),

            # Social media verification
            instagram_verified=data.get('instagram_verified', False),
            instagram_username=data.get('instagram_username'),
            instagram_followers=data.get('instagram_followers', 0),
            tiktok_verified=data.get('tiktok_verified', False),
            tiktok_username=data.get('tiktok_username'),
            tiktok_followers=data.get('tiktok_followers', 0),
            facebook_verified=data.get('facebook_verified', False),
            facebook_username=data.get('facebook_username'),
            facebook_followers=data.get('facebook_followers', 0),

            payment_reference=active_subscription.payment_reference,
            payment_verified=True
        )

        db.session.add(application)
        db.session.commit()

        return jsonify({
            'message': 'Verification application submitted successfully',
            'application': application.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@verification_bp.route('/api/creator/verification/upload-document', methods=['POST'])
@jwt_required()
def upload_verification_document():
    """Upload verification document"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)

        if not user or user.user_type != 'creator':
            return jsonify({'error': 'Creator account required'}), 403

        creator = CreatorProfile.query.filter_by(user_id=current_user_id).first()
        if not creator:
            return jsonify({'error': 'Creator profile not found'}), 404

        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400

        file = request.files['file']
        document_type = request.form.get('document_type')  # 'id_front', 'id_back', 'selfie'

        if not document_type or document_type not in ['id_front', 'id_back', 'selfie']:
            return jsonify({'error': 'Invalid document type'}), 400

        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400

        if file and allowed_file(file.filename):
            # Create upload directory if it doesn't exist
            os.makedirs(UPLOAD_FOLDER, exist_ok=True)

            # Generate unique filename
            filename = secure_filename(f"{creator.id}_{document_type}_{datetime.utcnow().timestamp()}.{file.filename.rsplit('.', 1)[1].lower()}")
            filepath = os.path.join(UPLOAD_FOLDER, filename)

            file.save(filepath)

            # Return the relative path
            relative_path = f"/uploads/verification/{filename}"

            return jsonify({
                'message': 'Document uploaded successfully',
                'file_path': relative_path,
                'document_type': document_type
            }), 200

        return jsonify({'error': 'Invalid file type. Allowed: png, jpg, jpeg, pdf'}), 400

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@verification_bp.route('/api/creator/verification/status', methods=['GET'])
@jwt_required()
def get_verification_status():
    """Get creator's verification application status"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)

        if not user or user.user_type != 'creator':
            return jsonify({'error': 'Creator account required'}), 403

        creator = CreatorProfile.query.filter_by(user_id=current_user_id).first()
        if not creator:
            return jsonify({'error': 'Creator profile not found'}), 404

        # Get latest application
        application = VerificationApplication.query.filter_by(
            creator_id=creator.id
        ).order_by(VerificationApplication.created_at.desc()).first()

        if not application:
            return jsonify({
                'is_verified': creator.is_verified,
                'has_application': False,
                'application': None
            }), 200

        return jsonify({
            'is_verified': creator.is_verified,
            'has_application': True,
            'application': application.to_dict()
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ========== ADMIN ROUTES ==========

@verification_bp.route('/api/admin/verification/applications', methods=['GET'])
@jwt_required()
def get_verification_applications():
    """Get all verification applications (admin only)"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)

        if not user or not user.is_admin:
            return jsonify({'error': 'Admin access required'}), 403

        status = request.args.get('status', 'pending')

        query = VerificationApplication.query

        if status and status != 'all':
            query = query.filter_by(status=status)

        applications = query.order_by(
            VerificationApplication.created_at.desc()
        ).all()

        # Include creator info
        result = []
        for app in applications:
            app_dict = app.to_dict()
            if app.creator:
                app_dict['creator'] = {
                    'id': app.creator.id,
                    'display_name': app.creator.display_name,
                    'username': app.creator.username,
                    'profile_image': app.creator.profile_image
                }
            result.append(app_dict)

        return jsonify({
            'applications': result,
            'total': len(result)
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@verification_bp.route('/api/admin/verification/applications/<int:app_id>/approve', methods=['POST'])
@jwt_required()
def approve_verification(app_id):
    """Approve verification application (admin only)"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)

        if not user or not user.is_admin:
            return jsonify({'error': 'Admin access required'}), 403

        application = VerificationApplication.query.get(app_id)
        if not application:
            return jsonify({'error': 'Application not found'}), 404

        if application.status != 'pending':
            return jsonify({'error': 'Only pending applications can be approved'}), 400

        # Approve application
        application.approve(current_user_id)

        # Set creator as verified
        creator = application.creator
        creator.is_verified = True

        db.session.commit()

        return jsonify({
            'message': 'Verification application approved',
            'application': application.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@verification_bp.route('/api/admin/verification/applications/<int:app_id>/reject', methods=['POST'])
@jwt_required()
def reject_verification(app_id):
    """Reject verification application (admin only)"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)

        if not user or not user.is_admin:
            return jsonify({'error': 'Admin access required'}), 403

        application = VerificationApplication.query.get(app_id)
        if not application:
            return jsonify({'error': 'Application not found'}), 404

        if application.status != 'pending':
            return jsonify({'error': 'Only pending applications can be rejected'}), 400

        data = request.json
        reason = data.get('reason', 'Application does not meet verification requirements')

        # Reject application
        application.reject(current_user_id, reason)

        db.session.commit()

        return jsonify({
            'message': 'Verification application rejected',
            'application': application.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@verification_bp.route('/api/admin/verification/applications/<int:app_id>/notes', methods=['POST'])
@jwt_required()
def update_verification_notes(app_id):
    """Update admin notes for verification application"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)

        if not user or not user.is_admin:
            return jsonify({'error': 'Admin access required'}), 403

        application = VerificationApplication.query.get(app_id)
        if not application:
            return jsonify({'error': 'Application not found'}), 404

        data = request.json
        notes = data.get('notes', '')

        application.admin_notes = notes
        db.session.commit()

        return jsonify({
            'message': 'Notes updated successfully',
            'application': application.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
