from datetime import datetime
from app import db


class Review(db.Model):
    """
    Reviews and ratings left by brands for creators after completing collaborations
    """
    __tablename__ = 'reviews'

    id = db.Column(db.Integer, primary_key=True)

    # Parties involved
    brand_id = db.Column(db.Integer, db.ForeignKey('brand_profiles.id'), nullable=False)
    creator_id = db.Column(db.Integer, db.ForeignKey('creator_profiles.id'), nullable=False)
    collaboration_id = db.Column(db.Integer, db.ForeignKey('collaborations.id'), nullable=False)

    # Rating (1-5 stars)
    rating = db.Column(db.Integer, nullable=False)  # 1-5

    # Review content
    title = db.Column(db.String(200))
    comment = db.Column(db.Text, nullable=False)

    # Specific ratings (optional, all 1-5)
    communication_rating = db.Column(db.Integer)  # How well they communicated
    quality_rating = db.Column(db.Integer)  # Quality of deliverables
    professionalism_rating = db.Column(db.Integer)  # Professional behavior
    timeliness_rating = db.Column(db.Integer)  # Met deadlines

    # Would work again?
    would_recommend = db.Column(db.Boolean, default=True)

    # Response from creator (optional)
    creator_response = db.Column(db.Text)
    creator_response_date = db.Column(db.DateTime)

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    brand = db.relationship('BrandProfile', backref=db.backref('reviews_given', lazy='dynamic'))
    creator = db.relationship('CreatorProfile', backref=db.backref('reviews_received', lazy='dynamic'))
    collaboration = db.relationship('Collaboration', backref=db.backref('review', uselist=False))

    def to_dict(self, include_relations=False):
        """Convert review to dictionary"""
        data = {
            'id': self.id,
            'brand_id': self.brand_id,
            'creator_id': self.creator_id,
            'collaboration_id': self.collaboration_id,
            'rating': self.rating,
            'title': self.title,
            'comment': self.comment,
            'communication_rating': self.communication_rating,
            'quality_rating': self.quality_rating,
            'professionalism_rating': self.professionalism_rating,
            'timeliness_rating': self.timeliness_rating,
            'would_recommend': self.would_recommend,
            'creator_response': self.creator_response,
            'creator_response_date': self.creator_response_date.isoformat() if self.creator_response_date else None,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

        if include_relations:
            if self.brand:
                data['brand'] = self.brand.to_dict(include_user=True)
            if self.creator:
                data['creator'] = self.creator.to_dict(include_user=True)
            if self.collaboration:
                data['collaboration'] = {
                    'id': self.collaboration.id,
                    'title': self.collaboration.title,
                    'collaboration_type': self.collaboration.collaboration_type
                }

        return data

    def __repr__(self):
        return f'<Review {self.id} - {self.rating} stars>'
