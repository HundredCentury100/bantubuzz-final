from app import db, socketio
from app.models import Notification
from flask_socketio import emit


def create_notification(user_id, notification_type, title, message, action_url=None):
    """
    Create a notification and emit it via Socket.IO

    Args:
        user_id: ID of the user to notify
        notification_type: Type of notification (booking, message, review, campaign, etc.)
        title: Notification title
        message: Notification message
        action_url: Optional URL for the notification action

    Returns:
        Notification object
    """
    try:
        notification = Notification(
            user_id=user_id,
            type=notification_type,
            title=title,
            message=message,
            action_url=action_url
        )

        db.session.add(notification)
        db.session.commit()

        # Emit real-time notification via Socket.IO
        socketio.emit('new_notification', notification.to_dict(), room=f'user_{user_id}')

        return notification
    except Exception as e:
        db.session.rollback()
        print(f"Error creating notification: {str(e)}")
        return None


def notify_new_booking(creator_id, brand_name, booking_id):
    """Notify creator of a new booking"""
    return create_notification(
        user_id=creator_id,
        notification_type='booking',
        title='New Booking Request',
        message=f'{brand_name} has requested to book your services',
        action_url=f'/bookings/{booking_id}'
    )


def notify_booking_status(user_id, status, booking_id):
    """Notify user of booking status change"""
    status_messages = {
        'accepted': 'Your booking has been accepted',
        'declined': 'Your booking has been declined',
        'completed': 'Your booking has been marked as completed',
        'cancelled': 'Your booking has been cancelled'
    }

    return create_notification(
        user_id=user_id,
        notification_type='booking',
        title='Booking Status Update',
        message=status_messages.get(status, f'Booking status updated to {status}'),
        action_url=f'/bookings/{booking_id}'
    )


def notify_new_message(user_id, sender_name, conversation_id):
    """Notify user of a new message"""
    return create_notification(
        user_id=user_id,
        notification_type='message',
        title='New Message',
        message=f'You have a new message from {sender_name}',
        action_url=f'/messages/{conversation_id}'
    )


def notify_new_review(creator_id, brand_name, review_id):
    """Notify creator of a new review"""
    return create_notification(
        user_id=creator_id,
        notification_type='review',
        title='New Review',
        message=f'{brand_name} left a review for you',
        action_url=f'/reviews/{review_id}'
    )


def notify_review_response(user_id, creator_name, review_id):
    """Notify user that creator responded to their review"""
    return create_notification(
        user_id=user_id,
        notification_type='review',
        title='Review Response',
        message=f'{creator_name} responded to your review',
        action_url=f'/reviews/{review_id}'
    )


def notify_campaign_application(brand_id, creator_name, campaign_id):
    """Notify brand of a new campaign application"""
    return create_notification(
        user_id=brand_id,
        notification_type='campaign',
        title='New Campaign Application',
        message=f'{creator_name} applied to your campaign',
        action_url=f'/campaigns/{campaign_id}'
    )


def notify_campaign_status(user_id, status, campaign_name, campaign_id):
    """Notify creator of campaign application status"""
    status_messages = {
        'accepted': f'Your application to "{campaign_name}" has been accepted',
        'rejected': f'Your application to "{campaign_name}" was not accepted',
    }

    return create_notification(
        user_id=user_id,
        notification_type='campaign',
        title='Campaign Application Update',
        message=status_messages.get(status, f'Campaign application status updated'),
        action_url=f'/campaigns/{campaign_id}'
    )


def notify_payment_received(user_id, amount, booking_id):
    """Notify user of payment received"""
    return create_notification(
        user_id=user_id,
        notification_type='payment',
        title='Payment Received',
        message=f'Payment of ${amount} has been received',
        action_url=f'/bookings/{booking_id}'
    )


def notify_collaboration_invite(user_id, inviter_name, collaboration_id):
    """Notify user of collaboration invite"""
    return create_notification(
        user_id=user_id,
        notification_type='collaboration',
        title='Collaboration Invite',
        message=f'{inviter_name} invited you to collaborate',
        action_url=f'/collaborations/{collaboration_id}'
    )


def notify_collaboration_status(user_id, status, collaboration_title, collaboration_id, user_type):
    """Notify user of collaboration status change"""
    status_messages = {
        'in_progress': f'Collaboration "{collaboration_title}" is now in progress',
        'completed': f'Collaboration "{collaboration_title}" has been completed',
        'cancelled': f'Collaboration "{collaboration_title}" has been cancelled'
    }

    return create_notification(
        user_id=user_id,
        notification_type='collaboration',
        title='Collaboration Status Update',
        message=status_messages.get(status, f'Collaboration status updated'),
        action_url=f'/{user_type}/collaborations/{collaboration_id}' if user_type else f'/collaborations/{collaboration_id}'
    )


def notify_collaboration_update(user_id, collaboration_title, collaboration_id, update_message):
    """Notify user of collaboration update"""
    return create_notification(
        user_id=user_id,
        notification_type='collaboration',
        title='Collaboration Update',
        message=f'{collaboration_title}: {update_message}',
        action_url=f'/collaborations/{collaboration_id}'
    )
