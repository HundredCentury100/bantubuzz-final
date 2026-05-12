from app import create_app
from app.models import Message, User
from datetime import datetime, timedelta

app = create_app()

with app.app_context():
    # Get messages from the last 30 minutes
    thirty_mins_ago = datetime.utcnow() - timedelta(minutes=30)

    recent_messages = Message.query.filter(
        Message.created_at > thirty_mins_ago
    ).order_by(Message.created_at.desc()).limit(10).all()

    print(f"Messages in the last 30 minutes: {len(recent_messages)}\n")

    for msg in recent_messages:
        print(f"ID: {msg.id}")
        print(f"From user_id: {msg.sender_id}")
        print(f"To user_id: {msg.receiver_id}")
        print(f"Content: {msg.content[:50] if len(msg.content) > 50 else msg.content}")
        print(f"Created: {msg.created_at}")

        # Get receiver email
        receiver = User.query.get(msg.receiver_id)
        if receiver:
            print(f"Receiver email: {receiver.email}")

        print("-" * 50)
