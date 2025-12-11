from datetime import datetime
from app import db


class Wallet(db.Model):
    __tablename__ = 'wallets'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), unique=True, nullable=False)

    # Balance breakdown
    pending_clearance = db.Column(db.Numeric(10, 2), default=0.00)  # Money in 30-day hold
    available_balance = db.Column(db.Numeric(10, 2), default=0.00)  # Money ready to withdraw
    withdrawn_total = db.Column(db.Numeric(10, 2), default=0.00)    # Lifetime withdrawals
    total_earned = db.Column(db.Numeric(10, 2), default=0.00)       # Lifetime NET earnings (after platform fees)

    # Metadata
    currency = db.Column(db.String(3), default='USD')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    transactions = db.relationship('WalletTransaction', backref='wallet', lazy='dynamic')
    cashout_requests = db.relationship('CashoutRequest', backref='wallet', lazy='dynamic')

    def to_dict(self):
        """Convert wallet to dictionary"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'pending_clearance': float(self.pending_clearance),
            'available_balance': float(self.available_balance),
            'withdrawn_total': float(self.withdrawn_total),
            'total_earned': float(self.total_earned),
            'currency': self.currency,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

    def __repr__(self):
        return f'<Wallet {self.id} - User {self.user_id}>'


class WalletTransaction(db.Model):
    __tablename__ = 'wallet_transactions'

    id = db.Column(db.Integer, primary_key=True)
    wallet_id = db.Column(db.Integer, db.ForeignKey('wallets.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)

    # Transaction details
    transaction_type = db.Column(db.String(20), nullable=False)  # 'earning', 'cashout', 'refund', 'fee', 'bonus'
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    currency = db.Column(db.String(3), default='USD')

    # Status tracking
    status = db.Column(db.String(20), nullable=False)  # 'escrowed', 'pending_clearance', 'available', 'withdrawn', 'failed'

    # Clearance tracking
    clearance_required = db.Column(db.Boolean, default=True)
    clearance_days = db.Column(db.Integer, default=30)
    completed_at = db.Column(db.DateTime)  # When collaboration marked complete
    available_at = db.Column(db.DateTime)  # When money becomes available (completed_at + 30 days)
    cleared_at = db.Column(db.DateTime)    # When actually cleared

    # Related entities
    collaboration_id = db.Column(db.Integer, db.ForeignKey('collaborations.id'))
    booking_id = db.Column(db.Integer, db.ForeignKey('bookings.id'))
    cashout_request_id = db.Column(db.Integer, db.ForeignKey('cashout_requests.id'))

    # Financial breakdown
    gross_amount = db.Column(db.Numeric(10, 2))  # Before fees
    platform_fee = db.Column(db.Numeric(10, 2))  # Fee charged
    platform_fee_percentage = db.Column(db.Numeric(5, 2))  # Fee % at time of transaction
    net_amount = db.Column(db.Numeric(10, 2))    # After fees (amount field)

    # Description
    description = db.Column(db.Text)
    transaction_metadata = db.Column(db.JSON)  # Additional data (brand name, package name, etc.)

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        """Convert transaction to dictionary"""
        return {
            'id': self.id,
            'wallet_id': self.wallet_id,
            'user_id': self.user_id,
            'transaction_type': self.transaction_type,
            'amount': float(self.amount),
            'currency': self.currency,
            'status': self.status,
            'clearance_required': self.clearance_required,
            'clearance_days': self.clearance_days,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'available_at': self.available_at.isoformat() if self.available_at else None,
            'cleared_at': self.cleared_at.isoformat() if self.cleared_at else None,
            'collaboration_id': self.collaboration_id,
            'booking_id': self.booking_id,
            'cashout_request_id': self.cashout_request_id,
            'gross_amount': float(self.gross_amount) if self.gross_amount else None,
            'platform_fee': float(self.platform_fee) if self.platform_fee else None,
            'platform_fee_percentage': float(self.platform_fee_percentage) if self.platform_fee_percentage else None,
            'net_amount': float(self.net_amount) if self.net_amount else None,
            'description': self.description,
            'metadata': self.transaction_metadata,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

    def __repr__(self):
        return f'<WalletTransaction {self.id} - {self.transaction_type} - {self.amount}>'
