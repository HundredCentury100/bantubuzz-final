"""
Post Metrics Model
Stores social media post performance metrics fetched from ThunziAI
"""
from app import db
from datetime import datetime


class PostMetrics(db.Model):
    __tablename__ = 'post_metrics'

    id = db.Column(db.Integer, primary_key=True)

    # Links to BantuBuzz entities
    collaboration_id = db.Column(db.Integer, db.ForeignKey('collaborations.id'), nullable=False)
    deliverable_id = db.Column(db.Integer, nullable=False)  # ID of either milestone or package deliverable
    deliverable_type = db.Column(db.String(20), nullable=False)  # 'milestone' or 'package'
    creator_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)

    # ThunziAI IDs
    thunzi_platform_id = db.Column(db.Integer)  # ThunziAI platform ID from creator's connected platforms
    thunzi_post_id = db.Column(db.String(255))  # ThunziAI's internal post ID (if available)

    # Post Information
    post_url = db.Column(db.Text, nullable=False)
    post_platform = db.Column(db.String(50), nullable=False)  # instagram, facebook, youtube, tiktok, twitter
    post_id = db.Column(db.String(255), nullable=False)  # Native platform post ID (extracted from URL)
    post_title = db.Column(db.Text)
    post_description = db.Column(db.Text)
    published_at = db.Column(db.DateTime)

    # Core Performance Metrics
    reach = db.Column(db.BigInteger, default=0)  # Unique users who saw the post
    impressions = db.Column(db.BigInteger, default=0)  # Total views
    likes = db.Column(db.Integer, default=0)
    comments = db.Column(db.Integer, default=0)
    shares = db.Column(db.Integer, default=0)
    saves = db.Column(db.Integer, default=0)

    # Calculated Metrics
    total_engagement = db.Column(db.Integer, default=0)  # likes + comments + shares + saves
    engagement_rate = db.Column(db.Numeric(5, 2), default=0)  # (engagement / reach) * 100

    # Sentiment Analysis
    sentiment = db.Column(db.String(50))  # positive, neutral, negative
    sentiment_score = db.Column(db.Numeric(5, 2))  # -100 to 100
    positive_comments = db.Column(db.Integer, default=0)
    negative_comments = db.Column(db.Integer, default=0)
    neutral_comments = db.Column(db.Integer, default=0)

    # Video-specific metrics (YouTube, TikTok, Instagram Reels)
    video_views = db.Column(db.BigInteger, default=0)
    video_duration = db.Column(db.Integer)  # Duration in seconds
    average_watch_time = db.Column(db.Integer)  # Average watch time in seconds
    completion_rate = db.Column(db.Numeric(5, 2))  # Percentage who watched to end

    # Sync metadata
    last_synced_at = db.Column(db.DateTime)
    sync_status = db.Column(db.String(50), default='pending')  # pending, synced, failed, not_found
    sync_error = db.Column(db.Text)  # Error message if sync failed

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    collaboration = db.relationship('Collaboration', backref='post_metrics')
    creator = db.relationship('User', backref='post_metrics')
    # Note: Deliverable relationship handled dynamically based on deliverable_type

    def get_deliverable(self):
        """Get the deliverable object based on deliverable_type"""
        if self.deliverable_type == 'milestone':
            from app.models import MilestoneDeliverable
            return MilestoneDeliverable.query.get(self.deliverable_id)
        elif self.deliverable_type == 'package':
            from app.models import PackageDeliverable
            return PackageDeliverable.query.get(self.deliverable_id)
        return None

    def calculate_engagement(self):
        """Calculate total engagement and engagement rate"""
        self.total_engagement = (self.likes or 0) + (self.comments or 0) + (self.shares or 0) + (self.saves or 0)

        if self.reach and self.reach > 0:
            self.engagement_rate = round((self.total_engagement / self.reach) * 100, 2)
        elif self.impressions and self.impressions > 0:
            self.engagement_rate = round((self.total_engagement / self.impressions) * 100, 2)
        else:
            self.engagement_rate = 0

    def to_dict(self):
        return {
            'id': self.id,
            'collaboration_id': self.collaboration_id,
            'deliverable_id': self.deliverable_id,
            'deliverable_type': self.deliverable_type,
            'creator_id': self.creator_id,
            'thunzi_platform_id': self.thunzi_platform_id,
            'thunzi_post_id': self.thunzi_post_id,
            'post_url': self.post_url,
            'post_platform': self.post_platform,
            'post_id': self.post_id,
            'post_title': self.post_title,
            'post_description': self.post_description,
            'published_at': self.published_at.isoformat() if self.published_at else None,
            'metrics': {
                'reach': self.reach,
                'impressions': self.impressions,
                'likes': self.likes,
                'comments': self.comments,
                'shares': self.shares,
                'saves': self.saves,
                'total_engagement': self.total_engagement,
                'engagement_rate': float(self.engagement_rate) if self.engagement_rate else 0,
                'video_views': self.video_views,
                'average_watch_time': self.average_watch_time,
                'completion_rate': float(self.completion_rate) if self.completion_rate else None,
            },
            'sentiment': {
                'overall': self.sentiment,
                'score': float(self.sentiment_score) if self.sentiment_score else None,
                'positive': self.positive_comments,
                'negative': self.negative_comments,
                'neutral': self.neutral_comments,
            },
            'sync': {
                'last_synced_at': self.last_synced_at.isoformat() if self.last_synced_at else None,
                'status': self.sync_status,
                'error': self.sync_error
            },
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self):
        return f'<PostMetrics deliverable_id={self.deliverable_id} platform={self.post_platform} engagement={self.total_engagement}>'
