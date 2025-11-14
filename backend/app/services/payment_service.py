from flask import current_app
from paynow import Paynow


def get_paynow_client():
    """Initialize Paynow client"""
    print(f"[PAYMENT] Creating Paynow client with:")
    print(f"[PAYMENT]   Integration ID: {current_app.config['PAYNOW_INTEGRATION_ID']}")
    print(f"[PAYMENT]   Return URL: {current_app.config['PAYNOW_RETURN_URL']}")
    print(f"[PAYMENT]   Result URL: {current_app.config['PAYNOW_RESULT_URL']}")

    return Paynow(
        current_app.config['PAYNOW_INTEGRATION_ID'],
        current_app.config['PAYNOW_INTEGRATION_KEY'],
        current_app.config['PAYNOW_RETURN_URL'],
        current_app.config['PAYNOW_RESULT_URL']
    )


def initiate_payment(booking, email, package_title, phone=None):
    """
    Initiate payment via Paynow

    Args:
        booking: Booking object
        email: Customer email
        package_title: Package title for payment description
        phone: Customer phone number (optional, for mobile payments)

    Returns:
        dict: Payment response with redirect URL or error
    """
    try:
        print(f"[PAYMENT] Initiating payment for booking {booking.id}")
        print(f"[PAYMENT] Email: {email}, Amount: {booking.amount}, Package: {package_title}")

        paynow = get_paynow_client()
        print(f"[PAYMENT] Paynow client created")

        # Create payment
        payment = paynow.create_payment(
            f'Booking-{booking.id}',
            email
        )
        print(f"[PAYMENT] Payment object created")

        # Add item to payment
        payment.add(
            f'Package: {package_title}',
            booking.amount
        )
        print(f"[PAYMENT] Item added to payment")

        # Send payment request
        if phone:
            # Mobile payment (EcoCash, OneMoney, etc.)
            response = paynow.send_mobile(payment, phone, 'ecocash')
        else:
            # Web payment
            response = paynow.send(payment)

        print(f"[PAYMENT] Payment sent, response received")
        print(f"[PAYMENT] Response type: {type(response)}")
        print(f"[PAYMENT] Response success: {response.success if hasattr(response, 'success') else 'N/A'}")

        # Check if request was successful
        if response.success:
            print(f"[PAYMENT] Payment successful!")
            print(f"[PAYMENT] Redirect URL: {response.redirect_url if hasattr(response, 'redirect_url') else 'N/A'}")
            print(f"[PAYMENT] Poll URL: {response.poll_url if hasattr(response, 'poll_url') else 'N/A'}")

            # Save poll URL for checking payment status
            booking.paynow_poll_url = response.poll_url
            from app import db
            db.session.commit()

            # Get instructions safely (check if it's a valid string, not a type object)
            instructions = None
            if hasattr(response, 'instructions'):
                instr = response.instructions
                # Only include if it's an actual string instance, not the str type class
                if isinstance(instr, str) and instr:
                    instructions = instr

            return {
                'success': True,
                'redirect_url': response.redirect_url,
                'poll_url': response.poll_url,
                'instructions': instructions
            }
        else:
            # Get error message from response
            error_msg = 'Payment initiation failed'

            # Try to get error from response.data first (this is the actual error message)
            if hasattr(response, 'data') and isinstance(response.data, dict):
                if 'error' in response.data:
                    error_msg = response.data['error']
                    print(f"[PAYMENT] Error from response.data: {error_msg}")
                elif 'errors' in response.data:
                    error_msg = response.data['errors']
                    print(f"[PAYMENT] Errors from response.data: {error_msg}")

            # Also check status
            if hasattr(response, 'status'):
                print(f"[PAYMENT] Response status: {response.status}")

            print(f"[PAYMENT] Payment failed: {error_msg}")

            return {
                'success': False,
                'error': error_msg
            }

    except Exception as e:
        import traceback
        print(f"[PAYMENT] Exception occurred: {str(e)}")
        print(f"[PAYMENT] Traceback: {traceback.format_exc()}")
        return {
            'success': False,
            'error': str(e)
        }


def check_payment_status(booking):
    """
    Check payment status using poll URL

    Args:
        booking: Booking object with paynow_poll_url

    Returns:
        dict: Payment status information
    """
    try:
        if not booking.paynow_poll_url:
            return {
                'success': False,
                'error': 'No poll URL available'
            }

        paynow = get_paynow_client()
        status = paynow.check_transaction_status(booking.paynow_poll_url)

        # Update booking payment status
        if status.paid:
            booking.payment_status = 'paid'
            booking.payment_reference = status.reference
        elif status.status.lower() == 'failed':
            booking.payment_status = 'failed'

        from app import db
        db.session.commit()

        return {
            'success': True,
            'paid': status.paid,
            'status': status.status,
            'reference': status.reference if hasattr(status, 'reference') else None,
            'amount': status.amount if hasattr(status, 'amount') else None
        }

    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }


def process_payment_webhook(data):
    """
    Process Paynow webhook/IPN (Instant Payment Notification)

    Args:
        data: Webhook POST data from Paynow

    Returns:
        bool: True if processed successfully
    """
    try:
        from app.models import Booking
        from app import db

        # Extract booking ID from reference
        reference = data.get('reference', '')
        if reference.startswith('Booking-'):
            booking_id = int(reference.split('-')[1])
            booking = Booking.query.get(booking_id)

            if booking:
                # Update payment status based on webhook data
                status = data.get('status', '').lower()

                if status == 'paid' or status == 'delivered':
                    booking.payment_status = 'paid'
                    booking.payment_reference = data.get('paynowreference')

                    # Update booking status if pending
                    if booking.status == 'pending':
                        booking.status = 'accepted'

                    # Send confirmation emails
                    from app.services.email_service import send_booking_confirmation_email
                    send_booking_confirmation_email(
                        booking,
                        booking.brand.user.email,
                        booking.creator.user.email
                    )

                elif status == 'failed' or status == 'cancelled':
                    booking.payment_status = 'failed'

                db.session.commit()
                return True

        return False

    except Exception as e:
        print(f"Webhook processing error: {str(e)}")
        return False
