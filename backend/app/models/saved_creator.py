from datetime import datetime
from app import db


class SavedCreator(db.Model):
    __tablename__ = 'saved_creators'

    id = db.Column(db.Integer, primary_key=True)
    brand_id = db.Column(db.Integer, db.ForeignKey('brand_profiles.id'), nullable=False)
    creator_id = db.Column(db.Integer, db.ForeignKey('creator_profiles.id'), nullable=False)
    saved_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Unique constraint to prevent duplicate saves
    __table_args__ = (db.UniqueConstraint('brand_id', 'creator_id', name='unique_brand_creator'),)

    def to_dict(self):
        """Convert saved creator to dictionary"""
        return {
            'id': self.id,
            'brand_id': self.brand_id,
            'creator_id': self.creator_id,
            'saved_at': self.saved_at.isoformat()
        }

    def __repr__(self):
        return f'<SavedCreator brand:{self.brand_id} creator:{self.creator_id}>'
