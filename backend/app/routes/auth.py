from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    jwt_required,
    get_jwt_identity,
    get_jwt
)
from datetime import datetime, timedelta
import re
from app import db
from app.models import User, CreatorProfile, BrandProfile, OTP
from app.services.email_service import send_otp_email, send_verification_email, send_password_reset_email

bp = Blueprint('auth', __name__)


@bp.route('/register/creator', methods=['POST'])
def register_creator():
    """Register a new creator account"""
    try:
        data = request.get_json()

        # Validate required fields
        required_fields = ['email', 'password', 'username']
        if not all(field in data for field in required_fields):
            return jsonify({'error': 'Missing required fields'}), 400

        # Validate username
        username = data['username'].strip()
        if len(username) < 3:
            return jsonify({'error': 'Username must be at least 3 characters'}), 400
        if len(username) > 30:
            return jsonify({'error': 'Username must be less than 30 characters'}), 400
        if not re.match(r'^[a-zA-Z0-9_]+$', username):
            return jsonify({'error': 'Username can only contain letters, numbers, and underscores'}), 400

        # Check if username is already taken
        if CreatorProfile.query.filter_by(username=username).first():
            return jsonify({'error': 'Username already taken'}), 409

        # Check if user already exists
        if User.query.filter_by(email=data['email'].lower()).first():
            return jsonify({'error': 'Email already registered'}), 409

        # Create user
        user = User(
            email=data['email'],
            password=data['password'],
            user_type='creator'
        )
        db.session.add(user)
        db.session.flush()  # Get user.id without committing

        # Create creator profile with username
        creator_profile = CreatorProfile(
            user_id=user.id,
            username=username
        )
        db.session.add(creator_profile)

        # Generate OTP
        otp = OTP(user_id=user.id, purpose='registration', expiry_minutes=10)
        db.session.add(otp)
        db.session.commit()

        # Send OTP email
        send_otp_email(user.email, otp.code, purpose='registration')

        return jsonify({
            'message': 'Creator account created successfully. Please check your email for the verification code.',
            'user': user.to_dict(),
            'requires_verification': True
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/register/brand', methods=['POST'])
def register_brand():
    """Register a new brand account"""
    try:
        data = request.get_json()

        # Validate required fields
        required_fields = ['email', 'password', 'company_name']
        if not all(field in data for field in required_fields):
            return jsonify({'error': 'Missing required fields'}), 400

        # Check if user already exists
        if User.query.filter_by(email=data['email'].lower()).first():
            return jsonify({'error': 'Email already registered'}), 409

        # Create user
        user = User(
            email=data['email'],
            password=data['password'],
            user_type='brand'
        )
        db.session.add(user)
        db.session.flush()

        # Create brand profile
        brand_profile = BrandProfile(
            user_id=user.id,
            company_name=data['company_name']
        )
        db.session.add(brand_profile)

        # Generate OTP
        otp = OTP(user_id=user.id, purpose='registration', expiry_minutes=10)
        db.session.add(otp)
        db.session.commit()

        # Send OTP email
        send_otp_email(user.email, otp.code, purpose='registration')

        return jsonify({
            'message': 'Brand account created successfully. Please check your email for the verification code.',
            'user': user.to_dict(),
            'requires_verification': True
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/login', methods=['POST'])
def login():
    """Login and get access token"""
    try:
        data = request.get_json()

        # Validate required fields
        if not all(field in data for field in ['email', 'password']):
            return jsonify({'error': 'Missing email or password'}), 400

        # Find user
        user = User.query.filter_by(email=data['email'].lower()).first()
        if not user or not user.check_password(data['password']):
            return jsonify({'error': 'Invalid email or password'}), 401

        # Check if user is active
        if not user.is_active:
            return jsonify({'error': 'Account is deactivated'}), 403

        # Update last login
        user.update_last_login()
        db.session.commit()

        # Create tokens with admin claims
        claims = {
            'user_type': user.user_type,
            'is_admin': user.is_admin,
            'admin_role': user.admin_role if user.is_admin else None
        }
        access_token = create_access_token(
            identity=str(user.id),
            additional_claims=claims
        )
        refresh_token = create_refresh_token(identity=str(user.id))

        # Get profile data
        profile = None
        if user.user_type == 'creator' and user.creator_profile:
            profile = user.creator_profile.to_dict()
        elif user.user_type == 'brand' and user.brand_profile:
            profile = user.brand_profile.to_dict()

        return jsonify({
            'access_token': access_token,
            'refresh_token': refresh_token,
            'user': user.to_dict(),
            'profile': profile
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    """Refresh access token"""
    try:
        user_id = get_jwt_identity()
        # Ensure user_id is a string
        access_token = create_access_token(identity=str(user_id))
        return jsonify({'access_token': access_token}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/verify-otp', methods=['POST'])
def verify_otp():
    """Verify OTP code"""
    try:
        data = request.get_json()
        email = data.get('email')
        code = data.get('code')

        # Validate required fields
        if not email or not code:
            return jsonify({'error': 'Email and code are required'}), 400

        # Find user
        user = User.query.filter_by(email=email.lower()).first()
        if not user:
            return jsonify({'error': 'User not found'}), 404

        # Find valid OTP
        otp = OTP.query.filter_by(
            user_id=user.id,
            code=code,
            purpose='registration',
            is_used=False
        ).order_by(OTP.created_at.desc()).first()

        if not otp:
            return jsonify({'error': 'Invalid verification code'}), 400

        # Check if OTP is valid (not expired)
        if not otp.is_valid():
            return jsonify({'error': 'Verification code has expired'}), 400

        # Mark user as verified
        user.is_verified = True

        # Mark OTP as used
        otp.mark_as_used()

        db.session.commit()

        return jsonify({
            'message': 'Email verified successfully',
            'user': user.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/resend-otp', methods=['POST'])
def resend_otp():
    """Resend OTP code"""
    try:
        data = request.get_json()
        email = data.get('email')

        if not email:
            return jsonify({'error': 'Email is required'}), 400

        # Find user
        user = User.query.filter_by(email=email.lower()).first()
        if not user:
            return jsonify({'error': 'User not found'}), 404

        # Check if user is already verified
        if user.is_verified:
            return jsonify({'error': 'Email already verified'}), 400

        # Generate new OTP
        otp = OTP(user_id=user.id, purpose='registration', expiry_minutes=10)
        db.session.add(otp)
        db.session.commit()

        # Send OTP email
        send_otp_email(user.email, otp.code, purpose='registration')

        return jsonify({
            'message': 'Verification code sent successfully'
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/verify/<token>', methods=['GET'])
def verify_email(token):
    """Verify email address (legacy token-based method)"""
    try:
        user = User.query.filter_by(verification_token=token).first()
        if not user:
            return jsonify({'error': 'Invalid verification token'}), 400

        user.is_verified = True
        user.verification_token = None
        db.session.commit()

        return jsonify({'message': 'Email verified successfully'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    """Request password reset"""
    try:
        data = request.get_json()
        email = data.get('email')

        if not email:
            return jsonify({'error': 'Email is required'}), 400

        user = User.query.filter_by(email=email.lower()).first()
        if user:
            # Generate reset token
            reset_token = user.generate_reset_token()
            db.session.commit()

            # Send reset email
            send_password_reset_email(user.email, reset_token)

        # Always return success to prevent email enumeration
        return jsonify({'message': 'If the email exists, a password reset link has been sent'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/reset-password/<token>', methods=['POST'])
def reset_password(token):
    """Reset password with token"""
    try:
        data = request.get_json()
        new_password = data.get('password')

        if not new_password:
            return jsonify({'error': 'Password is required'}), 400

        # Find user by reset token
        user = User.query.filter_by(reset_token=token).first()
        if not user:
            return jsonify({'error': 'Invalid reset token'}), 400

        # Check if token is expired
        if user.reset_token_expires < datetime.utcnow():
            return jsonify({'error': 'Reset token has expired'}), 400

        # Update password
        user.set_password(new_password)
        user.reset_token = None
        user.reset_token_expires = None
        db.session.commit()

        return jsonify({'message': 'Password reset successfully'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    """Get current user info"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if not user:
            return jsonify({'error': 'User not found'}), 404

        # Get profile
        profile = None
        if user.user_type == 'creator' and user.creator_profile:
            profile = user.creator_profile.to_dict()
        elif user.user_type == 'brand' and user.brand_profile:
            profile = user.brand_profile.to_dict()

        return jsonify({
            'user': user.to_dict(),
            'profile': profile
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    """Logout (client-side token removal)"""
    # JWT tokens are stateless, so logout is handled client-side
    # This endpoint exists for consistency and future token blacklisting
    return jsonify({'message': 'Logged out successfully'}), 200
