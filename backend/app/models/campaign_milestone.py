from app import db
from datetime import datetime
from sqlalchemy.dialects.postgresql import JSON

class CampaignMilestone(db.Model):
    """Campaign milestones for tracking deliverables over time"""
    __tablename__ = 'campaign_milestones'

    id = db.Column(db.Integer, primary_key=True)
    campaign_id = db.Column(db.Integer, db.ForeignKey('campaigns.id', ondelete='CASCADE'), nullable=False)
    milestone_number = db.Column(db.Integer, nullable=False)
    name = db.Column(db.String(200), nullable=False)  # Renamed from 'title' in migration
    description = db.Column(db.Text, nullable=True)
    deliverables = db.Column(JSON, nullable=True)  # Renamed from 'expected_deliverables' in migration
    duration_days = db.Column(db.Integer)  # How many days from campaign start
    due_date = db.Column(db.DateTime)  # When this milestone should be completed (added in migration)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)  # Added in migration

    # Ensure unique milestone numbers per campaign
    __table_args__ = (
        db.UniqueConstraint('campaign_id', 'milestone_number', name='uq_campaign_milestone_number'),
    )

    def to_dict(self):
        """Convert milestone to dictionary"""
        return {
            'id': self.id,
            'campaign_id': self.campaign_id,
            'milestone_number': self.milestone_number,
            'name': self.name,
            'description': self.description,
            'deliverables': self.deliverables or [],
            'duration_days': self.duration_days,
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

    def __repr__(self):
        return f'<CampaignMilestone {self.id}: {self.name}>'
