from app import db
from datetime import datetime, timedelta

class CustomPackageOffer(db.Model):
    __tablename__ = 'custom_package_offers'

    id = db.Column(db.Integer, primary_key=True)
    request_id = db.Column(db.Integer, db.ForeignKey('custom_package_requests.id'), nullable=False)
    creator_id = db.Column(db.Integer, db.ForeignKey('creator_profiles.id'), nullable=False)
    brand_id = db.Column(db.Integer, db.ForeignKey('brand_profiles.id'), nullable=False)
    booking_id = db.Column(db.Integer, db.ForeignKey('bookings.id'), nullable=True)  # Set when offer is accepted

    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=False)
    deliverables = db.Column(db.JSON, nullable=False)
    price = db.Column(db.Numeric(10, 2), nullable=False)
    delivery_time_days = db.Column(db.Integer, nullable=False)
    revisions_allowed = db.Column(db.Integer, default=2)

    status = db.Column(db.String(20), default='pending')

    accepted_at = db.Column(db.DateTime)
    declined_at = db.Column(db.DateTime)
    declined_reason = db.Column(db.Text)

    expires_at = db.Column(db.DateTime, default=lambda: datetime.utcnow() + timedelta(days=7))

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    creator = db.relationship('CreatorProfile', backref='custom_offers_sent')
    brand = db.relationship('BrandProfile', backref='custom_offers_received')

    def to_dict(self):
        return {
            'id': self.id,
            'request_id': self.request_id,
            'creator_id': self.creator_id,
            'brand_id': self.brand_id,
            'booking_id': self.booking_id,
            'creator': {
                'id': self.creator.id,
                'username': self.creator.username,
                'profile_picture': self.creator.profile_picture,
                'user_id': self.creator.user_id
            } if self.creator else None,
            'brand': {
                'id': self.brand.id,
                'company_name': self.brand.company_name,
                'logo': self.brand.logo,
                'user_id': self.brand.user_id
            } if self.brand else None,
            'title': self.title,
            'description': self.description,
            'deliverables': self.deliverables,
            'price': float(self.price),
            'delivery_time_days': self.delivery_time_days,
            'revisions_allowed': self.revisions_allowed,
            'status': self.status,
            'accepted_at': self.accepted_at.isoformat() if self.accepted_at else None,
            'declined_at': self.declined_at.isoformat() if self.declined_at else None,
            'declined_reason': self.declined_reason,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'is_expired': datetime.utcnow() > self.expires_at if self.expires_at else False
        }
