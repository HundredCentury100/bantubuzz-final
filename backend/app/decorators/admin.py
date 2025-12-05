"""
Admin authorization decorators for BantuBuzz API
"""
from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
from app.models import User


def admin_required(fn):
    """
    Decorator to require admin access for a route.
    Checks if the user is authenticated and has is_admin flag set to True.
    """
    @wraps(fn)
    def wrapper(*args, **kwargs):
        try:
            verify_jwt_in_request()
            current_user_id = get_jwt_identity()
            user = User.query.get(current_user_id)

            if not user:
                return jsonify({'error': 'User not found'}), 404

            if not user.is_admin:
                return jsonify({'error': 'Admin access required'}), 403

            if not user.is_active:
                return jsonify({'error': 'Account is suspended'}), 403

            return fn(*args, **kwargs)

        except Exception as e:
            return jsonify({'error': 'Unauthorized', 'message': str(e)}), 401

    return wrapper


def role_required(*allowed_roles):
    """
    Decorator to require specific admin role for a route.
    Usage: @role_required('super_admin', 'finance')

    Admin roles:
    - super_admin: Full access to everything
    - moderator: User management, content moderation
    - support: Support tickets, user communication
    - finance: Payments, cashouts, financial reports
    """
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            try:
                verify_jwt_in_request()
                current_user_id = get_jwt_identity()
                user = User.query.get(current_user_id)

                if not user:
                    return jsonify({'error': 'User not found'}), 404

                if not user.is_admin:
                    return jsonify({'error': 'Admin access required'}), 403

                if not user.is_active:
                    return jsonify({'error': 'Account is suspended'}), 403

                # Super admin has access to everything
                if user.admin_role == 'super_admin':
                    return fn(*args, **kwargs)

                # Check if user's role is in allowed roles
                if user.admin_role not in allowed_roles:
                    return jsonify({
                        'error': 'Insufficient permissions',
                        'message': f'Required role: {", ".join(allowed_roles)}',
                        'your_role': user.admin_role
                    }), 403

                return fn(*args, **kwargs)

            except Exception as e:
                return jsonify({'error': 'Unauthorized', 'message': str(e)}), 401

        return wrapper
    return decorator
