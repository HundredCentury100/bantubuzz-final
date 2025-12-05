from datetime import datetime
from app import db


class Payment(db.Model):
    __tablename__ = 'payments'

    id = db.Column(db.Integer, primary_key=True)
    booking_id = db.Column(db.Integer, db.ForeignKey('bookings.id'), nullable=True)
    collaboration_id = db.Column(db.Integer, db.ForeignKey('collaborations.id'), nullable=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)  # Brand user

    # Payment details
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    currency = db.Column(db.String(3), default='USD')

    # Payment method and type
    payment_method = db.Column(db.String(50), default='paynow')  # 'paynow', 'bank_transfer', 'ecocash', 'cash', 'other'
    payment_type = db.Column(db.String(20), default='automated')  # 'automated', 'manual', 'admin_added'

    # Status
    status = db.Column(db.String(20), default='pending')  # 'pending', 'completed', 'failed', 'refunded'

    # Paynow specific (for automated payments)
    paynow_poll_url = db.Column(db.String(255))
    paynow_reference = db.Column(db.String(100))

    # Manual payment fields
    payment_proof_url = db.Column(db.String(255))  # URL to uploaded payment proof
    payment_reference = db.Column(db.String(100))  # Bank reference, transaction ID, etc.
    external_reference = db.Column(db.String(100))  # Brand's own reference

    # Verification (for manual payments)
    verified_by = db.Column(db.Integer, db.ForeignKey('users.id'))  # Admin who verified
    verified_at = db.Column(db.DateTime)
    verification_notes = db.Column(db.Text)

    # Payment instructions (shown to brand for manual payment)
    payment_instructions = db.Column(db.Text)

    # Escrow status
    escrow_status = db.Column(db.String(20), default='pending')  # 'pending', 'escrowed', 'released', 'refunded'
    held_amount = db.Column(db.Numeric(10, 2))

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at = db.Column(db.DateTime)

    # Relationships
    booking = db.relationship('Booking', backref='payments', foreign_keys=[booking_id])
    user = db.relationship('User', foreign_keys=[user_id])
    verifier = db.relationship('User', foreign_keys=[verified_by])

    def to_dict(self, include_relations=False):
        """Convert payment to dictionary"""
        data = {
            'id': self.id,
            'booking_id': self.booking_id,
            'collaboration_id': self.collaboration_id,
            'user_id': self.user_id,
            'amount': float(self.amount),
            'currency': self.currency,
            'payment_method': self.payment_method,
            'payment_type': self.payment_type,
            'status': self.status,
            'payment_reference': self.payment_reference,
            'external_reference': self.external_reference,
            'payment_proof_url': self.payment_proof_url,
            'verified_by': self.verified_by,
            'verified_at': self.verified_at.isoformat() if self.verified_at else None,
            'verification_notes': self.verification_notes,
            'escrow_status': self.escrow_status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None
        }

        if include_relations:
            if self.booking:
                data['booking'] = self.booking.to_dict(include_relations=True)
            if self.verifier:
                data['verifier'] = {
                    'id': self.verifier.id,
                    'email': self.verifier.email
                }

        return data

    def __repr__(self):
        return f'<Payment {self.id} - {self.amount} - {self.status}>'


class PaymentVerification(db.Model):
    __tablename__ = 'payment_verifications'

    id = db.Column(db.Integer, primary_key=True)
    payment_id = db.Column(db.Integer, db.ForeignKey('payments.id'), nullable=False)
    booking_id = db.Column(db.Integer, db.ForeignKey('bookings.id'))

    # Verification details
    verified_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    verified_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Payment details confirmed
    amount_verified = db.Column(db.Numeric(10, 2), nullable=False)
    payment_method = db.Column(db.String(50), nullable=False)
    transaction_reference = db.Column(db.String(100))
    payment_date = db.Column(db.Date)

    # Proof
    proof_url = db.Column(db.String(255))

    # Notes
    verification_notes = db.Column(db.Text)

    # If verification was edited/updated
    previous_verification_id = db.Column(db.Integer, db.ForeignKey('payment_verifications.id'))

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    payment = db.relationship('Payment', backref='verifications')
    verifier = db.relationship('User', foreign_keys=[verified_by])

    def to_dict(self):
        """Convert verification to dictionary"""
        return {
            'id': self.id,
            'payment_id': self.payment_id,
            'booking_id': self.booking_id,
            'verified_by': self.verified_by,
            'verified_at': self.verified_at.isoformat() if self.verified_at else None,
            'amount_verified': float(self.amount_verified),
            'payment_method': self.payment_method,
            'transaction_reference': self.transaction_reference,
            'payment_date': self.payment_date.isoformat() if self.payment_date else None,
            'proof_url': self.proof_url,
            'verification_notes': self.verification_notes,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

    def __repr__(self):
        return f'<PaymentVerification {self.id} - Payment {self.payment_id}>'
