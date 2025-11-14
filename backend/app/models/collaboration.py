from datetime import datetime
from app import db


class Collaboration(db.Model):
    """
    Unified model for tracking all collaborations between brands and creators.
    This includes both campaign applications (when accepted) and package bookings.
    """
    __tablename__ = 'collaborations'

    id = db.Column(db.Integer, primary_key=True)

    # Source of collaboration
    collaboration_type = db.Column(db.String(20), nullable=False)  # 'campaign' or 'package'
    campaign_application_id = db.Column(db.Integer, db.ForeignKey('campaign_applications.id'), nullable=True)
    booking_id = db.Column(db.Integer, db.ForeignKey('bookings.id'), nullable=True)

    # Parties involved
    brand_id = db.Column(db.Integer, db.ForeignKey('brand_profiles.id'), nullable=False)
    creator_id = db.Column(db.Integer, db.ForeignKey('creator_profiles.id'), nullable=False)

    # Basic information
    title = db.Column(db.String(200), nullable=False)  # Campaign title or Package title
    description = db.Column(db.Text)
    amount = db.Column(db.Float, nullable=False)

    # Status tracking
    status = db.Column(db.String(20), default='in_progress')  # in_progress, completed, cancelled
    progress_percentage = db.Column(db.Integer, default=0)  # 0-100

    # Deliverables tracking
    deliverables = db.Column(db.JSON, default=list)  # List of expected deliverables
    submitted_deliverables = db.Column(db.JSON, default=list)  # List of submitted deliverables with URLs/descriptions

    # Dates
    start_date = db.Column(db.DateTime, nullable=False)
    expected_completion_date = db.Column(db.DateTime)
    actual_completion_date = db.Column(db.DateTime)

    # Notes and updates
    notes = db.Column(db.Text)
    last_update = db.Column(db.Text)  # Latest progress update from creator
    last_update_date = db.Column(db.DateTime)

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    brand = db.relationship('BrandProfile', backref=db.backref('collaborations', lazy='dynamic'))
    creator = db.relationship('CreatorProfile', backref=db.backref('collaborations', lazy='dynamic'))
    campaign_application = db.relationship('CampaignApplication', backref=db.backref('collaboration', uselist=False))
    booking = db.relationship('Booking', backref=db.backref('collaboration', uselist=False))

    def to_dict(self, include_relations=False):
        """Convert collaboration to dictionary"""
        data = {
            'id': self.id,
            'collaboration_type': self.collaboration_type,
            'campaign_application_id': self.campaign_application_id,
            'booking_id': self.booking_id,
            'brand_id': self.brand_id,
            'creator_id': self.creator_id,
            'title': self.title,
            'description': self.description,
            'amount': self.amount,
            'status': self.status,
            'progress_percentage': self.progress_percentage,
            'deliverables': self.deliverables or [],
            'submitted_deliverables': self.submitted_deliverables or [],
            'start_date': self.start_date.isoformat(),
            'expected_completion_date': self.expected_completion_date.isoformat() if self.expected_completion_date else None,
            'actual_completion_date': self.actual_completion_date.isoformat() if self.actual_completion_date else None,
            'notes': self.notes,
            'last_update': self.last_update,
            'last_update_date': self.last_update_date.isoformat() if self.last_update_date else None,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

        if include_relations:
            if self.brand:
                data['brand'] = self.brand.to_dict(include_user=True)
            if self.creator:
                data['creator'] = self.creator.to_dict(include_user=True)
            if self.campaign_application:
                data['campaign_application'] = self.campaign_application.to_dict(include_relations=True)
            if self.booking:
                data['booking'] = self.booking.to_dict(include_relations=True)

        return data

    def __repr__(self):
        return f'<Collaboration {self.id} - {self.title}>'
