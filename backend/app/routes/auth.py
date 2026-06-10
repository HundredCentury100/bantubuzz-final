from flask import Blueprint, current_app, request, jsonify
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    jwt_required,
    get_jwt_identity,
    get_jwt
)
from datetime import datetime, timedelta, timezone
import re
from app import db
from app.models import User, CreatorProfile, BrandProfile, OTP, Subscription, SubscriptionPlan
from app.models import CreatorSubscription, CreatorSubscriptionPlan
from app.services.email_service import (
    send_otp_email,
    send_verification_email,
    send_password_reset_email,
    send_two_factor_code_email,
    send_welcome_email,
)
from app.services.referral_service import attach_referral, mark_referral_activated

bp = Blueprint('auth', __name__)
MAX_FAILED_LOGIN_ATTEMPTS = 5
LOGIN_LOCKOUT_MINUTES = 15


def _issue_auth_response(user):
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

    profile = None
    if user.user_type == 'creator' and user.creator_profile:
        profile = user.creator_profile.to_dict()
    elif user.user_type == 'brand' and user.brand_profile:
        profile = user.brand_profile.to_dict()

    return {
        'access_token': access_token,
        'refresh_token': refresh_token,
        'user': user.to_dict(),
        'profile': profile
    }


def _has_active_paid_subscription(user):
    now = datetime.utcnow()
    if user.user_type == 'brand':
        subscription = Subscription.query.join(SubscriptionPlan).filter(
            Subscription.user_id == user.id,
            Subscription.status == 'active',
            SubscriptionPlan.price_monthly > 0,
        ).order_by(Subscription.created_at.desc()).first()
        return bool(subscription and subscription.is_active())

    if user.user_type == 'creator' and user.creator_profile:
        creator_subscription = CreatorSubscription.query.join(CreatorSubscriptionPlan).filter(
            CreatorSubscription.creator_id == user.creator_profile.id,
            CreatorSubscription.status == 'active',
            CreatorSubscription.payment_verified == True,
            CreatorSubscriptionPlan.price > 0,
            CreatorSubscription.end_date > now,
        ).first()
        if creator_subscription:
            return True

        subscription = Subscription.query.join(SubscriptionPlan).filter(
            Subscription.user_id == user.id,
            Subscription.status == 'active',
            SubscriptionPlan.price_monthly > 0,
        ).order_by(Subscription.created_at.desc()).first()
        return bool(subscription and subscription.is_active())

    return False


def _reset_login_security(user):
    user.failed_login_attempts = 0
    user.locked_until = None


def _register_failed_login(user):
    user.failed_login_attempts = (user.failed_login_attempts or 0) + 1
    if user.failed_login_attempts >= MAX_FAILED_LOGIN_ATTEMPTS:
        user.locked_until = datetime.utcnow() + timedelta(minutes=LOGIN_LOCKOUT_MINUTES)
    db.session.commit()


def _login_locked_response(user):
    now = datetime.utcnow()
    if user.locked_until and user.locked_until > now:
        minutes = max(1, int((user.locked_until - now).total_seconds() // 60) + 1)
        return jsonify({
            'error': f'Too many failed login attempts. Try again in {minutes} minutes.',
            'locked_until': user.locked_until.isoformat(),
        }), 429
    if user.locked_until and user.locked_until <= now:
        _reset_login_security(user)
        db.session.commit()
    return None


def _parse_optional_int(value):
    if value in [None, '', 'null', 'undefined']:
        return None
    if isinstance(value, int):
        return value
    if isinstance(value, str):
        cleaned = value.strip().lower()
        if not cleaned:
            return None
        workspace_ranges = {
            '1-2': 2,
            '3-5': 5,
            '5-10': 10,
            'more-than-10': 11,
            'more_than_10': 11,
        }
        if cleaned in workspace_ranges:
            return workspace_ranges[cleaned]
        try:
            return int(cleaned)
        except ValueError:
            return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


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

        # Store phone number if provided
        if data.get('phone_number'):
            user.phone_number = data['phone_number']

        # Create creator profile with username
        creator_profile = CreatorProfile(
            user_id=user.id,
            username=username
        )
        db.session.add(creator_profile)
        attach_referral(user, data.get('referral_code'))

        # Assign free creator subscription plan
        free_plan = SubscriptionPlan.query.filter_by(
            user_type='creator',
            price_monthly=0
        ).first()

        if free_plan:
            free_subscription = Subscription(
                user_id=user.id,
                plan_id=free_plan.id,
                status='active',
                billing_cycle='monthly',
                payment_method='free'
            )
            free_subscription.set_billing_period('monthly')
            free_subscription.last_payment_date = datetime.utcnow()
            db.session.add(free_subscription)

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

        account_type = data.get('account_type', 'brand')
        if account_type not in ['brand', 'agency', 'enterprise']:
            return jsonify({'error': 'Invalid account type'}), 400

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
            company_name=data['company_name'],
            account_type=account_type,
            expected_workspace_count=_parse_optional_int(data.get('expected_workspace_count'))
        )
        db.session.add(brand_profile)
        attach_referral(user, data.get('referral_code'))

        # Assign free brand subscription plan
        free_plan = SubscriptionPlan.query.filter_by(
            user_type='brand',
            price_monthly=0
        ).first()

        if free_plan:
            free_subscription = Subscription(
                user_id=user.id,
                plan_id=free_plan.id,
                status='active',
                billing_cycle='monthly',
                payment_method='free'
            )
            free_subscription.set_billing_period('monthly')
            free_subscription.last_payment_date = datetime.utcnow()
            db.session.add(free_subscription)

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
        current_app.logger.exception('Brand registration failed')
        return jsonify({'error': 'Registration failed. Please check your details and try again.'}), 500


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
        if not user:
            return jsonify({'error': 'Invalid email or password'}), 401

        locked_response = _login_locked_response(user)
        if locked_response:
            return locked_response

        if not user.check_password(data['password']):
            _register_failed_login(user)
            remaining = max(0, MAX_FAILED_LOGIN_ATTEMPTS - (user.failed_login_attempts or 0))
            if user.locked_until and user.locked_until > datetime.utcnow():
                return _login_locked_response(user)
            return jsonify({
                'error': 'Invalid email or password',
                'attempts_remaining': remaining
            }), 401

        # Check if user is active
        if not user.is_active:
            return jsonify({'error': 'Account is deactivated'}), 403

        # Check if user has verified their email (skip for Google OAuth users)
        if not user.is_verified and not user.google_oauth_id:
            return jsonify({
                'error': 'Please verify your email before logging in',
                'requires_verification': True,
                'email': user.email
            }), 403

        _reset_login_security(user)

        if user.two_factor_enabled:
            if not _has_active_paid_subscription(user):
                user.two_factor_enabled = False
            else:
                OTP.query.filter_by(
                    user_id=user.id,
                    purpose='login_2fa',
                    is_used=False
                ).update({'is_used': True})
                otp = OTP(user_id=user.id, purpose='login_2fa', expiry_minutes=10)
                db.session.add(otp)
                db.session.commit()
                send_two_factor_code_email(user.email, otp.code)
                return jsonify({
                    'requires_2fa': True,
                    'message': 'A login verification code has been sent to your email.',
                    'email': user.email
                }), 200

        # Update last login
        user.update_last_login()
        db.session.commit()

        return jsonify(_issue_auth_response(user)), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/login/verify-2fa', methods=['POST'])
def verify_login_two_factor():
    """Verify email 2FA code and complete login."""
    try:
        data = request.get_json() or {}
        email = (data.get('email') or '').lower()
        code = data.get('code')
        if not email or not code:
            return jsonify({'error': 'Email and code are required'}), 400

        user = User.query.filter_by(email=email).first()
        if not user:
            return jsonify({'error': 'Invalid verification code'}), 400
        if not user.is_active:
            return jsonify({'error': 'Account is deactivated'}), 403

        otp = OTP.query.filter_by(
            user_id=user.id,
            code=code,
            purpose='login_2fa',
            is_used=False
        ).order_by(OTP.created_at.desc()).first()

        if not otp or not otp.is_valid():
            return jsonify({'error': 'Invalid or expired verification code'}), 400

        otp.mark_as_used()
        _reset_login_security(user)
        user.update_last_login()
        db.session.commit()

        return jsonify(_issue_auth_response(user)), 200

    except Exception as e:
        db.session.rollback()
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
        mark_referral_activated(user.id)

        # Mark OTP as used
        otp.mark_as_used()

        db.session.commit()
        send_welcome_email(user)

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
        _reset_login_security(user)
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
            'profile': profile,
            'security': {
                'can_enable_2fa': _has_active_paid_subscription(user),
                'two_factor_enabled': bool(user.two_factor_enabled),
            }
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/security', methods=['PUT'])
@jwt_required()
def update_security_settings():
    """Update user account security settings."""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404

        data = request.get_json() or {}
        if 'two_factor_enabled' in data:
            enabled = bool(data.get('two_factor_enabled'))
            if enabled and not _has_active_paid_subscription(user):
                return jsonify({'error': 'Email 2FA is available for paid tier users only'}), 403
            user.two_factor_enabled = enabled

        user.updated_at = datetime.utcnow()
        db.session.commit()

        return jsonify({
            'message': 'Security settings updated',
            'user': user.to_dict(),
            'security': {
                'can_enable_2fa': _has_active_paid_subscription(user),
                'two_factor_enabled': bool(user.two_factor_enabled),
            }
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    """Logout (client-side token removal)"""
    # JWT tokens are stateless, so logout is handled client-side
    # This endpoint exists for consistency and future token blacklisting
    return jsonify({'message': 'Logged out successfully'}), 200


@bp.route('/google/creator', methods=['POST'])
def google_creator_auth():
    """
    Google OAuth for creators.
    Accepts a Google ID token from the frontend, verifies it,
    then either logs in existing user or creates a new one.

    For NEW users: returns needs_profile_completion=True + temp_token
    For EXISTING users: returns full auth tokens (access_token, refresh_token)
    """
    try:
        from google.oauth2 import id_token
        from google.auth.transport import requests as google_requests
        import os

        data = request.get_json()
        credential = data.get('credential')  # Google ID token
        referral_code = data.get('referral_code')

        if not credential:
            return jsonify({'error': 'Google credential is required'}), 400

        google_client_id = os.environ.get('GOOGLE_CLIENT_ID')
        if not google_client_id:
            return jsonify({'error': 'Google OAuth not configured'}), 500

        # Verify the Google ID token
        try:
            id_info = id_token.verify_oauth2_token(
                credential,
                google_requests.Request(),
                google_client_id
            )
        except ValueError as e:
            return jsonify({'error': f'Invalid Google token: {str(e)}'}), 401

        google_id = id_info.get('sub')
        email = id_info.get('email', '').lower()
        google_name = id_info.get('name', '')
        google_picture = id_info.get('picture', '')

        if not email or not google_id:
            return jsonify({'error': 'Could not retrieve email from Google'}), 400

        # Check if user already exists by google_oauth_id
        user = User.query.filter_by(google_oauth_id=google_id).first()

        # Check if user exists by email (linked account)
        if not user:
            user = User.query.filter_by(email=email).first()
            if user:
                # Link Google account to existing user
                user.google_oauth_id = google_id
                if google_picture:
                    user.google_profile_picture = google_picture
                db.session.commit()

        if user:
            # Existing user - log them in directly
            if not user.is_active:
                return jsonify({'error': 'Account is deactivated'}), 403

            if user.user_type != 'creator':
                return jsonify({'error': 'This account is not a creator account'}), 403

            user.update_last_login()
            db.session.commit()

            claims = {
                'user_type': user.user_type,
                'is_admin': user.is_admin,
                'admin_role': user.admin_role if user.is_admin else None
            }
            access_token = create_access_token(identity=str(user.id), additional_claims=claims)
            refresh_token = create_refresh_token(identity=str(user.id))

            profile = user.creator_profile.to_dict() if user.creator_profile else None

            return jsonify({
                'access_token': access_token,
                'refresh_token': refresh_token,
                'user': user.to_dict(),
                'profile': profile,
                'needs_profile_completion': False
            }), 200

        else:
            # New user - create account but needs profile completion
            # Create a temporary token for the profile completion step
            import secrets as secrets_module
            temp_token = secrets_module.token_urlsafe(32)

            # Store pending Google registration in a simple way using a temp token
            # We'll create the user record but mark as needing profile completion
            # Use a placeholder password hash since it's a Google user
            new_user = User(
                email=email,
                user_type='creator',
                google_oauth_id=google_id,
                google_profile_picture=google_picture
            )
            new_user.is_verified = True  # Google email is already verified
            db.session.add(new_user)
            db.session.flush()

            # Create empty creator profile
            creator_profile = CreatorProfile(user_id=new_user.id)
            db.session.add(creator_profile)
            attach_referral(new_user, referral_code)

            # Assign free creator subscription plan
            free_plan = SubscriptionPlan.query.filter_by(
                user_type='creator',
                price_monthly=0
            ).first()

            if free_plan:
                free_subscription = Subscription(
                    user_id=new_user.id,
                    plan_id=free_plan.id,
                    status='active',
                    billing_cycle='monthly',
                    payment_method='free'
                )
                free_subscription.set_billing_period('monthly')
                free_subscription.last_payment_date = datetime.utcnow()
                db.session.add(free_subscription)

            db.session.commit()

            # Issue a temp access token for the profile completion step
            claims = {
                'user_type': 'creator',
                'is_admin': False,
                'admin_role': None,
                'needs_profile_completion': True
            }
            temp_access_token = create_access_token(
                identity=str(new_user.id),
                additional_claims=claims
            )

            return jsonify({
                'needs_profile_completion': True,
                'temp_token': temp_access_token,
                'user': new_user.to_dict(),
                'google_name': google_name,
                'google_email': email
            }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/google/complete-profile', methods=['POST'])
@jwt_required()
def google_complete_profile():
    """
    Complete profile for Google OAuth new creator.
    Called after new Google signup to set username, password, and phone number.
    """
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if not user:
            return jsonify({'error': 'User not found'}), 404

        if user.user_type != 'creator':
            return jsonify({'error': 'Only creators can use this endpoint'}), 403

        data = request.get_json()
        username = data.get('username', '').strip()
        password = data.get('password', '')
        phone_number = data.get('phone_number', '').strip()

        # Validate username
        if not username or len(username) < 3:
            return jsonify({'error': 'Username must be at least 3 characters'}), 400
        if len(username) > 30:
            return jsonify({'error': 'Username must be less than 30 characters'}), 400
        if not re.match(r'^[a-zA-Z0-9_]+$', username):
            return jsonify({'error': 'Username can only contain letters, numbers, and underscores'}), 400

        # Check username availability
        existing = CreatorProfile.query.filter_by(username=username).first()
        if existing and existing.user_id != user_id:
            return jsonify({'error': 'Username already taken'}), 409

        # Validate password
        if not password or len(password) < 8:
            return jsonify({'error': 'Password must be at least 8 characters'}), 400

        # Validate phone
        if not phone_number:
            return jsonify({'error': 'Phone number is required'}), 400

        # Update user
        user.set_password(password)
        user.phone_number = phone_number
        mark_referral_activated(user.id)

        # Update creator profile username
        if user.creator_profile:
            user.creator_profile.username = username
        else:
            profile = CreatorProfile(user_id=user.id, username=username)
            db.session.add(profile)

        db.session.commit()

        # Issue full auth tokens
        claims = {
            'user_type': user.user_type,
            'is_admin': user.is_admin,
            'admin_role': user.admin_role if user.is_admin else None
        }
        access_token = create_access_token(identity=str(user.id), additional_claims=claims)
        refresh_token = create_refresh_token(identity=str(user.id))

        profile = user.creator_profile.to_dict() if user.creator_profile else None

        return jsonify({
            'access_token': access_token,
            'refresh_token': refresh_token,
            'user': user.to_dict(),
            'profile': profile,
            'message': 'Profile completed successfully'
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
