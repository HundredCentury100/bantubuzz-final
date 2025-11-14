from datetime import datetime
from app import db


class CampaignApplication(db.Model):
    """Campaign applications from creators"""
    __tablename__ = 'campaign_applications'

    id = db.Column(db.Integer, primary_key=True)
    campaign_id = db.Column(db.Integer, db.ForeignKey('campaigns.id'), nullable=False)
    creator_id = db.Column(db.Integer, db.ForeignKey('creator_profiles.id'), nullable=False)
    status = db.Column(db.String(20), default='pending')  # pending, accepted, rejected
    application_message = db.Column(db.Text)
    proposed_price = db.Column(db.Float, nullable=False)  # How much creator is charging
    deliverables = db.Column(db.JSON, default=list)  # List of deliverables creator proposes
    applied_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    campaign = db.relationship('Campaign', backref=db.backref('applications', lazy='dynamic'))
    creator = db.relationship('CreatorProfile', backref=db.backref('campaign_applications', lazy='dynamic'))

    def to_dict(self, include_relations=False):
        """Convert application to dictionary"""
        data = {
            'id': self.id,
            'campaign_id': self.campaign_id,
            'creator_id': self.creator_id,
            'status': self.status,
            'application_message': self.application_message,
            'proposed_price': self.proposed_price,
            'deliverables': self.deliverables or [],
            'applied_at': self.applied_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

        if include_relations:
            if self.campaign:
                data['campaign'] = self.campaign.to_dict(include_brand=True)
            if self.creator:
                data['creator'] = self.creator.to_dict(include_user=True)

        return data

    def __repr__(self):
        return f'<CampaignApplication {self.id} - {self.status}>'

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
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    objectives = db.Column(db.Text)
    budget = db.Column(db.Float, nullable=False)
    start_date = db.Column(db.DateTime, nullable=False)
    end_date = db.Column(db.DateTime, nullable=False)
    status = db.Column(db.String(20), default='draft')  # draft, active, paused, completed, cancelled
    requirements = db.Column(db.JSON, default=dict)  # Campaign requirements
    category = db.Column(db.String(100), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    bookings = db.relationship('Booking', backref='campaign', lazy='dynamic')

    # Many-to-many relationship with packages
    packages = db.relationship('Package', secondary=campaign_packages,
                              backref=db.backref('campaigns', lazy='dynamic'), lazy='dynamic')

    def to_dict(self, include_brand=False, include_packages=False, include_applicants=False):
        """Convert campaign to dictionary"""
        data = {
            'id': self.id,
            'brand_id': self.brand_id,
            'title': self.title,
            'description': self.description,
            'objectives': self.objectives,
            'budget': self.budget,
            'start_date': self.start_date.isoformat(),
            'end_date': self.end_date.isoformat(),
            'status': self.status,
            'requirements': self.requirements or {},
            'category': self.category,
            'packages_count': self.packages.count(),
            'applicants_count': self.applications.count(),
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

        if include_brand and self.brand:
            data['brand'] = self.brand.to_dict(include_user=True)

        if include_packages:
            data['packages'] = [pkg.to_dict() for pkg in self.packages.all()]

        if include_applicants:
            data['applications'] = [app.to_dict(include_relations=True) for app in self.applications.all()]

        return data

    def __repr__(self):
        return f'<Campaign {self.title}>'
