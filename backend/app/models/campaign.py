"""Campaign models - Rebuilt with proper money handling and NULL constraints

CRITICAL RULES:
1. ALL money fields returned as str() in to_dict() - NO float() conversion
2. Use datetime.now(timezone.utc) for ALL datetime operations
3. Budget fields nullable based on participation_mode
"""

from datetime import datetime, timezone
from decimal import Decimal
from app import db
from sqlalchemy.dialects.postgresql import ARRAY, JSONB


# Association table for campaign-package many-to-many relationship
campaign_packages = db.Table('campaign_packages',
    db.Column('campaign_id', db.Integer, db.ForeignKey('campaigns.id', ondelete='CASCADE'), primary_key=True),
    db.Column('package_id', db.Integer, db.ForeignKey('packages.id', ondelete='CASCADE'), primary_key=True),
    db.Column('booking_id', db.Integer, db.ForeignKey('bookings.id', ondelete='SET NULL')),
    db.Column('added_at', db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
)


class Campaign(db.Model):
    """
    Campaign model - Brand initiatives for creator collaborations

    Participation Modes:
    - 'packages': Brands select creator packages (budget required, budget_min/max NULL)
    - 'proposals': Creators submit custom proposals (budget NULL, budget_min/max required)
    - 'both': Both packages and proposals allowed (all budget fields required)
    """
    __tablename__ = 'campaigns'

    id = db.Column(db.Integer, primary_key=True)
    brand_id = db.Column(db.Integer, db.ForeignKey('brand_profiles.id', ondelete='CASCADE'), nullable=False)
    brief_id = db.Column(db.Integer, db.ForeignKey('briefs.id', ondelete='SET NULL'))

    # Basic Info
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    category = db.Column(db.String(100))

    # Campaign Brief
    campaign_objective = db.Column(db.String(100))  # 'Brand Awareness', 'Engagement', etc.
    target_audience = db.Column(db.Text)
    content_guidelines = db.Column(db.Text)

    # Participation Mode
    participation_mode = db.Column(db.String(20), nullable=False, default='proposals')  # 'packages', 'proposals', 'both'
    allows_applications = db.Column(db.Boolean, nullable=False, default=True)
    allows_packages = db.Column(db.Boolean, nullable=False, default=False)
    requires_milestones = db.Column(db.Boolean, nullable=False, default=True)

    # Budget - CRITICAL: NULL handling
    # For 'packages' mode: budget NOT NULL, budget_min/max NULL
    # For 'proposals' mode: budget NULL, budget_min/max NOT NULL
    # For 'both' mode: all three NOT NULL
    budget = db.Column(db.Numeric(12, 2), nullable=True)  # Single budget for packages mode
    budget_min = db.Column(db.Numeric(12, 2), nullable=True)  # Min budget for proposals mode
    budget_max = db.Column(db.Numeric(12, 2), nullable=True)  # Max budget for proposals mode

    # Timeline
    start_date = db.Column(db.DateTime(timezone=True), nullable=False)
    end_date = db.Column(db.DateTime(timezone=True), nullable=False)
    application_deadline = db.Column(db.DateTime(timezone=True))  # Deadline for proposals
    timeline_days = db.Column(db.Integer)

    # Targeting
    target_categories = db.Column(ARRAY(db.Text), default=[])
    target_locations = db.Column(ARRAY(db.Text), default=[])
    target_min_followers = db.Column(db.Integer)
    target_max_followers = db.Column(db.Integer)

    # Status
    status = db.Column(db.String(20), nullable=False, default='draft')  # 'draft', 'active', 'paused', 'completed'

    # Timestamps
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    # Note: 'brand' backref is defined in BrandProfile.campaigns relationship
    brand = db.relationship('BrandProfile', back_populates='campaigns')
    milestones = db.relationship('CampaignMilestone', backref='campaign', lazy='dynamic', cascade='all, delete-orphan', order_by='CampaignMilestone.milestone_number')
    proposals = db.relationship('CampaignProposal', backref='campaign', lazy='dynamic', cascade='all, delete-orphan')
    packages = db.relationship('Package', secondary=campaign_packages, backref='campaigns')

    def to_dict(self, include_milestones=True, include_brand=False):
        """
        CRITICAL: Return money as strings to avoid rounding
        Never use float() or .toFixed() anywhere
        """
        result = {
            'id': self.id,
            'brand_id': self.brand_id,
            'brief_id': self.brief_id,
            'title': self.title,
            'description': self.description,
            'category': self.category,
            'campaign_objective': self.campaign_objective,
            'target_audience': self.target_audience,
            'content_guidelines': self.content_guidelines,
            'participation_mode': self.participation_mode,
            'allows_applications': self.allows_applications,
            'allows_packages': self.allows_packages,
            'requires_milestones': self.requires_milestones,

            # CRITICAL: Return as strings to prevent rounding
            'budget': str(self.budget) if self.budget is not None else None,
            'budget_min': str(self.budget_min) if self.budget_min is not None else None,
            'budget_max': str(self.budget_max) if self.budget_max is not None else None,

            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'application_deadline': self.application_deadline.isoformat() if self.application_deadline else None,
            'timeline_days': self.timeline_days,
            'target_categories': self.target_categories or [],
            'target_locations': self.target_locations or [],
            'target_min_followers': self.target_min_followers,
            'target_max_followers': self.target_max_followers,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }

        if include_milestones:
            result['milestones'] = [m.to_dict() for m in self.milestones.all()]
            result['proposals_count'] = self.proposals.count()
            result['packages_count'] = len(self.packages)

        if include_brand and self.brand:
            result['brand'] = self.brand.to_dict()

        return result

    def __repr__(self):
        return f'<Campaign {self.id}: {self.title}>'


class CampaignMilestone(db.Model):
    """
    Campaign Milestone - Structured deliverables within a campaign
    """
    __tablename__ = 'campaign_milestones'

    id = db.Column(db.Integer, primary_key=True)
    campaign_id = db.Column(db.Integer, db.ForeignKey('campaigns.id', ondelete='CASCADE'), nullable=False)
    milestone_number = db.Column(db.Integer, nullable=False)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)

    # Structured deliverables: [{"platform": "Instagram", "content_type": "Post", "quantity": 2}, ...]
    deliverables = db.Column(JSONB, default=[], nullable=False)

    # Budget allocation for this milestone (proposals mode)
    budget_allocation = db.Column(db.Numeric(12, 2))  # NULL for packages mode

    duration_days = db.Column(db.Integer)
    due_date = db.Column(db.DateTime(timezone=True))

    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        db.UniqueConstraint('campaign_id', 'milestone_number', name='uq_campaign_milestone_number'),
    )

    def to_dict(self):
        """CRITICAL: Return money as string"""
        return {
            'id': self.id,
            'campaign_id': self.campaign_id,
            'milestone_number': self.milestone_number,
            'name': self.name,
            'description': self.description,
            'deliverables': self.deliverables,
            'budget_allocation': str(self.budget_allocation) if self.budget_allocation is not None else None,
            'duration_days': self.duration_days,
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

    def __repr__(self):
        return f'<CampaignMilestone {self.id}: {self.name}>'


class CampaignProposal(db.Model):
    """
    Campaign Proposal - Creator applications to campaigns (opportunities)
    """
    __tablename__ = 'campaign_proposals'

    id = db.Column(db.Integer, primary_key=True)
    campaign_id = db.Column(db.Integer, db.ForeignKey('campaigns.id', ondelete='CASCADE'), nullable=False)
    creator_id = db.Column(db.Integer, db.ForeignKey('creator_profiles.id', ondelete='CASCADE'), nullable=False)

    status = db.Column(db.String(20), nullable=False, default='pending')  # 'pending', 'awaiting_payment', 'accepted', 'rejected'
    proposed_price = db.Column(db.Numeric(12, 2), nullable=False)
    proposal_message = db.Column(db.Text)  # Why they're perfect for this opportunity
    deliverables = db.Column(db.Text)  # Legacy text field for backward compatibility
    delivery_timeline_days = db.Column(db.Integer)

    # New structured fields for milestone-based applications
    pricing_mode = db.Column(db.String(20), default='total')  # 'total' or 'per_milestone'
    milestones = db.Column(JSONB, default=[])  # Structured milestones with deliverables and pricing

    brand_notes = db.Column(db.Text)  # Brand's internal notes
    booking_id = db.Column(db.Integer, db.ForeignKey('bookings.id', ondelete='SET NULL'))  # Payment link

    applied_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    reviewed_at = db.Column(db.DateTime(timezone=True))

    __table_args__ = (
        db.UniqueConstraint('campaign_id', 'creator_id', name='uq_campaign_creator_proposal'),
    )

    # Relationships
    creator = db.relationship('CreatorProfile', backref='campaign_proposals')
    booking = db.relationship('Booking', backref='campaign_proposal', uselist=False)

    def to_dict(self, include_creator=False, include_campaign=False):
        """CRITICAL: Return money as string"""
        result = {
            'id': self.id,
            'campaign_id': self.campaign_id,
            'creator_id': self.creator_id,
            'status': self.status,
            'proposed_price': str(self.proposed_price) if self.proposed_price is not None else None,
            'proposal_message': self.proposal_message,
            'deliverables': self.deliverables,
            'delivery_timeline_days': self.delivery_timeline_days,
            'pricing_mode': self.pricing_mode,
            'milestones': self.milestones or [],
            'brand_notes': self.brand_notes,
            'booking_id': self.booking_id,
            'applied_at': self.applied_at.isoformat() if self.applied_at else None,
            'reviewed_at': self.reviewed_at.isoformat() if self.reviewed_at else None
        }

        if include_creator and self.creator:
            result['creator'] = self.creator.to_dict()

        if include_campaign and self.campaign:
            result['campaign'] = self.campaign.to_dict(include_milestones=True, include_brand=False)

        return result

    def __repr__(self):
        return f'<CampaignProposal {self.id}: Campaign {self.campaign_id} - Creator {self.creator_id}>'


# Backward compatibility alias
CampaignApplication = CampaignProposal
