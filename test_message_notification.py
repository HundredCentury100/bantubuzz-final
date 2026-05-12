from app import create_app
from app.models import Message, User
from datetime import datetime, timedelta

app = create_app()

with app.app_context():
    # Get the most recent message
    recent_message = Message.query.order_by(Message.created_at.desc()).first()

    if recent_message:
        print(f"Most recent message:")
        print(f"  ID: {recent_message.id}")
        print(f"  From user_id: {recent_message.sender_id}")
        print(f"  To user_id: {recent_message.receiver_id}")
        print(f"  Content: {recent_message.content[:50] if len(recent_message.content) > 50 else recent_message.content}...")
        print(f"  Created: {recent_message.created_at}")

        # Get receiver info
        receiver = User.query.get(recent_message.receiver_id)
        if receiver:
            print(f"  Receiver email: {receiver.email}")
            print(f"  Receiver username: {receiver.username}")

        # Get sender info
        sender = User.query.get(recent_message.sender_id)
        if sender:
            print(f"  Sender email: {sender.email}")
            print(f"  Sender username: {sender.username}")
    else:
        print("No messages found")
