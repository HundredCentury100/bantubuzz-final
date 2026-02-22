from app import create_app, db
from app.models import Message

app = create_app()

with app.app_context():
    # Get message ID 117 (the custom request message)
    msg = db.session.query(Message).filter_by(id=117).first()

    if msg:
        print(f"Message ID: {msg.id}")
        print(f"Sender ID: {msg.sender_id}")
        print(f"Receiver ID: {msg.receiver_id}")
        print(f"Message Type: {msg.message_type}")
        print(f"Custom Request ID: {msg.custom_request_id}")
        print(f"Content: {msg.content}")
        print(f"Created At: {msg.created_at}")
        print(f"\nto_dict() output:")
        import json
        print(json.dumps(msg.to_dict(), indent=2, default=str))
    else:
        print("Message 117 not found")
