"""Campaign report schedules and secure public report links."""
from datetime import datetime

from app import db


class CampaignReportSchedule(db.Model):
    __tablename__ = 'campaign_report_schedules'

    id = db.Column(db.Integer, primary_key=True)
    campaign_id = db.Column(
        db.Integer,
        db.ForeignKey('campaigns.id', ondelete='CASCADE'),
        nullable=False,
        index=True,
    )
    brand_user_id = db.Column(
        db.Integer,
        db.ForeignKey('users.id', ondelete='CASCADE'),
        nullable=False,
        index=True,
    )
    frequency = db.Column(db.String(20), nullable=False)  # weekly, monthly
    recipients = db.Column(db.JSON, nullable=False, default=list)
    subject = db.Column(db.String(180))
    date_range_mode = db.Column(db.String(20), nullable=False, default='last_30_days')
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    next_run_at = db.Column(db.DateTime, nullable=False, index=True)
    last_run_at = db.Column(db.DateTime)
    last_status = db.Column(db.String(20))
    last_error = db.Column(db.Text)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    campaign = db.relationship(
        'Campaign',
        backref=db.backref('report_schedules', lazy='dynamic', cascade='all, delete-orphan'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'campaign_id': self.campaign_id,
            'frequency': self.frequency,
            'recipients': self.recipients or [],
            'subject': self.subject,
            'date_range_mode': self.date_range_mode,
            'is_active': self.is_active,
            'next_run_at': self.next_run_at.isoformat() if self.next_run_at else None,
            'last_run_at': self.last_run_at.isoformat() if self.last_run_at else None,
            'last_status': self.last_status,
            'last_error': self.last_error,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class CampaignReportShare(db.Model):
    __tablename__ = 'campaign_report_shares'

    id = db.Column(db.Integer, primary_key=True)
    campaign_id = db.Column(
        db.Integer,
        db.ForeignKey('campaigns.id', ondelete='CASCADE'),
        nullable=False,
        index=True,
    )
    brand_user_id = db.Column(
        db.Integer,
        db.ForeignKey('users.id', ondelete='CASCADE'),
        nullable=False,
        index=True,
    )
    token = db.Column(db.String(96), nullable=False, unique=True, index=True)
    label = db.Column(db.String(120))
    start_date = db.Column(db.Date)
    end_date = db.Column(db.Date)
    expires_at = db.Column(db.DateTime, nullable=False, index=True)
    revoked_at = db.Column(db.DateTime)
    last_viewed_at = db.Column(db.DateTime)
    view_count = db.Column(db.Integer, nullable=False, default=0)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    campaign = db.relationship(
        'Campaign',
        backref=db.backref('report_shares', lazy='dynamic', cascade='all, delete-orphan'),
    )

    @property
    def is_active(self):
        return not self.revoked_at and self.expires_at > datetime.utcnow()

    def to_dict(self, include_token=True):
        data = {
            'id': self.id,
            'campaign_id': self.campaign_id,
            'label': self.label,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'revoked_at': self.revoked_at.isoformat() if self.revoked_at else None,
            'last_viewed_at': self.last_viewed_at.isoformat() if self.last_viewed_at else None,
            'view_count': self.view_count or 0,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
        if include_token:
            data['token'] = self.token
        return data
