from flask import current_app
from flask_mail import Message
from app import mail
from threading import Thread


def send_async_email(app, msg):
    """Send email asynchronously"""
    with app.app_context():
        mail.send(msg)


def send_email(subject, recipients, text_body, html_body=None):
    """Send email"""
    msg = Message(
        subject=subject,
        recipients=recipients if isinstance(recipients, list) else [recipients],
        sender=current_app.config['MAIL_DEFAULT_SENDER']
    )
    msg.body = text_body
    if html_body:
        msg.html = html_body

    # Send asynchronously
    Thread(target=send_async_email, args=(current_app._get_current_object(), msg)).start()


def send_otp_email(email, otp_code, purpose='registration'):
    """Send OTP verification email"""
    purpose_text = {
        'registration': 'verify your account',
        'password_reset': 'reset your password',
        'email_change': 'change your email'
    }.get(purpose, 'verify your account')

    subject = f"Your BantuBuzz verification code: {otp_code}"
    text_body = f"""
    Welcome to BantuBuzz!

    Your verification code is: {otp_code}

    Please enter this code to {purpose_text}.
    This code will expire in 10 minutes.

    If you did not request this code, please ignore this email.

    Best regards,
    The BantuBuzz Team
    """

    html_body = f"""
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #B5E61D; padding: 20px; text-align: center;">
            <h1 style="color: #1F2937; margin: 0;">BantuBuzz</h1>
        </div>
        <div style="padding: 30px; background-color: #F3F4F6;">
            <h2 style="color: #1F2937;">Your Verification Code</h2>
            <p style="color: #1F2937; line-height: 1.6;">
                Thank you for joining Africa's premier creator-brand collaboration platform.
                Please use the code below to {purpose_text}.
            </p>
            <div style="text-align: center; margin: 30px 0;">
                <div style="background-color: #1F2937; color: #B5E61D; padding: 20px 40px;
                            font-size: 32px; font-weight: bold; letter-spacing: 8px;
                            border-radius: 10px; display: inline-block;">
                    {otp_code}
                </div>
            </div>
            <p style="color: #F59E0B; font-size: 14px; text-align: center;">
                This code will expire in 10 minutes.
            </p>
            <p style="color: #6B7280; font-size: 14px;">
                If you did not request this code, please ignore this email.
            </p>
        </div>
        <div style="background-color: #1F2937; padding: 20px; text-align: center;">
            <p style="color: #F3F4F6; margin: 0; font-size: 14px;">
                © 2025 BantuBuzz. All rights reserved.
            </p>
        </div>
    </body>
    </html>
    """

    send_email(subject, email, text_body, html_body)


def send_verification_email(email, token):
    """Send email verification"""
    frontend_url = current_app.config['FRONTEND_URL']
    verification_url = f"{frontend_url}/verify-email/{token}"

    subject = "Verify your BantuBuzz account"
    text_body = f"""
    Welcome to BantuBuzz!

    Please verify your email address by clicking the link below:
    {verification_url}

    If you did not create an account, please ignore this email.

    Best regards,
    The BantuBuzz Team
    """

    html_body = f"""
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #B5E61D; padding: 20px; text-align: center;">
            <h1 style="color: #1F2937; margin: 0;">BantuBuzz</h1>
        </div>
        <div style="padding: 30px; background-color: #F3F4F6;">
            <h2 style="color: #1F2937;">Welcome to BantuBuzz!</h2>
            <p style="color: #1F2937; line-height: 1.6;">
                Thank you for joining Africa's premier creator-brand collaboration platform.
                Please verify your email address to get started.
            </p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="{verification_url}"
                   style="background-color: #B5E61D; color: #1F2937; padding: 12px 30px;
                          text-decoration: none; border-radius: 5px; font-weight: bold;">
                    Verify Email Address
                </a>
            </div>
            <p style="color: #6B7280; font-size: 14px;">
                If you did not create an account, please ignore this email.
            </p>
        </div>
        <div style="background-color: #1F2937; padding: 20px; text-align: center;">
            <p style="color: #F3F4F6; margin: 0; font-size: 14px;">
                © 2025 BantuBuzz. All rights reserved.
            </p>
        </div>
    </body>
    </html>
    """

    send_email(subject, email, text_body, html_body)


def send_password_reset_email(email, token):
    """Send password reset email"""
    frontend_url = current_app.config['FRONTEND_URL']
    reset_url = f"{frontend_url}/reset-password/{token}"

    subject = "Reset your BantuBuzz password"
    text_body = f"""
    You requested to reset your password.

    Click the link below to reset your password:
    {reset_url}

    This link will expire in 1 hour.

    If you did not request a password reset, please ignore this email.

    Best regards,
    The BantuBuzz Team
    """

    html_body = f"""
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #B5E61D; padding: 20px; text-align: center;">
            <h1 style="color: #1F2937; margin: 0;">BantuBuzz</h1>
        </div>
        <div style="padding: 30px; background-color: #F3F4F6;">
            <h2 style="color: #1F2937;">Password Reset Request</h2>
            <p style="color: #1F2937; line-height: 1.6;">
                You requested to reset your password. Click the button below to create a new password.
            </p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="{reset_url}"
                   style="background-color: #B5E61D; color: #1F2937; padding: 12px 30px;
                          text-decoration: none; border-radius: 5px; font-weight: bold;">
                    Reset Password
                </a>
            </div>
            <p style="color: #F59E0B; font-size: 14px;">
                This link will expire in 1 hour.
            </p>
            <p style="color: #6B7280; font-size: 14px;">
                If you did not request a password reset, please ignore this email.
            </p>
        </div>
        <div style="background-color: #1F2937; padding: 20px; text-align: center;">
            <p style="color: #F3F4F6; margin: 0; font-size: 14px;">
                © 2025 BantuBuzz. All rights reserved.
            </p>
        </div>
    </body>
    </html>
    """

    send_email(subject, email, text_body, html_body)


def send_booking_confirmation_email(booking, brand_email, creator_email):
    """Send booking confirmation to both parties"""
    subject = f"New Booking Confirmation - {booking.package.title}"

    # Email to brand
    brand_text = f"""
    Your booking has been confirmed!

    Package: {booking.package.title}
    Amount: ${booking.amount}
    Booking ID: {booking.id}

    The creator will be notified and will start working on your project.

    Best regards,
    The BantuBuzz Team
    """

    # Email to creator
    creator_text = f"""
    You have a new booking!

    Package: {booking.package.title}
    Amount: ${booking.amount}
    Booking ID: {booking.id}

    Please log in to your dashboard to view the details and get started.

    Best regards,
    The BantuBuzz Team
    """

    send_email(subject, brand_email, brand_text)
    send_email(subject, creator_email, creator_text)
