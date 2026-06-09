"""Historical snapshots for cumulative social post metrics."""
from datetime import datetime

from app import db


class PostMetricsSnapshot(db.Model):
    __tablename__ = 'post_metrics_snapshots'

    id = db.Column(db.Integer, primary_key=True)
    post_metrics_id = db.Column(
        db.Integer,
        db.ForeignKey('post_metrics.id', ondelete='CASCADE'),
        nullable=False,
        index=True,
    )
    reach = db.Column(db.BigInteger, default=0)
    impressions = db.Column(db.BigInteger, default=0)
    video_views = db.Column(db.BigInteger, default=0)
    likes = db.Column(db.Integer, default=0)
    comments = db.Column(db.Integer, default=0)
    shares = db.Column(db.Integer, default=0)
    saves = db.Column(db.Integer, default=0)
    clicks = db.Column(db.Integer, default=0)
    conversions = db.Column(db.Integer, default=0)
    total_engagement = db.Column(db.Integer, default=0)
    positive_comments = db.Column(db.Integer, default=0)
    negative_comments = db.Column(db.Integer, default=0)
    neutral_comments = db.Column(db.Integer, default=0)
    captured_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, index=True)

    post_metrics = db.relationship(
        'PostMetrics',
        backref=db.backref('snapshots', lazy='dynamic', cascade='all, delete-orphan'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'post_metrics_id': self.post_metrics_id,
            'reach': self.reach or 0,
            'impressions': self.impressions or 0,
            'video_views': self.video_views or 0,
            'likes': self.likes or 0,
            'comments': self.comments or 0,
            'shares': self.shares or 0,
            'saves': self.saves or 0,
            'clicks': self.clicks or 0,
            'conversions': self.conversions or 0,
            'total_engagement': self.total_engagement or 0,
            'positive_comments': self.positive_comments or 0,
            'negative_comments': self.negative_comments or 0,
            'neutral_comments': self.neutral_comments or 0,
            'captured_at': self.captured_at.isoformat() if self.captured_at else None,
        }
