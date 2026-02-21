"""
Subscription Model - Tracks user subscriptions and billing
"""
from app import db
from datetime import datetime, timedelta


class Subscription(db.Model):
    __tablename__ = 'subscriptions'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    plan_id = db.Column(db.Integer, db.ForeignKey('subscription_plans.id'), nullable=False)

    # Subscription Status
    status = db.Column(db.String(20), default='active')  # active, cancelled, expired, past_due, trialing
    billing_cycle = db.Column(db.String(20), default='monthly')  # monthly, yearly

    # Billing Period
    current_period_start = db.Column(db.DateTime, default=datetime.utcnow)
    current_period_end = db.Column(db.DateTime)
    trial_end = db.Column(db.DateTime, nullable=True)  # For trial periods

    # Cancellation
    cancel_at_period_end = db.Column(db.Boolean, default=False)
    cancelled_at = db.Column(db.DateTime, nullable=True)
    cancellation_reason = db.Column(db.Text, nullable=True)

    # Payment Info
    payment_method = db.Column(db.String(30))  # paynow, bank_transfer, stripe, paypal, etc.
    payment_reference = db.Column(db.String(100))  # External payment ID
    last_payment_date = db.Column(db.DateTime, nullable=True)
    next_payment_date = db.Column(db.DateTime, nullable=True)
    last_payment_amount = db.Column(db.Float, nullable=True)

    # Admin Actions
    admin_note = db.Column(db.Text, nullable=True)  # Internal admin notes
    modified_by_admin = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)

    # Metadata
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def set_billing_period(self, billing_cycle='monthly'):
        """Set current_period_end and next_payment_date based on billing cycle"""
        self.billing_cycle = billing_cycle
        self.current_period_start = datetime.utcnow()

        if billing_cycle == 'yearly':
            self.current_period_end = self.current_period_start + timedelta(days=365)
            self.next_payment_date = self.current_period_end
        else:  # monthly
            self.current_period_end = self.current_period_start + timedelta(days=30)
            self.next_payment_date = self.current_period_end

    def is_active(self):
        """Check if subscription is currently active"""
        if self.status != 'active':
            return False
        if self.current_period_end and datetime.utcnow() > self.current_period_end:
            return False
        return True

    def days_until_renewal(self):
        """Calculate days until next renewal"""
        if not self.next_payment_date:
            return None
        delta = self.next_payment_date - datetime.utcnow()
        return max(0, delta.days)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'plan': self.plan.to_dict() if self.plan else None,
            'status': self.status,
            'billing_cycle': self.billing_cycle,
            'current_period_start': self.current_period_start.isoformat() if self.current_period_start else None,
            'current_period_end': self.current_period_end.isoformat() if self.current_period_end else None,
            'cancel_at_period_end': self.cancel_at_period_end,
            'cancelled_at': self.cancelled_at.isoformat() if self.cancelled_at else None,
            'payment_method': self.payment_method,
            'next_payment_date': self.next_payment_date.isoformat() if self.next_payment_date else None,
            'last_payment_date': self.last_payment_date.isoformat() if self.last_payment_date else None,
            'last_payment_amount': float(self.last_payment_amount) if self.last_payment_amount else None,
            'days_until_renewal': self.days_until_renewal(),
            'is_active': self.is_active(),
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

    def __repr__(self):
        return f'<Subscription user_id={self.user_id} plan={self.plan.name if self.plan else None} status={self.status}>'
