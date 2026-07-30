"""
Admin User Management routes - Verify, suspend, manage users
"""
from datetime import datetime, timedelta
from decimal import Decimal, InvalidOperation
from flask import jsonify, request
from flask_jwt_extended import get_jwt_identity
from sqlalchemy import or_
from app import db
from app.models import (
    AccountFeeOverride,
    AdminActivityLog,
    Notification,
    Subscription,
    SubscriptionPlan,
    User,
)
from app.decorators.admin import admin_required, role_required
from app.services.brand_wallet_service import credit_brand_wallet, get_wallet_statistics
from . import bp


CREATOR_ADMIN_BADGES = {
    'top_creator': 'Top Creator',
}


def _current_admin_id():
    try:
        return int(get_jwt_identity())
    except Exception:
        return None


def _log_admin_action(action_type, target_type, target_id, action_data=None):
    admin_id = _current_admin_id()
    if not admin_id:
        return
    try:
        db.session.add(AdminActivityLog(
            admin_id=admin_id,
            action_type=action_type,
            target_type=target_type,
            target_id=target_id,
            action_data=action_data or {},
            ip_address=request.headers.get('X-Forwarded-For', request.remote_addr),
            user_agent=request.headers.get('User-Agent')
        ))
    except Exception:
        pass


def _parse_optional_datetime(value):
    if not value:
        return None
    if isinstance(value, datetime):
        return value
    text = str(value).replace('Z', '+00:00')
    parsed = datetime.fromisoformat(text)
    if parsed.tzinfo:
        parsed = parsed.replace(tzinfo=None)
    return parsed


def _active_fee_overrides_for_user(user_id):
    now = datetime.utcnow()
    overrides = AccountFeeOverride.query.filter_by(user_id=user_id).order_by(
        AccountFeeOverride.created_at.desc()
    ).all()
    data = []
    for override in overrides:
        item = override.to_dict()
        item['is_current'] = override.is_current(now)
        data.append(item)
    return data


def _admin_control_summary(user):
    summary = {
        'fee_overrides': _active_fee_overrides_for_user(user.id),
    }

    subscription = Subscription.query.filter_by(user_id=user.id, status='active').first()
    summary['active_subscription'] = subscription.to_dict() if subscription else None

    if user.user_type == 'brand':
        try:
            summary['brand_wallet'] = get_wallet_statistics(user.id)['wallet']
        except Exception:
            summary['brand_wallet'] = None

    if user.user_type == 'creator' and user.creator_profile:
        badges = user.creator_profile.leaderboard_badges or []
        summary['creator_badges'] = {
            'leaderboard_badges': badges,
            'is_top_creator': 'top_creator' in badges,
        }

    return summary


@bp.route('/users', methods=['GET'])
@admin_required
def get_users():
    """
    Get list of all users with filtering and pagination
    Query params:
        - user_type: creator, brand, admin
        - is_verified: true, false
        - is_active: true, false
        - search: search by email or name
        - page: page number
        - per_page: items per page
    """
    try:
        # Get query parameters
        user_type = request.args.get('user_type') or None
        is_verified = request.args.get('is_verified') or None
        is_active = request.args.get('is_active') or None
        search = request.args.get('search', '').strip()
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)

        # Base query
        query = User.query

        # Apply filters (only if values are not empty)
        if user_type:
            query = query.filter(User.user_type == user_type)

        if is_verified:
            verified_bool = is_verified.lower() == 'true'
            query = query.filter(User.is_verified == verified_bool)

        if is_active:
            active_bool = is_active.lower() == 'true'
            query = query.filter(User.is_active == active_bool)

        if search:
            query = query.filter(
                or_(
                    User.email.ilike(f'%{search}%')
                )
            )

        # Order by creation date
        query = query.order_by(User.created_at.desc())

        # Paginate
        paginated = query.paginate(page=page, per_page=per_page, error_out=False)

        users_data = []
        for user in paginated.items:
            user_dict = user.to_dict()

            # Add profile info
            if user.user_type == 'creator' and user.creator_profile:
                user_dict['profile'] = {
                    'username': user.creator_profile.username,
                    'profile_picture': user.creator_profile.profile_picture,
                    'categories': user.creator_profile.categories
                }
            elif user.user_type == 'brand' and user.brand_profile:
                user_dict['profile'] = {
                    'company_name': user.brand_profile.company_name,
                    'logo': user.brand_profile.logo
                }

            users_data.append(user_dict)

        return jsonify({
            'success': True,
            'data': {
                'users': users_data,
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
            'error': 'Failed to fetch users',
            'message': str(e)
        }), 500


@bp.route('/users/<int:user_id>', methods=['GET'])
@admin_required
def get_user_details(user_id):
    """Get detailed information about a specific user"""
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404

        user_data = user.to_dict()

        # Add profile details
        if user.user_type == 'creator' and user.creator_profile:
            user_data['creator_profile'] = user.creator_profile.to_dict()
        elif user.user_type == 'brand' and user.brand_profile:
            user_data['brand_profile'] = user.brand_profile.to_dict()

        user_data['admin_controls'] = _admin_control_summary(user)

        return jsonify({
            'success': True,
            'data': user_data
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Failed to fetch user details',
            'message': str(e)
        }), 500


@bp.route('/users/<int:user_id>/creator-controls', methods=['PUT'])
@admin_required
def update_creator_controls(user_id):
    """Grant creator badges/status and creator account tier from admin."""
    try:
        user = User.query.get(user_id)
        if not user or user.user_type != 'creator' or not user.creator_profile:
            return jsonify({'success': False, 'error': 'Creator account not found'}), 404

        data = request.get_json() or {}
        creator = user.creator_profile

        if 'is_verified' in data:
            creator.is_verified = bool(data.get('is_verified'))
            creator.verified_at = datetime.utcnow() if creator.is_verified and not creator.verified_at else creator.verified_at
            user.is_verified = bool(data.get('is_verified'))

        if 'is_top_creator' in data:
            badges = creator.leaderboard_badges or []
            badges = [badge for badge in badges if badge != 'top_creator']
            if data.get('is_top_creator'):
                badges.insert(0, 'top_creator')
            creator.leaderboard_badges = badges[:3]

        plan_slug = data.get('plan_slug')
        if plan_slug:
            if plan_slug not in ['rising', 'pro-creator', 'creator-free']:
                return jsonify({'success': False, 'error': 'Invalid creator plan'}), 400

            plan = SubscriptionPlan.query.filter_by(slug=plan_slug, user_type='creator', is_active=True).first()
            if not plan:
                return jsonify({'success': False, 'error': 'Creator plan not found'}), 404

            duration_days = int(data.get('duration_days') or 30)
            if duration_days <= 0:
                return jsonify({'success': False, 'error': 'duration_days must be greater than zero'}), 400

            existing = Subscription.query.filter_by(user_id=user.id, status='active').first()
            if not existing:
                existing = Subscription(user_id=user.id, plan_id=plan.id, status='active')
                db.session.add(existing)

            existing.plan_id = plan.id
            existing.status = 'active'
            existing.billing_cycle = data.get('billing_cycle') or 'monthly'
            existing.payment_method = 'admin_grant'
            existing.payment_status = 'verified'
            existing.payment_verified = True
            existing.current_period_start = datetime.utcnow()
            existing.current_period_end = datetime.utcnow() + timedelta(days=duration_days)
            existing.next_payment_date = existing.current_period_end
            existing.last_payment_date = datetime.utcnow()
            existing.last_payment_amount = 0
            existing.auto_renew = False
            existing.admin_note = data.get('reason') or 'Creator plan granted by admin'
            existing.modified_by_admin = _current_admin_id()

        _log_admin_action('creator_controls_updated', 'user', user.id, {
            'is_verified': data.get('is_verified'),
            'is_top_creator': data.get('is_top_creator'),
            'plan_slug': plan_slug,
            'reason': data.get('reason'),
        })

        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Creator controls updated',
            'data': {
                **user.to_dict(),
                'admin_controls': _admin_control_summary(user),
            }
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': 'Failed to update creator controls', 'message': str(e)}), 500


@bp.route('/users/<int:user_id>/fund-wallet', methods=['POST'])
@admin_required
def admin_fund_brand_wallet(user_id):
    """Credit a brand wallet from admin controls."""
    try:
        user = User.query.get(user_id)
        if not user or user.user_type != 'brand':
            return jsonify({'success': False, 'error': 'Brand account not found'}), 404

        data = request.get_json() or {}
        try:
            amount = Decimal(str(data.get('amount')))
        except (InvalidOperation, TypeError):
            return jsonify({'success': False, 'error': 'A valid amount is required'}), 400

        if amount <= 0:
            return jsonify({'success': False, 'error': 'Amount must be greater than zero'}), 400

        reason = (data.get('reason') or 'Admin wallet funding').strip()
        reference = (data.get('reference') or f'ADMIN-FUND-{datetime.utcnow().strftime("%Y%m%d%H%M%S")}').strip()
        admin_id = _current_admin_id()

        transaction = credit_brand_wallet(
            user.id,
            float(amount),
            reason,
            metadata={
                'reference': reference,
                'funded_by_admin': admin_id,
                'reason': reason,
            },
            admin_id=admin_id,
        )
        _log_admin_action('brand_wallet_funded', 'user', user.id, {
            'amount': float(amount),
            'reference': reference,
            'reason': reason,
            'transaction_id': transaction.id,
        })
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Brand wallet funded',
            'data': {
                'transaction': transaction.to_dict(),
                'wallet': get_wallet_statistics(user.id)['wallet'],
            }
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': 'Failed to fund brand wallet', 'message': str(e)}), 500


@bp.route('/users/<int:user_id>/fee-overrides', methods=['POST'])
@admin_required
def create_fee_override(user_id):
    """Create or replace an active commission/service-fee override."""
    try:
        user = User.query.get(user_id)
        if not user or user.user_type not in ['creator', 'brand']:
            return jsonify({'success': False, 'error': 'User account not found'}), 404

        data = request.get_json() or {}
        override_type = data.get('override_type')
        allowed = {
            'creator': ['creator_commission'],
            'brand': ['brand_service_fee', 'brand_platform_fee'],
        }[user.user_type]
        if override_type not in allowed:
            return jsonify({'success': False, 'error': f'override_type must be one of: {", ".join(allowed)}'}), 400

        try:
            percentage = Decimal(str(data.get('percentage')))
        except (InvalidOperation, TypeError):
            return jsonify({'success': False, 'error': 'A valid percentage is required'}), 400

        if percentage < 0 or percentage > 100:
            return jsonify({'success': False, 'error': 'Percentage must be between 0 and 100'}), 400

        starts_at = _parse_optional_datetime(data.get('starts_at')) or datetime.utcnow()
        ends_at = _parse_optional_datetime(data.get('ends_at'))
        duration_days = data.get('duration_days')
        if not ends_at and duration_days:
            ends_at = starts_at + timedelta(days=int(duration_days))

        if ends_at and ends_at <= starts_at:
            return jsonify({'success': False, 'error': 'ends_at must be after starts_at'}), 400

        AccountFeeOverride.query.filter_by(
            user_id=user.id,
            override_type=override_type,
            is_active=True,
        ).update({'is_active': False, 'updated_at': datetime.utcnow()})

        override = AccountFeeOverride(
            user_id=user.id,
            override_type=override_type,
            percentage=percentage,
            starts_at=starts_at,
            ends_at=ends_at,
            reason=data.get('reason'),
            created_by_admin_id=_current_admin_id(),
        )
        db.session.add(override)
        _log_admin_action('fee_override_created', 'user', user.id, override.to_dict())
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Fee override saved',
            'data': override.to_dict(),
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': 'Failed to save fee override', 'message': str(e)}), 500


@bp.route('/users/<int:user_id>/fee-overrides/<int:override_id>', methods=['DELETE'])
@admin_required
def deactivate_fee_override(user_id, override_id):
    """Deactivate an admin fee override."""
    try:
        override = AccountFeeOverride.query.filter_by(id=override_id, user_id=user_id).first()
        if not override:
            return jsonify({'success': False, 'error': 'Fee override not found'}), 404

        override.is_active = False
        override.updated_at = datetime.utcnow()
        _log_admin_action('fee_override_deactivated', 'user', user_id, override.to_dict())
        db.session.commit()

        return jsonify({'success': True, 'message': 'Fee override deactivated'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': 'Failed to deactivate fee override', 'message': str(e)}), 500


@bp.route('/users/<int:user_id>/verify', methods=['PUT'])
@admin_required
def verify_user(user_id):
    """Verify a user account"""
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404

        user.is_verified = True
        db.session.commit()

        # Send notification
        notification = Notification(
            user_id=user_id,
            title='Account Verified',
            message='Your account has been verified! You now have full access to all platform features.',
            type='success'
        )
        db.session.add(notification)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': f'User {user.email} has been verified',
            'data': user.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': 'Failed to verify user',
            'message': str(e)
        }), 500


@bp.route('/users/<int:user_id>/unverify', methods=['PUT'])
@admin_required
def unverify_user(user_id):
    """Remove verification from a user account"""
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404

        user.is_verified = False
        db.session.commit()

        # Send notification
        notification = Notification(
            user_id=user_id,
            title='Verification Removed',
            message='Your account verification has been removed. Please contact support for more information.',
            type='warning'
        )
        db.session.add(notification)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': f'Verification removed from {user.email}',
            'data': user.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': 'Failed to unverify user',
            'message': str(e)
        }), 500


@bp.route('/users/<int:user_id>/activate', methods=['PUT'])
@admin_required
def activate_user(user_id):
    """Activate a suspended user account"""
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404

        user.is_active = True
        db.session.commit()

        # Send notification
        notification = Notification(
            user_id=user_id,
            title='Account Activated',
            message='Your account has been reactivated. You can now log in and use all platform features.',
            type='success'
        )
        db.session.add(notification)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': f'User {user.email} has been activated',
            'data': user.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': 'Failed to activate user',
            'message': str(e)
        }), 500


@bp.route('/users/<int:user_id>/deactivate', methods=['PUT'])
@admin_required
def deactivate_user(user_id):
    """Deactivate/suspend a user account"""
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404

        reason = request.json.get('reason', 'Account suspended by administrator')

        user.is_active = False
        db.session.commit()

        # Send notification
        notification = Notification(
            user_id=user_id,
            title='Account Suspended',
            message=f'Your account has been suspended. Reason: {reason}. Please contact support.',
            type='error'
        )
        db.session.add(notification)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': f'User {user.email} has been deactivated',
            'data': user.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': 'Failed to deactivate user',
            'message': str(e)
        }), 500


@bp.route('/users/<int:user_id>', methods=['DELETE'])
@role_required('super_admin')
def delete_user(user_id):
    """Delete a user account (super admin only)"""
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404

        # Check for active collaborations
        if user.user_type == 'creator' and user.creator_profile:
            from app.models import Collaboration
            active_collabs = Collaboration.query.filter_by(
                creator_id=user.creator_profile.id,
                status='in_progress'
            ).count()

            if active_collabs > 0:
                return jsonify({
                    'error': 'Cannot delete user',
                    'message': f'User has {active_collabs} active collaborations. Suspend account instead or complete collaborations first.'
                }), 400

        elif user.user_type == 'brand' and user.brand_profile:
            from app.models import Collaboration
            active_collabs = Collaboration.query.filter_by(
                brand_id=user.brand_profile.id,
                status='in_progress'
            ).count()

            if active_collabs > 0:
                return jsonify({
                    'error': 'Cannot delete user',
                    'message': f'User has {active_collabs} active collaborations. Suspend account instead or complete collaborations first.'
                }), 400

        # Check for pending cashouts
        if user.user_type == 'creator':
            from app.models import CashoutRequest, Wallet
            pending_cashouts = CashoutRequest.query.join(Wallet).filter(
                Wallet.user_id == user_id,
                CashoutRequest.status == 'pending'
            ).count()

            if pending_cashouts > 0:
                return jsonify({
                    'error': 'Cannot delete user',
                    'message': f'User has {pending_cashouts} pending cashout requests. Process or reject them first.'
                }), 400

        email = user.email
        db.session.delete(user)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': f'User {email} has been permanently deleted'
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': 'Failed to delete user',
            'message': str(e)
        }), 500
