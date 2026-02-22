from app import db
from datetime import datetime
from sqlalchemy.dialects.postgresql import JSON

class BriefMilestone(db.Model):
    __tablename__ = 'brief_milestones'

    id = db.Column(db.Integer, primary_key=True)
    brief_id = db.Column(db.Integer, db.ForeignKey('briefs.id'), nullable=False)
    milestone_number = db.Column(db.Integer, nullable=False)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    expected_deliverables = db.Column(JSON, nullable=False)  # ["2 Instagram Posts", "1 Story"]
    duration_days = db.Column(db.Integer, nullable=False)
    price = db.Column(db.Numeric(10, 2), nullable=True)  # NULL if total pricing
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Ensure unique milestone numbers per brief
    __table_args__ = (
        db.UniqueConstraint('brief_id', 'milestone_number', name='uq_brief_milestone_number'),
    )

    def to_dict(self):
        """Convert milestone to dictionary"""
        return {
            'id': self.id,
            'brief_id': self.brief_id,
            'milestone_number': self.milestone_number,
            'title': self.title,
            'description': self.description,
            'expected_deliverables': self.expected_deliverables or [],
            'duration_days': self.duration_days,
            'price': float(self.price) if self.price else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

    def __repr__(self):
        return f'<BriefMilestone {self.id}: Brief {self.brief_id}, Milestone {self.milestone_number}>'
