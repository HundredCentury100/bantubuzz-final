from app import db
from datetime import datetime

class MilestoneDeliverable(db.Model):
    __tablename__ = 'milestone_deliverables'

    id = db.Column(db.Integer, primary_key=True)
    collaboration_milestone_id = db.Column(db.Integer, db.ForeignKey('collaboration_milestones.id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    url = db.Column(db.Text, nullable=False)
    description = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(20), default='pending_review')  # pending_review, revision_requested, approved
    submitted_at = db.Column(db.DateTime, default=datetime.utcnow)
    approved_at = db.Column(db.DateTime, nullable=True)
    revision_notes = db.Column(db.Text, nullable=True)
    revision_requested_at = db.Column(db.DateTime, nullable=True)

    def to_dict(self):
        """Convert deliverable to dictionary"""
        return {
            'id': self.id,
            'collaboration_milestone_id': self.collaboration_milestone_id,
            'title': self.title,
            'url': self.url,
            'description': self.description,
            'status': self.status,
            'submitted_at': self.submitted_at.isoformat() if self.submitted_at else None,
            'approved_at': self.approved_at.isoformat() if self.approved_at else None,
            'revision_notes': self.revision_notes,
            'revision_requested_at': self.revision_requested_at.isoformat() if self.revision_requested_at else None
        }

    def __repr__(self):
        return f'<MilestoneDeliverable {self.id}: {self.title}>'
