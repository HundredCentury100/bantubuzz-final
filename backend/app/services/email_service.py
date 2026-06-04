from flask import current_app
from flask_mail import Message
from app import mail
from threading import Thread
from email.utils import formataddr


def send_async_email(app, msg):
    """Send email asynchronously"""
    with app.app_context():
        mail.send(msg)


def send_email(subject, recipients, text_body, html_body=None, sender_name='BantuBuzz', reply_to=None, attachments=None):
    """Send email"""
    # Format sender with display name using email.utils.formataddr
    sender_email = current_app.config.get('MAIL_DEFAULT_SENDER') or current_app.config.get('MAIL_USERNAME', 'user@bantubuzz.com')
    if isinstance(sender_email, (tuple, list)):
        sender_name = sender_name or sender_email[0]
        sender_email = sender_email[-1]
    sender_display = formataddr((sender_name or 'BantuBuzz', sender_email))

    msg = Message(
        subject=subject,
        recipients=recipients if isinstance(recipients, list) else [recipients],
        sender=sender_display,
        reply_to=reply_to
    )
    msg.body = text_body
    if html_body:
        msg.html = html_body
    for attachment in attachments or []:
        filename, content_type, data = attachment
        msg.attach(filename, content_type, data)

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


def send_welcome_email(user):
    """Send welcome email after account activation."""
    frontend_url = current_app.config.get('FRONTEND_URL', 'https://bantubuzz.com')
    is_brand = user.user_type == 'brand'
    dashboard_url = f"{frontend_url}/brand/dashboard" if is_brand else f"{frontend_url}/creator/dashboard"
    account_label = 'brand' if is_brand else 'creator'
    subject = "Welcome to BantuBuzz"
    text_body = f"""
Welcome to BantuBuzz!

Your {account_label} account is now active.

You can now sign in and start using your dashboard:
{dashboard_url}

Best regards,
The BantuBuzz Team
"""
    html_body = f"""
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #F9FAFB;">
    <div style="background-color: #B5E61D; padding: 20px; text-align: center;">
        <h1 style="color: #1F2937; margin: 0;">BantuBuzz</h1>
    </div>
    <div style="padding: 30px; background-color: white;">
        <h2 style="color: #1F2937;">Welcome to BantuBuzz</h2>
        <p style="color: #1F2937; line-height: 1.6;">
            Your {account_label} account is now active. You can sign in and start using your dashboard.
        </p>
        <div style="text-align: center; margin: 30px 0;">
            <a href="{dashboard_url}"
               style="background-color: #B5E61D; color: #1F2937; padding: 12px 30px;
                      text-decoration: none; border-radius: 5px; font-weight: bold;">
                Open Dashboard
            </a>
        </div>
    </div>
    <div style="background-color: #1F2937; padding: 20px; text-align: center;">
        <p style="color: #F3F4F6; margin: 0; font-size: 14px;">Powered by BantuBuzz</p>
    </div>
</body>
</html>
"""
    send_email(subject, user.email, text_body, html_body)


def send_two_factor_code_email(email, otp_code):
    """Send email-based two-factor authentication code."""
    subject = f"Your BantuBuzz login code: {otp_code}"
    text_body = f"""
Your BantuBuzz login code is: {otp_code}

This code expires in 10 minutes. If you did not try to sign in, reset your password immediately.

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
        <h2 style="color: #1F2937;">Login Verification Code</h2>
        <p style="color: #1F2937;">Use this code to finish signing in:</p>
        <div style="text-align: center; margin: 30px 0;">
            <div style="background-color: #1F2937; color: #B5E61D; padding: 20px 40px;
                        font-size: 32px; font-weight: bold; letter-spacing: 8px;
                        border-radius: 10px; display: inline-block;">
                {otp_code}
            </div>
        </div>
        <p style="color: #6B7280; font-size: 14px;">This code expires in 10 minutes.</p>
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


def send_collaboration_declined_email(brand_email, brand_name, creator_name, collaboration_title, refund_amount, decline_reason, counter_offer=None):
    """Send email notification when creator declines a collaboration"""
    frontend_url = current_app.config.get('FRONTEND_URL', 'https://bantubuzz.com')

    subject = f"Collaboration Declined - {collaboration_title}"

    counter_offer_text = ""
    counter_offer_html = ""
    if counter_offer:
        counter_offer_text = f"\n\nCounter Offer:\n  Amount: ${counter_offer.get('amount')}\n  Duration: {counter_offer.get('duration')} days\n  Details: {counter_offer.get('details', 'N/A')}"
        counter_offer_html = f"""
            <div style="background-color: #FEF3C7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #F59E0B;">
                <h3 style="color: #92400E; margin-top: 0;">Counter Offer Available</h3>
                <p style="margin: 10px 0;"><strong>Amount:</strong> ${counter_offer.get('amount')}</p>
                <p style="margin: 10px 0;"><strong>Duration:</strong> {counter_offer.get('duration')} days</p>
                <p style="margin: 10px 0;"><strong>Details:</strong> {counter_offer.get('details', 'N/A')}</p>
                <div style="text-align: center; margin-top: 15px;">
                    <a href="{frontend_url}/brand/wallet"
                       style="background-color: #F59E0B; color: white; padding: 10px 24px;
                              text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                        View Counter Offer
                    </a>
                </div>
            </div>
        """

    text_body = f"""
    Hello {brand_name},

    We're writing to inform you that {creator_name} has declined your collaboration request for "{collaboration_title}".

    Decline Reason:
    {decline_reason}{counter_offer_text}

    Refund Information:
    The full amount of ${refund_amount:.2f} has been automatically refunded to your BantuBuzz wallet and is available for immediate use.

    Next Steps:
    - You can browse other creators and packages on our platform
    - Consider reaching out to other creators who match your campaign needs
    - Check your wallet to confirm the refund

    View Your Wallet: {frontend_url}/brand/wallet

    If you have any questions or need assistance finding the right creator for your campaign, our support team is here to help.

    Best regards,
    The BantuBuzz Team
    """

    html_body = f"""
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #F9FAFB;">
        <div style="background-color: #B5E61D; padding: 20px; text-align: center;">
            <h1 style="color: #1F2937; margin: 0;">BantuBuzz</h1>
        </div>
        <div style="padding: 30px; background-color: white;">
            <h2 style="color: #1F2937;">Collaboration Declined</h2>
            <p style="color: #1F2937; line-height: 1.6;">
                Hello {brand_name},
            </p>
            <p style="color: #1F2937; line-height: 1.6;">
                We're writing to inform you that <strong>{creator_name}</strong> has declined your collaboration request for <strong>"{collaboration_title}"</strong>.
            </p>

            <div style="background-color: #FEE2E2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #DC2626;">
                <h3 style="color: #991B1B; margin-top: 0;">Decline Reason</h3>
                <p style="color: #7F1D1D; margin: 0;">{decline_reason}</p>
            </div>

            {counter_offer_html}

            <div style="background-color: #D1FAE5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10B981;">
                <h3 style="color: #065F46; margin-top: 0;">✓ Refund Processed</h3>
                <p style="color: #064E3B; margin: 10px 0;">
                    The full amount of <strong>${refund_amount:.2f}</strong> has been automatically refunded to your BantuBuzz wallet and is available for immediate use.
                </p>
                <div style="text-align: center; margin-top: 15px;">
                    <a href="{frontend_url}/brand/wallet"
                       style="background-color: #10B981; color: white; padding: 10px 24px;
                              text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                        View Wallet
                    </a>
                </div>
            </div>

            <div style="background-color: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #1F2937; margin-top: 0;">What's Next?</h3>
                <ul style="color: #4B5563; line-height: 1.8;">
                    <li>Browse other creators and packages on our platform</li>
                    <li>Consider reaching out to other creators who match your campaign needs</li>
                    <li>Your refunded amount is ready to use for new bookings</li>
                </ul>
                <div style="text-align: center; margin-top: 15px;">
                    <a href="{frontend_url}/brand/discover"
                       style="background-color: #B5E61D; color: #1F2937; padding: 10px 24px;
                              text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                        Discover Creators
                    </a>
                </div>
            </div>

            <p style="color: #6B7280; font-size: 14px; margin-top: 30px;">
                If you have any questions or need assistance finding the right creator for your campaign, our support team is here to help.
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

    send_email(subject, brand_email, text_body, html_body)


def send_subscription_limit_reached_email(user_email, user_name, user_type, feature_name, current_limit, plan_name, next_plan_name):
    """Send email notification when user hits their subscription limit"""
    frontend_url = current_app.config.get('FRONTEND_URL', 'https://bantubuzz.com')
    upgrade_url = f"{frontend_url}/{user_type}/subscriptions"

    feature_descriptions = {
        'active_collaborations': 'active collaborations',
        'proposals_per_month': 'proposals this month',
        'packages': 'packages',
        'campaigns_per_month': 'campaigns this month',
    }
    feature_display = feature_descriptions.get(feature_name, feature_name)

    subject = f"You've reached your {plan_name} plan limit"

    text_body = f"""
    Hello {user_name},

    You've reached your {plan_name} plan limit for {feature_display}.

    Current Limit: {current_limit}

    To continue growing your business on BantuBuzz, consider upgrading to the {next_plan_name} plan for:
    - More {feature_display}
    - Lower commission rates
    - Priority support
    - And more exclusive features!

    Upgrade Now: {upgrade_url}

    Need help choosing the right plan? Our team is here to assist you.

    Best regards,
    The BantuBuzz Team
    """

    html_body = f"""
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #F9FAFB;">
        <div style="background-color: #B5E61D; padding: 20px; text-align: center;">
            <h1 style="color: #1F2937; margin: 0;">BantuBuzz</h1>
        </div>
        <div style="padding: 30px; background-color: white;">
            <h2 style="color: #1F2937;">Plan Limit Reached</h2>
            <p style="color: #1F2937; line-height: 1.6;">
                Hello {user_name},
            </p>
            <p style="color: #1F2937; line-height: 1.6;">
                You've reached your <strong>{plan_name}</strong> plan limit for <strong>{feature_display}</strong>.
            </p>

            <div style="background-color: #FEF3C7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #F59E0B;">
                <h3 style="color: #92400E; margin-top: 0;">⚠️ Current Limit Reached</h3>
                <p style="color: #78350F; margin: 10px 0; font-size: 18px;">
                    <strong>{current_limit}</strong> {feature_display}
                </p>
            </div>

            <div style="background-color: #DBEAFE; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3B82F6;">
                <h3 style="color: #1E40AF; margin-top: 0;">✨ Upgrade to {next_plan_name}</h3>
                <p style="color: #1E3A8A; margin: 10px 0;">
                    Continue growing your business with:
                </p>
                <ul style="color: #1E3A8A; line-height: 1.8;">
                    <li>More {feature_display}</li>
                    <li>Lower commission rates</li>
                    <li>Priority support</li>
                    <li>Exclusive features</li>
                </ul>
                <div style="text-align: center; margin-top: 15px;">
                    <a href="{upgrade_url}"
                       style="background-color: #3B82F6; color: white; padding: 12px 30px;
                              text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                        Upgrade to {next_plan_name}
                    </a>
                </div>
            </div>

            <p style="color: #6B7280; font-size: 14px; margin-top: 30px;">
                Need help choosing the right plan? Our team is here to assist you.
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

    send_email(subject, user_email, text_body, html_body)


def send_subscription_upgraded_email(user_email, user_name, old_plan_name, new_plan_name, new_features):
    """Send email confirmation when user successfully upgrades their plan"""
    frontend_url = current_app.config.get('FRONTEND_URL', 'https://bantubuzz.com')

    subject = f"Welcome to {new_plan_name}! 🎉"

    features_text = '\n'.join([f"  • {feature}" for feature in new_features])
    features_html = ''.join([f"<li>{feature}</li>" for feature in new_features])

    text_body = f"""
    Hello {user_name},

    Congratulations! You've successfully upgraded from {old_plan_name} to {new_plan_name}! 🎉

    Your new plan includes:
{features_text}

    These benefits are active immediately. Start enjoying your enhanced experience on BantuBuzz!

    Thank you for growing with us.

    Best regards,
    The BantuBuzz Team
    """

    html_body = f"""
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #F9FAFB;">
        <div style="background-color: #B5E61D; padding: 20px; text-align: center;">
            <h1 style="color: #1F2937; margin: 0;">BantuBuzz</h1>
        </div>
        <div style="padding: 30px; background-color: white;">
            <div style="text-align: center; margin-bottom: 20px;">
                <span style="font-size: 60px;">🎉</span>
            </div>
            <h2 style="color: #1F2937; text-align: center;">Welcome to {new_plan_name}!</h2>
            <p style="color: #1F2937; line-height: 1.6;">
                Hello {user_name},
            </p>
            <p style="color: #1F2937; line-height: 1.6;">
                Congratulations! You've successfully upgraded from <strong>{old_plan_name}</strong> to <strong>{new_plan_name}</strong>!
            </p>

            <div style="background-color: #D1FAE5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10B981;">
                <h3 style="color: #065F46; margin-top: 0;">✓ Your New Benefits</h3>
                <ul style="color: #064E3B; line-height: 1.8;">
                    {features_html}
                </ul>
                <p style="color: #065F46; margin: 10px 0; font-weight: bold;">
                    These benefits are active immediately!
                </p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
                <a href="{frontend_url}"
                   style="background-color: #B5E61D; color: #1F2937; padding: 12px 30px;
                          text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                    Start Exploring
                </a>
            </div>

            <p style="color: #6B7280; font-size: 14px; margin-top: 30px;">
                Thank you for growing with us. We're excited to support your journey!
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

    send_email(subject, user_email, text_body, html_body)


def send_subscription_approaching_limit_email(user_email, user_name, feature_name, current, limit, plan_name, user_type):
    """Send email notification when user is approaching their limit (80%+)"""
    frontend_url = current_app.config.get('FRONTEND_URL', 'https://bantubuzz.com')
    upgrade_url = f"{frontend_url}/{user_type}/subscriptions"

    feature_descriptions = {
        'active_collaborations': 'active collaborations',
        'proposals_per_month': 'proposals this month',
        'packages': 'packages',
        'campaigns_per_month': 'campaigns this month',
    }
    feature_display = feature_descriptions.get(feature_name, feature_name)

    percentage = int((current / limit) * 100)
    remaining = limit - current

    subject = f"Approaching your {plan_name} plan limit"

    text_body = f"""
    Hello {user_name},

    You're approaching your {plan_name} plan limit for {feature_display}.

    Current Usage: {current} of {limit} ({percentage}%)
    Remaining: {remaining}

    To ensure uninterrupted service, consider upgrading to a higher plan before you reach your limit.

    Upgrade Now: {upgrade_url}

    Best regards,
    The BantuBuzz Team
    """

    html_body = f"""
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #F9FAFB;">
        <div style="background-color: #B5E61D; padding: 20px; text-align: center;">
            <h1 style="color: #1F2937; margin: 0;">BantuBuzz</h1>
        </div>
        <div style="padding: 30px; background-color: white;">
            <h2 style="color: #1F2937;">Approaching Your Plan Limit</h2>
            <p style="color: #1F2937; line-height: 1.6;">
                Hello {user_name},
            </p>
            <p style="color: #1F2937; line-height: 1.6;">
                You're approaching your <strong>{plan_name}</strong> plan limit for <strong>{feature_display}</strong>.
            </p>

            <div style="background-color: #FEF3C7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #F59E0B;">
                <h3 style="color: #92400E; margin-top: 0;">Current Usage</h3>
                <p style="color: #78350F; margin: 10px 0; font-size: 24px;">
                    <strong>{current} of {limit}</strong> ({percentage}%)
                </p>
                <div style="background-color: #FDE68A; border-radius: 10px; height: 20px; overflow: hidden; margin: 15px 0;">
                    <div style="background-color: #F59E0B; height: 100%; width: {percentage}%;"></div>
                </div>
                <p style="color: #78350F; margin: 10px 0;">
                    <strong>{remaining}</strong> {feature_display} remaining
                </p>
            </div>

            <p style="color: #1F2937; line-height: 1.6;">
                To ensure uninterrupted service, consider upgrading to a higher plan before you reach your limit.
            </p>

            <div style="text-align: center; margin: 30px 0;">
                <a href="{upgrade_url}"
                   style="background-color: #F59E0B; color: white; padding: 12px 30px;
                          text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                    View Upgrade Options
                </a>
            </div>
        </div>
        <div style="background-color: #1F2937; padding: 20px; text-align: center;">
            <p style="color: #F3F4F6; margin: 0; font-size: 14px;">
                © 2025 BantuBuzz. All rights reserved.
            </p>
        </div>
    </body>
    </html>
    """

    send_email(subject, user_email, text_body, html_body)


def send_campaign_invitation_email(creator_email, creator_name, campaign_title, brand_name, invitation_type, message, campaign_url):
    """Send email notification when creator is invited to a campaign"""
    frontend_url = current_app.config.get('FRONTEND_URL', 'https://bantubuzz.com')

    invitation_action = "apply for" if invitation_type == "invite_to_apply" else "join"
    subject = f"Campaign Invitation: {campaign_title}"

    custom_message_text = f"\n\nPersonal Message from {brand_name}:\n{message}\n" if message else ""
    custom_message_html = f"""
        <div style="background-color: #EDE9FE; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #7C3AED;">
            <h3 style="color: #5B21B6; margin-top: 0;">💬 Message from {brand_name}</h3>
            <p style="color: #4C1D95; margin: 0; font-style: italic;">"{message}"</p>
        </div>
    """ if message else ""

    # Build next steps text based on invitation type
    if invitation_type == 'invite_to_apply':
        next_steps_text = f"1. Review the campaign details\n2. Submit your proposal if interested\n3. {brand_name} will review your proposal and get back to you"
    else:
        next_steps_text = f"1. Review the campaign details\n2. Accept the invitation to join directly\n3. Start collaborating with {brand_name}!"

    text_body = f"""
    Hello {creator_name},

    Great news! {brand_name} has invited you to {invitation_action} their campaign "{campaign_title}".
    {custom_message_text}
    This is a great opportunity to collaborate with {brand_name} and showcase your creative talents!

    What happens next?
    {next_steps_text}

    View Campaign: {campaign_url}

    Don't miss this opportunity - respond to the invitation today!

    Best regards,
    The BantuBuzz Team
    """

    html_body = f"""
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #F9FAFB;">
        <div style="background-color: #B5E61D; padding: 20px; text-align: center;">
            <h1 style="color: #1F2937; margin: 0;">BantuBuzz</h1>
        </div>
        <div style="padding: 30px; background-color: white;">
            <div style="text-align: center; margin-bottom: 20px;">
                <span style="font-size: 60px;">🎯</span>
            </div>
            <h2 style="color: #1F2937; text-align: center;">You've Been Invited!</h2>
            <p style="color: #1F2937; line-height: 1.6;">
                Hello {creator_name},
            </p>
            <p style="color: #1F2937; line-height: 1.6;">
                Great news! <strong>{brand_name}</strong> has invited you to <strong>{invitation_action}</strong> their campaign <strong>"{campaign_title}"</strong>.
            </p>

            {custom_message_html}

            <div style="background-color: #DBEAFE; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3B82F6;">
                <h3 style="color: #1E40AF; margin-top: 0;">✨ This is a Great Opportunity!</h3>
                <p style="color: #1E3A8A; margin: 10px 0;">
                    {brand_name} specifically selected you for this campaign. This is your chance to showcase your creative talents and build a meaningful partnership!
                </p>
            </div>

            <div style="background-color: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #1F2937; margin-top: 0;">What Happens Next?</h3>
                <ol style="color: #4B5563; line-height: 1.8; margin: 10px 0; padding-left: 20px;">
                    {'<li>Review the campaign details and requirements</li><li>Submit your proposal if you are interested</li><li>' + brand_name + ' will review your proposal and get back to you</li>' if invitation_type == 'invite_to_apply' else '<li>Review the campaign details and requirements</li><li>Accept the invitation to join the campaign directly</li><li>Start collaborating with ' + brand_name + '!</li>'}
                </ol>
            </div>

            <div style="text-align: center; margin: 30px 0;">
                <a href="{campaign_url}"
                   style="background-color: #B5E61D; color: #1F2937; padding: 15px 40px;
                          text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; font-size: 16px;">
                    View Campaign & Respond
                </a>
            </div>

            <p style="color: #DC2626; text-align: center; font-weight: bold; margin-top: 20px;">
                ⏰ Don't miss this opportunity - respond to the invitation today!
            </p>

            <p style="color: #6B7280; font-size: 14px; margin-top: 30px;">
                If you have any questions about this invitation, feel free to reach out to our support team.
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

    send_email(subject, creator_email, text_body, html_body)


def send_invitation_accepted_email(brand_email, creator_name, campaign_title, response_message):
    """Send email notification when creator accepts campaign invitation"""
    frontend_url = current_app.config.get('FRONTEND_URL', 'https://bantubuzz.com')

    subject = f"Invitation Accepted - {campaign_title}"

    response_text = f"\n\nCreator's Message:\n{response_message}\n" if response_message else ""
    response_html = f"""
        <div style="background-color: #EDE9FE; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #7C3AED;">
            <h3 style="color: #5B21B6; margin-top: 0;">💬 Message from {creator_name}</h3>
            <p style="color: #4C1D95; margin: 0; font-style: italic;">"{response_message}"</p>
        </div>
    """ if response_message else ""

    text_body = f"""
    Great news!

    {creator_name} has accepted your invitation for the campaign "{campaign_title}"!
    {response_text}
    The collaboration is now active. You can now coordinate with {creator_name} through the campaign chat and track progress in your dashboard.

    Next Steps:
    1. Review the collaboration details
    2. Start communicating with {creator_name} via campaign chat
    3. Track the campaign performance in your analytics dashboard

    View Campaign: {frontend_url}/campaigns

    Best regards,
    The BantuBuzz Team
    """

    html_body = f"""
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #F9FAFB;">
        <div style="background-color: #B5E61D; padding: 20px; text-align: center;">
            <h1 style="color: #1F2937; margin: 0;">BantuBuzz</h1>
        </div>
        <div style="padding: 30px; background-color: white;">
            <div style="text-align: center; margin-bottom: 20px;">
                <span style="font-size: 60px;">🎉</span>
            </div>
            <h2 style="color: #1F2937; text-align: center;">Invitation Accepted!</h2>
            <p style="color: #1F2937; line-height: 1.6;">
                Great news! <strong>{creator_name}</strong> has accepted your invitation for the campaign <strong>"{campaign_title}"</strong>!
            </p>

            {response_html}

            <div style="background-color: #D1FAE5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10B981;">
                <h3 style="color: #065F46; margin-top: 0;">✓ Collaboration Active</h3>
                <p style="color: #064E3B; margin: 10px 0;">
                    The collaboration is now active. You can coordinate with {creator_name} and track progress in your dashboard.
                </p>
            </div>

            <div style="background-color: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #1F2937; margin-top: 0;">What's Next?</h3>
                <ol style="color: #4B5563; line-height: 1.8; margin: 10px 0; padding-left: 20px;">
                    <li>Review the collaboration details</li>
                    <li>Start communicating via campaign chat</li>
                    <li>Track campaign performance in your analytics dashboard</li>
                </ol>
            </div>

            <div style="text-align: center; margin: 30px 0;">
                <a href="{frontend_url}/campaigns"
                   style="background-color: #B5E61D; color: #1F2937; padding: 15px 40px;
                          text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; font-size: 16px;">
                    View Campaign Dashboard
                </a>
            </div>
        </div>
        <div style="background-color: #1F2937; padding: 20px; text-align: center;">
            <p style="color: #F3F4F6; margin: 0; font-size: 14px;">
                © 2025 BantuBuzz. All rights reserved.
            </p>
        </div>
    </body>
    </html>
    """

    send_email(subject, brand_email, text_body, html_body)


def send_invitation_declined_email(brand_email, creator_name, campaign_title, response_message):
    """Send email notification when creator declines campaign invitation"""
    frontend_url = current_app.config.get('FRONTEND_URL', 'https://bantubuzz.com')

    subject = f"Invitation Declined - {campaign_title}"

    response_text = f"\n\nCreator's Message:\n{response_message}\n" if response_message else ""
    response_html = f"""
        <div style="background-color: #FEE2E2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #DC2626;">
            <h3 style="color: #991B1B; margin-top: 0;">Message from {creator_name}</h3>
            <p style="color: #7F1D1D; margin: 0; font-style: italic;">"{response_message}"</p>
        </div>
    """ if response_message else ""

    text_body = f"""
    Hello,

    {creator_name} has declined your invitation for the campaign "{campaign_title}".
    {response_text}
    Don't worry - there are many talented creators on BantuBuzz who would love to collaborate with you!

    Next Steps:
    1. Browse other creators who match your campaign requirements
    2. Send invitations to additional creators
    3. Review proposals from interested creators

    Find Creators: {frontend_url}/discover

    Best regards,
    The BantuBuzz Team
    """

    html_body = f"""
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #F9FAFB;">
        <div style="background-color: #B5E61D; padding: 20px; text-align: center;">
            <h1 style="color: #1F2937; margin: 0;">BantuBuzz</h1>
        </div>
        <div style="padding: 30px; background-color: white;">
            <h2 style="color: #1F2937;">Invitation Declined</h2>
            <p style="color: #1F2937; line-height: 1.6;">
                <strong>{creator_name}</strong> has declined your invitation for the campaign <strong>"{campaign_title}"</strong>.
            </p>

            {response_html}

            <div style="background-color: #DBEAFE; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3B82F6;">
                <h3 style="color: #1E40AF; margin-top: 0;">Keep Going!</h3>
                <p style="color: #1E3A8A; margin: 10px 0;">
                    Don't worry - there are many talented creators on BantuBuzz who would love to collaborate with you!
                </p>
            </div>

            <div style="background-color: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #1F2937; margin-top: 0;">What's Next?</h3>
                <ol style="color: #4B5563; line-height: 1.8; margin: 10px 0; padding-left: 20px;">
                    <li>Browse other creators who match your requirements</li>
                    <li>Send invitations to additional creators</li>
                    <li>Review proposals from interested creators</li>
                </ol>
            </div>

            <div style="text-align: center; margin: 30px 0;">
                <a href="{frontend_url}/discover"
                   style="background-color: #B5E61D; color: #1F2937; padding: 15px 40px;
                          text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; font-size: 16px;">
                    Discover Creators
                </a>
            </div>
        </div>
        <div style="background-color: #1F2937; padding: 20px; text-align: center;">
            <p style="color: #F3F4F6; margin: 0; font-size: 14px;">
                © 2025 BantuBuzz. All rights reserved.
            </p>
        </div>
    </body>
    </html>
    """

    send_email(subject, brand_email, text_body, html_body)


def send_invitation_cancelled_email(invitation_id, creator_email):
    """Send email notification when brand cancels an invitation"""
    from app.models import CampaignInvitation, Campaign

    invitation = CampaignInvitation.query.get(invitation_id)
    if not invitation:
        return

    campaign = Campaign.query.get(invitation.campaign_id)
    if not campaign:
        return

    frontend_url = current_app.config.get('FRONTEND_URL', 'https://bantubuzz.com')

    subject = f"Invitation Cancelled - {campaign.title}"

    text_body = f"""
    Hello,

    The brand has cancelled their invitation for you to join the campaign "{campaign.title}".

    You can continue browsing other campaign opportunities on BantuBuzz.

    Browse Campaigns: {frontend_url}/campaigns

    Best regards,
    The BantuBuzz Team
    """

    html_body = f"""
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #F9FAFB;">
        <div style="background-color: #B5E61D; padding: 20px; text-align: center;">
            <h1 style="color: #1F2937; margin: 0;">BantuBuzz</h1>
        </div>
        <div style="padding: 30px; background-color: white;">
            <h2 style="color: #1F2937;">Invitation Cancelled</h2>
            <p style="color: #1F2937; line-height: 1.6;">
                The brand has cancelled their invitation for you to join the campaign <strong>"{campaign.title}"</strong>.
            </p>

            <div style="background-color: #DBEAFE; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3B82F6;">
                <p style="color: #1E3A8A; margin: 10px 0;">
                    Don't worry - there are many other exciting campaign opportunities waiting for you on BantuBuzz!
                </p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
                <a href="{frontend_url}/campaigns"
                   style="background-color: #B5E61D; color: #1F2937; padding: 15px 40px;
                          text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; font-size: 16px;">
                    Browse Campaigns
                </a>
            </div>
        </div>
        <div style="background-color: #1F2937; padding: 20px; text-align: center;">
            <p style="color: #F3F4F6; margin: 0; font-size: 14px;">
                © 2025 BantuBuzz. All rights reserved.
            </p>
        </div>
    </body>
    </html>
    """

    send_email(subject, creator_email, text_body, html_body)


def send_campaign_payment_notification_email(payment_id, recipient_email, recipient_name, is_brand=True):
    """Send email notification for campaign payment"""
    from app.models import CampaignPayment, Campaign

    payment = CampaignPayment.query.get(payment_id)
    if not payment:
        return

    campaign = Campaign.query.get(payment.campaign_id)
    if not campaign:
        return

    frontend_url = current_app.config.get('FRONTEND_URL', 'https://bantubuzz.com')

    if is_brand:
        subject = f"Payment Initiated - {campaign.title}"

        text_body = f"""
        Hello {recipient_name},

        Your payment of R{float(payment.total_amount):.2f} for the campaign "{campaign.title}" has been initiated.

        Payment Details:
        - Amount: R{float(payment.total_amount):.2f}
        - Method: {payment.payment_method}
        - Status: {payment.status}
        - Creators: {len(payment.items) if hasattr(payment, 'items') else 'Multiple'}

        The payment will be processed shortly. You will receive a confirmation once completed.

        View Payment: {frontend_url}/campaigns/{campaign.id}

        Best regards,
        The BantuBuzz Team
        """

        html_body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #F9FAFB;">
            <div style="background-color: #B5E61D; padding: 20px; text-align: center;">
                <h1 style="color: #1F2937; margin: 0;">BantuBuzz</h1>
            </div>
            <div style="padding: 30px; background-color: white;">
                <h2 style="color: #1F2937;">Payment Initiated</h2>
                <p style="color: #1F2937; line-height: 1.6;">
                    Hello {recipient_name},
                </p>
                <p style="color: #1F2937; line-height: 1.6;">
                    Your payment for the campaign <strong>"{campaign.title}"</strong> has been initiated.
                </p>

                <div style="background-color: #DBEAFE; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3B82F6;">
                    <h3 style="color: #1E40AF; margin-top: 0;">Payment Details</h3>
                    <p style="color: #1E3A8A; margin: 10px 0;">
                        <strong>Amount:</strong> R{float(payment.total_amount):.2f}<br>
                        <strong>Method:</strong> {payment.payment_method}<br>
                        <strong>Status:</strong> {payment.status}
                    </p>
                </div>

                <p style="color: #1F2937; line-height: 1.6;">
                    The payment will be processed shortly. You will receive a confirmation once completed.
                </p>

                <div style="text-align: center; margin: 30px 0;">
                    <a href="{frontend_url}/campaigns/{campaign.id}"
                       style="background-color: #B5E61D; color: #1F2937; padding: 15px 40px;
                              text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; font-size: 16px;">
                        View Campaign
                    </a>
                </div>
            </div>
            <div style="background-color: #1F2937; padding: 20px; text-align: center;">
                <p style="color: #F3F4F6; margin: 0; font-size: 14px;">
                    © 2025 BantuBuzz. All rights reserved.
                </p>
            </div>
        </body>
        </html>
        """
    else:
        # Creator email
        subject = f"Payment Received - {campaign.title}"

        text_body = f"""
        Hello {recipient_name},

        Great news! You've received a payment for your collaboration on the campaign "{campaign.title}".

        The funds have been credited to your BantuBuzz wallet and are available for withdrawal.

        View Earnings: {frontend_url}/creator/earnings

        Best regards,
        The BantuBuzz Team
        """

        html_body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #F9FAFB;">
            <div style="background-color: #B5E61D; padding: 20px; text-align: center;">
                <h1 style="color: #1F2937; margin: 0;">BantuBuzz</h1>
            </div>
            <div style="padding: 30px; background-color: white;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <span style="font-size: 60px;">💰</span>
                </div>
                <h2 style="color: #1F2937; text-align: center;">Payment Received!</h2>
                <p style="color: #1F2937; line-height: 1.6;">
                    Hello {recipient_name},
                </p>
                <p style="color: #1F2937; line-height: 1.6;">
                    Great news! You've received a payment for your collaboration on the campaign <strong>"{campaign.title}"</strong>.
                </p>

                <div style="background-color: #D1FAE5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10B981;">
                    <h3 style="color: #065F46; margin-top: 0;">✓ Funds Available</h3>
                    <p style="color: #064E3B; margin: 10px 0;">
                        The funds have been credited to your BantuBuzz wallet and are available for withdrawal.
                    </p>
                </div>

                <div style="text-align: center; margin: 30px 0;">
                    <a href="{frontend_url}/creator/earnings"
                       style="background-color: #10B981; color: white; padding: 15px 40px;
                              text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; font-size: 16px;">
                        View Earnings
                    </a>
                </div>
            </div>
            <div style="background-color: #1F2937; padding: 20px; text-align: center;">
                <p style="color: #F3F4F6; margin: 0; font-size: 14px;">
                    © 2025 BantuBuzz. All rights reserved.
                </p>
            </div>
        </body>
        </html>
        """

    send_email(subject, recipient_email, text_body, html_body)


def send_campaign_chat_message_notification_email(recipient_email, recipient_name, sender_name, campaign_title, message_preview, chat_url):
    """Send email notification for new campaign chat message"""
    subject = f"New message from {sender_name} - {campaign_title}"

    text_body = f"""
    Hello {recipient_name},

    You have a new message from {sender_name} in the campaign "{campaign_title}":

    "{message_preview}"

    View and reply to this message in your campaign chat.

    View Chat: {chat_url}

    Best regards,
    The BantuBuzz Team
    """

    html_body = f"""
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #F9FAFB;">
        <div style="background-color: #B5E61D; padding: 20px; text-align: center;">
            <h1 style="color: #1F2937; margin: 0;">BantuBuzz</h1>
        </div>
        <div style="padding: 30px; background-color: white;">
            <h2 style="color: #1F2937;">New Campaign Message</h2>
            <p style="color: #1F2937; line-height: 1.6;">
                Hello {recipient_name},
            </p>
            <p style="color: #1F2937; line-height: 1.6;">
                You have a new message from <strong>{sender_name}</strong> in the campaign <strong>"{campaign_title}"</strong>:
            </p>

            <div style="background-color: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #B5E61D;">
                <p style="color: #1F2937; margin: 0; font-style: italic;">
                    "{message_preview}"
                </p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
                <a href="{chat_url}"
                   style="background-color: #B5E61D; color: #1F2937; padding: 15px 40px;
                          text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; font-size: 16px;">
                    View & Reply
                </a>
            </div>

            <p style="color: #6B7280; font-size: 14px; margin-top: 30px;">
                💡 Tip: Turn off email notifications for chats in your settings if you prefer in-app notifications only.
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

    send_email(subject, recipient_email, text_body, html_body)


def send_custom_package_request_email(creator_email, creator_name, brand_name, budget, deliverables, notes):
    """Send email notification when brand sends custom package request to creator"""
    frontend_url = current_app.config.get('FRONTEND_URL', 'https://bantubuzz.com')

    subject = f"Custom Package Request from {brand_name}"

    deliverables_text = '\n'.join([f"  • {item}" for item in deliverables])
    deliverables_html = ''.join([f"<li>{item}</li>" for item in deliverables])

    notes_text = f"\n\nAdditional Notes:\n{notes}\n" if notes else ""
    notes_html = f"""
        <div style="background-color: #EDE9FE; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #7C3AED;">
            <h3 style="color: #5B21B6; margin-top: 0;">📝 Additional Notes</h3>
            <p style="color: #4C1D95; margin: 0; font-style: italic;">"{notes}"</p>
        </div>
    """ if notes else ""

    text_body = f"""
    Hello {creator_name},

    Great news! {brand_name} has sent you a custom package request on BantuBuzz!

    Budget: ${budget}

    Expected Deliverables:
{deliverables_text}{notes_text}

    This is a great opportunity to create a custom package that matches the brand's specific needs!

    What Happens Next?
    1. Review the request details in your messages
    2. Create a custom package offer with your pricing and timeline
    3. Send the offer to {brand_name} for their approval

    View Request: {frontend_url}/messages

    Don't miss this opportunity - respond to the request today!

    Best regards,
    The BantuBuzz Team
    """

    html_body = f"""
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #F9FAFB;">
        <div style="background-color: #B5E61D; padding: 20px; text-align: center;">
            <h1 style="color: #1F2937; margin: 0;">BantuBuzz</h1>
        </div>
        <div style="padding: 30px; background-color: white;">
            <div style="text-align: center; margin-bottom: 20px;">
                <span style="font-size: 60px;">📦</span>
            </div>
            <h2 style="color: #1F2937; text-align: center;">Custom Package Request!</h2>
            <p style="color: #1F2937; line-height: 1.6;">
                Hello {creator_name},
            </p>
            <p style="color: #1F2937; line-height: 1.6;">
                Great news! <strong>{brand_name}</strong> has sent you a custom package request on BantuBuzz!
            </p>

            <div style="background-color: #DBEAFE; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3B82F6;">
                <h3 style="color: #1E40AF; margin-top: 0;">💰 Budget</h3>
                <p style="color: #1E3A8A; margin: 10px 0; font-size: 24px;">
                    <strong>${budget}</strong>
                </p>
            </div>

            <div style="background-color: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #1F2937; margin-top: 0;">Expected Deliverables</h3>
                <ul style="color: #4B5563; line-height: 1.8; margin: 10px 0; padding-left: 20px;">
                    {deliverables_html}
                </ul>
            </div>

            {notes_html}

            <div style="background-color: #FEF3C7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #F59E0B;">
                <h3 style="color: #92400E; margin-top: 0;">✨ Great Opportunity!</h3>
                <p style="color: #78350F; margin: 10px 0;">
                    {brand_name} specifically requested a custom package from you. This is your chance to create a tailored offering that matches their needs!
                </p>
            </div>

            <div style="background-color: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #1F2937; margin-top: 0;">What Happens Next?</h3>
                <ol style="color: #4B5563; line-height: 1.8; margin: 10px 0; padding-left: 20px;">
                    <li>Review the request details in your messages</li>
                    <li>Create a custom package offer with your pricing and timeline</li>
                    <li>Send the offer to {brand_name} for their approval</li>
                </ol>
            </div>

            <div style="text-align: center; margin: 30px 0;">
                <a href="{frontend_url}/messages"
                   style="background-color: #B5E61D; color: #1F2937; padding: 15px 40px;
                          text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; font-size: 16px;">
                    View Request & Respond
                </a>
            </div>

            <p style="color: #DC2626; text-align: center; font-weight: bold; margin-top: 20px;">
                ⏰ Don't miss this opportunity - respond to the request today!
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

    send_email(subject, creator_email, text_body, html_body)


def send_custom_package_offer_email(brand_email, brand_name, creator_name, title, price, deliverables, delivery_time_days):
    """Send email notification when creator sends custom package offer to brand"""
    frontend_url = current_app.config.get('FRONTEND_URL', 'https://bantubuzz.com')

    subject = f"Custom Package Offer from {creator_name}"

    deliverables_text = '\n'.join([f"  • {item}" for item in deliverables])
    deliverables_html = ''.join([f"<li>{item}</li>" for item in deliverables])

    text_body = f"""
    Hello {brand_name},

    {creator_name} has sent you a custom package offer on BantuBuzz!

    Package: {title}
    Price: ${price}
    Delivery Time: {delivery_time_days} days

    Deliverables:
{deliverables_text}

    Review the offer and decide if it meets your needs!

    What Happens Next?
    1. Review the complete offer details in your messages
    2. Accept the offer to proceed with booking
    3. Decline the offer if it doesn't meet your requirements (you can request modifications)

    View Offer: {frontend_url}/messages

    Don't keep {creator_name} waiting - review the offer today!

    Best regards,
    The BantuBuzz Team
    """

    html_body = f"""
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #F9FAFB;">
        <div style="background-color: #B5E61D; padding: 20px; text-align: center;">
            <h1 style="color: #1F2937; margin: 0;">BantuBuzz</h1>
        </div>
        <div style="padding: 30px; background-color: white;">
            <div style="text-align: center; margin-bottom: 20px;">
                <span style="font-size: 60px;">🎁</span>
            </div>
            <h2 style="color: #1F2937; text-align: center;">Custom Package Offer!</h2>
            <p style="color: #1F2937; line-height: 1.6;">
                Hello {brand_name},
            </p>
            <p style="color: #1F2937; line-height: 1.6;">
                <strong>{creator_name}</strong> has sent you a custom package offer on BantuBuzz!
            </p>

            <div style="background-color: #DBEAFE; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3B82F6;">
                <h3 style="color: #1E40AF; margin-top: 0;">📦 Package Details</h3>
                <p style="color: #1E3A8A; margin: 10px 0;">
                    <strong>Title:</strong> {title}<br>
                    <strong>Price:</strong> <span style="font-size: 20px; font-weight: bold;">${price}</span><br>
                    <strong>Delivery Time:</strong> {delivery_time_days} days
                </p>
            </div>

            <div style="background-color: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #1F2937; margin-top: 0;">What's Included</h3>
                <ul style="color: #4B5563; line-height: 1.8; margin: 10px 0; padding-left: 20px;">
                    {deliverables_html}
                </ul>
            </div>

            <div style="background-color: #D1FAE5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10B981;">
                <h3 style="color: #065F46; margin-top: 0;">✓ Custom Tailored For You</h3>
                <p style="color: #064E3B; margin: 10px 0;">
                    {creator_name} has created this custom package specifically based on your requirements. Review the offer and accept if it meets your needs!
                </p>
            </div>

            <div style="background-color: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #1F2937; margin-top: 0;">What Happens Next?</h3>
                <ol style="color: #4B5563; line-height: 1.8; margin: 10px 0; padding-left: 20px;">
                    <li>Review the complete offer details in your messages</li>
                    <li>Accept the offer to proceed with booking</li>
                    <li>Decline the offer if it doesn't meet your requirements</li>
                </ol>
            </div>

            <div style="text-align: center; margin: 30px 0;">
                <a href="{frontend_url}/messages"
                   style="background-color: #B5E61D; color: #1F2937; padding: 15px 40px;
                          text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; font-size: 16px;">
                    View Offer & Respond
                </a>
            </div>

            <p style="color: #DC2626; text-align: center; font-weight: bold; margin-top: 20px;">
                ⏰ Don't keep {creator_name} waiting - review the offer today!
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

    send_email(subject, brand_email, text_body, html_body)


def send_booking_auto_accepted_email(creator_email, creator_name, brand_name, package_title, amount, deliverables, expected_days, collaboration_id):
    """Send email when booking is auto-accepted after payment"""
    frontend_url = current_app.config.get('FRONTEND_URL', 'https://bantubuzz.com')
    subject = f"New Collaboration from {brand_name} - Payment Confirmed"

    deliverables_text = '\n'.join([f"  • {item}" for item in deliverables]) if deliverables else "  • See collaboration details"
    deliverables_html = ''.join([f"<li>{item}</li>" for item in deliverables]) if deliverables else "<li>See collaboration details</li>"

    duration_text = f"{expected_days} days" if expected_days else "As agreed"

    text_body = f"""
    Hi {creator_name},

    Great news! {brand_name} has booked your package and payment has been confirmed.

    Package: {package_title}
    Amount: R {amount:.2f}
    Expected Delivery: {duration_text}

    Deliverables:
{deliverables_text}

    What's Next:
    1. Review the collaboration details
    2. Start working on deliverables
    3. Submit drafts for review

    View Collaboration: {frontend_url}/creator/collaborations/{collaboration_id}

    Important: Cancelling collaborations affects your rating by -0.10 stars per cancellation (up to -0.50 max). Please only cancel if absolutely necessary and provide a valid reason.

    Best regards,
    The BantuBuzz Team
    """

    html_body = f"""
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #F9FAFB;">
        <div style="background-color: #B5E61D; padding: 20px; text-align: center;">
            <h1 style="color: #1F2937; margin: 0;">BantuBuzz</h1>
        </div>
        <div style="padding: 30px; background-color: white;">
            <div style="text-align: center; margin-bottom: 20px;">
                <span style="font-size: 60px;">🎉</span>
            </div>
            <h2 style="color: #1F2937; text-align: center;">New Collaboration Started!</h2>
            <p style="color: #1F2937; line-height: 1.6;">
                Hi {creator_name},
            </p>
            <p style="color: #1F2937; line-height: 1.6;">
                <strong>Great news!</strong> {brand_name} has booked your package and payment has been confirmed. The collaboration is now active.
            </p>

            <div style="background-color: #DBEAFE; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3B82F6;">
                <h3 style="color: #1E40AF; margin-top: 0;">Collaboration Details</h3>
                <p style="color: #1E3A8A; margin: 10px 0;">
                    <strong>Package:</strong> {package_title}<br>
                    <strong>Amount:</strong> R {amount:.2f}<br>
                    <strong>Expected Delivery:</strong> {duration_text}
                </p>

                <h4 style="color: #1E40AF; margin-top: 15px; margin-bottom: 5px;">Deliverables:</h4>
                <ul style="color: #1E3A8A; margin: 5px 0; padding-left: 20px;">
                    {deliverables_html}
                </ul>
            </div>

            <div style="background-color: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #1F2937; margin-top: 0;">What's Next?</h3>
                <ol style="color: #4B5563; line-height: 1.8; margin: 10px 0; padding-left: 20px;">
                    <li>Review the collaboration details</li>
                    <li>Start working on deliverables</li>
                    <li>Submit drafts for brand review</li>
                </ol>
            </div>

            <div style="text-align: center; margin: 30px 0;">
                <a href="{frontend_url}/creator/collaborations/{collaboration_id}"
                   style="background-color: #B5E61D; color: #1F2937; padding: 15px 40px;
                          text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; font-size: 16px;">
                    View Collaboration
                </a>
            </div>

            <div style="background-color: #FEF3C7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #F59E0B;">
                <p style="color: #92400E; margin: 0; font-size: 14px;">
                    ⚠️ <strong>Important:</strong> Cancelling collaborations will decrease your rating by 0.10 stars (up to -0.50 max). Please only cancel if absolutely necessary.
                </p>
            </div>
        </div>
        <div style="background-color: #1F2937; padding: 20px; text-align: center;">
            <p style="color: #F3F4F6; margin: 0; font-size: 14px;">
                © 2026 BantuBuzz. All rights reserved.
            </p>
        </div>
    </body>
    </html>
    """

    send_email(subject, creator_email, text_body, html_body)


def send_collaboration_cancelled_email(brand_email, brand_name, creator_name, collaboration_title, cancellation_reason):
    """Send email when creator cancels collaboration"""
    frontend_url = current_app.config.get('FRONTEND_URL', 'https://bantubuzz.com')
    subject = f"Collaboration Cancelled - {collaboration_title}"

    text_body = f"""
    Hi {brand_name},

    Unfortunately, {creator_name} has cancelled the collaboration: {collaboration_title}.

    Cancellation Reason:
    {cancellation_reason}

    What Happens Next:
    - Funds will be refunded to your wallet within 24-48 hours
    - You can book another creator or contact support

    If you have any questions, please contact our support team.

    Best regards,
    The BantuBuzz Team
    """

    html_body = f"""
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #F9FAFB;">
        <div style="background-color: #B5E61D; padding: 20px; text-align: center;">
            <h1 style="color: #1F2937; margin: 0;">BantuBuzz</h1>
        </div>
        <div style="padding: 30px; background-color: white;">
            <h2 style="color: #1F2937;">Collaboration Cancelled</h2>
            <p style="color: #1F2937; line-height: 1.6;">
                Hi {brand_name},
            </p>
            <p style="color: #1F2937; line-height: 1.6;">
                Unfortunately, <strong>{creator_name}</strong> has cancelled the collaboration: <strong>{collaboration_title}</strong>.
            </p>

            <div style="background-color: #FEE2E2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #DC2626;">
                <h3 style="color: #991B1B; margin-top: 0;">Cancellation Reason:</h3>
                <p style="color: #7F1D1D; margin: 0;">{cancellation_reason}</p>
            </div>

            <div style="background-color: #D1FAE5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10B981;">
                <h3 style="color: #065F46; margin-top: 0;">What Happens Next:</h3>
                <ul style="color: #064E3B; line-height: 1.8;">
                    <li>✅ Funds will be refunded to your wallet within 24-48 hours</li>
                    <li>✅ You can book another creator</li>
                    <li>✅ Contact support if you need assistance</li>
                </ul>
            </div>

            <div style="text-align: center; margin: 30px 0;">
                <a href="{frontend_url}/brand/discover"
                   style="background-color: #B5E61D; color: #1F2937; padding: 15px 40px;
                          text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; font-size: 16px;">
                    Discover Other Creators
                </a>
            </div>

            <p style="color: #6B7280; font-size: 14px; margin-top: 30px;">
                We apologize for the inconvenience. Our team is here to help you find the perfect creator for your next collaboration.
            </p>
        </div>
        <div style="background-color: #1F2937; padding: 20px; text-align: center;">
            <p style="color: #F3F4F6; margin: 0; font-size: 14px;">
                © 2026 BantuBuzz. All rights reserved.
            </p>
        </div>
    </body>
    </html>
    """

    send_email(subject, brand_email, text_body, html_body)


# Email Service Class wrapper for easier importing
class EmailService:
    """Wrapper class for email service functions"""

    @staticmethod
    def send_campaign_invitation_email(creator_email, creator_name, campaign_title, brand_name, invitation_type, message, campaign_url):
        return send_campaign_invitation_email(creator_email, creator_name, campaign_title, brand_name, invitation_type, message, campaign_url)

    @staticmethod
    def send_invitation_accepted_email(brand_email, creator_name, campaign_title, response_message):
        return send_invitation_accepted_email(brand_email, creator_name, campaign_title, response_message)

    @staticmethod
    def send_invitation_declined_email(brand_email, creator_name, campaign_title, response_message):
        return send_invitation_declined_email(brand_email, creator_name, campaign_title, response_message)

    @staticmethod
    def send_invitation_cancelled_email(invitation_id, creator_email):
        return send_invitation_cancelled_email(invitation_id, creator_email)

    @staticmethod
    def send_campaign_payment_notification_email(payment_id, recipient_email, recipient_name, is_brand=True):
        return send_campaign_payment_notification_email(payment_id, recipient_email, recipient_name, is_brand)

    @staticmethod
    def send_campaign_chat_message_notification_email(recipient_email, recipient_name, sender_name, campaign_title, message_preview, chat_url):
        return send_campaign_chat_message_notification_email(recipient_email, recipient_name, sender_name, campaign_title, message_preview, chat_url)

    @staticmethod
    def send_custom_package_request_email(creator_email, creator_name, brand_name, budget, deliverables, notes):
        return send_custom_package_request_email(creator_email, creator_name, brand_name, budget, deliverables, notes)

    @staticmethod
    def send_custom_package_offer_email(brand_email, brand_name, creator_name, title, price, deliverables, delivery_time_days):
        return send_custom_package_offer_email(brand_email, brand_name, creator_name, title, price, deliverables, delivery_time_days)

    @staticmethod
    def send_booking_auto_accepted_email(creator_email, creator_name, brand_name, package_title, amount, deliverables, expected_days, collaboration_id):
        return send_booking_auto_accepted_email(creator_email, creator_name, brand_name, package_title, amount, deliverables, expected_days, collaboration_id)

    @staticmethod
    def send_collaboration_cancelled_email(brand_email, brand_name, creator_name, collaboration_title, cancellation_reason):
        return send_collaboration_cancelled_email(brand_email, brand_name, creator_name, collaboration_title, cancellation_reason)
