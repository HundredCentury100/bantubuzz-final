import os
import uuid
from datetime import datetime

from flask import Blueprint, current_app, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename
from app import db
from app.models import Message, PushSubscription, User, UserBlock
from app.services.workspace_service import get_request_workspace_id, require_workspace_access

bp = Blueprint('messages', __name__)


ALLOWED_MESSAGE_EXTENSIONS = {
    'png', 'jpg', 'jpeg', 'gif', 'webp',
    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'txt',
    'mp4', 'mov', 'webm'
}
IMAGE_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}


def _allowed_message_file(filename):
    return (
        filename
        and '.' in filename
        and filename.rsplit('.', 1)[1].lower() in ALLOWED_MESSAGE_EXTENSIONS
    )


def _attachment_type(filename, mimetype):
    extension = filename.rsplit('.', 1)[1].lower() if '.' in filename else ''
    if extension in IMAGE_EXTENSIONS or (mimetype or '').startswith('image/'):
        return 'image'
    return 'file'


def _message_payload_from_request(data):
    message_type = data.get('message_type') or 'text'
    content = (data.get('content') or '').strip()
    attachment_url = data.get('attachment_url')
    attachment_name = data.get('attachment_name')
    link_url = (data.get('link_url') or '').strip()

    if message_type in ['image', 'file'] and not attachment_url:
        raise ValueError('attachment_url is required for file and image messages')
    if message_type == 'content_link' and not link_url:
        raise ValueError('link_url is required for content link messages')
    if not content and message_type == 'text':
        raise ValueError('content is required')

    return {
        'message_type': message_type,
        'content': content or attachment_name or link_url or '',
        'attachment_url': attachment_url,
        'attachment_type': data.get('attachment_type'),
        'attachment_name': attachment_name,
        'attachment_mime_type': data.get('attachment_mime_type'),
        'attachment_size': data.get('attachment_size'),
        'link_url': link_url or None,
        'link_title': data.get('link_title'),
        'link_description': data.get('link_description'),
        'link_image': data.get('link_image'),
    }


def _messaging_block_status(user_id, other_user_id):
    blocked_by_me = UserBlock.query.filter_by(
        blocker_user_id=user_id,
        blocked_user_id=other_user_id,
        is_active=True,
    ).first() is not None
    blocked_me = UserBlock.query.filter_by(
        blocker_user_id=other_user_id,
        blocked_user_id=user_id,
        is_active=True,
    ).first() is not None
    return blocked_by_me, blocked_me


def _resolve_message_workspace(user_id, data=None):
    workspace_id = get_request_workspace_id(data)
    if not workspace_id:
        return None, None

    _, workspace_error, workspace_status = require_workspace_access(user_id, workspace_id)
    if workspace_error:
        return None, (jsonify({'error': workspace_error}), workspace_status)

    return workspace_id, None


def _scope_message_query(query, workspace_id):
    if workspace_id:
        return query.filter(Message.workspace_id == workspace_id)
    return query


@bp.route('/', methods=['GET'])
@jwt_required()
def get_messages():
    """Get messages for current user"""
    try:
        user_id = int(get_jwt_identity())
        other_user_id = request.args.get('user_id', type=int)
        booking_id = request.args.get('booking_id', type=int)
        workspace_id, workspace_response = _resolve_message_workspace(user_id)
        if workspace_response:
            return workspace_response

        query = Message.query.filter(
            (Message.sender_id == user_id) | (Message.receiver_id == user_id)
        )
        query = _scope_message_query(query, workspace_id)

        if other_user_id:
            query = query.filter(
                ((Message.sender_id == user_id) & (Message.receiver_id == other_user_id)) |
                ((Message.sender_id == other_user_id) & (Message.receiver_id == user_id))
            )

        if booking_id:
            query = query.filter_by(booking_id=booking_id)

        messages = query.order_by(Message.created_at.asc()).all()
        return jsonify({'messages': [msg.to_dict() for msg in messages]}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/', methods=['POST'])
@jwt_required()
def send_message():
    """Send a new message"""
    try:
        user_id = int(get_jwt_identity())
        data = request.get_json() or {}
        workspace_id, workspace_response = _resolve_message_workspace(user_id, data)
        if workspace_response:
            return workspace_response

        if 'receiver_id' not in data:
            return jsonify({'error': 'Missing receiver_id'}), 400

        receiver_id = int(data['receiver_id'])
        blocked_by_me, blocked_me = _messaging_block_status(user_id, receiver_id)
        if blocked_by_me:
            return jsonify({'error': 'You have blocked this user. Unblock them before sending messages.'}), 403
        if blocked_me:
            return jsonify({'error': 'You cannot message this user.'}), 403

        try:
            payload = _message_payload_from_request(data)
        except ValueError as exc:
            return jsonify({'error': str(exc)}), 400

        message = Message(
            sender_id=user_id,
            receiver_id=receiver_id,
            workspace_id=workspace_id,
            booking_id=data.get('booking_id'),
            **payload
        )

        db.session.add(message)
        db.session.commit()

        try:
            from app.services.creator_score_service import queue_creator_score_recalculation
            sender = User.query.get(int(user_id))
            receiver = User.query.get(receiver_id)
            if sender and sender.user_type == 'creator' and sender.creator_profile:
                queue_creator_score_recalculation(sender.creator_profile.id)
            if receiver and receiver.user_type == 'creator' and receiver.creator_profile:
                queue_creator_score_recalculation(receiver.creator_profile.id)
        except Exception:
            pass

        try:
            from app.utils.websocket_helper import emit_message_to_websocket
            emit_message_to_websocket(message, db.session)
        except Exception as websocket_error:
            print(f"Failed to broadcast message via websocket helper: {str(websocket_error)}")

        try:
            from app.services.product_notifications import notify_message_received
            notify_message_received(message)
        except Exception as notification_error:
            print(f"Failed to create message notification: {str(notification_error)}")

        return jsonify({
            'message': 'Message sent successfully',
            'data': message.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:message_id>/read', methods=['PUT'])
@jwt_required()
def mark_as_read(message_id):
    """Mark message as read"""
    try:
        user_id = int(get_jwt_identity())
        workspace_id, workspace_response = _resolve_message_workspace(user_id)
        if workspace_response:
            return workspace_response

        message = Message.query.get(message_id)

        if not message:
            return jsonify({'error': 'Message not found'}), 404

        if message.receiver_id != user_id:
            return jsonify({'error': 'Unauthorized'}), 403
        if workspace_id and message.workspace_id != workspace_id:
            return jsonify({'error': 'Message not found in this workspace'}), 404

        message.is_read = True
        message.read_at = message.read_at or datetime.utcnow()
        db.session.commit()

        return jsonify({
            'message': 'Message marked as read',
            'message_id': message.id,
            'read_at': message.read_at.isoformat() if message.read_at else None,
            'sender_id': message.sender_id
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/read', methods=['POST'])
@jwt_required()
def mark_many_as_read():
    """Mark multiple messages as read for the current user."""
    try:
        user_id = int(get_jwt_identity())
        data = request.get_json() or {}
        workspace_id, workspace_response = _resolve_message_workspace(user_id, data)
        if workspace_response:
            return workspace_response
        message_ids = data.get('messageIds') or data.get('message_ids') or []
        if not isinstance(message_ids, list):
            return jsonify({'error': 'messageIds must be a list'}), 400

        ids = [int(message_id) for message_id in message_ids if str(message_id).isdigit()]
        if not ids:
            return jsonify({'message': 'No messages to mark as read', 'updated': 0}), 200

        read_at = datetime.utcnow()
        update_query = Message.query.filter(
            Message.id.in_(ids),
            Message.receiver_id == user_id,
        )
        update_query = _scope_message_query(update_query, workspace_id)
        updated = update_query.update({'is_read': True, 'read_at': read_at}, synchronize_session=False)
        db.session.commit()

        read_messages_query = Message.query.filter(Message.id.in_(ids))
        read_messages_query = _scope_message_query(read_messages_query, workspace_id)
        read_messages = read_messages_query.all()
        read_by_sender = {}
        for message in read_messages:
            if message.receiver_id == user_id:
                read_by_sender.setdefault(str(message.sender_id), []).append(message.id)

        return jsonify({
            'message': 'Messages marked as read',
            'updated': updated,
            'message_ids': ids,
            'read_at': read_at.isoformat(),
            'read_by_sender': read_by_sender
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/attachments', methods=['POST'])
@jwt_required()
def upload_message_attachment():
    """Upload a message image or file attachment."""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400

        file = request.files['file']
        if not file or file.filename == '':
            return jsonify({'error': 'No file provided'}), 400
        if not _allowed_message_file(file.filename):
            return jsonify({'error': 'File type not allowed'}), 400

        original_name = secure_filename(file.filename)
        extension = original_name.rsplit('.', 1)[1].lower()
        filename = f"{uuid.uuid4().hex}.{extension}"
        upload_dir = os.path.join(current_app.root_path, '..', 'uploads', 'messages')
        os.makedirs(upload_dir, exist_ok=True)
        file_path = os.path.join(upload_dir, filename)
        file.save(file_path)

        relative_url = f'/uploads/messages/{filename}'
        size = os.path.getsize(file_path)
        attachment_type = _attachment_type(original_name, file.mimetype)

        return jsonify({
            'url': relative_url,
            'attachment_url': relative_url,
            'attachment_type': attachment_type,
            'file_name': original_name,
            'attachment_name': original_name,
            'mime_type': file.mimetype,
            'attachment_mime_type': file.mimetype,
            'file_size': size,
            'attachment_size': size,
        }), 201

    except Exception as e:
        current_app.logger.error('Message attachment upload failed: %s', e)
        return jsonify({'error': str(e)}), 500


@bp.route('/push/vapid-public-key', methods=['GET'])
def get_vapid_public_key():
    """Return the configured Web Push public key, if available."""
    public_key = current_app.config.get('VAPID_PUBLIC_KEY') or os.getenv('VAPID_PUBLIC_KEY')
    return jsonify({
        'public_key': public_key,
        'enabled': bool(public_key)
    }), 200


@bp.route('/push-subscriptions', methods=['POST'])
@jwt_required()
def save_push_subscription():
    """Save or update a browser Web Push subscription or native device token."""
    try:
        user_id = int(get_jwt_identity())
        data = request.get_json() or {}
        is_native = bool(data.get('native') or data.get('token'))

        if is_native:
            platform = (data.get('platform') or 'android').lower()
            token = (data.get('token') or '').strip()
            device_id = (data.get('device_id') or '').strip()

            if not token:
                return jsonify({'error': 'Invalid native push token'}), 400

            endpoint = f'native:{platform}:{token}'
            subscription = PushSubscription.query.filter_by(endpoint=endpoint).first()
            if not subscription:
                subscription = PushSubscription(endpoint=endpoint)
                db.session.add(subscription)

            subscription.user_id = user_id
            subscription.p256dh = f'native:{platform}'
            subscription.auth = device_id or 'native'
            subscription.user_agent = request.headers.get('User-Agent')
            subscription.is_active = True
            subscription.updated_at = datetime.utcnow()
            db.session.commit()

            return jsonify({
                'message': 'Native push token saved',
                'subscription': subscription.to_dict()
            }), 201

        endpoint = data.get('endpoint')
        keys = data.get('keys') or {}
        p256dh = keys.get('p256dh')
        auth = keys.get('auth')

        if not endpoint or not p256dh or not auth:
            return jsonify({'error': 'Invalid push subscription'}), 400

        subscription = PushSubscription.query.filter_by(endpoint=endpoint).first()
        if not subscription:
            subscription = PushSubscription(endpoint=endpoint)
            db.session.add(subscription)

        subscription.user_id = user_id
        subscription.p256dh = p256dh
        subscription.auth = auth
        subscription.user_agent = request.headers.get('User-Agent')
        subscription.is_active = True
        subscription.updated_at = datetime.utcnow()
        db.session.commit()

        return jsonify({
            'message': 'Push subscription saved',
            'subscription': subscription.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/push-subscriptions', methods=['DELETE'])
@jwt_required()
def disable_push_subscription():
    """Disable a browser push subscription for the current user."""
    try:
        user_id = int(get_jwt_identity())
        data = request.get_json() or {}
        endpoint = data.get('endpoint')
        if not endpoint:
            return jsonify({'error': 'endpoint is required'}), 400

        updated = PushSubscription.query.filter_by(
            user_id=user_id,
            endpoint=endpoint
        ).update({'is_active': False}, synchronize_session=False)
        db.session.commit()

        return jsonify({'message': 'Push subscription disabled', 'updated': updated}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/conversations', methods=['GET'])
@jwt_required()
def get_conversations():
    """Get all conversations for current user"""
    try:
        user_id = int(get_jwt_identity())
        workspace_id, workspace_response = _resolve_message_workspace(user_id)
        if workspace_response:
            return workspace_response

        # Get unique users the current user has messaged with
        sent = db.session.query(Message.receiver_id).filter_by(sender_id=user_id)
        received = db.session.query(Message.sender_id).filter_by(receiver_id=user_id)
        sent = _scope_message_query(sent, workspace_id).distinct()
        received = _scope_message_query(received, workspace_id).distinct()

        user_ids = set([u[0] for u in sent.all()] + [u[0] for u in received.all()])
        users = User.query.filter(User.id.in_(user_ids)).all()

        conversations = []
        for user in users:
            last_message = Message.query.filter(
                ((Message.sender_id == user_id) & (Message.receiver_id == user.id)) |
                ((Message.sender_id == user.id) & (Message.receiver_id == user_id))
            )
            last_message = _scope_message_query(last_message, workspace_id).order_by(Message.created_at.desc()).first()

            unread_query = Message.query.filter_by(
                sender_id=user.id,
                receiver_id=user_id,
                is_read=False
            )
            unread_count = _scope_message_query(unread_query, workspace_id).count()

            conversations.append({
                'id': user.id,
                'email': user.email,
                'user_type': user.user_type,
                'display_name': (
                    getattr(user.creator_profile, 'display_name', None)
                    if user.creator_profile else None
                ),
                'username': (
                    getattr(user.creator_profile, 'username', None)
                    if user.creator_profile else None
                ),
                'company_name': (
                    getattr(user.brand_profile, 'company_name', None)
                    if user.brand_profile else None
                ),
                'profile_picture': (
                    getattr(user.creator_profile, 'profile_picture', None)
                    if user.creator_profile else None
                ) or (
                    getattr(user.brand_profile, 'logo', None)
                    if user.brand_profile else None
                ),
                'user': user.to_dict(),
                'last_message': last_message.to_dict() if last_message else None,
                'last_message_time': last_message.created_at.isoformat() if last_message else None,
                'unread_count': unread_count
            })

        conversations.sort(
            key=lambda conversation: conversation.get('last_message_time') or '',
            reverse=True,
        )

        return jsonify({'conversations': conversations}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500
