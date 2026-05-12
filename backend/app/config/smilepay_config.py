"""
SmilePay Payment Gateway Configuration
Supports multiple payment methods: Ecocash, Innbucks, Omari, SmileCash, Visa/Mastercard
"""

import os
from typing import Dict, Any

class SmilePayConfig:
    """SmilePay configuration for sandbox and production environments"""

    # Environment settings
    ENVIRONMENT = os.getenv('SMILEPAY_ENVIRONMENT', 'production')  # 'sandbox' or 'production'

    # API Configuration - Production keys
    PRODUCTION = {
        'base_url': 'https://zbnet.zb.co.zw/wallet_gateway/payments-gateway',
        'checkout_url': 'https://zbnet.zb.co.zw/wallet_checkout',
        'api_key': os.getenv('SMILEPAY_API_KEY', '3927c441-efee-49df-a00b-de456832d02d'),
        'api_secret': os.getenv('SMILEPAY_API_SECRET', '3234fa9a-eb0a-4b57-9f40-4704d52a5459'),
    }

    # Sandbox (for testing only)
    SANDBOX = {
        'base_url': 'https://zbnet.zb.co.zw/wallet_sandbox_api/payments-gateway',
        'checkout_url': 'https://zbnet.zb.co.zw/wallet_sandbox_checkout',
        'api_key': os.getenv('SMILEPAY_SANDBOX_API_KEY', ''),
        'api_secret': os.getenv('SMILEPAY_SANDBOX_API_SECRET', ''),
    }

    # Currency codes
    CURRENCY_CODES = {
        'USD': '840',
        'ZWL': '924',
    }

    # Payment methods
    PAYMENT_METHODS = {
        'ecocash': 'express-checkout/ecocash',
        'innbucks': 'express-checkout/innbucks',
        'smilecash': 'express-checkout/smilecash',
        'omari': 'express-checkout/omari',
        'visa': 'express-checkout/visa',
        'mastercard': 'express-checkout/mastercard',
        'standard': 'initiate-transaction',
    }

    # Payment statuses
    STATUS_PENDING = 'PENDING'
    STATUS_PAID = 'PAID'
    STATUS_FAILED = 'FAILED'
    STATUS_CANCELED = 'CANCELED'

    # Timeout settings
    PAYMENT_TIMEOUT_SECONDS = 300  # 5 minutes
    WEBHOOK_TIMEOUT_SECONDS = 10
    STATUS_POLL_INTERVAL_SECONDS = 3
    STATUS_POLL_MAX_ATTEMPTS = 40  # 2 minutes total

    @classmethod
    def get_config(cls) -> Dict[str, Any]:
        """Get configuration for current environment"""
        if cls.ENVIRONMENT == 'production':
            return cls.PRODUCTION
        return cls.SANDBOX

    @classmethod
    def get_base_url(cls) -> str:
        """Get base API URL for current environment"""
        return cls.get_config()['base_url']

    @classmethod
    def get_checkout_url(cls) -> str:
        """Get checkout URL for current environment"""
        return cls.get_config()['checkout_url']

    @classmethod
    def get_api_key(cls) -> str:
        """Get API key for current environment"""
        return cls.get_config()['api_key']

    @classmethod
    def get_api_secret(cls) -> str:
        """Get API secret for current environment"""
        return cls.get_config()['api_secret']

    @classmethod
    def get_headers(cls) -> Dict[str, str]:
        """Get authentication headers for API requests"""
        return {
            'x-api-key': cls.get_api_key(),
            'x-api-secret': cls.get_api_secret(),
            'Content-Type': 'application/json',
        }

    @classmethod
    def get_currency_code(cls, currency: str) -> str:
        """Convert currency to SmilePay currency code"""
        return cls.CURRENCY_CODES.get(currency.upper(), '840')  # Default to USD

    @classmethod
    def get_payment_endpoint(cls, method: str) -> str:
        """Get payment endpoint for given payment method"""
        endpoint = cls.PAYMENT_METHODS.get(method.lower(), 'initiate-transaction')
        return f"{cls.get_base_url()}/payments/{endpoint}"

    @classmethod
    def is_sandbox(cls) -> bool:
        """Check if running in sandbox mode"""
        return cls.ENVIRONMENT == 'sandbox'

    @classmethod
    def is_production(cls) -> bool:
        """Check if running in production mode"""
        return cls.ENVIRONMENT == 'production'


# Export config instance
config = SmilePayConfig
