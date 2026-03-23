from datetime import datetime
from app import db


class CampaignProposal(db.Model):
    """Campaign proposals from creators (formerly CampaignApplication)"""
    __tablename__ = 'campaign_proposals'

    id = db.Column(db.Integer, primary_key=True)
    campaign_id = db.Column(db.Integer, db.ForeignKey('campaigns.id'), nullable=False)
    creator_id = db.Column(db.Integer, db.ForeignKey('creator_profiles.id'), nullable=False)
    status = db.Column(db.String(20), default='pending')  # pending, accepted, rejected
    proposal_message = db.Column(db.Text)  # Creator's pitch/proposal
    proposed_price = db.Column(db.Numeric(10, 2), nullable=False)  # How much creator is charging
    deliverables = db.Column(db.JSON, default=list)  # List of deliverables creator proposes
    delivery_timeline_days = db.Column(db.Integer)  # How many days creator needs to deliver
    brand_notes = db.Column(db.Text)  # Brand's notes/feedback on the proposal
    applied_at = db.Column(db.DateTime, default=datetime.utcnow)
    reviewed_at = db.Column(db.DateTime)  # When brand reviewed the proposal
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    campaign = db.relationship('Campaign', backref=db.backref('applications', lazy='dynamic'))
    creator = db.relationship('CreatorProfile', backref=db.backref('campaign_proposals', lazy='dynamic'))

    def to_dict(self, include_relations=False):
        """Convert proposal to dictionary"""
        data = {
            'id': self.id,
            'campaign_id': self.campaign_id,
            'creator_id': self.creator_id,
            'status': self.status,
            'proposal_message': self.proposal_message,
            'proposed_price': float(self.proposed_price) if self.proposed_price else None,
            'deliverables': self.deliverables or [],
            'delivery_timeline_days': self.delivery_timeline_days,
            'brand_notes': self.brand_notes,
            'applied_at': self.applied_at.isoformat() if self.applied_at else None,
            'reviewed_at': self.reviewed_at.isoformat() if self.reviewed_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

        if include_relations:
            if self.campaign:
                data['campaign'] = self.campaign.to_dict(include_brand=True)
            if self.creator:
                data['creator'] = self.creator.to_dict(include_user=True)

        return data

    def __repr__(self):
        return f'<CampaignProposal {self.id} - {self.status}>'


# Keep CampaignApplication as an alias for backward compatibility
CampaignApplication = CampaignProposal

# Association table for campaign packages (brands adding packages to campaigns)
campaign_packages = db.Table('campaign_packages',
    db.Column('id', db.Integer, primary_key=True),
    db.Column('campaign_id', db.Integer, db.ForeignKey('campaigns.id'), nullable=False),
    db.Column('package_id', db.Integer, db.ForeignKey('packages.id'), nullable=False),
    db.Column('added_at', db.DateTime, default=datetime.utcnow)
)


class Campaign(db.Model):
    __tablename__ = 'campaigns'

    id = db.Column(db.Integer, primary_key=True)
    brand_id = db.Column(db.Integer, db.ForeignKey('brand_profiles.id'), nullable=False)
    brief_id = db.Column(db.Integer, db.ForeignKey('briefs.id'), nullable=True)  # Link to source brief if converted
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    objectives = db.Column(db.Text)
    budget = db.Column(db.Numeric(10, 2), nullable=False)
    start_date = db.Column(db.DateTime, nullable=False)
    end_date = db.Column(db.DateTime, nullable=False)
    status = db.Column(db.String(20), default='draft')  # draft, active, paused, completed, cancelled
    requirements = db.Column(db.JSON, default=dict)  # Campaign requirements
    category = db.Column(db.String(100), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # ========================================
    # Campaign Brief Fields
    # ========================================
    campaign_objective = db.Column(db.Text)  # What brand wants to achieve
    target_audience = db.Column(db.JSON)  # {age_range, locations, interests, customer_type}
    key_message = db.Column(db.Text)  # Main message to communicate
    required_mentions = db.Column(db.JSON)  # {hashtags: [], mentions: [], links: []}
    content_guidelines = db.Column(db.Text)  # Tone, style, format guidelines

    # ========================================
    # Participation Mode
    # ========================================
    participation_mode = db.Column(db.String(20))  # 'packages' or 'proposals'
    allows_applications = db.Column(db.Boolean, default=True)  # Allow creators to apply

    # ========================================
    # Budget Fields
    # ========================================
    budget_min = db.Column(db.Numeric(10, 2))  # For proposal mode
    budget_max = db.Column(db.Numeric(10, 2))  # For proposal mode
    # Note: 'budget' field is kept for packages mode

    # ========================================
    # Timeline
    # ========================================
    timeline_days = db.Column(db.Integer)  # How long creators have to deliver

    # ========================================
    # Targeting Fields
    # ========================================
    target_categories = db.Column(db.JSON)  # ["Fashion", "Lifestyle"]
    target_min_followers = db.Column(db.Integer)
    target_max_followers = db.Column(db.Integer)
    target_locations = db.Column(db.JSON)  # ["Zimbabwe", "South Africa"]

    # Relationships
    bookings = db.relationship('Booking', backref='campaign', lazy='dynamic')

    # Many-to-many relationship with packages
    packages = db.relationship('Package', secondary=campaign_packages,
                              backref=db.backref('campaigns', lazy='dynamic'), lazy='dynamic')

    def to_dict(self, include_brand=False, include_packages=False, include_applicants=False, include_milestones=False):
        """Convert campaign to dictionary"""
        data = {
            'id': self.id,
            'brand_id': self.brand_id,
            'brief_id': self.brief_id,
            'title': self.title,
            'description': self.description,
            'objectives': self.objectives,
            'budget': float(self.budget) if self.budget else None,
            'start_date': self.start_date.isoformat(),
            'end_date': self.end_date.isoformat(),
            'status': self.status,
            'requirements': self.requirements or {},
            'category': self.category,
            'packages_count': self.packages.count(),
            'applicants_count': self.applications.count(),
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),

            # Campaign Brief
            'campaign_objective': self.campaign_objective,
            'target_audience': self.target_audience or {},
            'key_message': self.key_message,
            'required_mentions': self.required_mentions or {},
            'content_guidelines': self.content_guidelines,

            # Participation Mode
            'participation_mode': self.participation_mode or 'packages',
            'allows_applications': self.allows_applications,

            # Budget
            'budget_min': float(self.budget_min) if self.budget_min else None,
            'budget_max': float(self.budget_max) if self.budget_max else None,

            # Timeline
            'timeline_days': self.timeline_days,

            # Targeting
            'target_categories': self.target_categories or [],
            'target_min_followers': self.target_min_followers,
            'target_max_followers': self.target_max_followers,
            'target_locations': self.target_locations or []
        }

        if include_brand and self.brand:
            data['brand'] = self.brand.to_dict(include_user=True)

        if include_packages:
            data['packages'] = [pkg.to_dict() for pkg in self.packages.all()]

        if include_applicants:
            data['applications'] = [app.to_dict(include_relations=True) for app in self.applications.all()]

        if include_milestones and hasattr(self, 'milestones'):
            data['milestones'] = [m.to_dict() for m in self.milestones.all()]

        return data

    def __repr__(self):
        return f'<Campaign {self.title}>'
