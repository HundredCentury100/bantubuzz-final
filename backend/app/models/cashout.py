from datetime import datetime
from app import db


class CashoutRequest(db.Model):
    __tablename__ = 'cashout_requests'

    id = db.Column(db.Integer, primary_key=True)
    request_reference = db.Column(db.String(50), unique=True, nullable=False)  # CR-123456

    # User info
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    creator_id = db.Column(db.Integer, db.ForeignKey('creator_profiles.id'), nullable=False)
    wallet_id = db.Column(db.Integer, db.ForeignKey('wallets.id'), nullable=False)

    # Request details
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    currency = db.Column(db.String(3), default='USD')

    # Payment method chosen by creator
    payment_method = db.Column(db.String(50), nullable=False)  # 'ecocash', 'bank_transfer', 'cash_pickup', 'onemoney', 'other'
    payment_details = db.Column(db.JSON, nullable=False)
    # EcoCash: { "phone": "+263771234567", "name": "John Doe" }
    # Bank: { "bank_name": "CBZ", "account_number": "1234567890", "account_name": "John Doe", "branch": "Harare" }
    # Cash: { "pickup_location": "Harare Office", "id_number": "12-345678-A-12" }

    # Status tracking
    status = db.Column(db.String(30), default='pending', nullable=False)
    # Values: 'pending', 'processing', 'completed', 'failed', 'cancelled'

    # Creator notes
    creator_notes = db.Column(db.Text)

    # Admin processing
    assigned_to = db.Column(db.Integer, db.ForeignKey('users.id'))  # Admin assigned to process
    assigned_at = db.Column(db.DateTime)

    processed_by = db.Column(db.Integer, db.ForeignKey('users.id'))  # Admin who completed it
    processed_at = db.Column(db.DateTime)

    # Payment proof from admin
    payment_proof_url = db.Column(db.String(255))
    transaction_reference = db.Column(db.String(100))
    admin_notes = db.Column(db.Text)

    # Failure handling
    failed_at = db.Column(db.DateTime)
    failure_reason = db.Column(db.Text)

    # Cancellation
    cancelled_at = db.Column(db.DateTime)
    cancelled_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    cancellation_reason = db.Column(db.Text)

    # Fees (if any)
    cashout_fee = db.Column(db.Numeric(10, 2), default=0.00)
    net_amount = db.Column(db.Numeric(10, 2))  # Amount - fee

    # Timestamps
    requested_at = db.Column(db.DateTime, default=datetime.utcnow)
    completed_at = db.Column(db.DateTime)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = db.relationship('User', foreign_keys=[user_id])
    creator = db.relationship('CreatorProfile', foreign_keys=[creator_id])
    assigned_admin = db.relationship('User', foreign_keys=[assigned_to])
    processor = db.relationship('User', foreign_keys=[processed_by])
    canceller = db.relationship('User', foreign_keys=[cancelled_by])

    def to_dict(self, include_relations=False):
        """Convert cashout request to dictionary"""
        data = {
            'id': self.id,
            'request_reference': self.request_reference,
            'user_id': self.user_id,
            'creator_id': self.creator_id,
            'wallet_id': self.wallet_id,
            'amount': float(self.amount),
            'currency': self.currency,
            'payment_method': self.payment_method,
            'payment_details': self.payment_details,
            'status': self.status,
            'creator_notes': self.creator_notes,
            'assigned_to': self.assigned_to,
            'assigned_at': self.assigned_at.isoformat() if self.assigned_at else None,
            'processed_by': self.processed_by,
            'processed_at': self.processed_at.isoformat() if self.processed_at else None,
            'payment_proof_url': self.payment_proof_url,
            'transaction_reference': self.transaction_reference,
            'admin_notes': self.admin_notes,
            'failed_at': self.failed_at.isoformat() if self.failed_at else None,
            'failure_reason': self.failure_reason,
            'cancelled_at': self.cancelled_at.isoformat() if self.cancelled_at else None,
            'cancelled_by': self.cancelled_by,
            'cancellation_reason': self.cancellation_reason,
            'cashout_fee': float(self.cashout_fee),
            'net_amount': float(self.net_amount) if self.net_amount else float(self.amount),
            'requested_at': self.requested_at.isoformat() if self.requested_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

        if include_relations:
            if self.creator:
                data['creator'] = {
                    'id': self.creator.id,
                    'display_name': self.creator.display_name,
                    'user': {
                        'id': self.creator.user.id,
                        'email': self.creator.user.email
                    } if self.creator.user else None
                }
            if self.processor:
                data['processor'] = {
                    'id': self.processor.id,
                    'email': self.processor.email
                }
            if self.assigned_admin:
                data['assigned_admin'] = {
                    'id': self.assigned_admin.id,
                    'email': self.assigned_admin.email
                }

        return data

    def __repr__(self):
        return f'<CashoutRequest {self.request_reference} - {self.status}>'
