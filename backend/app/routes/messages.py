from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import Message, User

bp = Blueprint('messages', __name__)


@bp.route('/', methods=['GET'])
@jwt_required()
def get_messages():
    """Get messages for current user"""
    try:
        user_id = get_jwt_identity()
        other_user_id = request.args.get('user_id', type=int)
        booking_id = request.args.get('booking_id', type=int)

        query = Message.query.filter(
            (Message.sender_id == user_id) | (Message.receiver_id == user_id)
        )

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
        user_id = get_jwt_identity()
        data = request.get_json()

        if not all(field in data for field in ['receiver_id', 'content']):
            return jsonify({'error': 'Missing required fields'}), 400

        message = Message(
            sender_id=user_id,
            receiver_id=data['receiver_id'],
            booking_id=data.get('booking_id'),
            content=data['content'],
            attachment_url=data.get('attachment_url')
        )

        db.session.add(message)
        db.session.commit()

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
        user_id = get_jwt_identity()
        message = Message.query.get(message_id)

        if not message:
            return jsonify({'error': 'Message not found'}), 404

        if message.receiver_id != user_id:
            return jsonify({'error': 'Unauthorized'}), 403

        message.is_read = True
        db.session.commit()

        return jsonify({'message': 'Message marked as read'}), 200

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
        message_ids = data.get('messageIds') or data.get('message_ids') or []
        if not isinstance(message_ids, list):
            return jsonify({'error': 'messageIds must be a list'}), 400

        ids = [int(message_id) for message_id in message_ids if str(message_id).isdigit()]
        if not ids:
            return jsonify({'message': 'No messages to mark as read', 'updated': 0}), 200

        updated = Message.query.filter(
            Message.id.in_(ids),
            Message.receiver_id == user_id,
        ).update({'is_read': True}, synchronize_session=False)
        db.session.commit()

        return jsonify({'message': 'Messages marked as read', 'updated': updated}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/conversations', methods=['GET'])
@jwt_required()
def get_conversations():
    """Get all conversations for current user"""
    try:
        user_id = get_jwt_identity()

        # Get unique users the current user has messaged with
        sent = db.session.query(Message.receiver_id).filter_by(sender_id=user_id).distinct()
        received = db.session.query(Message.sender_id).filter_by(receiver_id=user_id).distinct()

        user_ids = set([u[0] for u in sent.all()] + [u[0] for u in received.all()])
        users = User.query.filter(User.id.in_(user_ids)).all()

        conversations = []
        for user in users:
            last_message = Message.query.filter(
                ((Message.sender_id == user_id) & (Message.receiver_id == user.id)) |
                ((Message.sender_id == user.id) & (Message.receiver_id == user_id))
            ).order_by(Message.created_at.desc()).first()

            unread_count = Message.query.filter_by(
                sender_id=user.id,
                receiver_id=user_id,
                is_read=False
            ).count()

            conversations.append({
                'user': user.to_dict(),
                'last_message': last_message.to_dict() if last_message else None,
                'unread_count': unread_count
            })

        return jsonify({'conversations': conversations}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500
