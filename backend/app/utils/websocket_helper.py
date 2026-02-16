"""
WebSocket helper to emit messages to the messaging service
"""
import requests
import os
from app.models import User, BrandProfile, CreatorProfile

def emit_message_to_websocket(message, db_session):
    """
    Emit a message to the WebSocket messaging service so it's broadcast in real-time

    Args:
        message: Message object from database
        db_session: Database session to query user info
    """
    try:
        # Get messaging service URL from environment
        messaging_url = os.getenv('MESSAGING_SERVICE_URL', 'http://localhost:3002')

        # Fetch sender info
        sender = db_session.query(User).filter_by(id=message.sender_id).first()
        if not sender:
            print(f"Warning: Sender user {message.sender_id} not found")
            return

        # Get sender name based on user type
        sender_name = None
        if sender.user_type == 'brand':
            brand = db_session.query(BrandProfile).filter_by(user_id=sender.id).first()
            sender_name = brand.company_name if brand else None
        elif sender.user_type == 'creator':
            creator = db_session.query(CreatorProfile).filter_by(user_id=sender.id).first()
            sender_name = creator.username if creator else None

        # Fetch receiver info
        receiver = db_session.query(User).filter_by(id=message.receiver_id).first()
        if not receiver:
            print(f"Warning: Receiver user {message.receiver_id} not found")
            return

        # Get receiver name based on user type
        receiver_name = None
        if receiver.user_type == 'brand':
            brand = db_session.query(BrandProfile).filter_by(user_id=receiver.id).first()
            receiver_name = brand.company_name if brand else None
        elif receiver.user_type == 'creator':
            creator = db_session.query(CreatorProfile).filter_by(user_id=receiver.id).first()
            receiver_name = creator.username if creator else None

        # Prepare message data
        message_data = {
            'id': message.id,
            'sender_id': message.sender_id,
            'receiver_id': message.receiver_id,
            'booking_id': message.booking_id,
            'custom_request_id': message.custom_request_id,
            'custom_offer_id': message.custom_offer_id,
            'message_type': message.message_type or 'text',
            'content': message.content,
            'is_read': message.is_read,
            'attachment_url': message.attachment_url,
            'created_at': message.created_at.isoformat() if message.created_at else None,
            'sender': {
                'email': sender.email,
                'user_type': sender.user_type,
                'name': sender_name
            },
            'receiver': {
                'email': receiver.email,
                'user_type': receiver.user_type,
                'name': receiver_name
            }
        }

        # Send to messaging service via internal API
        response = requests.post(
            f'{messaging_url}/api/internal/broadcast-message',
            json=message_data,
            timeout=5
        )

        if response.status_code == 200:
            print(f"✓ Message {message.id} broadcast via WebSocket")
        else:
            print(f"✗ Failed to broadcast message {message.id}: {response.status_code}")

    except requests.exceptions.RequestException as e:
        print(f"✗ WebSocket broadcast error: {e}")
    except Exception as e:
        print(f"✗ Error broadcasting message: {e}")
