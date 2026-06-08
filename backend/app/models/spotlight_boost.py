from datetime import datetime
from app import db


class SpotlightBoost(db.Model):
    __tablename__ = 'spotlight_boosts'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    target_type = db.Column(db.String(20), nullable=False)  # creator_profile, campaign
    target_id = db.Column(db.Integer, nullable=False, index=True)
    duration_days = db.Column(db.Integer, nullable=False)
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    currency = db.Column(db.String(3), default='USD')
    status = db.Column(db.String(20), nullable=False, default='active')  # active, expired, cancelled
    payment_method = db.Column(db.String(30), nullable=False, default='wallet')
    payment_reference = db.Column(db.String(100))
    wallet_transaction_id = db.Column(db.Integer, db.ForeignKey('wallet_transactions.id'))
    starts_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    ends_at = db.Column(db.DateTime, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = db.relationship('User', backref=db.backref('spotlight_boosts', lazy='dynamic'))
    wallet_transaction = db.relationship('WalletTransaction', foreign_keys=[wallet_transaction_id])

    def is_active(self):
        return self.status == 'active' and self.starts_at <= datetime.utcnow() < self.ends_at

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'target_type': self.target_type,
            'target_id': self.target_id,
            'duration_days': self.duration_days,
            'amount': float(self.amount),
            'currency': self.currency,
            'status': self.status,
            'payment_method': self.payment_method,
            'payment_reference': self.payment_reference,
            'wallet_transaction_id': self.wallet_transaction_id,
            'starts_at': self.starts_at.isoformat() if self.starts_at else None,
            'ends_at': self.ends_at.isoformat() if self.ends_at else None,
            'is_active': self.is_active(),
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f'<SpotlightBoost {self.target_type}:{self.target_id} {self.duration_days}d>'
