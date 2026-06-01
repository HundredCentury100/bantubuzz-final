from flask import current_app

from app.services.email_service import send_email
from app.utils.notifications import create_notification


def _frontend_url(path):
    base_url = current_app.config.get('FRONTEND_URL', 'https://bantubuzz.com').rstrip('/')
    return f"{base_url}{path}"


def _profile_name(profile, fallback='BantuBuzz user'):
    if not profile:
        return fallback
    return (
        getattr(profile, 'company_name', None)
        or getattr(profile, 'display_name', None)
        or getattr(profile, 'username', None)
        or fallback
    )


def _send_product_email(user, subject, heading, message, action_url=None, action_label='Open BantuBuzz'):
    if not user or not user.email:
        return

    link = _frontend_url(action_url) if action_url else current_app.config.get('FRONTEND_URL', 'https://bantubuzz.com')
    text_body = f"""
{heading}

{message}

Open BantuBuzz:
{link}

Best regards,
The BantuBuzz Team
"""
    html_body = f"""
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1F2937;">
        <div style="background-color: #ccdb53; padding: 22px; text-align: center;">
            <h1 style="margin: 0; color: #1F2937;">BantuBuzz</h1>
        </div>
        <div style="padding: 30px; background-color: #ffffff;">
            <h2 style="margin-top: 0; color: #1F2937;">{heading}</h2>
            <p style="line-height: 1.6; color: #374151;">{message}</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="{link}" style="background-color: #ccdb53; color: #1F2937; padding: 13px 28px; text-decoration: none; border-radius: 999px; font-weight: bold;">
                    {action_label}
                </a>
            </div>
        </div>
        <div style="background-color: #1F2937; padding: 18px; text-align: center;">
            <p style="color: #F3F4F6; margin: 0; font-size: 13px;">BantuBuzz creator-brand collaboration updates</p>
        </div>
    </body>
    </html>
    """
    send_email(subject, user.email, text_body, html_body)


def _notify_user(user, notification_type, title, message, action_url, email_subject=None, email_heading=None):
    if not user:
        return
    create_notification(
        user_id=user.id,
        notification_type=notification_type,
        title=title,
        message=message,
        action_url=action_url
    )
    _send_product_email(
        user=user,
        subject=email_subject or title,
        heading=email_heading or title,
        message=message,
        action_url=action_url
    )


def notify_creator_new_booking(booking):
    creator = getattr(booking, 'creator', None)
    brand = getattr(booking, 'brand', None)
    package = getattr(booking, 'package', None)
    creator_user = getattr(creator, 'user', None)
    brand_name = _profile_name(brand, 'A brand')
    package_title = getattr(package, 'title', 'your package')
    message = f'{brand_name} has booked your package "{package_title}".'
    _notify_user(
        creator_user,
        'booking',
        'New booking received',
        message,
        f'/bookings/{booking.id}',
        email_subject='New booking received on BantuBuzz'
    )


def notify_collaboration_active(collaboration):
    creator = getattr(collaboration, 'creator', None)
    brand = getattr(collaboration, 'brand', None)
    creator_user = getattr(creator, 'user', None)
    brand_user = getattr(brand, 'user', None)
    brand_name = _profile_name(brand, 'The brand')
    creator_name = _profile_name(creator, 'the creator')

    _notify_user(
        creator_user,
        'collaboration',
        'Brand payment confirmed',
        f'{brand_name} has paid. Your collaboration "{collaboration.title}" is now active.',
        f'/creator/collaborations/{collaboration.id}',
        email_subject='Brand payment confirmed'
    )
    _notify_user(
        brand_user,
        'collaboration',
        'Payment confirmed',
        f'Your payment is confirmed. Your collaboration with {creator_name} is now active.',
        f'/brand/collaborations/{collaboration.id}',
        email_subject='Payment confirmed'
    )


def notify_brand_content_submitted(collaboration, deliverable_title):
    brand_user = getattr(getattr(collaboration, 'brand', None), 'user', None)
    creator_name = _profile_name(getattr(collaboration, 'creator', None), 'The creator')
    _notify_user(
        brand_user,
        'collaboration',
        'Creator submitted content for review',
        f'{creator_name} submitted "{deliverable_title}" for review.',
        f'/brand/collaborations/{collaboration.id}',
        email_subject='Creator submitted content for review'
    )


def notify_creator_content_approved(collaboration, deliverable_title):
    creator_user = getattr(getattr(collaboration, 'creator', None), 'user', None)
    _notify_user(
        creator_user,
        'collaboration',
        'Brand approved your content',
        f'Your content "{deliverable_title}" was approved. You can now post it live.',
        f'/creator/collaborations/{collaboration.id}',
        email_subject='Brand approved your content'
    )


def notify_creator_revision_requested(collaboration, deliverable_title, revision_notes):
    creator_user = getattr(getattr(collaboration, 'creator', None), 'user', None)
    _notify_user(
        creator_user,
        'collaboration',
        'Brand requested a revision',
        f'Revision requested for "{deliverable_title}". Notes: {revision_notes}',
        f'/creator/collaborations/{collaboration.id}',
        email_subject='Brand requested a revision'
    )


def notify_brand_live_urls_submitted(collaboration):
    brand_user = getattr(getattr(collaboration, 'brand', None), 'user', None)
    creator_name = _profile_name(getattr(collaboration, 'creator', None), 'The creator')
    _notify_user(
        brand_user,
        'collaboration',
        'Creator submitted live post URLs',
        f'{creator_name} submitted live post URLs for "{collaboration.title}".',
        f'/brand/collaborations/{collaboration.id}',
        email_subject='Creator submitted live post URLs'
    )


def notify_collaboration_completed(collaboration, auto_completed=False):
    creator = getattr(collaboration, 'creator', None)
    brand = getattr(collaboration, 'brand', None)
    creator_user = getattr(creator, 'user', None)
    brand_user = getattr(brand, 'user', None)
    title = 'Collaboration auto-completed' if auto_completed else 'Collaboration marked complete'
    creator_message = (
        f'Your collaboration "{collaboration.title}" was auto-completed.'
        if auto_completed else
        f'Your collaboration "{collaboration.title}" was marked complete.'
    )
    brand_message = (
        f'Your collaboration "{collaboration.title}" was auto-completed.'
        if auto_completed else
        f'You marked "{collaboration.title}" complete.'
    )
    _notify_user(
        creator_user,
        'collaboration',
        title,
        creator_message,
        f'/creator/collaborations/{collaboration.id}',
        email_subject=title
    )
    _notify_user(
        brand_user,
        'collaboration',
        title,
        brand_message,
        f'/brand/collaborations/{collaboration.id}',
        email_subject=title
    )


def notify_message_received(message):
    receiver = getattr(message, 'receiver', None)
    sender = getattr(message, 'sender', None)
    if not receiver and getattr(message, 'receiver_id', None):
        from app.models import User
        receiver = User.query.get(message.receiver_id)
    if not sender and getattr(message, 'sender_id', None):
        from app.models import User
        sender = User.query.get(message.sender_id)
    if not receiver or not sender:
        return

    sender_name = _profile_name(getattr(sender, 'creator_profile', None), None)
    sender_name = sender_name or _profile_name(getattr(sender, 'brand_profile', None), None)
    sender_name = sender_name or getattr(sender, 'email', 'Someone')
    sender_type = getattr(sender, 'user_type', '')
    sender_role = 'brand' if sender_type == 'brand' else 'creator'
    notify_message_received_for_user(receiver, sender_name, sender_role)


def notify_message_received_for_user(receiver, sender_name='A user', sender_role=None):
    if not receiver:
        return

    role = sender_role if sender_role in ['brand', 'creator'] else 'user'
    title = f'New message received from {role}'
    _notify_user(
        receiver,
        'message',
        title,
        f'You have a new message from {sender_name}.',
        '/messages',
        email_subject=title
    )
