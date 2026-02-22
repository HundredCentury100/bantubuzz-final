from app import db
from datetime import datetime
from sqlalchemy.dialects.postgresql import JSON

class ProposalMilestone(db.Model):
    __tablename__ = 'proposal_milestones'

    id = db.Column(db.Integer, primary_key=True)
    proposal_id = db.Column(db.Integer, db.ForeignKey('proposals.id'), nullable=False)
    milestone_number = db.Column(db.Integer, nullable=False)
    title = db.Column(db.String(200), nullable=False)
    deliverables = db.Column(JSON, nullable=False)  # ["2 Reels", "1 Post"]
    duration_days = db.Column(db.Integer, nullable=False)
    price = db.Column(db.Numeric(10, 2), nullable=True)  # NULL if total pricing
    notes = db.Column(db.Text, nullable=True)

    # Ensure unique milestone numbers per proposal
    __table_args__ = (
        db.UniqueConstraint('proposal_id', 'milestone_number', name='uq_proposal_milestone_number'),
    )

    def to_dict(self):
        """Convert milestone to dictionary"""
        return {
            'id': self.id,
            'proposal_id': self.proposal_id,
            'milestone_number': self.milestone_number,
            'title': self.title,
            'deliverables': self.deliverables or [],
            'duration_days': self.duration_days,
            'price': float(self.price) if self.price else None,
            'notes': self.notes
        }

    def __repr__(self):
        return f'<ProposalMilestone {self.id}: Proposal {self.proposal_id}, Milestone {self.milestone_number}>'
