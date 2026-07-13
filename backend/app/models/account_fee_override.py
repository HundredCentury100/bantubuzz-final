from datetime import datetime
from app import db


class AccountFeeOverride(db.Model):
    __tablename__ = 'account_fee_overrides'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    override_type = db.Column(db.String(40), nullable=False)  # creator_commission, brand_service_fee, brand_platform_fee
    percentage = db.Column(db.Numeric(5, 2), nullable=False)
    starts_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    ends_at = db.Column(db.DateTime, nullable=True)
    reason = db.Column(db.Text, nullable=True)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_by_admin_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = db.relationship('User', foreign_keys=[user_id], backref=db.backref('fee_overrides', lazy='dynamic'))
    created_by_admin = db.relationship('User', foreign_keys=[created_by_admin_id])

    def is_current(self, now=None):
        now = now or datetime.utcnow()
        if not self.is_active:
            return False
        if self.starts_at and self.starts_at > now:
            return False
        if self.ends_at and self.ends_at <= now:
            return False
        return True

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'override_type': self.override_type,
            'percentage': float(self.percentage),
            'starts_at': self.starts_at.isoformat() if self.starts_at else None,
            'ends_at': self.ends_at.isoformat() if self.ends_at else None,
            'reason': self.reason,
            'is_active': self.is_active,
            'created_by_admin_id': self.created_by_admin_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
