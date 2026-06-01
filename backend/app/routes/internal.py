from flask import Blueprint, request, jsonify
from app.models import User
from app.services.product_notifications import notify_message_received_for_user
import logging

bp = Blueprint('internal', __name__)
logger = logging.getLogger(__name__)

INTERNAL_SERVICE_SECRET = 'messaging-service-secret'  # Should match Node.js service


@bp.route('/trigger-email-notification', methods=['POST'])
def trigger_email_notification():
    """
    Internal endpoint for messaging service to trigger email notifications.
    This is called by the Node.js messaging service when a message is sent.
    """
    # Verify internal service authentication
    auth_header = request.headers.get('X-Internal-Service')
    if auth_header != INTERNAL_SERVICE_SECRET:
        logger.warning(f"Unauthorized internal API call from {request.remote_addr}")
        return jsonify({'error': 'Unauthorized'}), 401

    try:
        data = request.get_json()

        recipient_user_id = data.get('recipient_user_id')
        sender_name = data.get('sender_name', 'A user')
        sender_type = data.get('sender_type')

        if not recipient_user_id:
            return jsonify({'error': 'recipient_user_id is required'}), 400

        logger.info(f"[INTERNAL] Triggering message notification for user {recipient_user_id} from {sender_name}")

        recipient = User.query.get(recipient_user_id)
        if not recipient:
            return jsonify({'error': 'recipient user not found'}), 404

        notify_message_received_for_user(recipient, sender_name, sender_type)

        logger.info(f"[INTERNAL] Message notification sent for user {recipient_user_id}")

        return jsonify({
            'success': True
        }), 200

    except Exception as e:
        logger.error(f"[INTERNAL] Error triggering email notification: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500
