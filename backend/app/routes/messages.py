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

        # Send email notification to recipient asynchronously
        import logging
        logger = logging.getLogger(__name__)

        try:
            logger.info(f"[EMAIL_NOTIFICATION] Starting email notification process for message to user {data['receiver_id']}")

            from app.tasks.email_tasks import send_message_notification
            from app.models import CreatorProfile, BrandProfile

            sender = User.query.get(user_id)
            sender_name = "A user"

            if sender:
                logger.info(f"[EMAIL_NOTIFICATION] Sender found: user_id={user_id}, type={sender.user_type}")
                # Get sender name from profile
                if sender.user_type == 'creator':
                    creator = CreatorProfile.query.filter_by(user_id=user_id).first()
                    if creator:
                        sender_name = creator.username
                        logger.info(f"[EMAIL_NOTIFICATION] Creator name: {sender_name}")
                elif sender.user_type == 'brand':
                    brand = BrandProfile.query.filter_by(user_id=user_id).first()
                    if brand:
                        sender_name = brand.company_name
                        logger.info(f"[EMAIL_NOTIFICATION] Brand name: {sender_name}")

            logger.info(f"[EMAIL_NOTIFICATION] About to queue email task: recipient={data['receiver_id']}, sender={sender_name}")

            # Queue the email notification task
            result = send_message_notification.delay(
                recipient_user_id=data['receiver_id'],
                sender_name=sender_name,
                message_preview=data['content']
            )

            logger.info(f"[EMAIL_NOTIFICATION] Email task queued successfully! Task ID: {result.id}")

        except Exception as email_error:
            # Log error but don't fail the request
            logger.error(f"[EMAIL_NOTIFICATION] Failed to queue message notification: {str(email_error)}", exc_info=True)
            print(f"Failed to queue message notification: {str(email_error)}")

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
