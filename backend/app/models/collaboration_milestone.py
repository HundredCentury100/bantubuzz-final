from app import db
from datetime import datetime, timedelta
from sqlalchemy.dialects.postgresql import JSON

class CollaborationMilestone(db.Model):
    __tablename__ = 'collaboration_milestones'

    id = db.Column(db.Integer, primary_key=True)
    collaboration_id = db.Column(db.Integer, db.ForeignKey('collaborations.id'), nullable=False)
    milestone_number = db.Column(db.Integer, nullable=False)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    expected_deliverables = db.Column(JSON, nullable=False)  # ["2 Instagram Posts", "1 Story"]
    status = db.Column(db.String(20), default='pending')  # pending, in_progress, completed, approved
    price = db.Column(db.Numeric(10, 2), nullable=False)
    due_date = db.Column(db.Date, nullable=True)

    # Timestamps
    completed_at = db.Column(db.DateTime, nullable=True)
    approved_at = db.Column(db.DateTime, nullable=True)
    escrow_triggered_at = db.Column(db.DateTime, nullable=True)  # When 30-day countdown started
    escrow_release_date = db.Column(db.Date, nullable=True)  # approved_at + 30 days
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    deliverables = db.relationship('MilestoneDeliverable', backref='milestone', lazy='dynamic', cascade='all, delete-orphan')

    # Ensure unique milestone numbers per collaboration
    __table_args__ = (
        db.UniqueConstraint('collaboration_id', 'milestone_number', name='uq_collaboration_milestone_number'),
    )

    def to_dict(self, include_deliverables=False):
        """Convert milestone to dictionary"""
        data = {
            'id': self.id,
            'collaboration_id': self.collaboration_id,
            'milestone_number': self.milestone_number,
            'title': self.title,
            'description': self.description,
            'expected_deliverables': self.expected_deliverables or [],
            'status': self.status,
            'price': float(self.price) if self.price else 0,
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'approved_at': self.approved_at.isoformat() if self.approved_at else None,
            'escrow_triggered_at': self.escrow_triggered_at.isoformat() if self.escrow_triggered_at else None,
            'escrow_release_date': self.escrow_release_date.isoformat() if self.escrow_release_date else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

        if include_deliverables:
            data['deliverables'] = [d.to_dict() for d in self.deliverables.all()]
            data['deliverable_count'] = self.deliverables.count()
            data['approved_deliverable_count'] = self.deliverables.filter_by(status='approved').count()

        # Calculate days until escrow release
        if self.escrow_release_date:
            today = datetime.utcnow().date()
            days_remaining = (self.escrow_release_date - today).days
            data['escrow_days_remaining'] = max(0, days_remaining)

        return data

    def trigger_escrow(self):
        """Trigger escrow release countdown"""
        self.escrow_triggered_at = datetime.utcnow()
        self.escrow_release_date = (datetime.utcnow() + timedelta(days=30)).date()
        db.session.commit()

    def is_complete(self):
        """Check if all deliverables are approved"""
        total_deliverables = self.deliverables.count()
        if total_deliverables == 0:
            return False
        approved_deliverables = self.deliverables.filter_by(status='approved').count()
        return approved_deliverables == total_deliverables

    def __repr__(self):
        return f'<CollaborationMilestone {self.id}: Collab {self.collaboration_id}, Milestone {self.milestone_number}>'
