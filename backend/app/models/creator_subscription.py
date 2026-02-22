"""
Creator Subscription Model
Tracks individual creator subscriptions to featured/verification plans
"""
from app import db
from datetime import datetime, timedelta


class CreatorSubscription(db.Model):
    __tablename__ = 'creator_subscriptions'

    id = db.Column(db.Integer, primary_key=True)
    creator_id = db.Column(db.Integer, db.ForeignKey('creator_profiles.id'), nullable=False)
    plan_id = db.Column(db.Integer, db.ForeignKey('creator_subscription_plans.id'), nullable=False)
    status = db.Column(db.String(20), default='active')  # active, expired, cancelled, pending_payment

    # Payment Info
    payment_method = db.Column(db.String(30))  # paynow, manual
    payment_reference = db.Column(db.String(100))
    paynow_poll_url = db.Column(db.Text)
    payment_verified = db.Column(db.Boolean, default=False)

    # Subscription Period
    start_date = db.Column(db.DateTime)
    end_date = db.Column(db.DateTime)
    auto_renew = db.Column(db.Boolean, default=False)

    # Metadata
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    # plan is backref from CreatorSubscriptionPlan
    # creator is backref from CreatorProfile (will add to creator_profile.py)

    def is_active(self):
        """Check if subscription is currently active"""
        if self.status != 'active':
            return False
        if self.end_date and datetime.utcnow() > self.end_date:
            return False
        return True

    def days_remaining(self):
        """Calculate days until subscription expires"""
        if not self.end_date:
            return None
        delta = self.end_date - datetime.utcnow()
        return max(0, delta.days)

    def activate_subscription(self):
        """Activate the subscription after payment"""
        self.status = 'active'
        self.payment_verified = True
        self.start_date = datetime.utcnow()
        if self.plan:
            self.end_date = self.start_date + timedelta(days=self.plan.duration_days)

    def to_dict(self):
        return {
            'id': self.id,
            'creator_id': self.creator_id,
            'plan': self.plan.to_dict() if self.plan else None,
            'status': self.status,
            'payment_method': self.payment_method,
            'payment_reference': self.payment_reference,
            'payment_verified': self.payment_verified,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'days_remaining': self.days_remaining(),
            'auto_renew': self.auto_renew,
            'is_active': self.is_active(),
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

    def __repr__(self):
        return f'<CreatorSubscription creator_id={self.creator_id} plan={self.plan.name if self.plan else None} status={self.status}>'
