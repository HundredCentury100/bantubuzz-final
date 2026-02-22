from app import db
from datetime import datetime

class Proposal(db.Model):
    __tablename__ = 'proposals'

    id = db.Column(db.Integer, primary_key=True)
    brief_id = db.Column(db.Integer, db.ForeignKey('briefs.id'), nullable=False)
    creator_id = db.Column(db.Integer, db.ForeignKey('creator_profiles.id'), nullable=False)
    status = db.Column(db.String(20), default='pending')  # pending, accepted, rejected
    message = db.Column(db.Text, nullable=False)  # Cover letter
    total_price = db.Column(db.Numeric(10, 2), nullable=False)
    pricing_type = db.Column(db.String(20), nullable=False)  # total, per_milestone
    timeline_days = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    creator = db.relationship('CreatorProfile', backref='proposals')
    milestones = db.relationship('ProposalMilestone', backref='proposal', lazy='dynamic', cascade='all, delete-orphan', order_by='ProposalMilestone.milestone_number')

    # Ensure one proposal per creator per brief
    __table_args__ = (
        db.UniqueConstraint('brief_id', 'creator_id', name='uq_brief_creator_proposal'),
    )

    def to_dict(self, include_relations=False):
        """Convert proposal to dictionary"""
        data = {
            'id': self.id,
            'brief_id': self.brief_id,
            'creator_id': self.creator_id,
            'status': self.status,
            'message': self.message,
            'total_price': float(self.total_price) if self.total_price else 0,
            'pricing_type': self.pricing_type,
            'timeline_days': self.timeline_days,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

        if include_relations:
            data['creator'] = {
                'id': self.creator.id,
                'username': self.creator.username,
                'profile_picture': self.creator.profile_picture,
                'follower_count': self.creator.follower_count,
                'categories': self.creator.categories,
                'location': self.creator.location
            } if self.creator else None

            data['milestones'] = [m.to_dict() for m in self.milestones.all()]

            # Calculate total from milestones if per_milestone pricing
            if self.pricing_type == 'per_milestone':
                milestone_total = sum(m.price for m in self.milestones if m.price)
                data['calculated_total'] = float(milestone_total)

        return data

    def __repr__(self):
        return f'<Proposal {self.id}: Brief {self.brief_id}, Creator {self.creator_id}>'
