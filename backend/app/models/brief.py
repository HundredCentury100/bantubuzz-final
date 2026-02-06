from app import db
from datetime import datetime
from sqlalchemy.dialects.postgresql import JSON

class Brief(db.Model):
    __tablename__ = 'briefs'

    id = db.Column(db.Integer, primary_key=True)
    brand_id = db.Column(db.Integer, db.ForeignKey('brand_profiles.id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    goal = db.Column(db.Text, nullable=False)
    platforms = db.Column(JSON, default=list)  # ["Instagram", "TikTok", "YouTube"]
    budget_min = db.Column(db.Numeric(10, 2), nullable=False)
    budget_max = db.Column(db.Numeric(10, 2), nullable=False)
    timeline_days = db.Column(db.Integer, nullable=False)
    total_duration_days = db.Column(db.Integer, nullable=False)  # Calculated from milestones
    status = db.Column(db.String(20), default='draft')  # draft, open, closed

    # Targeting filters
    target_categories = db.Column(JSON, default=list)  # ["Fashion", "Lifestyle"]
    target_min_followers = db.Column(db.Integer, nullable=True)
    target_max_followers = db.Column(db.Integer, nullable=True)
    target_locations = db.Column(JSON, default=list)  # ["Zimbabwe", "South Africa"]

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    closed_at = db.Column(db.DateTime, nullable=True)

    # Relationships
    brand = db.relationship('BrandProfile', backref='briefs')
    milestones = db.relationship('BriefMilestone', backref='brief', lazy='dynamic', cascade='all, delete-orphan', order_by='BriefMilestone.milestone_number')
    proposals = db.relationship('Proposal', backref='brief', lazy='dynamic', cascade='all, delete-orphan')
    campaign = db.relationship('Campaign', backref='source_brief', foreign_keys='Campaign.brief_id', uselist=False)

    def to_dict(self, include_relations=False):
        """Convert brief to dictionary"""
        data = {
            'id': self.id,
            'brand_id': self.brand_id,
            'title': self.title,
            'description': self.description,
            'goal': self.goal,
            'platforms': self.platforms or [],
            'budget_min': float(self.budget_min) if self.budget_min else 0,
            'budget_max': float(self.budget_max) if self.budget_max else 0,
            'timeline_days': self.timeline_days,
            'total_duration_days': self.total_duration_days,
            'status': self.status,
            'target_categories': self.target_categories or [],
            'target_min_followers': self.target_min_followers,
            'target_max_followers': self.target_max_followers,
            'target_locations': self.target_locations or [],
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'closed_at': self.closed_at.isoformat() if self.closed_at else None,
            'proposals_count': self.proposals.count(),  # Always include proposal count
        }

        if include_relations:
            data['brand'] = {
                'id': self.brand.id,
                'company_name': self.brand.company_name,
                'logo': self.brand.logo,
                'industry': self.brand.industry
            } if self.brand else None

            data['milestones'] = [m.to_dict() for m in self.milestones.all()]
            data['proposal_count'] = self.proposals.count()
            data['pending_proposals'] = self.proposals.filter_by(status='pending').count()

        return data

    def __repr__(self):
        return f'<Brief {self.id}: {self.title}>'
