"""
Admin User Management routes - Verify, suspend, manage users
"""
from flask import jsonify, request
from sqlalchemy import or_
from app import db
from app.models import User, CreatorProfile, BrandProfile, Notification
from app.decorators.admin import admin_required, role_required
from . import bp


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
