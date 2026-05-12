"""
SmilePay Transaction Model
Tracks payment transactions processed through SmilePay gateway
"""

from datetime import datetime, timezone
from app import db


class SmilePayTransaction(db.Model):
    """Model for tracking SmilePay payment transactions"""

    __tablename__ = 'smilepay_transactions'

    id = db.Column(db.Integer, primary_key=True)

    # Reference to payment type
    payment_type = db.Column(db.String(50), nullable=False)  # 'subscription', 'campaign', 'booking', 'wallet', 'cart'
    payment_id = db.Column(db.Integer)

    # User information
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'))
    user_type = db.Column(db.String(20))  # 'brand' or 'creator'

    # Transaction identifiers
    order_reference = db.Column(db.String(100), unique=True, nullable=False, index=True)
    smilepay_reference = db.Column(db.String(100))
    transaction_reference = db.Column(db.String(100), index=True)

    # Payment details
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    currency = db.Column(db.String(10), default='USD')
    currency_code = db.Column(db.String(10))  # '840' for USD, '924' for ZWL

    # Payment method
    payment_method = db.Column(db.String(50), index=True)  # 'ecocash', 'innbucks', 'visa', etc
    payment_option = db.Column(db.String(50))

    # Transaction status
    status = db.Column(db.String(50), default='PENDING', index=True)
    response_code = db.Column(db.String(50))
    response_message = db.Column(db.Text)

    # Item details
    item_name = db.Column(db.String(200))
    item_description = db.Column(db.Text)

    # Customer details
    customer_email = db.Column(db.String(255))
    customer_phone = db.Column(db.String(50))
    customer_first_name = db.Column(db.String(100))
    customer_last_name = db.Column(db.String(100))
    customer_mobile = db.Column(db.String(50))

    # URLs
    return_url = db.Column(db.Text)
    result_url = db.Column(db.Text)
    cancel_url = db.Column(db.Text)
    failure_url = db.Column(db.Text)

    # Fees
    client_fee = db.Column(db.Numeric(10, 2))
    merchant_fee = db.Column(db.Numeric(10, 2))

    # Payment-specific data
    payment_code = db.Column(db.String(100))  # For Innbucks
    otp_required = db.Column(db.Boolean, default=False)

    # Additional data
    extra_data = db.Column(db.JSON)  # Renamed from 'metadata' (reserved by SQLAlchemy)
    webhook_data = db.Column(db.JSON)
    request_data = db.Column(db.JSON)

    # Timestamps
    initiated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    paid_at = db.Column(db.DateTime)
    failed_at = db.Column(db.DateTime)
    canceled_at = db.Column(db.DateTime)
    webhook_received_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    user = db.relationship('User', backref=db.backref('smilepay_transactions', lazy='dynamic'))

    def __repr__(self):
        return f'<SmilePayTransaction {self.order_reference}: {self.status}>'

    def to_dict(self):
        """Convert transaction to dictionary"""
        return {
            'id': self.id,
            'order_reference': self.order_reference,
            'transaction_reference': self.transaction_reference,
            'smilepay_reference': self.smilepay_reference,
            'payment_type': self.payment_type,
            'payment_id': self.payment_id,
            'user_id': self.user_id,
            'user_type': self.user_type,
            'amount': float(self.amount) if self.amount else None,
            'currency': self.currency,
            'currency_code': self.currency_code,
            'payment_method': self.payment_method,
            'payment_option': self.payment_option,
            'status': self.status,
            'response_code': self.response_code,
            'response_message': self.response_message,
            'item_name': self.item_name,
            'item_description': self.item_description,
            'customer_email': self.customer_email,
            'customer_phone': self.customer_phone,
            'customer_first_name': self.customer_first_name,
            'customer_last_name': self.customer_last_name,
            'customer_mobile': self.customer_mobile,
            'payment_code': self.payment_code,
            'otp_required': self.otp_required,
            'client_fee': float(self.client_fee) if self.client_fee else None,
            'merchant_fee': float(self.merchant_fee) if self.merchant_fee else None,
            'extra_data': self.extra_data,
            'initiated_at': self.initiated_at.isoformat() if self.initiated_at else None,
            'paid_at': self.paid_at.isoformat() if self.paid_at else None,
            'failed_at': self.failed_at.isoformat() if self.failed_at else None,
            'canceled_at': self.canceled_at.isoformat() if self.canceled_at else None,
            'webhook_received_at': self.webhook_received_at.isoformat() if self.webhook_received_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }

    def update_status(self, new_status, **kwargs):
        """
        Update transaction status with timestamp

        Args:
            new_status: New status ('PAID', 'FAILED', 'CANCELED')
            **kwargs: Additional fields to update
        """
        self.status = new_status
        self.updated_at = datetime.now(timezone.utc)

        # Set appropriate timestamp
        if new_status == 'PAID':
            self.paid_at = datetime.now(timezone.utc)
        elif new_status == 'FAILED':
            self.failed_at = datetime.now(timezone.utc)
        elif new_status == 'CANCELED':
            self.canceled_at = datetime.now(timezone.utc)

        # Update additional fields
        for key, value in kwargs.items():
            if hasattr(self, key):
                setattr(self, key, value)

    def mark_webhook_received(self, webhook_payload):
        """Mark that webhook was received and store payload"""
        self.webhook_received_at = datetime.now(timezone.utc)
        self.webhook_data = webhook_payload
        self.updated_at = datetime.now(timezone.utc)

    def is_pending(self):
        """Check if transaction is pending"""
        return self.status == 'PENDING'

    def is_paid(self):
        """Check if transaction is paid"""
        return self.status == 'PAID'

    def is_failed(self):
        """Check if transaction failed"""
        return self.status == 'FAILED'

    def is_canceled(self):
        """Check if transaction was canceled"""
        return self.status == 'CANCELED'

    def is_complete(self):
        """Check if transaction is in a final state"""
        return self.status in ['PAID', 'FAILED', 'CANCELED']

    @staticmethod
    def generate_order_reference(payment_type, payment_id=None):
        """
        Generate unique order reference

        Args:
            payment_type: Type of payment (subscription, booking, etc)
            payment_id: ID of payment record (optional)

        Returns:
            Unique order reference string
        """
        import uuid
        from datetime import datetime

        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        unique_id = str(uuid.uuid4())[:8]

        if payment_id:
            return f"SP-{payment_type.upper()}-{payment_id}-{timestamp}-{unique_id}"
        else:
            return f"SP-{payment_type.upper()}-{timestamp}-{unique_id}"

    @staticmethod
    def get_by_order_reference(order_reference):
        """Get transaction by order reference"""
        return SmilePayTransaction.query.filter_by(order_reference=order_reference).first()

    @staticmethod
    def get_by_transaction_reference(transaction_reference):
        """Get transaction by SmilePay transaction reference"""
        return SmilePayTransaction.query.filter_by(transaction_reference=transaction_reference).first()

    @staticmethod
    def get_user_transactions(user_id, limit=50):
        """Get user's transactions"""
        return SmilePayTransaction.query.filter_by(user_id=user_id)\
            .order_by(SmilePayTransaction.created_at.desc())\
            .limit(limit).all()

    @staticmethod
    def get_pending_transactions(max_age_minutes=10):
        """Get pending transactions older than specified minutes"""
        from datetime import timedelta
        cutoff_time = datetime.now(timezone.utc) - timedelta(minutes=max_age_minutes)

        return SmilePayTransaction.query.filter(
            SmilePayTransaction.status == 'PENDING',
            SmilePayTransaction.initiated_at < cutoff_time
        ).all()
