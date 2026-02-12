from app import db
from datetime import datetime

class CustomPackageRequest(db.Model):
    __tablename__ = 'custom_package_requests'

    id = db.Column(db.Integer, primary_key=True)
    brand_id = db.Column(db.Integer, db.ForeignKey('brand_profiles.id'), nullable=False)
    creator_id = db.Column(db.Integer, db.ForeignKey('creator_profiles.id'), nullable=False)

    expected_deliverables = db.Column(db.JSON, nullable=False)
    budget = db.Column(db.Numeric(10, 2), nullable=False)
    additional_notes = db.Column(db.Text)

    status = db.Column(db.String(20), default='pending')

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    brand = db.relationship('BrandProfile', backref='custom_requests')
    creator = db.relationship('CreatorProfile', backref='custom_requests_received')
    offers = db.relationship('CustomPackageOffer', backref='request', cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'brand_id': self.brand_id,
            'creator_id': self.creator_id,
            'brand': {
                'id': self.brand.id,
                'company_name': self.brand.company_name,
                'logo': self.brand.logo,
                'user_id': self.brand.user_id
            } if self.brand else None,
            'creator': {
                'id': self.creator.id,
                'username': self.creator.username,
                'display_name': self.creator.display_name,
                'profile_picture': self.creator.profile_picture,
                'user_id': self.creator.user_id
            } if self.creator else None,
            'expected_deliverables': self.expected_deliverables,
            'budget': float(self.budget),
            'additional_notes': self.additional_notes,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
