"""
Connected Platform Model
Stores social media platforms connected via ThunziAI
"""
from app import db
from datetime import datetime


class ConnectedPlatform(db.Model):
    __tablename__ = 'connected_platforms'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    thunzi_platform_id = db.Column(db.Integer)  # ThunziAI platform ID from their API
    platform = db.Column(db.String(20), nullable=False)  # instagram, tiktok, youtube, facebook, twitter
    account_name = db.Column(db.String(255))
    account_id = db.Column(db.String(255))
    account_id_secondary = db.Column(db.String(255))
    profile_url = db.Column(db.String(500))

    # Metrics
    followers = db.Column(db.Integer, default=0)
    posts = db.Column(db.Integer, default=0)
    average_engagement_rate = db.Column(db.Numeric(8, 4))
    average_sentiment_score = db.Column(db.Numeric(8, 4))
    average_views = db.Column(db.BigInteger)
    average_reach = db.Column(db.BigInteger)
    analytics_synced_at = db.Column(db.DateTime)

    # Connection status
    is_connected = db.Column(db.Boolean, default=False)
    sync_status = db.Column(db.String(20), default='pending')  # pending, in_progress, success, failure
    last_synced_at = db.Column(db.DateTime)

    # OAuth Tokens (encrypted in production)
    access_token = db.Column(db.Text)  # User's OAuth access token from Facebook/YouTube/Twitter
    refresh_token = db.Column(db.Text)  # OAuth refresh token for token renewal
    token_expiry = db.Column(db.DateTime)  # When the access token expires
    scopes = db.Column(db.JSON, default=list)  # OAuth scopes granted for this platform

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = db.relationship('User', backref='connected_platforms')

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'thunzi_platform_id': self.thunzi_platform_id,
            'platform': self.platform,
            'account_name': self.account_name,
            'account_id': self.account_id,
            'profile_url': self.profile_url,
            'followers': self.followers,
            'posts': self.posts,
            'average_engagement_rate': float(self.average_engagement_rate) if self.average_engagement_rate is not None else None,
            'average_sentiment_score': float(self.average_sentiment_score) if self.average_sentiment_score is not None else None,
            'average_views': self.average_views,
            'average_reach': self.average_reach,
            'is_connected': self.is_connected,
            'sync_status': self.sync_status,
            'last_synced_at': self.last_synced_at.isoformat() if self.last_synced_at else None,
            'token_expiry': self.token_expiry.isoformat() if self.token_expiry else None,
            'scopes': self.scopes or [],
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

    def update_analytics_from_thunzi(self, payload):
        if not isinstance(payload, dict):
            return
        field_map = {
            'averageEngagementRate': 'average_engagement_rate',
            'averageSentimentScore': 'average_sentiment_score',
            'averageViews': 'average_views',
            'averageReach': 'average_reach',
        }
        updated = False
        for source, target in field_map.items():
            if source in payload and payload[source] is not None:
                setattr(self, target, payload[source])
                updated = True
        if updated:
            self.analytics_synced_at = datetime.utcnow()

    def __repr__(self):
        return f'<ConnectedPlatform user_id={self.user_id} platform={self.platform} account={self.account_name}>'
