import re
from collections import Counter

from app import db
from app.models import (
    Campaign,
    ConnectedPlatform,
    CreatorMatchFeedback,
    CreatorProfile,
    Package,
    Subscription,
    User,
)


PRO_PLUS_TOKENS = ('pro', 'premium', 'agency', 'enterprise')
STOPWORDS = {
    'and', 'are', 'for', 'the', 'with', 'your', 'you', 'our', 'this', 'that', 'from',
    'into', 'about', 'campaign', 'brand', 'creator', 'content', 'target', 'audience',
    'post', 'posts', 'video', 'videos', 'social', 'media', 'need', 'needs', 'want',
    'wants', 'will', 'can', 'has', 'have', 'their', 'they', 'them', 'then',
}


def _tokens(value):
    if not value:
        return set()
    if isinstance(value, (list, tuple, set)):
        value = ' '.join(str(item) for item in value if item)
    words = re.findall(r"[a-z0-9']+", str(value).lower())
    return {word for word in words if len(word) > 2 and word not in STOPWORDS}


def _as_float(value, default=0.0):
    try:
        if value is None:
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


def _score_percent(value):
    return max(0.0, min(100.0, float(value or 0)))


class CreatorMatchingService:
    @staticmethod
    def get_plan_access(user_id):
        subscription = (
            Subscription.query
            .filter_by(user_id=user_id, status='active')
            .join(Subscription.plan)
            .first()
        )
        plan = subscription.plan if subscription else None
        if not plan:
            return {
                'enabled': False,
                'plan_name': 'Free',
                'plan_slug': 'free',
                'message': 'AI creator matching is available on Pro and higher brand plans.',
            }

        slug = (plan.slug or '').lower()
        name = (plan.name or '').lower()
        enabled = bool(plan.has_advanced_analytics or plan.analytics_access) or any(
            token in slug or token in name for token in PRO_PLUS_TOKENS
        )
        return {
            'enabled': enabled,
            'plan_name': plan.name,
            'plan_slug': plan.slug,
            'message': None if enabled else 'AI creator matching is available on Pro and higher brand plans.',
        }

    @staticmethod
    def _campaign_terms(campaign, brand):
        return _tokens([
            campaign.title,
            campaign.description,
            campaign.category,
            campaign.campaign_objective,
            campaign.target_audience,
            campaign.content_guidelines,
            campaign.target_categories or [],
            brand.company_name if brand else '',
            brand.industry if brand else '',
            brand.description if brand else '',
            brand.location if brand else '',
        ])

    @staticmethod
    def _creator_terms(creator, packages):
        package_text = []
        for package in packages:
            package_text.extend([
                package.title,
                package.description,
                package.category,
                package.collaboration_type,
                package.platform_type,
                package.content_type,
                package.platforms or [],
            ])
        return _tokens([
            creator.username,
            creator.bio,
            creator.categories or [],
            creator.location,
            creator.city,
            creator.country,
            creator.platforms or [],
            package_text,
        ])

    @staticmethod
    def _niche_alignment(campaign, brand, creator, packages):
        campaign_terms = CreatorMatchingService._campaign_terms(campaign, brand)
        creator_terms = CreatorMatchingService._creator_terms(creator, packages)
        if not campaign_terms:
            return 50.0, []

        overlap = campaign_terms.intersection(creator_terms)
        overlap_ratio = len(overlap) / max(1, len(campaign_terms))

        target_categories = {str(item).lower() for item in (campaign.target_categories or [])}
        creator_categories = {str(item).lower() for item in (creator.categories or [])}
        category_overlap = target_categories.intersection(creator_categories)
        category_bonus = 25 if category_overlap else 0

        score = min(100.0, (overlap_ratio * 85) + category_bonus)
        reasons = []
        if category_overlap:
            reasons.append('Matches target categories')
        if overlap:
            reasons.append('Brief keywords align with profile and packages')
        if not reasons:
            reasons.append('Some profile context available, but limited niche overlap')
        return score, reasons

    @staticmethod
    def _audience_overlap(campaign, creator, platforms):
        total_followers = sum(int(platform.followers or 0) for platform in platforms) or int(creator.follower_count or 0)
        score = 45.0
        reasons = []

        min_followers = campaign.target_min_followers
        max_followers = campaign.target_max_followers
        if min_followers or max_followers:
            if min_followers and total_followers < min_followers:
                gap = (min_followers - total_followers) / max(min_followers, 1)
                score = max(10.0, 45.0 - (gap * 35))
                reasons.append('Follower count is below target range')
            elif max_followers and total_followers > max_followers:
                gap = (total_followers - max_followers) / max(max_followers, 1)
                score = max(35.0, 80.0 - (gap * 25))
                reasons.append('Audience is above the target follower range')
            else:
                score = 85.0
                reasons.append('Follower count fits the campaign target range')
        else:
            score = 65.0 if total_followers > 0 else 35.0
            if total_followers:
                reasons.append('Has measurable connected audience')

        target_locations = {str(item).lower() for item in (campaign.target_locations or [])}
        creator_locations = _tokens([creator.location, creator.city, creator.country])
        if target_locations:
            location_hit = any(location in ' '.join(creator_locations) for location in target_locations)
            if location_hit:
                score = min(100.0, score + 15)
                reasons.append('Location matches campaign targeting')
            else:
                score = max(0.0, score - 15)

        return score, reasons, total_followers

    @staticmethod
    def _engagement_quality(creator, platforms):
        if platforms:
            engagement_values = [_as_float(platform.average_engagement_rate) for platform in platforms if platform.average_engagement_rate is not None]
            sentiment_values = [_as_float(platform.average_sentiment_score) for platform in platforms if platform.average_sentiment_score is not None]
            avg_engagement = sum(engagement_values) / len(engagement_values) if engagement_values else _as_float(creator.engagement_rate)
            avg_sentiment = sum(sentiment_values) / len(sentiment_values) if sentiment_values else 70.0
        else:
            avg_engagement = _as_float(creator.engagement_rate)
            avg_sentiment = 60.0

        engagement_component = min(100.0, max(0.0, avg_engagement * 10))
        sentiment_component = _score_percent(avg_sentiment)
        score = (engagement_component * 0.7) + (sentiment_component * 0.3)
        reasons = []
        if avg_engagement >= 5:
            reasons.append('Strong engagement quality')
        elif avg_engagement > 0:
            reasons.append('Engagement data available')
        if avg_sentiment >= 75:
            reasons.append('Positive audience sentiment')
        return score, reasons, avg_engagement

    @staticmethod
    def _feedback_adjustment(brand_user_id, campaign, creator):
        feedback_rows = CreatorMatchFeedback.query.filter(
            CreatorMatchFeedback.brand_user_id == brand_user_id,
            CreatorMatchFeedback.creator_id == creator.id,
        ).all()
        if not feedback_rows:
            return 0.0, None
        counter = Counter(row.feedback for row in feedback_rows)
        latest = sorted(feedback_rows, key=lambda row: row.updated_at or row.created_at, reverse=True)[0]
        adjustment = (counter.get('up', 0) * 4.0) - (counter.get('down', 0) * 6.0)
        return max(-15.0, min(15.0, adjustment)), latest.feedback

    @staticmethod
    def get_matches(campaign, brand, brand_user_id, limit=25):
        limit = max(10, min(int(limit or 25), 25))
        creator_query = (
            CreatorProfile.query
            .join(User, CreatorProfile.user_id == User.id)
            .filter(User.user_type == 'creator', User.is_active == True)
        )

        package_rows = Package.query.filter_by(is_active=True).all()
        packages_by_creator = {}
        for package in package_rows:
            packages_by_creator.setdefault(package.creator_id, []).append(package)

        platforms = ConnectedPlatform.query.filter_by(is_connected=True).all()
        platforms_by_user = {}
        for platform in platforms:
            platforms_by_user.setdefault(platform.user_id, []).append(platform)

        existing_creator_ids = {
            row[0] for row in db.session.query(Package.creator_id)
            .join(Package.campaigns)
            .filter(Campaign.id == campaign.id)
            .all()
        }

        matches = []
        for creator in creator_query.all():
            if creator.id in existing_creator_ids:
                continue
            creator_packages = packages_by_creator.get(creator.id, [])
            if not creator_packages:
                continue
            creator_platforms = platforms_by_user.get(creator.user_id, [])

            niche_score, niche_reasons = CreatorMatchingService._niche_alignment(campaign, brand, creator, creator_packages)
            audience_score, audience_reasons, total_followers = CreatorMatchingService._audience_overlap(campaign, creator, creator_platforms)
            engagement_score, engagement_reasons, avg_engagement = CreatorMatchingService._engagement_quality(creator, creator_platforms)
            feedback_adjustment, existing_feedback = CreatorMatchingService._feedback_adjustment(brand_user_id, campaign, creator)

            match_score = (
                niche_score * 0.42
                + audience_score * 0.28
                + engagement_score * 0.25
                + feedback_adjustment
                + 5.0
            )
            match_score = round(max(0.0, min(100.0, match_score)), 1)

            top_platform = None
            if creator_platforms:
                top_platform_obj = max(creator_platforms, key=lambda platform: int(platform.followers or 0))
                top_platform = {
                    'platform': top_platform_obj.platform,
                    'followers': int(top_platform_obj.followers or 0),
                    'account_name': top_platform_obj.account_name,
                }

            matches.append({
                'creator': creator.to_dict(public_view=True),
                'match_score': match_score,
                'breakdown': {
                    'niche_alignment': round(niche_score, 1),
                    'audience_overlap': round(audience_score, 1),
                    'engagement_quality': round(engagement_score, 1),
                    'feedback_adjustment': round(feedback_adjustment, 1),
                },
                'reasons': (niche_reasons + audience_reasons + engagement_reasons)[:4],
                'existing_feedback': existing_feedback,
                'top_platform': top_platform,
                'package_count': len(creator_packages),
                'starting_price': str(min((package.price for package in creator_packages), default=0)),
                'total_followers': total_followers,
                'average_engagement_rate': round(avg_engagement, 2),
            })

        matches.sort(key=lambda item: item['match_score'], reverse=True)
        return matches[:limit]

    @staticmethod
    def save_feedback(brand_user_id, campaign_id, creator_id, feedback, reason=None):
        normalized = (feedback or '').lower().strip()
        if normalized not in {'up', 'down'}:
            raise ValueError('Feedback must be up or down')

        row = CreatorMatchFeedback.query.filter_by(
            brand_user_id=brand_user_id,
            campaign_id=campaign_id,
            creator_id=creator_id,
        ).first()
        if not row:
            row = CreatorMatchFeedback(
                brand_user_id=brand_user_id,
                campaign_id=campaign_id,
                creator_id=creator_id,
            )
            db.session.add(row)

        row.feedback = normalized
        row.reason = reason
        db.session.commit()
        return row
