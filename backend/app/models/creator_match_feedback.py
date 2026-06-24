from datetime import datetime

from app import db


class CreatorMatchFeedback(db.Model):
    __tablename__ = 'creator_match_feedback'

    id = db.Column(db.Integer, primary_key=True)
    brand_user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    campaign_id = db.Column(db.Integer, db.ForeignKey('campaigns.id', ondelete='CASCADE'), nullable=False, index=True)
    creator_id = db.Column(db.Integer, db.ForeignKey('creator_profiles.id', ondelete='CASCADE'), nullable=False, index=True)
    feedback = db.Column(db.String(10), nullable=False)
    reason = db.Column(db.Text)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    brand_user = db.relationship('User', foreign_keys=[brand_user_id])
    campaign = db.relationship('Campaign', foreign_keys=[campaign_id])
    creator = db.relationship('CreatorProfile', foreign_keys=[creator_id])

    __table_args__ = (
        db.UniqueConstraint('brand_user_id', 'campaign_id', 'creator_id', name='uq_creator_match_feedback'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'brand_user_id': self.brand_user_id,
            'campaign_id': self.campaign_id,
            'creator_id': self.creator_id,
            'feedback': self.feedback,
            'reason': self.reason,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
