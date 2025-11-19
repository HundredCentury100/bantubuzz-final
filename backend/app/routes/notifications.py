from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import Notification

bp = Blueprint('notifications', __name__)


@bp.route('/', methods=['GET'])
@jwt_required()
def get_notifications():
    """Get notifications for current user"""
    try:
        user_id = get_jwt_identity()
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        unread_only = request.args.get('unread_only', 'false').lower() == 'true'

        query = Notification.query.filter_by(user_id=user_id)

        if unread_only:
            query = query.filter_by(is_read=False)

        pagination = query.order_by(Notification.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )

        notifications = [notif.to_dict() for notif in pagination.items]
        unread_count = Notification.query.filter_by(user_id=user_id, is_read=False).count()

        return jsonify({
            'notifications': notifications,
            'unread_count': unread_count,
            'total': pagination.total,
            'pages': pagination.pages,
            'current_page': page
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:notification_id>/read', methods=['PUT'])
@jwt_required()
def mark_as_read(notification_id):
    """Mark notification as read"""
    try:
        user_id = str(get_jwt_identity())
        notification = Notification.query.get(notification_id)

        if not notification:
            return jsonify({'error': 'Notification not found'}), 404

        if str(notification.user_id) != user_id:
            return jsonify({'error': 'Unauthorized'}), 403

        notification.is_read = True
        db.session.commit()

        return jsonify({'message': 'Notification marked as read'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/mark-all-read', methods=['PUT'])
@jwt_required()
def mark_all_as_read():
    """Mark all notifications as read"""
    try:
        user_id = str(get_jwt_identity())

        Notification.query.filter_by(
            user_id=user_id,
            is_read=False
        ).update({'is_read': True})

        db.session.commit()

        return jsonify({'message': 'All notifications marked as read'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
