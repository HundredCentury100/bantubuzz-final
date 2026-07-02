from datetime import datetime

from app import db


class BulkBriefSend(db.Model):
    __tablename__ = 'bulk_brief_sends'

    id = db.Column(db.Integer, primary_key=True)
    brief_id = db.Column(db.Integer, db.ForeignKey('briefs.id', ondelete='CASCADE'), nullable=False, index=True)
    brand_id = db.Column(db.Integer, db.ForeignKey('brand_profiles.id', ondelete='CASCADE'), nullable=False, index=True)
    workspace_id = db.Column(db.Integer, db.ForeignKey('client_workspaces.id', ondelete='SET NULL'), nullable=True, index=True)
    subject = db.Column(db.String(200), nullable=False)
    message_template = db.Column(db.Text, nullable=False)
    schedule_mode = db.Column(db.String(20), nullable=False, default='now')
    scheduled_start_at = db.Column(db.DateTime, nullable=True)
    spread_hours = db.Column(db.Integer, nullable=False, default=0)
    status = db.Column(db.String(20), nullable=False, default='scheduled')
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    brief = db.relationship('Brief', backref=db.backref('bulk_sends', lazy='dynamic', cascade='all, delete-orphan'))
    brand = db.relationship('BrandProfile', foreign_keys=[brand_id])

    def to_dict(self, include_recipients=False):
        recipients = self.recipients.order_by(BulkBriefRecipient.scheduled_at.asc()).all()
        opened = sum(1 for recipient in recipients if recipient.opened_at)
        responded = sum(1 for recipient in recipients if recipient.responded_at)
        total = len(recipients)
        data = {
            'id': self.id,
            'brief_id': self.brief_id,
            'brand_id': self.brand_id,
            'workspace_id': self.workspace_id,
            'subject': self.subject,
            'message_template': self.message_template,
            'schedule_mode': self.schedule_mode,
            'scheduled_start_at': self.scheduled_start_at.isoformat() if self.scheduled_start_at else None,
            'spread_hours': self.spread_hours,
            'status': self.status,
            'recipient_count': total,
            'sent_count': sum(1 for recipient in recipients if recipient.status == 'sent'),
            'open_count': opened,
            'response_count': responded,
            'open_rate': round((opened / total) * 100, 1) if total else 0,
            'response_rate': round((responded / total) * 100, 1) if total else 0,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
        if include_recipients:
            data['recipients'] = [recipient.to_dict() for recipient in recipients]
        return data


class BulkBriefRecipient(db.Model):
    __tablename__ = 'bulk_brief_recipients'

    id = db.Column(db.Integer, primary_key=True)
    bulk_send_id = db.Column(db.Integer, db.ForeignKey('bulk_brief_sends.id', ondelete='CASCADE'), nullable=False, index=True)
    creator_id = db.Column(db.Integer, db.ForeignKey('creator_profiles.id', ondelete='CASCADE'), nullable=False, index=True)
    creator_user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    rendered_subject = db.Column(db.String(200), nullable=False)
    rendered_message = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(20), nullable=False, default='scheduled')
    scheduled_at = db.Column(db.DateTime, nullable=False, index=True)
    sent_at = db.Column(db.DateTime, nullable=True)
    opened_at = db.Column(db.DateTime, nullable=True)
    responded_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    bulk_send = db.relationship('BulkBriefSend', backref=db.backref('recipients', lazy='dynamic', cascade='all, delete-orphan'))
    creator = db.relationship('CreatorProfile', foreign_keys=[creator_id])
    creator_user = db.relationship('User', foreign_keys=[creator_user_id])

    __table_args__ = (
        db.UniqueConstraint('bulk_send_id', 'creator_id', name='uq_bulk_brief_recipient_creator'),
    )

    def to_dict(self):
        creator = self.creator
        return {
            'id': self.id,
            'bulk_send_id': self.bulk_send_id,
            'creator_id': self.creator_id,
            'creator_user_id': self.creator_user_id,
            'creator': creator.to_dict(public_view=True) if creator else None,
            'rendered_subject': self.rendered_subject,
            'rendered_message': self.rendered_message,
            'status': self.status,
            'scheduled_at': self.scheduled_at.isoformat() if self.scheduled_at else None,
            'sent_at': self.sent_at.isoformat() if self.sent_at else None,
            'opened_at': self.opened_at.isoformat() if self.opened_at else None,
            'responded_at': self.responded_at.isoformat() if self.responded_at else None,
        }
