"""
Email Notification Service for Wallet System
Sends email notifications for payment verification and cashout processing
"""
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from flask import current_app


# Email configuration (will be loaded from environment variables)
ADMIN_EMAIL = 'admin@bantubuzz.com'


def send_email(to_email, subject, html_body, text_body=None):
    """
    Send email using SMTP

    Args:
        to_email: Recipient email address
        subject: Email subject
        html_body: HTML email body
        text_body: Plain text fallback (optional)

    Returns:
        bool: True if sent successfully, False otherwise
    """
    try:
        # Get SMTP configuration from environment
        smtp_host = os.getenv('SMTP_HOST', 'smtp.gmail.com')
        smtp_port = int(os.getenv('SMTP_PORT', 587))
        smtp_user = os.getenv('SMTP_USER', ADMIN_EMAIL)
        smtp_password = os.getenv('SMTP_PASSWORD', '')
        from_email = os.getenv('SMTP_FROM', ADMIN_EMAIL)

        # Skip sending if no SMTP password configured (dev mode)
        if not smtp_password:
            current_app.logger.warning(f"SMTP not configured - Email would be sent to {to_email}: {subject}")
            return True

        # Create message
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = f"BantuBuzz <{from_email}>"
        msg['To'] = to_email

        # Add text and HTML parts
        if text_body:
            part1 = MIMEText(text_body, 'plain')
            msg.attach(part1)

        part2 = MIMEText(html_body, 'html')
        msg.attach(part2)

        # Send email
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_password)
            server.send_message(msg)

        current_app.logger.info(f"Email sent successfully to {to_email}: {subject}")
        return True

    except Exception as e:
        current_app.logger.error(f"Failed to send email to {to_email}: {str(e)}")
        return False


def format_currency(amount):
    """Format amount as currency"""
    return f"${amount:,.2f}"


def format_date(date_obj):
    """Format datetime object"""
    if not date_obj:
        return 'N/A'
    return date_obj.strftime('%B %d, %Y at %I:%M %p')


# ============================================================================
# CASHOUT NOTIFICATION EMAILS
# ============================================================================

def send_cashout_request_notification_to_admin(cashout):
    """
    Send email to admin when creator requests a cashout

    Args:
        cashout: CashoutRequest object
    """
    subject = f"New Cashout Request - {cashout.request_reference}"

    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }}
            .info-box {{ background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #7c3aed; }}
            .info-row {{ display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }}
            .info-row:last-child {{ border-bottom: none; }}
            .label {{ font-weight: bold; color: #6b7280; }}
            .value {{ color: #111827; }}
            .amount {{ font-size: 28px; font-weight: bold; color: #7c3aed; text-align: center; margin: 20px 0; }}
            .button {{ display: inline-block; padding: 14px 28px; background: #7c3aed; color: white; text-decoration: none; border-radius: 8px; margin: 20px 0; }}
            .footer {{ text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🔔 New Cashout Request</h1>
                <p>A creator has submitted a new cashout request</p>
            </div>
            <div class="content">
                <div class="amount">{format_currency(cashout.amount)}</div>

                <div class="info-box">
                    <h3 style="margin-top: 0;">Request Details</h3>
                    <div class="info-row">
                        <span class="label">Reference:</span>
                        <span class="value">{cashout.request_reference}</span>
                    </div>
                    <div class="info-row">
                        <span class="label">Creator ID:</span>
                        <span class="value">#{cashout.creator_id}</span>
                    </div>
                    <div class="info-row">
                        <span class="label">Amount:</span>
                        <span class="value">{format_currency(cashout.amount)}</span>
                    </div>
                    <div class="info-row">
                        <span class="label">Fee:</span>
                        <span class="value">{format_currency(cashout.cashout_fee or 0)}</span>
                    </div>
                    <div class="info-row">
                        <span class="label">Net Amount:</span>
                        <span class="value">{format_currency(cashout.net_amount)}</span>
                    </div>
                    <div class="info-row">
                        <span class="label">Payment Method:</span>
                        <span class="value">{cashout.payment_method.replace('_', ' ').title()}</span>
                    </div>
                    <div class="info-row">
                        <span class="label">Requested:</span>
                        <span class="value">{format_date(cashout.requested_at)}</span>
                    </div>
                </div>

                <div class="info-box">
                    <h3 style="margin-top: 0;">Payment Details</h3>
                    {_format_payment_details_html(cashout.payment_details)}
                </div>

                {f'''
                <div class="info-box">
                    <h3 style="margin-top: 0;">Creator Notes</h3>
                    <p>{cashout.creator_notes}</p>
                </div>
                ''' if cashout.creator_notes else ''}

                <div style="text-align: center;">
                    <a href="https://bantubuzz.com/admin/cashouts" class="button">
                        Process Cashout →
                    </a>
                </div>

                <div class="footer">
                    <p>This is an automated notification from BantuBuzz</p>
                    <p>Please process this cashout request within 24-48 hours</p>
                    <p style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                        © 2025 BantuBuzz. All rights reserved.<br>
                        <a href="https://bantubuzz.com" style="color: #7c3aed; text-decoration: none;">bantubuzz.com</a>
                    </p>
                </div>
            </div>
        </div>
    </body>
    </html>
    """

    text_body = f"""
New Cashout Request - {cashout.request_reference}

Amount: {format_currency(cashout.amount)}
Net Amount: {format_currency(cashout.net_amount)}
Payment Method: {cashout.payment_method.replace('_', ' ').title()}
Creator ID: #{cashout.creator_id}
Requested: {format_date(cashout.requested_at)}

Please log in to the admin dashboard to process this request.
    """

    return send_email(ADMIN_EMAIL, subject, html_body, text_body)


def send_cashout_completed_notification(cashout, creator_email):
    """
    Send email to creator when cashout is completed

    Args:
        cashout: CashoutRequest object
        creator_email: Creator's email address
    """
    subject = f"Cashout Completed - {cashout.request_reference}"

    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #10b981 0%, #34d399 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }}
            .success-icon {{ font-size: 60px; text-align: center; margin: 20px 0; }}
            .amount {{ font-size: 32px; font-weight: bold; color: #10b981; text-align: center; margin: 20px 0; }}
            .info-box {{ background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }}
            .info-row {{ display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }}
            .info-row:last-child {{ border-bottom: none; }}
            .label {{ font-weight: bold; color: #6b7280; }}
            .value {{ color: #111827; }}
            .footer {{ text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>✅ Cashout Completed!</h1>
                <p>Your cashout request has been processed</p>
            </div>
            <div class="content">
                <div class="success-icon">🎉</div>
                <div class="amount">{format_currency(cashout.net_amount)}</div>
                <p style="text-align: center; color: #6b7280;">has been sent to your account</p>

                <div class="info-box">
                    <h3 style="margin-top: 0;">Transaction Details</h3>
                    <div class="info-row">
                        <span class="label">Reference:</span>
                        <span class="value">{cashout.request_reference}</span>
                    </div>
                    <div class="info-row">
                        <span class="label">Amount:</span>
                        <span class="value">{format_currency(cashout.amount)}</span>
                    </div>
                    <div class="info-row">
                        <span class="label">Fee:</span>
                        <span class="value">{format_currency(cashout.cashout_fee or 0)}</span>
                    </div>
                    <div class="info-row">
                        <span class="label">Net Amount:</span>
                        <span class="value">{format_currency(cashout.net_amount)}</span>
                    </div>
                    <div class="info-row">
                        <span class="label">Payment Method:</span>
                        <span class="value">{cashout.payment_method.replace('_', ' ').title()}</span>
                    </div>
                    {f'''
                    <div class="info-row">
                        <span class="label">Transaction Ref:</span>
                        <span class="value">{cashout.transaction_reference}</span>
                    </div>
                    ''' if cashout.transaction_reference else ''}
                    <div class="info-row">
                        <span class="label">Processed:</span>
                        <span class="value">{format_date(cashout.processed_at)}</span>
                    </div>
                </div>

                {f'''
                <div class="info-box">
                    <h3 style="margin-top: 0;">Admin Notes</h3>
                    <p>{cashout.admin_notes}</p>
                </div>
                ''' if cashout.admin_notes else ''}

                <div class="info-box" style="background: #fef3c7; border-left: 4px solid #f59e0b;">
                    <p style="margin: 0;"><strong>⏰ Processing Time:</strong></p>
                    <p style="margin: 5px 0 0 0;">Please allow 1-3 business days for the funds to reflect in your account, depending on your payment method.</p>
                </div>

                <div class="footer">
                    <p>Thank you for being part of BantuBuzz!</p>
                    <p>If you have any questions, please contact support@bantubuzz.com</p>
                    <p style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                        © 2025 BantuBuzz. All rights reserved.<br>
                        <a href="https://bantubuzz.com" style="color: #10b981; text-decoration: none;">bantubuzz.com</a>
                    </p>
                </div>
            </div>
        </div>
    </body>
    </html>
    """

    text_body = f"""
Cashout Completed - {cashout.request_reference}

Your cashout request has been processed successfully!

Amount: {format_currency(cashout.net_amount)}
Payment Method: {cashout.payment_method.replace('_', ' ').title()}
{f'Transaction Reference: {cashout.transaction_reference}' if cashout.transaction_reference else ''}
Processed: {format_date(cashout.processed_at)}

Please allow 1-3 business days for the funds to reflect in your account.

Thank you for being part of BantuBuzz!
    """

    return send_email(creator_email, subject, html_body, text_body)


# ============================================================================
# PAYMENT VERIFICATION EMAILS
# ============================================================================

def send_payment_verified_notification(payment, creator_email):
    """
    Send email to creator when payment is verified

    Args:
        payment: Payment object
        creator_email: Creator's email address
    """
    subject = f"Payment Verified - Booking #{payment.booking_id}"

    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }}
            .amount {{ font-size: 28px; font-weight: bold; color: #3b82f6; text-align: center; margin: 20px 0; }}
            .info-box {{ background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }}
            .info-row {{ display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }}
            .info-row:last-child {{ border-bottom: none; }}
            .label {{ font-weight: bold; color: #6b7280; }}
            .value {{ color: #111827; }}
            .footer {{ text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>💰 Payment Verified!</h1>
                <p>The brand's payment has been verified and will be released to your wallet after work completion</p>
            </div>
            <div class="content">
                <div class="amount">{format_currency(payment.amount)}</div>

                <div class="info-box">
                    <h3 style="margin-top: 0;">Payment Details</h3>
                    <div class="info-row">
                        <span class="label">Booking ID:</span>
                        <span class="value">#{payment.booking_id}</span>
                    </div>
                    <div class="info-row">
                        <span class="label">Amount:</span>
                        <span class="value">{format_currency(payment.amount)}</span>
                    </div>
                    <div class="info-row">
                        <span class="label">Payment Method:</span>
                        <span class="value">{payment.payment_method.replace('_', ' ').title()}</span>
                    </div>
                    <div class="info-row">
                        <span class="label">Verified:</span>
                        <span class="value">{format_date(payment.verified_at)}</span>
                    </div>
                </div>

                <div class="info-box" style="background: #dbeafe; border-left: 4px solid #3b82f6;">
                    <h3 style="margin-top: 0;">📋 Next Steps</h3>
                    <ol style="margin: 0; padding-left: 20px;">
                        <li>Complete the work according to the collaboration agreement</li>
                        <li>Submit deliverables for brand approval</li>
                        <li>After completion, funds enter 30-day clearance period</li>
                        <li>After clearance, funds become available for cashout</li>
                    </ol>
                </div>

                <div class="footer">
                    <p>The payment is now held in escrow and will be released to your wallet once the work is completed and approved.</p>
                    <p>Questions? Contact support@bantubuzz.com</p>
                    <p style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                        © 2025 BantuBuzz. All rights reserved.<br>
                        <a href="https://bantubuzz.com" style="color: #3b82f6; text-decoration: none;">bantubuzz.com</a>
                    </p>
                </div>
            </div>
        </div>
    </body>
    </html>
    """

    text_body = f"""
Payment Verified - Booking #{payment.booking_id}

Good news! The brand's payment has been verified.

Amount: {format_currency(payment.amount)}
Payment Method: {payment.payment_method.replace('_', ' ').title()}
Verified: {format_date(payment.verified_at)}

The payment is now held in escrow. Complete your work and submit deliverables.
After work completion and approval, funds will enter a 30-day clearance period,
then become available for cashout.

Thank you for being part of BantuBuzz!
    """

    return send_email(creator_email, subject, html_body, text_body)


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def _format_payment_details_html(payment_details):
    """Format payment details as HTML"""
    if not payment_details:
        return '<p>No additional details</p>'

    html = ''
    if payment_details.get('phone_number'):
        html += f'<div class="info-row"><span class="label">Phone:</span><span class="value">{payment_details["phone_number"]}</span></div>'
    if payment_details.get('account_name'):
        html += f'<div class="info-row"><span class="label">Name:</span><span class="value">{payment_details["account_name"]}</span></div>'
    if payment_details.get('bank_name'):
        html += f'<div class="info-row"><span class="label">Bank:</span><span class="value">{payment_details["bank_name"]}</span></div>'
    if payment_details.get('account_number'):
        html += f'<div class="info-row"><span class="label">Account:</span><span class="value">{payment_details["account_number"]}</span></div>'
    if payment_details.get('branch'):
        html += f'<div class="info-row"><span class="label">Branch:</span><span class="value">{payment_details["branch"]}</span></div>'
    if payment_details.get('pickup_location'):
        html += f'<div class="info-row"><span class="label">Pickup:</span><span class="value">{payment_details["pickup_location"]}</span></div>'

    return html if html else '<p>No additional details</p>'
