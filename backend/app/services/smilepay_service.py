"""
SmilePay Payment Gateway Service
Handles all interactions with SmilePay API for processing payments
"""

import requests
import logging
from typing import Dict, Any, Optional
from datetime import datetime, timezone

from app.config.smilepay_config import config as smilepay_config
from app.models import SmilePayTransaction
from app import db

logger = logging.getLogger(__name__)


class SmilePayService:
    """Service class for SmilePay payment gateway integration"""

    @staticmethod
    def initiate_ecocash_payment(
        order_reference: str,
        amount: float,
        ecocash_mobile: str,
        item_name: str,
        item_description: str,
        customer_email: str,
        customer_first_name: str = '',
        customer_last_name: str = '',
        return_url: str = '',
        result_url: str = '',
        cancel_url: str = '',
        failure_url: str = '',
        currency: str = 'USD'
    ) -> Dict[str, Any]:
        """
        Initiate Ecocash payment via Express Checkout

        Args:
            order_reference: Unique order reference
            amount: Payment amount
            ecocash_mobile: Ecocash mobile number
            item_name: Name of item being purchased
            item_description: Description of item
            customer_email: Customer email
            customer_first_name: Customer first name
            customer_last_name: Customer last name
            return_url: URL to redirect after payment
            result_url: Webhook URL for payment result
            cancel_url: URL for cancelled payment
            failure_url: URL for failed payment
            currency: Currency code (USD or ZWL)

        Returns:
            Dict with success status and response data
        """
        try:
            endpoint = smilepay_config.get_payment_endpoint('ecocash')
            headers = smilepay_config.get_headers()

            payload = {
                'orderReference': order_reference,
                'amount': amount,
                'currencyCode': smilepay_config.get_currency_code(currency),
                'ecocashMobile': ecocash_mobile,
                'itemName': item_name,
                'itemDescription': item_description,
                'email': customer_email,
                'firstName': customer_first_name,
                'lastName': customer_last_name,
                'mobilePhoneNumber': ecocash_mobile,
                'returnUrl': return_url or '',
                'resultUrl': result_url or '',
                'cancelUrl': cancel_url or '',
                'failureUrl': failure_url or '',
            }

            logger.info(f"Initiating Ecocash payment for order {order_reference}")

            response = requests.post(endpoint, json=payload, headers=headers, timeout=30)
            response_data = response.json()

            logger.info(f"Ecocash payment response: {response_data}")

            return {
                'success': response.status_code == 200,
                'status_code': response.status_code,
                'data': response_data
            }

        except requests.exceptions.RequestException as e:
            logger.error(f"Ecocash payment request failed: {str(e)}")
            return {
                'success': False,
                'error': f"Network error: {str(e)}"
            }
        except Exception as e:
            logger.error(f"Ecocash payment error: {str(e)}")
            return {
                'success': False,
                'error': f"Payment initiation failed: {str(e)}"
            }

    @staticmethod
    def initiate_innbucks_payment(
        order_reference: str,
        amount: float,
        item_name: str,
        item_description: str,
        customer_email: str,
        customer_phone: str = '',
        customer_first_name: str = '',
        customer_last_name: str = '',
        return_url: str = '',
        result_url: str = '',
        cancel_url: str = '',
        failure_url: str = '',
        currency: str = 'USD'
    ) -> Dict[str, Any]:
        """
        Initiate Innbucks payment via Express Checkout

        Returns a payment code that the customer enters in their Innbucks app
        """
        try:
            endpoint = smilepay_config.get_payment_endpoint('innbucks')
            headers = smilepay_config.get_headers()

            payload = {
                'orderReference': order_reference,
                'amount': amount,
                'currencyCode': smilepay_config.get_currency_code(currency),
                'itemName': item_name,
                'itemDescription': item_description,
                'email': customer_email,
                'firstName': customer_first_name,
                'lastName': customer_last_name,
                'mobilePhoneNumber': customer_phone,
                'returnUrl': return_url or '',
                'resultUrl': result_url or '',
                'cancelUrl': cancel_url or '',
                'failureUrl': failure_url or '',
            }

            logger.info(f"Initiating Innbucks payment for order {order_reference}")

            response = requests.post(endpoint, json=payload, headers=headers, timeout=30)
            response_data = response.json()

            logger.info(f"Innbucks payment response: {response_data}")

            return {
                'success': response.status_code == 200,
                'status_code': response.status_code,
                'data': response_data
            }

        except Exception as e:
            logger.error(f"Innbucks payment error: {str(e)}")
            return {
                'success': False,
                'error': f"Payment initiation failed: {str(e)}"
            }

    @staticmethod
    def initiate_smilecash_payment(
        order_reference: str,
        amount: float,
        smilecash_mobile: str,
        otp: str,
        item_name: str,
        item_description: str,
        customer_email: str,
        customer_first_name: str = '',
        customer_last_name: str = '',
        return_url: str = '',
        result_url: str = '',
        cancel_url: str = '',
        failure_url: str = '',
        currency: str = 'USD'
    ) -> Dict[str, Any]:
        """
        Initiate SmileCash payment via Express Checkout

        SmileCash is an OTP-based mobile wallet payment method
        """
        try:
            endpoint = smilepay_config.get_payment_endpoint('smilecash')
            headers = smilepay_config.get_headers()

            payload = {
                'orderReference': order_reference,
                'amount': amount,
                'currencyCode': smilepay_config.get_currency_code(currency),
                'smileCashMobile': smilecash_mobile,
                'otp': otp,
                'itemName': item_name,
                'itemDescription': item_description,
                'email': customer_email,
                'firstName': customer_first_name,
                'lastName': customer_last_name,
                'mobilePhoneNumber': smilecash_mobile,
                'returnUrl': return_url or '',
                'resultUrl': result_url or '',
                'cancelUrl': cancel_url or '',
                'failureUrl': failure_url or '',
            }

            logger.info(f"Initiating SmileCash payment for order {order_reference}")

            response = requests.post(endpoint, json=payload, headers=headers, timeout=30)
            response_data = response.json()

            logger.info(f"SmileCash payment response: {response_data}")

            return {
                'success': response.status_code == 200,
                'status_code': response.status_code,
                'data': response_data
            }

        except Exception as e:
            logger.error(f"SmileCash payment error: {str(e)}")
            return {
                'success': False,
                'error': f"Payment initiation failed: {str(e)}"
            }

    @staticmethod
    def initiate_omari_payment(
        order_reference: str,
        amount: float,
        omari_mobile: str,
        otp: str,
        item_name: str,
        item_description: str,
        customer_email: str,
        customer_first_name: str = '',
        customer_last_name: str = '',
        return_url: str = '',
        result_url: str = '',
        cancel_url: str = '',
        failure_url: str = '',
        currency: str = 'USD'
    ) -> Dict[str, Any]:
        """
        Initiate Omari payment via Express Checkout

        Omari is an OTP-based payment platform
        """
        try:
            endpoint = smilepay_config.get_payment_endpoint('omari')
            headers = smilepay_config.get_headers()

            payload = {
                'orderReference': order_reference,
                'amount': amount,
                'currencyCode': smilepay_config.get_currency_code(currency),
                'omariMobile': omari_mobile,
                'otp': otp,
                'itemName': item_name,
                'itemDescription': item_description,
                'email': customer_email,
                'firstName': customer_first_name,
                'lastName': customer_last_name,
                'mobilePhoneNumber': omari_mobile,
                'returnUrl': return_url or '',
                'resultUrl': result_url or '',
                'cancelUrl': cancel_url or '',
                'failureUrl': failure_url or '',
            }

            logger.info(f"Initiating Omari payment for order {order_reference}")

            response = requests.post(endpoint, json=payload, headers=headers, timeout=30)
            response_data = response.json()

            logger.info(f"Omari payment response: {response_data}")

            return {
                'success': response.status_code == 200,
                'status_code': response.status_code,
                'data': response_data
            }

        except Exception as e:
            logger.error(f"Omari payment error: {str(e)}")
            return {
                'success': False,
                'error': f"Payment initiation failed: {str(e)}"
            }

    @staticmethod
    def initiate_card_payment(
        order_reference: str,
        amount: float,
        card_number: str,
        expiry_month: str,
        expiry_year: str,
        cvv: str,
        cardholder_name: str,
        item_name: str,
        item_description: str,
        customer_email: str,
        customer_first_name: str = '',
        customer_last_name: str = '',
        return_url: str = '',
        result_url: str = '',
        cancel_url: str = '',
        failure_url: str = '',
        currency: str = 'USD'
    ) -> Dict[str, Any]:
        """
        Initiate card payment (Visa/Mastercard) via Express Checkout

        May return 3D Secure HTML for authentication
        """
        try:
            endpoint = smilepay_config.get_payment_endpoint('card')
            headers = smilepay_config.get_headers()

            payload = {
                'orderReference': order_reference,
                'amount': amount,
                'currencyCode': smilepay_config.get_currency_code(currency),
                'cardNumber': card_number,
                'expiryMonth': expiry_month,
                'expiryYear': expiry_year,
                'cvv': cvv,
                'cardholderName': cardholder_name,
                'itemName': item_name,
                'itemDescription': item_description,
                'email': customer_email,
                'firstName': customer_first_name,
                'lastName': customer_last_name,
                'returnUrl': return_url or '',
                'resultUrl': result_url or '',
                'cancelUrl': cancel_url or '',
                'failureUrl': failure_url or '',
            }

            logger.info(f"Initiating card payment for order {order_reference}")

            response = requests.post(endpoint, json=payload, headers=headers, timeout=30)
            response_data = response.json()

            logger.info(f"Card payment response: {response_data}")

            # Check if 3D Secure is required
            requires_3ds = 'threeDSecureHtml' in response_data or 'redirectUrl' in response_data

            return {
                'success': response.status_code == 200,
                'status_code': response.status_code,
                'data': response_data,
                'requires_3ds': requires_3ds
            }

        except Exception as e:
            logger.error(f"Card payment error: {str(e)}")
            return {
                'success': False,
                'error': f"Payment initiation failed: {str(e)}"
            }

    @staticmethod
    def initiate_card_payment(
        order_reference: str,
        amount: float,
        item_name: str,
        item_description: str,
        customer_email: str,
        customer_first_name: str = '',
        customer_last_name: str = '',
        customer_phone: str = '',
        return_url: str = '',
        result_url: str = '',
        cancel_url: str = '',
        failure_url: str = '',
        currency: str = 'USD',
        card_type: str = 'visa'  # 'visa' or 'mastercard'
    ) -> Dict[str, Any]:
        """
        Initiate card payment (Visa/Mastercard) via Express Checkout

        Returns redirect URL to SmilePay's hosted checkout page where
        the user enters their card details securely (PCI compliant).
        Similar to Ecocash/Innbucks flow.
        """
        try:
            endpoint = smilepay_config.get_payment_endpoint(card_type)
            headers = smilepay_config.get_headers()

            payload = {
                'orderReference': order_reference,
                'amount': amount,
                'currencyCode': smilepay_config.get_currency_code(currency),
                'itemName': item_name,
                'itemDescription': item_description,
                'email': customer_email,
                'firstName': customer_first_name,
                'lastName': customer_last_name,
                'mobilePhoneNumber': customer_phone,
                'returnUrl': return_url or '',
                'resultUrl': result_url or '',
                'cancelUrl': cancel_url or '',
                'failureUrl': failure_url or '',
            }

            logger.info(f"Initiating {card_type} payment for order {order_reference}")

            response = requests.post(endpoint, json=payload, headers=headers, timeout=30)
            response_data = response.json()

            logger.info(f"Card payment response: {response_data}")

            # Express Checkout returns a redirect URL to SmilePay's checkout page
            return {
                'success': response.status_code == 200,
                'status_code': response.status_code,
                'data': response_data,
                'redirect_url': response_data.get('redirectUrl') or response_data.get('checkoutUrl'),
                'poll_url': response_data.get('pollUrl')
            }

        except Exception as e:
            logger.error(f"Card payment error: {str(e)}")
            return {
                'success': False,
                'error': f"Payment initiation failed: {str(e)}"
            }

    @staticmethod
    def check_payment_status(order_reference: str) -> Dict[str, Any]:
        """
        Check payment status using SmilePay API

        Args:
            order_reference: Order reference to check

        Returns:
            Dict with payment status and details
        """
        try:
            base_url = smilepay_config.get_base_url()
            endpoint = f"{base_url}/payments/transaction/{order_reference}/status/check"
            headers = smilepay_config.get_headers()

            logger.info(f"Checking payment status for order {order_reference}")

            response = requests.get(endpoint, headers=headers, timeout=15)
            response_data = response.json()

            logger.info(f"Payment status response: {response_data}")

            return {
                'success': response.status_code == 200,
                'status_code': response.status_code,
                'data': response_data
            }

        except Exception as e:
            logger.error(f"Status check error: {str(e)}")
            return {
                'success': False,
                'error': f"Status check failed: {str(e)}"
            }

    @staticmethod
    def cancel_payment(order_reference: str) -> Dict[str, Any]:
        """
        Cancel a pending payment

        Args:
            order_reference: Order reference to cancel

        Returns:
            Dict with cancellation result
        """
        try:
            base_url = smilepay_config.get_base_url()
            endpoint = f"{base_url}/payments/cancel/{order_reference}"
            headers = smilepay_config.get_headers()

            logger.info(f"Cancelling payment for order {order_reference}")

            response = requests.post(endpoint, headers=headers, timeout=15)
            response_data = response.json()

            logger.info(f"Cancel payment response: {response_data}")

            return {
                'success': response.status_code == 200,
                'status_code': response.status_code,
                'data': response_data
            }

        except Exception as e:
            logger.error(f"Cancel payment error: {str(e)}")
            return {
                'success': False,
                'error': f"Cancellation failed: {str(e)}"
            }

    @staticmethod
    def process_webhook_callback(webhook_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process webhook callback from SmilePay

        Webhook payload format:
        {
            "merchantId": "",
            "reference": "",
            "orderReference": "",
            "itemName": "",
            "amount": null,
            "currency": "",
            "paymentOption": "",
            "status": "PAID|FAILED|CANCELED",
            "createdDate": "",
            "returnUrl": "",
            "resultUrl": "",
            "clientFee": null,
            "merchantFee": null
        }

        Args:
            webhook_data: Webhook payload from SmilePay

        Returns:
            Dict with processing result
        """
        try:
            order_reference = webhook_data.get('orderReference')

            if not order_reference:
                logger.error("Webhook missing order reference")
                return {'success': False, 'error': 'Missing order reference'}

            # Find transaction
            transaction = SmilePayTransaction.get_by_order_reference(order_reference)

            if not transaction:
                logger.error(f"Transaction not found for order {order_reference}")
                return {'success': False, 'error': 'Transaction not found'}

            # Extract webhook data
            new_status = webhook_data.get('status', 'PENDING')
            smilepay_reference = webhook_data.get('reference')
            payment_option = webhook_data.get('paymentOption')
            client_fee = webhook_data.get('clientFee')
            merchant_fee = webhook_data.get('merchantFee')

            logger.info(f"Processing webhook for {order_reference}: status={new_status}")

            # Update transaction
            transaction.update_status(
                new_status,
                smilepay_reference=smilepay_reference,
                payment_option=payment_option,
                client_fee=client_fee,
                merchant_fee=merchant_fee
            )
            transaction.mark_webhook_received(webhook_data)

            db.session.commit()

            logger.info(f"Transaction {order_reference} updated to {new_status}")

            # Handle payment completion
            if new_status == 'PAID':
                SmilePayService._handle_successful_payment(transaction)
            elif new_status == 'FAILED':
                SmilePayService._handle_failed_payment(transaction)
            elif new_status == 'CANCELED':
                SmilePayService._handle_canceled_payment(transaction)

            return {
                'success': True,
                'transaction_id': transaction.id,
                'status': new_status
            }

        except Exception as e:
            logger.error(f"Webhook processing error: {str(e)}")
            db.session.rollback()
            return {
                'success': False,
                'error': f"Webhook processing failed: {str(e)}"
            }

    @staticmethod
    def _handle_successful_payment(transaction: SmilePayTransaction):
        """
        Handle successful payment completion

        Args:
            transaction: SmilePayTransaction that was paid
        """
        try:
            logger.info(f"Handling successful payment for {transaction.order_reference}")

            # Update related payment record based on payment type
            if transaction.payment_type == 'subscription':
                SmilePayService._complete_subscription_payment(transaction)
            elif transaction.payment_type == 'booking':
                SmilePayService._complete_booking_payment(transaction)
            elif transaction.payment_type == 'campaign':
                SmilePayService._complete_campaign_payment(transaction)
            elif transaction.payment_type == 'cart':
                SmilePayService._complete_cart_payment(transaction)
            elif transaction.payment_type == 'collaboration':
                SmilePayService._complete_collaboration_payment(transaction)

            # Send notification email
            SmilePayService._send_payment_success_notification(transaction)

        except Exception as e:
            logger.error(f"Error handling successful payment: {str(e)}")

    @staticmethod
    def _complete_subscription_payment(transaction: SmilePayTransaction):
        """Complete subscription payment"""
        from app.models import Subscription

        subscription = Subscription.query.get(transaction.payment_id)
        if subscription:
            subscription.payment_status = 'paid'
            subscription.smilepay_order_reference = transaction.order_reference
            db.session.commit()
            logger.info(f"Subscription {subscription.id} marked as paid")

    @staticmethod
    def _complete_booking_payment(transaction: SmilePayTransaction):
        """Complete booking payment"""
        from app.models import Booking

        booking = Booking.query.get(transaction.payment_id)
        if booking:
            booking.payment_status = 'paid'
            booking.smilepay_order_reference = transaction.order_reference
            db.session.commit()
            logger.info(f"Booking {booking.id} marked as paid")

    @staticmethod
    def _complete_campaign_payment(transaction: SmilePayTransaction):
        """Complete campaign payment"""
        from app.models import CampaignPayment

        payment = CampaignPayment.query.get(transaction.payment_id)
        if payment:
            payment.payment_status = 'paid'
            payment.smilepay_order_reference = transaction.order_reference
            db.session.commit()
            logger.info(f"Campaign payment {payment.id} marked as paid")

    @staticmethod
    def _complete_cart_payment(transaction: SmilePayTransaction):
        """Complete cart payment"""
        # Handle campaign cart payments
        logger.info(f"Processing cart payment for {transaction.order_reference}")
        # TODO: Implement cart-specific logic

    @staticmethod
    def _complete_collaboration_payment(transaction: SmilePayTransaction):
        """Complete collaboration payment"""
        from app.models import Collaboration

        collaboration = Collaboration.query.get(transaction.payment_id)
        if collaboration:
            collaboration.payment_status = 'paid'
            collaboration.smilepay_order_reference = transaction.order_reference
            db.session.commit()
            logger.info(f"Collaboration {collaboration.id} marked as paid")

    @staticmethod
    def _handle_failed_payment(transaction: SmilePayTransaction):
        """Handle failed payment"""
        logger.info(f"Handling failed payment for {transaction.order_reference}")
        SmilePayService._send_payment_failure_notification(transaction)

    @staticmethod
    def _handle_canceled_payment(transaction: SmilePayTransaction):
        """Handle canceled payment"""
        logger.info(f"Handling canceled payment for {transaction.order_reference}")
        # Optional: Send cancellation notification

    @staticmethod
    def _send_payment_success_notification(transaction: SmilePayTransaction):
        """Send payment success notification email"""
        try:
            from app.services.email_service import send_payment_confirmation_email

            if transaction.customer_email:
                send_payment_confirmation_email(
                    email=transaction.customer_email,
                    order_reference=transaction.order_reference,
                    amount=float(transaction.amount),
                    currency=transaction.currency,
                    item_name=transaction.item_name
                )
                logger.info(f"Payment confirmation sent to {transaction.customer_email}")

        except Exception as e:
            logger.error(f"Error sending payment notification: {str(e)}")

    @staticmethod
    def _send_payment_failure_notification(transaction: SmilePayTransaction):
        """Send payment failure notification email"""
        try:
            from app.services.email_service import send_payment_failure_email

            if transaction.customer_email:
                send_payment_failure_email(
                    email=transaction.customer_email,
                    order_reference=transaction.order_reference,
                    amount=float(transaction.amount),
                    currency=transaction.currency,
                    reason=transaction.response_message or 'Payment failed'
                )
                logger.info(f"Payment failure notification sent to {transaction.customer_email}")

        except Exception as e:
            logger.error(f"Error sending failure notification: {str(e)}")


# Export service instance
smilepay_service = SmilePayService
