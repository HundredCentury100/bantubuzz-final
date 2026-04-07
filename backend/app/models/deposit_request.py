from datetime import datetime
from app import db


class DepositRequest(db.Model):
    """
    Model for tracking brand wallet deposit requests via Paynow or Bank Transfer
    """
    __tablename__ = 'deposit_requests'

    id = db.Column(db.Integer, primary_key=True)
    wallet_id = db.Column(db.Integer, db.ForeignKey('wallets.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)

    # Deposit details
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    currency = db.Column(db.String(3), default='USD')
    payment_method = db.Column(db.String(20), nullable=False)  # 'paynow' or 'bank_transfer'

    # Status tracking
    status = db.Column(db.String(20), default='pending')  # pending, completed, failed, cancelled
    deposit_reference = db.Column(db.String(100), unique=True, nullable=False)

    # Paynow-specific fields
    paynow_poll_url = db.Column(db.String(255))
    paynow_redirect_url = db.Column(db.String(255))
    paynow_payment_reference = db.Column(db.String(100))

    # Bank transfer-specific fields
    proof_of_payment = db.Column(db.String(500))  # File path for uploaded proof

    # Admin verification
    verified_by = db.Column(db.Integer, db.ForeignKey('users.id'))  # Admin who verified
    verified_at = db.Column(db.DateTime)
    admin_notes = db.Column(db.Text)  # Admin notes during verification

    # Transaction linkage
    transaction_id = db.Column(db.Integer, db.ForeignKey('wallet_transactions.id'))  # Created after confirmation

    # Timestamps
    requested_at = db.Column(db.DateTime, default=datetime.utcnow)
    completed_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    wallet = db.relationship('Wallet', backref=db.backref('deposit_requests', lazy='dynamic'))
    user = db.relationship('User', foreign_keys=[user_id], backref=db.backref('deposit_requests', lazy='dynamic'))
    verifier = db.relationship('User', foreign_keys=[verified_by])
    transaction = db.relationship('WalletTransaction', backref=db.backref('deposit_request', uselist=False))

    def to_dict(self, include_relations=False):
        """Convert deposit request to dictionary"""
        data = {
            'id': self.id,
            'wallet_id': self.wallet_id,
            'user_id': self.user_id,
            'amount': float(self.amount),
            'currency': self.currency,
            'payment_method': self.payment_method,
            'status': self.status,
            'deposit_reference': self.deposit_reference,
            'paynow_poll_url': self.paynow_poll_url,
            'paynow_redirect_url': self.paynow_redirect_url,
            'paynow_payment_reference': self.paynow_payment_reference,
            'proof_of_payment': self.proof_of_payment,
            'verified_by': self.verified_by,
            'verified_at': self.verified_at.isoformat() if self.verified_at else None,
            'admin_notes': self.admin_notes,
            'transaction_id': self.transaction_id,
            'requested_at': self.requested_at.isoformat() if self.requested_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

        if include_relations:
            if self.user:
                data['user'] = {
                    'id': self.user.id,
                    'email': self.user.email,
                    'user_type': self.user.user_type
                }
            if self.verifier:
                data['verifier'] = {
                    'id': self.verifier.id,
                    'email': self.verifier.email
                }
            if self.transaction:
                data['transaction'] = self.transaction.to_dict()

        return data

    def __repr__(self):
        return f'<DepositRequest {self.id} - {self.deposit_reference} - {self.status}>'
