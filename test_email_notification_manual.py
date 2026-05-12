from app import create_app
from app.tasks.email_tasks import send_message_notification

app = create_app()

with app.app_context():
    print("Testing email notification manually...")
    print("Sending notification to user_id 8 (hundredtechacademy@gmail.com)")

    # Call the task directly to test
    result = send_message_notification.delay(
        recipient_user_id=8,
        sender_name="Test Brand",
        message_preview="This is a test message to verify email notifications are working"
    )

    print(f"Task queued with ID: {result.id}")
    print("Check Celery worker logs and recipient email inbox")
