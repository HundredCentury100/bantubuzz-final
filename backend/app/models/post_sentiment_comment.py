"""Comment-level sentiment cached from ThunziAI."""
from datetime import datetime

from app import db


class PostSentimentComment(db.Model):
    __tablename__ = 'post_sentiment_comments'

    id = db.Column(db.Integer, primary_key=True)
    post_metrics_id = db.Column(
        db.Integer,
        db.ForeignKey('post_metrics.id', ondelete='CASCADE'),
        nullable=False,
        index=True,
    )
    external_id = db.Column(db.String(255), nullable=False)
    platform = db.Column(db.String(50))
    author = db.Column(db.String(255))
    content = db.Column(db.Text, nullable=False)
    sentiment = db.Column(db.String(20), nullable=False, default='neutral')
    sentiment_score = db.Column(db.Numeric(6, 3))
    language = db.Column(db.String(20), default='unknown')
    likes = db.Column(db.Integer, default=0)
    views = db.Column(db.Integer, default=0)
    themes = db.Column(db.JSON, default=list)
    published_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    post_metrics = db.relationship(
        'PostMetrics',
        backref=db.backref('sentiment_comments', lazy='dynamic', cascade='all, delete-orphan'),
    )

    __table_args__ = (
        db.UniqueConstraint(
            'post_metrics_id',
            'external_id',
            name='uq_post_sentiment_comment_external',
        ),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'post_metrics_id': self.post_metrics_id,
            'external_id': self.external_id,
            'platform': self.platform,
            'author': self.author,
            'content': self.content,
            'sentiment': self.sentiment,
            'sentiment_score': float(self.sentiment_score) if self.sentiment_score is not None else None,
            'language': self.language or 'unknown',
            'likes': self.likes or 0,
            'views': self.views or 0,
            'themes': self.themes or [],
            'published_at': self.published_at.isoformat() if self.published_at else None,
        }
