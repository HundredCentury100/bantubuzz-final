from datetime import datetime
from app import db


class Booking(db.Model):
    __tablename__ = 'bookings'

    id = db.Column(db.Integer, primary_key=True)
    package_id = db.Column(db.Integer, db.ForeignKey('packages.id'), nullable=False)
    campaign_id = db.Column(db.Integer, db.ForeignKey('campaigns.id'), nullable=True)
    creator_id = db.Column(db.Integer, db.ForeignKey('creator_profiles.id'), nullable=False)
    brand_id = db.Column(db.Integer, db.ForeignKey('brand_profiles.id'), nullable=False)
    status = db.Column(db.String(20), default='pending')  # pending, accepted, in_progress, completed, cancelled, rejected
    booking_date = db.Column(db.DateTime, default=datetime.utcnow)
    completion_date = db.Column(db.DateTime)
    amount = db.Column(db.Float, nullable=False)
    payment_status = db.Column(db.String(20), default='pending')  # pending, paid, failed, refunded
    payment_reference = db.Column(db.String(100))
    paynow_poll_url = db.Column(db.String(255))
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    messages = db.relationship('Message', backref='booking', lazy='dynamic')

    def to_dict(self, include_relations=False):
        """Convert booking to dictionary"""
        data = {
            'id': self.id,
            'package_id': self.package_id,
            'campaign_id': self.campaign_id,
            'creator_id': self.creator_id,
            'brand_id': self.brand_id,
            'status': self.status,
            'booking_date': self.booking_date.isoformat(),
            'completion_date': self.completion_date.isoformat() if self.completion_date else None,
            'amount': self.amount,
            'payment_status': self.payment_status,
            'payment_reference': self.payment_reference,
            'notes': self.notes,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

        if include_relations:
            if self.package:
                data['package'] = self.package.to_dict()
            if self.campaign:
                data['campaign'] = self.campaign.to_dict()
            if self.creator:
                data['creator'] = self.creator.to_dict(include_user=True)
            if self.brand:
                data['brand'] = self.brand.to_dict(include_user=True)

        return data

    def __repr__(self):
        return f'<Booking {self.id} - {self.status}>'
