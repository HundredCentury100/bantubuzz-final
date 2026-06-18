"""
Email sending background tasks.

These tasks handle asynchronous email sending to avoid blocking HTTP requests.
"""
from app.celery_app import celery
from app.services import email_service
import logging

logger = logging.getLogger(__name__)


@celery.task(name='app.tasks.email_tasks.send_email')
def send_email_task(subject, recipients, text_body, html_body=None):
    """
    Send an email asynchronously.

    Args:
        subject: Email subject
        recipients: Recipient email address or list of addresses
        text_body: Plain text email body
        html_body: HTML email body (optional)

    Returns:
        dict: Send result
    """
    try:
        logger.info(f"Sending email to {recipients}: {subject}")

        email_service.send_email(
            subject=subject,
            recipients=recipients,
            text_body=text_body,
            html_body=html_body
        )

        logger.info(f"Successfully sent email to {recipients}")
        return {
            'status': 'success',
            'to': recipients,
            'subject': subject
        }

    except Exception as e:
        logger.error(f"Error sending email to {recipients}: {str(e)}", exc_info=True)
        return {
            'status': 'error',
            'to': recipients,
            'message': str(e)
        }


@celery.task(name='app.tasks.email_tasks.send_collaboration_notification')
def send_collaboration_notification(collaboration_id, notification_type):
    """
    Send collaboration-related notification email.

    Args:
        collaboration_id: ID of the collaboration
        notification_type: Type of notification (new, accepted, rejected, completed, etc.)

    Returns:
        dict: Send result
    """
    try:
        from app.models import Collaboration, CreatorProfile, BrandProfile

        logger.info(f"Sending {notification_type} notification for collaboration {collaboration_id}")

        collaboration = Collaboration.query.get(collaboration_id)
        if not collaboration:
            logger.error(f"Collaboration {collaboration_id} not found")
            return {'status': 'error', 'message': 'Collaboration not found'}

        creator = CreatorProfile.query.get(collaboration.creator_id)
        brand = BrandProfile.query.get(collaboration.brand_id)

        # Determine recipient and email content based on notification type
        if notification_type == 'new':
            # Notify creator of new collaboration request
            to_email = creator.user.email
            subject = f"New Collaboration Request from {brand.company_name}"
            body = f"You have a new collaboration request from {brand.company_name}. Log in to view details."

        elif notification_type == 'accepted':
            # Notify brand that creator accepted
            to_email = brand.user.email
            subject = f"{creator.display_name or creator.user.username} Accepted Your Collaboration"
            body = f"{creator.display_name or creator.user.username} has accepted your collaboration request!"

        elif notification_type == 'rejected':
            # Notify brand that creator rejected
            to_email = brand.user.email
            subject = f"Collaboration Request Update"
            body = f"{creator.display_name or creator.user.username} has declined your collaboration request."

        elif notification_type == 'completed':
            # Notify both parties
            # Send to brand
            email_service.send_email(
                subject=f"Collaboration Completed",
                recipients=brand.user.email,
                text_body=f"Your collaboration with {creator.display_name or creator.user.username} has been marked as completed."
            )
            # Send to creator
            to_email = creator.user.email
            subject = f"Collaboration Completed"
            body = f"Your collaboration with {brand.company_name} has been marked as completed."

        else:
            logger.warning(f"Unknown notification type: {notification_type}")
            return {'status': 'skipped', 'message': f'Unknown notification type: {notification_type}'}

        email_service.send_email(
            subject=subject,
            recipients=to_email,
            text_body=body
        )

        logger.info(f"Successfully sent {notification_type} notification for collaboration {collaboration_id}")
        return {
            'status': 'success',
            'collaboration_id': collaboration_id,
            'notification_type': notification_type,
            'to': to_email
        }

    except Exception as e:
        logger.error(f"Error sending collaboration notification: {str(e)}", exc_info=True)
        return {
            'status': 'error',
            'collaboration_id': collaboration_id,
            'message': str(e)
        }


@celery.task(name='app.tasks.email_tasks.send_booking_notification')
def send_booking_notification(booking_id, notification_type):
    """
    Send booking-related notification email.

    Args:
        booking_id: ID of the booking
        notification_type: Type of notification (new, confirmed, cancelled, etc.)

    Returns:
        dict: Send result
    """
    try:
        from app.models import Booking, CreatorProfile, BrandProfile

        logger.info(f"Sending {notification_type} notification for booking {booking_id}")

        booking = Booking.query.get(booking_id)
        if not booking:
            logger.error(f"Booking {booking_id} not found")
            return {'status': 'error', 'message': 'Booking not found'}

        creator = CreatorProfile.query.get(booking.creator_id)
        brand = BrandProfile.query.get(booking.brand_id)

        # Determine recipient and email content
        if notification_type == 'new':
            to_email = creator.user.email
            subject = f"New Booking from {brand.company_name}"
            body = f"You have a new booking request. Log in to review."

        elif notification_type == 'confirmed':
            to_email = brand.user.email
            subject = f"Booking Confirmed"
            body = f"Your booking has been confirmed!"

        elif notification_type == 'cancelled':
            # Notify both
            email_service.send_email(
                subject="Booking Cancelled",
                recipients=brand.user.email,
                text_body=f"Your booking has been cancelled."
            )
            to_email = creator.user.email
            subject = "Booking Cancelled"
            body = "A booking has been cancelled."

        else:
            logger.warning(f"Unknown notification type: {notification_type}")
            return {'status': 'skipped', 'message': f'Unknown notification type: {notification_type}'}

        email_service.send_email(
            subject=subject,
            recipients=to_email,
            text_body=body
        )

        logger.info(f"Successfully sent {notification_type} notification for booking {booking_id}")
        return {
            'status': 'success',
            'booking_id': booking_id,
            'notification_type': notification_type,
            'to': to_email
        }

    except Exception as e:
        logger.error(f"Error sending booking notification: {str(e)}", exc_info=True)
        return {
            'status': 'error',
            'booking_id': booking_id,
            'message': str(e)
        }


@celery.task(name='app.tasks.email_tasks.send_message_notification')
def send_message_notification(recipient_user_id, sender_name, message_preview):
    """
    Notify a user that they received a new message.

    Args:
        recipient_user_id: ID of the user receiving the message
        sender_name: Name of the sender
        message_preview: Preview of the message content (first 100 chars)

    Returns:
        dict: Send result
    """
    try:
        from app.models import User, CreatorProfile, BrandProfile

        logger.info(f"Sending message notification to user {recipient_user_id}")

        recipient = User.query.get(recipient_user_id)
        if not recipient:
            logger.error(f"Recipient user {recipient_user_id} not found")
            return {'status': 'error', 'message': 'Recipient not found'}

        # Get username from profile
        recipient_name = "there"
        if recipient.user_type == 'creator':
            creator = CreatorProfile.query.filter_by(user_id=recipient_user_id).first()
            if creator:
                recipient_name = creator.username
        elif recipient.user_type == 'brand':
            brand = BrandProfile.query.filter_by(user_id=recipient_user_id).first()
            if brand:
                recipient_name = brand.company_name

        subject = f"New Message from {sender_name} on BantuBuzz"

        # Truncate message preview
        preview = message_preview[:100] + "..." if len(message_preview) > 100 else message_preview

        text_body = f"""
Hi {recipient_name},

You have received a new message from {sender_name}:

"{preview}"

Log in to BantuBuzz to read and respond to this message.

Best regards,
The BantuBuzz Team
        """

        html_body = f"""
<html>
<body>
    <h2>New Message from {sender_name}</h2>
    <p>Hi {recipient_name},</p>
    <p>You have received a new message:</p>
    <blockquote style="background: #f5f5f5; padding: 15px; border-left: 4px solid #4CAF50;">
        {preview}
    </blockquote>
    <p><a href="https://bantubuzz.com/messages" style="background: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">View Message</a></p>
    <p>Best regards,<br>The BantuBuzz Team</p>
</body>
</html>
        """

        email_service.send_email(
            subject=subject,
            recipients=recipient.email,
            text_body=text_body,
            html_body=html_body
        )

        logger.info(f"Successfully sent message notification to user {recipient_user_id}")
        return {
            'status': 'success',
            'recipient_id': recipient_user_id,
            'to': recipient.email
        }

    except Exception as e:
        logger.error(f"Error sending message notification: {str(e)}", exc_info=True)
        return {
            'status': 'error',
            'recipient_id': recipient_user_id,
            'message': str(e)
        }


@celery.task(name='app.tasks.email_tasks.send_deliverable_submission_notification')
def send_deliverable_submission_notification(collaboration_id, deliverable_description):
    """
    Notify brand when creator submits a deliverable.

    Args:
        collaboration_id: ID of the collaboration
        deliverable_description: Description of the submitted deliverable

    Returns:
        dict: Send result
    """
    try:
        from app.models import Collaboration, CreatorProfile, BrandProfile

        logger.info(f"Sending deliverable submission notification for collaboration {collaboration_id}")

        collaboration = Collaboration.query.get(collaboration_id)
        if not collaboration:
            logger.error(f"Collaboration {collaboration_id} not found")
            return {'status': 'error', 'message': 'Collaboration not found'}

        creator = CreatorProfile.query.get(collaboration.creator_id)
        brand = BrandProfile.query.get(collaboration.brand_id)

        subject = f"Deliverable Submitted by {creator.username}"

        text_body = f"""
Hi {brand.company_name},

{creator.username} has submitted a deliverable for your collaboration.

Deliverable: {deliverable_description}

Please review and approve the deliverable on BantuBuzz.

Best regards,
The BantuBuzz Team
        """

        html_body = f"""
<html>
<body>
    <h2>New Deliverable Submitted</h2>
    <p>Hi {brand.company_name},</p>
    <p><strong>{creator.username}</strong> has submitted a deliverable for your collaboration.</p>
    <div style="background: #f5f5f5; padding: 15px; margin: 15px 0; border-radius: 5px;">
        <strong>Deliverable:</strong> {deliverable_description}
    </div>
    <p><a href="https://bantubuzz.com/brand/collaborations/{collaboration_id}" style="background: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">Review Deliverable</a></p>
    <p>Best regards,<br>The BantuBuzz Team</p>
</body>
</html>
        """

        email_service.send_email(
            subject=subject,
            recipients=brand.user.email,
            text_body=text_body,
            html_body=html_body
        )

        logger.info(f"Successfully sent deliverable submission notification for collaboration {collaboration_id}")
        return {
            'status': 'success',
            'collaboration_id': collaboration_id,
            'to': brand.user.email
        }

    except Exception as e:
        logger.error(f"Error sending deliverable submission notification: {str(e)}", exc_info=True)
        return {
            'status': 'error',
            'collaboration_id': collaboration_id,
            'message': str(e)
        }


@celery.task(name='app.tasks.email_tasks.send_deliverable_approval_notification')
def send_deliverable_approval_notification(collaboration_id, deliverable_description):
    """
    Notify creator when brand approves a deliverable.

    Args:
        collaboration_id: ID of the collaboration
        deliverable_description: Description of the approved deliverable

    Returns:
        dict: Send result
    """
    try:
        from app.models import Collaboration, CreatorProfile, BrandProfile

        logger.info(f"Sending deliverable approval notification for collaboration {collaboration_id}")

        collaboration = Collaboration.query.get(collaboration_id)
        if not collaboration:
            logger.error(f"Collaboration {collaboration_id} not found")
            return {'status': 'error', 'message': 'Collaboration not found'}

        creator = CreatorProfile.query.get(collaboration.creator_id)
        brand = BrandProfile.query.get(collaboration.brand_id)

        subject = f"Deliverable Approved by {brand.company_name}!"

        text_body = f"""
Hi {creator.username},

Great news! {brand.company_name} has approved your deliverable.

Deliverable: {deliverable_description}

Payment will be released from escrow to your wallet shortly.

Best regards,
The BantuBuzz Team
        """

        html_body = f"""
<html>
<body>
    <h2 style="color: #4CAF50;">Deliverable Approved! 🎉</h2>
    <p>Hi {creator.username},</p>
    <p>Great news! <strong>{brand.company_name}</strong> has approved your deliverable.</p>
    <div style="background: #f5f5f5; padding: 15px; margin: 15px 0; border-radius: 5px;">
        <strong>Deliverable:</strong> {deliverable_description}
    </div>
    <p style="color: #4CAF50;"><strong>Payment will be released from escrow to your wallet shortly.</strong></p>
    <p><a href="https://bantubuzz.com/creator/collaborations/{collaboration_id}" style="background: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">View Collaboration</a></p>
    <p>Best regards,<br>The BantuBuzz Team</p>
</body>
</html>
        """

        email_service.send_email(
            subject=subject,
            recipients=creator.user.email,
            text_body=text_body,
            html_body=html_body
        )

        logger.info(f"Successfully sent deliverable approval notification for collaboration {collaboration_id}")
        return {
            'status': 'success',
            'collaboration_id': collaboration_id,
            'to': creator.user.email
        }

    except Exception as e:
        logger.error(f"Error sending deliverable approval notification: {str(e)}", exc_info=True)
        return {
            'status': 'error',
            'collaboration_id': collaboration_id,
            'message': str(e)
        }


@celery.task(name='app.tasks.email_tasks.send_payment_release_notification')
def send_payment_release_notification(creator_user_id, amount, collaboration_id):
    """
    Notify creator when payment is released from escrow to their wallet.

    Args:
        creator_user_id: ID of the creator user
        amount: Payment amount
        collaboration_id: ID of the collaboration

    Returns:
        dict: Send result
    """
    try:
        from app.models import User, CreatorProfile

        logger.info(f"Sending payment release notification to user {creator_user_id}")

        user = User.query.get(creator_user_id)
        if not user:
            logger.error(f"User {creator_user_id} not found")
            return {'status': 'error', 'message': 'User not found'}

        creator = CreatorProfile.query.filter_by(user_id=creator_user_id).first()

        subject = f"Payment Released: ${amount:.2f} Added to Your Wallet"

        text_body = f"""
Hi {creator.username if creator else user.username},

Congratulations! Your payment has been released from escrow.

Amount: ${amount:.2f}
Status: Added to your BantuBuzz wallet

You can now withdraw these funds or use them on the platform.

Best regards,
The BantuBuzz Team
        """

        html_body = f"""
<html>
<body>
    <h2 style="color: #4CAF50;">Payment Released! 💰</h2>
    <p>Hi {creator.username if creator else user.username},</p>
    <p><strong>Congratulations! Your payment has been released from escrow.</strong></p>
    <div style="background: #e8f5e9; padding: 20px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #4CAF50;">
        <h3 style="margin-top: 0; color: #2e7d32;">Amount: ${amount:.2f}</h3>
        <p style="margin-bottom: 0;"><strong>Status:</strong> Added to your BantuBuzz wallet</p>
    </div>
    <p>You can now withdraw these funds or use them on the platform.</p>
    <p><a href="https://bantubuzz.com/creator/wallet" style="background: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">View Wallet</a></p>
    <p>Best regards,<br>The BantuBuzz Team</p>
</body>
</html>
        """

        email_service.send_email(
            subject=subject,
            recipients=user.email,
            text_body=text_body,
            html_body=html_body
        )

        logger.info(f"Successfully sent payment release notification to user {creator_user_id}")
        return {
            'status': 'success',
            'user_id': creator_user_id,
            'to': user.email,
            'amount': amount
        }

    except Exception as e:
        logger.error(f"Error sending payment release notification: {str(e)}", exc_info=True)
        return {
            'status': 'error',
            'user_id': creator_user_id,
            'message': str(e)
        }


@celery.task(name='app.tasks.email_tasks.send_inactive_user_reminder')
def send_inactive_user_reminder(user_id, scheduled_week_start=None):
    """
    Send reminder email to users who haven't logged in for 7+ days.

    Args:
        user_id: ID of the inactive user

    Returns:
        dict: Send result
    """
    try:
        from app import db
        from app.models import User, CreatorProfile, BrandProfile
        from datetime import datetime, timedelta

        logger.info(f"Sending inactive user reminder to user {user_id}")

        user = User.query.get(user_id)
        if not user:
            logger.error(f"User {user_id} not found")
            return {'status': 'error', 'message': 'User not found'}

        # Double-check they're still inactive
        if user.last_login and user.last_login > datetime.utcnow() - timedelta(days=7):
            logger.info(f"User {user_id} is now active, skipping notification")
            return {'status': 'skipped', 'message': 'User is active'}

        now = datetime.utcnow()
        week_start = now - timedelta(days=now.weekday())
        week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)
        week_start_key = week_start.isoformat()
        if (
            user.inactive_reminder_sent_at
            and user.inactive_reminder_sent_at >= week_start
            and scheduled_week_start != week_start_key
        ):
            logger.info(f"User {user_id} already received this week's inactive reminder, skipping")
            return {'status': 'skipped', 'message': 'Already reminded this week'}

        # Get user type-specific content
        if user.user_type == 'creator':
            creator = CreatorProfile.query.filter_by(user_id=user_id).first()
            username = creator.username if creator else user.username
            cta_text = "Browse new collaboration opportunities"
            cta_link = "https://bantubuzz.com/creator/dashboard"
        elif user.user_type == 'brand':
            brand = BrandProfile.query.filter_by(user_id=user_id).first()
            username = brand.company_name if brand else user.username
            cta_text = "Find creators for your next campaign"
            cta_link = "https://bantubuzz.com/brand/dashboard"
        else:
            username = user.username
            cta_text = "Explore BantuBuzz"
            cta_link = "https://bantubuzz.com"

        subject = "We miss you on BantuBuzz! 👋"

        text_body = f"""
Hi {username},

We noticed you haven't logged into BantuBuzz recently. We miss you!

There are new opportunities waiting for you on the platform. Log in to see what you've been missing.

Best regards,
The BantuBuzz Team
        """

        html_body = f"""
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #4CAF50;">We miss you on BantuBuzz! 👋</h2>
        <p>Hi {username},</p>
        <p>We noticed you haven't logged into BantuBuzz recently. <strong>We miss you!</strong></p>
        <p>There are new opportunities waiting for you on the platform.</p>
        <div style="text-align: center; margin: 30px 0;">
            <a href="{cta_link}" style="background: #4CAF50; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">{cta_text}</a>
        </div>
        <p style="color: #666; font-size: 14px;">If you'd like to manage your email preferences, you can do so in your account settings.</p>
        <p>Best regards,<br>The BantuBuzz Team</p>
    </div>
</body>
</html>
        """

        email_service.send_email(
            subject=subject,
            recipients=user.email,
            text_body=text_body,
            html_body=html_body
        )

        user.inactive_reminder_sent_at = now
        db.session.commit()

        logger.info(f"Successfully sent inactive user reminder to user {user_id}")
        return {
            'status': 'success',
            'user_id': user_id,
            'to': user.email
        }

    except Exception as e:
        logger.error(f"Error sending inactive user reminder: {str(e)}", exc_info=True)
        return {
            'status': 'error',
            'user_id': user_id,
            'message': str(e)
        }


@celery.task(name='app.tasks.email_tasks.check_and_notify_inactive_users')
def check_and_notify_inactive_users():
    """
    Periodic task to find and notify inactive users (7+ days since last login).

    This task is scheduled to run weekly on Monday at 9 AM via Celery Beat.
    It also exits on non-Mondays so a stale daily scheduler cannot spam users.

    Returns:
        dict: Summary of notifications sent
    """
    try:
        from app.models import User
        from app import db
        from sqlalchemy import or_
        from datetime import datetime, timedelta

        now = datetime.utcnow()
        if now.weekday() != 0:
            logger.info("Skipping inactive user reminders because today is not Monday")
            return {
                'status': 'skipped',
                'message': 'Inactive reminders only run on Mondays',
                'weekday': now.weekday()
            }

        logger.info("Checking for inactive users...")

        # Find users who haven't logged in for 7+ days
        seven_days_ago = now - timedelta(days=7)
        week_start = now - timedelta(days=now.weekday())
        week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)

        inactive_users = User.query.filter(
            User.is_active == True,
            User.is_verified == True,
            User.last_login < seven_days_ago,
            or_(
                User.inactive_reminder_sent_at.is_(None),
                User.inactive_reminder_sent_at < week_start
            )
        ).all()

        logger.info(f"Found {len(inactive_users)} inactive users")

        # Reserve users for this week before queueing so duplicate beat entries
        # cannot enqueue the same reminder repeatedly on Monday.
        eligible_user_ids = []
        for user in inactive_users:
            user.inactive_reminder_sent_at = now
            eligible_user_ids.append(user.id)

        db.session.commit()

        # Send notifications asynchronously
        tasks_queued = 0
        week_start_key = week_start.isoformat()
        for user_id in eligible_user_ids:
            send_inactive_user_reminder.delay(user_id, scheduled_week_start=week_start_key)
            tasks_queued += 1

        logger.info(f"Queued {tasks_queued} inactive user reminder emails")
        return {
            'status': 'success',
            'inactive_users_found': len(inactive_users),
            'notifications_queued': tasks_queued,
            'week_start': week_start.isoformat()
        }

    except Exception as e:
        logger.error(f"Error checking inactive users: {str(e)}", exc_info=True)
        return {
            'status': 'error',
            'message': str(e)
        }
