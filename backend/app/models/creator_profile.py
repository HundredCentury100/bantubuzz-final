from datetime import datetime
from app import db


class CreatorProfile(db.Model):
    __tablename__ = 'creator_profiles'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), unique=True, nullable=False)
    username = db.Column(db.String(50), unique=True, nullable=True)  # Unique username for creators
    bio = db.Column(db.Text)
    profile_picture = db.Column(db.String(255))  # Kept for backward compatibility
    profile_picture_sizes = db.Column(db.JSON, default=dict)  # Multi-size storage: {thumbnail, medium, large}
    portfolio_url = db.Column(db.String(255))
    categories = db.Column(db.JSON, default=list)  # List of categories
    follower_count = db.Column(db.Integer, default=0)
    engagement_rate = db.Column(db.Numeric(5, 4), default=0.0)
    location = db.Column(db.String(100))
    city = db.Column(db.String(100))  # City/Town
    country = db.Column(db.String(2))  # 2-letter country code (e.g., ZW, ZA)
    languages = db.Column(db.JSON, default=list)
    platforms = db.Column(db.JSON, default=list)  # List of platforms: ['Instagram', 'TikTok', ...]
    availability_status = db.Column(db.String(20), default='available')  # available, busy, unavailable
    social_links = db.Column(db.JSON, default=dict)  # {platform: url}
    success_stories = db.Column(db.Text)
    gallery = db.Column(db.JSON, default=list)  # Legacy: List of gallery image paths
    gallery_images = db.Column(db.JSON, default=list)  # New: List of gallery items with multi-size support

    # Revision policy
    free_revisions = db.Column(db.Integer, default=2)  # Number of free revisions allowed per collaboration
    revision_fee = db.Column(db.Numeric(10, 2), default=0.0)  # Fee charged per revision after free limit

    # Featured creator fields
    is_featured = db.Column(db.Boolean, default=False)
    featured_type = db.Column(db.String(20), nullable=True)  # 'general', 'tiktok', 'instagram'
    featured_order = db.Column(db.Integer, default=0)
    featured_since = db.Column(db.DateTime, nullable=True)

    # Verification and badges
    is_verified = db.Column(db.Boolean, default=False)  # Verified by platform with documents
    verified_at = db.Column(db.DateTime, nullable=True)
    leaderboard_show_score = db.Column(db.Boolean, default=False, nullable=False)
    leaderboard_badges = db.Column(db.JSON, default=list)
    leaderboard_notified_at = db.Column(db.DateTime, nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    packages = db.relationship('Package', backref='creator', lazy='dynamic', cascade='all, delete-orphan')
    bookings_as_creator = db.relationship('Booking', foreign_keys='Booking.creator_id', backref='creator', lazy='dynamic')
    saved_by_brands = db.relationship('SavedCreator', backref='creator', lazy='dynamic', cascade='all, delete-orphan')

    def get_total_followers(self):
        """Calculate total followers across all connected platforms"""
        from app.models.connected_platform import ConnectedPlatform

        total = db.session.query(
            db.func.sum(ConnectedPlatform.followers)
        ).filter(
            ConnectedPlatform.user_id == self.user_id,
            ConnectedPlatform.is_connected == True
        ).scalar()

        return int(total or 0)

    def refresh_total_followers(self):
        """Persist follower_count as the sum of connected platform followers."""
        self.follower_count = self.get_total_followers()
        return self.follower_count

    def get_platform_stats(self):
        """Get detailed stats for each connected platform"""
        from app.models.connected_platform import ConnectedPlatform

        platforms = ConnectedPlatform.query.filter_by(
            user_id=self.user_id,
            is_connected=True
        ).all()

        platform_stats = []
        for platform in platforms:
            platform_stats.append({
                'platform': platform.platform,
                'account_name': platform.account_name,
                'followers': platform.followers,
                'posts': platform.posts,
                'profile_url': platform.profile_url
            })

        return platform_stats

    def get_average_engagement_rate(self):
        """Calculate average engagement rate (currently from profile, can be enhanced)"""
        return float(self.engagement_rate) if self.engagement_rate else 0.0

    def get_review_stats(self):
        """Calculate creator review stats from brand reviews."""
        from app.models import Review

        reviews = Review.query.filter_by(creator_id=self.id).all()
        if not reviews:
            return {
                'average_rating': None,
                'total_reviews': 0
            }

        ratings = [review.get_calculated_rating() for review in reviews]
        return {
            'average_rating': round(sum(ratings) / len(ratings), 2),
            'total_reviews': len(reviews)
        }

    def get_badges(self):
        badges = self.get_all_badges()
        return badges[:3]

    def get_all_badges(self):
        try:
            from app.services.creator_score_service import CreatorScoreService
            badges = CreatorScoreService.achievement_badges(self)
        except Exception:
            badges = ['verified_creator'] if self.is_verified else ['creator']

        try:
            from app.models.referral import ReferralReward
            from sqlalchemy import or_

            referral_badge = ReferralReward.query.filter(
                ReferralReward.user_id == self.user_id,
                ReferralReward.reward_type == 'promotional_badge',
                ReferralReward.status == 'active',
                or_(ReferralReward.starts_at.is_(None), ReferralReward.starts_at <= datetime.utcnow()),
                or_(ReferralReward.ends_at.is_(None), ReferralReward.ends_at > datetime.utcnow()),
            ).first()
            if referral_badge and 'referral_verified' not in badges:
                badges.append('referral_verified')
        except Exception:
            pass

        return badges

    def get_leaderboard_badges(self):
        badges = self.get_all_badges()
        selected = self.leaderboard_badges or []
        selected = [badge for badge in selected if badge in badges]

        if len(badges) <= 3:
            return badges
        if selected:
            return selected[:3]
        return badges[:3]

    def to_dict(self, include_user=False, public_view=False):
        """
        Convert creator profile to dictionary

        Args:
            include_user: Include user object
            public_view: If True, exclude private info (email) from user object
        """
        total_followers = self.get_total_followers()
        review_stats = self.get_review_stats()

        data = {
            'id': self.id,
            'user_id': self.user_id,
            'username': self.username,
            'display_name': self.username or 'Creator',  # Frontend-friendly fallback
            'bio': self.bio,
            'profile_picture': self.profile_picture,
            'profile_picture_sizes': self.profile_picture_sizes or {},
            'portfolio_url': self.portfolio_url,
            'categories': self.categories or [],
            'follower_count': total_followers,
            'total_followers': total_followers,
            'engagement_rate': self.engagement_rate,
            'location': self.location,
            'city': self.city,
            'country': self.country,
            'languages': self.languages or [],
            'platforms': self.platforms or [],  # Platforms selected by creator
            'platform_stats': self.get_platform_stats(),  # Connected platforms with follower counts
            'availability_status': self.availability_status,
            'social_links': self.social_links or {},
            'success_stories': self.success_stories,
            'gallery': self.gallery or [],
            'gallery_images': self.gallery_images or [],
            'free_revisions': self.free_revisions or 2,
            'revision_fee': self.revision_fee or 0.0,
            'is_verified': self.is_verified or False,
            'badges': self.get_badges(),
            'leaderboard_show_score': bool(self.leaderboard_show_score),
            'leaderboard_badges': self.leaderboard_badges or [],
            'leaderboard_display_badges': self.get_leaderboard_badges(),
            'rating_penalty': float(getattr(self, 'rating_penalty', 0.0) or 0.0),
            'cancelled_collaborations_count': getattr(self, 'cancelled_collaborations_count', 0) or 0,
            'effective_rating': self.get_effective_rating(),
            'review_stats': review_stats,
            'active_spotlight_boost': self.get_active_spotlight_boost(),
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

        if include_user and self.user:
            if public_view:
                data['user'] = self.user.to_public_dict()  # No email!
            else:
                data['user'] = self.user.to_dict()  # Full data for owner

        return data

    def get_effective_rating(self):
        """Calculate review rating with cancellation penalty applied."""
        review_stats = self.get_review_stats()
        base_rating = review_stats['average_rating']
        if base_rating is None:
            return None

        penalty = getattr(self, 'rating_penalty', 0.0) or 0.0
        return max(0.0, float(base_rating) - float(penalty))

    def get_active_spotlight_boost(self):
        from app.services.spotlight_boost_service import boost_payload_for

        return boost_payload_for('creator_profile', self.id)

    def __repr__(self):
        return f'<CreatorProfile {self.user_id}>'
