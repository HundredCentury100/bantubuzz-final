"""
Subscription Usage Model - Tracks monthly usage for subscription limits
"""
from app import db
from datetime import datetime, date
from dateutil.relativedelta import relativedelta
from sqlalchemy import Index


class SubscriptionUsage(db.Model):
    """Track monthly usage for subscription restrictions"""
    __tablename__ = 'subscription_usage'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    month = db.Column(db.Date, nullable=False)  # First day of the month

    # Creator monthly counters
    proposals_sent = db.Column(db.Integer, default=0)
    bookings_received = db.Column(db.Integer, default=0)

    # Brand monthly counters
    campaigns_created = db.Column(db.Integer, default=0)
    collaborations_initiated = db.Column(db.Integer, default=0)

    # Metadata
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = db.relationship('User', backref=db.backref('subscription_usage', lazy='dynamic'))

    # Indexes
    __table_args__ = (
        Index('idx_subscription_usage_user_month', 'user_id', 'month', unique=True),
    )

    @staticmethod
    def get_or_create_current_month(user_id: int):
        """Get or create usage record for current month"""
        current_month = date.today().replace(day=1)

        usage = SubscriptionUsage.query.filter_by(
            user_id=user_id,
            month=current_month
        ).first()

        if not usage:
            usage = SubscriptionUsage(
                user_id=user_id,
                month=current_month
            )
            db.session.add(usage)
            db.session.commit()

        return usage

    @staticmethod
    def increment_proposals(user_id: int) -> int:
        """Increment proposals sent counter for current month"""
        usage = SubscriptionUsage.get_or_create_current_month(user_id)
        usage.proposals_sent += 1
        usage.updated_at = datetime.utcnow()
        db.session.commit()
        return usage.proposals_sent

    @staticmethod
    def increment_bookings(user_id: int) -> int:
        """Increment bookings received counter for current month"""
        usage = SubscriptionUsage.get_or_create_current_month(user_id)
        usage.bookings_received += 1
        usage.updated_at = datetime.utcnow()
        db.session.commit()
        return usage.bookings_received

    @staticmethod
    def increment_campaigns(user_id: int) -> int:
        """Increment campaigns created counter for current month"""
        usage = SubscriptionUsage.get_or_create_current_month(user_id)
        usage.campaigns_created += 1
        usage.updated_at = datetime.utcnow()
        db.session.commit()
        return usage.campaigns_created

    @staticmethod
    def increment_collaborations(user_id: int) -> int:
        """Increment collaborations initiated counter for current month"""
        usage = SubscriptionUsage.get_or_create_current_month(user_id)
        usage.collaborations_initiated += 1
        usage.updated_at = datetime.utcnow()
        db.session.commit()
        return usage.collaborations_initiated

    @staticmethod
    def get_current_month_usage(user_id: int) -> dict:
        """Get usage stats for current month"""
        usage = SubscriptionUsage.get_or_create_current_month(user_id)

        # Calculate reset date (first day of next month)
        next_month = usage.month + relativedelta(months=1)

        return {
            'proposals_sent': usage.proposals_sent,
            'bookings_received': usage.bookings_received,
            'campaigns_created': usage.campaigns_created,
            'collaborations_initiated': usage.collaborations_initiated,
            'month': usage.month.isoformat(),
            'resets_at': next_month.isoformat()
        }

    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'month': self.month.isoformat(),
            'proposals_sent': self.proposals_sent,
            'bookings_received': self.bookings_received,
            'campaigns_created': self.campaigns_created,
            'collaborations_initiated': self.collaborations_initiated,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
