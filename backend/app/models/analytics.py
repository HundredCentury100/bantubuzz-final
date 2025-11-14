from datetime import datetime
from app import db


class Analytics(db.Model):
    __tablename__ = 'analytics'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    entity_type = db.Column(db.String(50), nullable=False)  # package, campaign, profile
    entity_id = db.Column(db.Integer, nullable=False)
    views = db.Column(db.Integer, default=0)
    clicks = db.Column(db.Integer, default=0)
    conversions = db.Column(db.Integer, default=0)
    date = db.Column(db.Date, default=datetime.utcnow().date)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Unique constraint for tracking per day
    __table_args__ = (
        db.UniqueConstraint('user_id', 'entity_type', 'entity_id', 'date', name='unique_analytics_entry'),
    )

    def to_dict(self):
        """Convert analytics to dictionary"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'entity_type': self.entity_type,
            'entity_id': self.entity_id,
            'views': self.views,
            'clicks': self.clicks,
            'conversions': self.conversions,
            'date': self.date.isoformat(),
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

    def __repr__(self):
        return f'<Analytics {self.entity_type}:{self.entity_id} on {self.date}>'
