from app import db
from datetime import datetime
from sqlalchemy.dialects.postgresql import JSON

class CampaignMilestone(db.Model):
    __tablename__ = 'campaign_milestones'

    id = db.Column(db.Integer, primary_key=True)
    campaign_id = db.Column(db.Integer, db.ForeignKey('campaigns.id'), nullable=False)
    milestone_number = db.Column(db.Integer, nullable=False)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    expected_deliverables = db.Column(JSON, nullable=False)  # ["2 Instagram Posts", "1 Story"]
    duration_days = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

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
            'title': self.title,
            'description': self.description,
            'expected_deliverables': self.expected_deliverables or [],
            'duration_days': self.duration_days,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

    def __repr__(self):
        return f'<CampaignMilestone {self.id}: Campaign {self.campaign_id}, Milestone {self.milestone_number}>'
