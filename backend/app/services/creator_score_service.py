import math
from datetime import datetime, timedelta

from sqlalchemy import func

from app import db
from app.models import (
    ConnectedPlatform,
    CreatorProfile,
    CreatorRanking,
    CreatorScore,
    CreatorScoreHistory,
    Collaboration,
    Message,
    Notification,
    Package,
    PortfolioItem,
    PostMetrics,
    Review,
    User,
    UserSession,
)
from app.services.creator_score_formula import (
    activity_dimension,
    average_delivery_score,
    clamp,
    engagement_dimension,
    final_creator_score,
    follower_dimension,
    normalize_sentiment,
    profile_quality_dimension,
    profile_trust_dimension,
    reach_dimension,
    reviews_dimension,
    order_completion_dimension,
    on_time_delivery_dimension,
    normalize_platform_name,
    response_rate_dimension,
    select_primary_platform,
    sentiment_dimension,
    weighted_component_score,
)


FORMULA_VERSION = '1.1'


BADGE_PRIORITY = {
    'elite_creator': 100,
    'top_creator': 90,
    'trusted_creator': 80,
    'campaign_pro': 70,
    'brand_magnet': 60,
    'category_leader': 55,
    'city_top_10': 50,
    'engagement_leader': 40,
    'audience_builder': 30,
    'rising_creator': 20,
    'verified_creator': 15,
    'referral_verified': 12,
    'creator_to_watch': 5,
    'buzz_creator': 1,
    'creator': 0,
}


class CreatorScoreService:
    SUPPORTED_LEADERBOARD_PLATFORMS = {'instagram', 'tiktok', 'youtube', 'facebook', 'twitter'}

    @staticmethod
    def normalize_platform(platform):
        return normalize_platform_name(platform)

    @staticmethod
    def primary_platform(user_id):
        platforms = ConnectedPlatform.query.filter_by(
            user_id=user_id,
            is_connected=True,
        ).all()
        return select_primary_platform(platforms)

    @staticmethod
    def total_followers(user_id):
        return int(db.session.query(func.coalesce(func.sum(ConnectedPlatform.followers), 0)).filter(
            ConnectedPlatform.user_id == user_id,
            ConnectedPlatform.is_connected == True,
        ).scalar() or 0)

    @staticmethod
    def max_platform_followers():
        totals = db.session.query(
            ConnectedPlatform.user_id,
            func.sum(ConnectedPlatform.followers).label('total'),
        ).filter(
            ConnectedPlatform.is_connected == True,
        ).group_by(ConnectedPlatform.user_id).all()
        return max([int(row.total or 0) for row in totals] or [0])

    @staticmethod
    def _engagement_inputs(user_id, creator_profile_id):
        values = [
            float(row.average_engagement_rate)
            for row in ConnectedPlatform.query.filter_by(user_id=user_id, is_connected=True).all()
            if row.average_engagement_rate is not None
        ]
        source = 'connected_platforms'
        if not values:
            values = [
                float(value)
                for (value,) in db.session.query(PostMetrics.engagement_rate).filter(
                    PostMetrics.creator_id == creator_profile_id,
                    PostMetrics.sync_status == 'synced',
                    PostMetrics.engagement_rate.isnot(None),
                ).all()
            ]
            source = 'post_metrics'
        return (sum(values) / len(values) if values else 0.0), source, len(values)

    @staticmethod
    def _reach_inputs(creator_profile_id, followers):
        records = PostMetrics.query.filter_by(creator_id=creator_profile_id, sync_status='synced').all()
        values = []
        for record in records:
            if record.reach is not None and record.reach > 0:
                values.append(float(record.reach))
            elif record.video_views is not None and record.video_views > 0:
                values.append(float(record.video_views))
        average = sum(values) / len(values) if values else 0.0
        ratio = average / followers if values and followers > 0 else None
        return average, ratio, len(values)

    @staticmethod
    def _sentiment_inputs(user_id, creator_profile_id):
        records = PostMetrics.query.filter_by(creator_id=creator_profile_id, sync_status='synced').all()
        # PostMetrics stores sentiment on a -100..100 scale; convert it to 0..100.
        values = [
            clamp((float(record.sentiment_score) + 100) / 2)
            for record in records
            if record.sentiment_score is not None
        ]
        values = [value for value in values if value is not None]
        source = 'post_metrics'
        if not values:
            values = [
                normalize_sentiment(row.average_sentiment_score)
                for row in ConnectedPlatform.query.filter_by(user_id=user_id, is_connected=True).all()
                if row.average_sentiment_score is not None
            ]
            values = [value for value in values if value is not None]
            source = 'connected_platforms'

        positive = sum(record.positive_comments or 0 for record in records)
        negative = sum(record.negative_comments or 0 for record in records)
        neutral = sum(record.neutral_comments or 0 for record in records)
        critical = sum(record.critical_comments or 0 for record in records)
        total_comments = positive + negative + neutral + critical
        negative_pct = (negative / total_comments * 100) if total_comments else 0
        critical_pct = (critical / total_comments * 100) if total_comments else 0
        average = sum(values) / len(values) if values else None
        return average, negative_pct, critical_pct, total_comments, source

    @staticmethod
    def _activity_inputs(user):
        cutoff = datetime.utcnow() - timedelta(days=30)
        sessions = UserSession.query.filter(
            UserSession.user_id == user.id,
            UserSession.created_at >= cutoff,
        ).count()
        last_session = db.session.query(func.max(UserSession.created_at)).filter(
            UserSession.user_id == user.id,
        ).scalar() or user.last_login
        return sessions, last_session

    @staticmethod
    def _review_inputs(creator_profile_id):
        completed_review_query = Review.query.join(Collaboration).filter(
            Review.creator_id == creator_profile_id,
            Collaboration.status == 'completed',
        )
        total_verified = completed_review_query.count()
        recent_reviews = completed_review_query.order_by(Review.created_at.desc()).limit(20).all()

        ratings = [
            float(review.get_calculated_rating())
            for review in recent_reviews
            if review.get_calculated_rating() is not None
        ]
        recent_count = len(ratings)
        if total_verified <= 0 or recent_count <= 0:
            return None, {
                'total_verified_reviews': total_verified,
                'recent_review_count': recent_count,
                'average_rating': None,
                'positive_reviews': 0,
            }

        positive_reviews = sum(1 for rating in ratings if rating >= 4)
        average_rating = sum(ratings) / recent_count
        return reviews_dimension(
            average_rating,
            total_verified,
            positive_reviews,
            recent_count,
        ), {
            'total_verified_reviews': total_verified,
            'recent_review_count': recent_count,
            'average_rating': round(average_rating, 4),
            'positive_reviews': positive_reviews,
            'positive_review_ratio': round((positive_reviews / recent_count) * 100, 4),
        }

    @staticmethod
    def _marketplace_reliability_inputs(creator):
        terminal_statuses = ['completed', 'cancelled', 'creator_declined']
        terminal_collaborations = Collaboration.query.filter(
            Collaboration.creator_id == creator.id,
            Collaboration.status.in_(terminal_statuses),
        ).all()
        completed_collaborations = [
            collaboration for collaboration in terminal_collaborations
            if collaboration.status == 'completed'
        ]
        completed_orders = len(completed_collaborations)
        total_orders = len(terminal_collaborations)

        due_deliveries = [
            collaboration for collaboration in completed_collaborations
            if collaboration.expected_completion_date is not None
        ]
        on_time_deliveries = 0
        for collaboration in due_deliveries:
            delivered_at = (
                collaboration.actual_completion_date
                or collaboration.live_urls_submitted_at
                or collaboration.updated_at
            )
            if delivered_at and delivered_at <= collaboration.expected_completion_date:
                on_time_deliveries += 1

        response_cutoff = datetime.utcnow() - timedelta(days=90)
        inbound_messages = Message.query.join(User, Message.sender_id == User.id).filter(
            Message.receiver_id == creator.user_id,
            User.user_type == 'brand',
            Message.created_at >= response_cutoff,
        ).order_by(Message.created_at.asc()).all()

        responded_messages = 0
        for inbound in inbound_messages:
            reply = Message.query.filter(
                Message.sender_id == creator.user_id,
                Message.receiver_id == inbound.sender_id,
                Message.created_at > inbound.created_at,
                Message.created_at <= inbound.created_at + timedelta(hours=12),
            ).first()
            if reply:
                responded_messages += 1

        delivery_scores = []
        early_delivery_cutoff = timedelta(hours=12)
        late_deliveries = 0
        missed_deliveries = 0
        for collaboration in completed_collaborations:
            if collaboration.expected_completion_date is None:
                continue
            delivered_at = (
                collaboration.actual_completion_date
                or collaboration.live_urls_submitted_at
                or collaboration.updated_at
            )
            if not delivered_at:
                missed_deliveries += 1
                delivery_scores.append(0)
            elif delivered_at <= collaboration.expected_completion_date - early_delivery_cutoff:
                delivery_scores.append(100)
            elif delivered_at < collaboration.expected_completion_date:
                delivery_scores.append(90)
            elif delivered_at == collaboration.expected_completion_date:
                delivery_scores.append(80)
            else:
                late_deliveries += 1
                delivery_scores.append(50)

        order_completion = order_completion_dimension(completed_orders, total_orders)
        response_rate = response_rate_dimension(responded_messages, len(inbound_messages))
        on_time_delivery = average_delivery_score(delivery_scores)
        marketplace_reliability = weighted_component_score({
            'order_completion': order_completion,
            'response_rate': response_rate,
            'on_time_delivery': on_time_delivery,
        }, ['order_completion', 'response_rate', 'on_time_delivery'])

        campaign_successes = Collaboration.query.filter(
            Collaboration.creator_id == creator.id,
            Collaboration.collaboration_type == 'campaign',
            Collaboration.status == 'completed',
        ).count()

        return {
            'order_completion': order_completion,
            'response_rate': response_rate,
            'on_time_delivery': on_time_delivery,
            'marketplace_reliability': marketplace_reliability,
            'raw': {
                'total_orders': total_orders,
                'completed_orders': completed_orders,
                'completed_campaigns': campaign_successes,
                'due_deliveries': len(due_deliveries),
                'on_time_deliveries': on_time_deliveries,
                'late_deliveries': late_deliveries,
                'missed_deliveries': missed_deliveries,
                'delivery_scores': delivery_scores,
                'inbound_brand_messages_90d': len(inbound_messages),
                'responded_brand_messages_12h': responded_messages,
            },
        }

    @staticmethod
    def calculate(creator_profile_id, max_followers=None, persist=True, rebuild_ranks=False):
        creator = CreatorProfile.query.get(creator_profile_id)
        if not creator or not creator.user:
            return None

        followers = CreatorScoreService.total_followers(creator.user_id)
        max_followers = max_followers if max_followers is not None else CreatorScoreService.max_platform_followers()
        average_engagement, engagement_source, engagement_count = CreatorScoreService._engagement_inputs(
            creator.user_id, creator.id,
        )
        average_reach, reach_ratio, reach_count = CreatorScoreService._reach_inputs(creator.id, followers)
        average_sentiment, negative_pct, critical_pct, comment_count, sentiment_source = (
            CreatorScoreService._sentiment_inputs(creator.user_id, creator.id)
        )
        session_count, last_session = CreatorScoreService._activity_inputs(creator.user)
        review_score, review_snapshot = CreatorScoreService._review_inputs(creator.id)
        reliability = CreatorScoreService._marketplace_reliability_inputs(creator)

        has_platform = ConnectedPlatform.query.filter_by(
            user_id=creator.user_id,
            is_connected=True,
        ).first() is not None
        has_package = Package.query.filter_by(creator_id=creator.id, is_active=True).first() is not None
        has_portfolio = PortfolioItem.query.filter_by(
            creator_profile_id=creator.id,
            is_visible=True,
        ).first() is not None
        has_photo = bool(creator.profile_picture or creator.profile_picture_sizes)
        has_bio = len((creator.bio or '').strip()) >= 160
        has_success_story = bool((creator.success_stories or '').strip()) or has_portfolio

        dimensions = {
            'engagement': engagement_dimension(average_engagement),
            'reach': reach_dimension(reach_ratio, reach_count > 0),
            'followers': follower_dimension(followers, max_followers),
            'sentiment': sentiment_dimension(average_sentiment, negative_pct, critical_pct),
            'order_completion': reliability['order_completion'],
            'response_rate': reliability['response_rate'],
            'on_time_delivery': reliability['on_time_delivery'],
            'reviews': review_score,
            'profile_trust': profile_trust_dimension(
                has_photo,
                has_bio,
                has_platform,
                has_package,
                has_portfolio=has_portfolio,
                is_verified=creator.is_verified,
                has_success_story=has_success_story,
            ),
            'activity': activity_dimension(session_count, last_session),
            'profile_quality': profile_quality_dimension(
                has_photo, has_bio, has_platform, has_package, has_portfolio,
            ),
        }
        final_score = final_creator_score(dimensions)
        snapshot = {
            'followers': followers,
            'max_followers': max_followers,
            'average_engagement_rate': round(average_engagement, 4),
            'engagement_source': engagement_source,
            'average_reach_or_views': round(average_reach, 2),
            'reach_ratio': round(reach_ratio, 6) if reach_ratio is not None else None,
            'average_sentiment': round(average_sentiment, 4) if average_sentiment is not None else None,
            'negative_comment_percentage': round(negative_pct, 4),
            'critical_comment_percentage': round(critical_pct, 4),
            'sessions_last_30_days': session_count,
            'last_session_at': last_session.isoformat() if last_session else None,
            'reviews': review_snapshot,
            'marketplace_reliability': reliability['raw'],
            'profile_elements': {
                'photo': has_photo,
                'bio': has_bio,
                'connected_platform': has_platform,
                'active_package': has_package,
                'visible_portfolio': has_portfolio,
                'verified': bool(creator.is_verified),
                'success_story': has_success_story,
            },
        }
        quality = {
            'engagement_records': engagement_count,
            'reach_records': reach_count,
            'sentiment_comments': comment_count,
            'sentiment_source': sentiment_source,
            'excluded_dimensions': [
                key for key, value in dimensions.items()
                if key in {'order_completion', 'response_rate', 'on_time_delivery', 'reviews'}
                and value is None
            ],
            'available_weight': sum(
                weight for key, weight in {
                    'engagement': 14,
                    'reach': 10,
                    'followers': 4,
                    'sentiment': 7,
                    'order_completion': 8,
                    'response_rate': 8,
                    'on_time_delivery': 9,
                    'reviews': 20,
                    'profile_trust': 15,
                    'activity': 5,
                }.items()
                if dimensions.get(key) is not None
            ),
        }
        result = {
            'dimensions': dimensions,
            'final_score': final_score,
            'input_snapshot': snapshot,
            'data_quality': quality,
        }
        if not persist:
            return result

        score = CreatorScore.query.filter_by(creator_profile_id=creator.id).first()
        previous_final = float(score.final_score) if score else None
        if not score:
            score = CreatorScore(creator_profile_id=creator.id)
            db.session.add(score)

        score.engagement_score = dimensions['engagement']
        score.reach_score = dimensions['reach']
        score.follower_score = dimensions['followers']
        score.sentiment_score = dimensions['sentiment']
        score.order_completion_score = dimensions['order_completion'] or 0
        score.response_rate_score = dimensions['response_rate'] or 0
        score.on_time_delivery_score = dimensions['on_time_delivery'] or 0
        score.marketplace_reliability_score = reliability['marketplace_reliability']
        score.review_score = dimensions['reviews'] or 0
        score.profile_trust_score = dimensions['profile_trust']
        score.activity_score = dimensions['activity']
        score.profile_quality_score = dimensions['profile_quality']
        score.final_score = final_score
        score.input_snapshot = snapshot
        score.data_quality = quality
        score.formula_version = FORMULA_VERSION
        score.calculated_at = datetime.utcnow()
        db.session.flush()

        recent_history = CreatorScoreHistory.query.filter(
            CreatorScoreHistory.creator_profile_id == creator.id,
            CreatorScoreHistory.calculated_at >= datetime.utcnow() - timedelta(hours=24),
        ).order_by(CreatorScoreHistory.calculated_at.desc()).first()
        if not recent_history or previous_final is None or abs(previous_final - final_score) >= 1:
            db.session.add(CreatorScoreHistory(
                creator_profile_id=creator.id,
                engagement_score=dimensions['engagement'],
                reach_score=dimensions['reach'],
                follower_score=dimensions['followers'],
                sentiment_score=dimensions['sentiment'],
                order_completion_score=dimensions['order_completion'] or 0,
                response_rate_score=dimensions['response_rate'] or 0,
                on_time_delivery_score=dimensions['on_time_delivery'] or 0,
                marketplace_reliability_score=reliability['marketplace_reliability'],
                review_score=dimensions['reviews'] or 0,
                profile_trust_score=dimensions['profile_trust'],
                activity_score=dimensions['activity'],
                profile_quality_score=dimensions['profile_quality'],
                final_score=final_score,
                input_snapshot=snapshot,
                formula_version=FORMULA_VERSION,
            ))

        if rebuild_ranks:
            CreatorScoreService.rebuild_rankings()
        return score

    @staticmethod
    def record_session(user, login_method):
        if not user:
            return None
        session = UserSession(user_id=user.id, login_method=login_method)
        db.session.add(session)
        db.session.flush()
        return session

    @staticmethod
    def is_ranking_eligible(creator):
        if not creator or not creator.user or not creator.user.is_active:
            return False
        if not creator.username or len((creator.bio or '').strip()) < 40:
            return False
        if not (creator.profile_picture or creator.profile_picture_sizes):
            return False
        if not ConnectedPlatform.query.filter_by(user_id=creator.user_id, is_connected=True).first():
            return False
        return Package.query.filter_by(creator_id=creator.id, is_active=True).first() is not None

    @staticmethod
    def _rank_context(creators, ranking_type, context_key, previous, now):
        ordered = sorted(
            creators,
            key=CreatorScoreService._ranking_sort_key,
        )
        for position, creator in enumerate(ordered, start=1):
            db.session.add(CreatorRanking(
                creator_profile_id=creator.id,
                ranking_type=ranking_type,
                context_key=context_key,
                position=position,
                previous_position=previous.get((creator.id, ranking_type, context_key)),
                calculated_at=now,
            ))

    @staticmethod
    def rebuild_rankings():
        previous = {
            (row.creator_profile_id, row.ranking_type, row.context_key): row.position
            for row in CreatorRanking.query.all()
        }
        CreatorRanking.query.delete(synchronize_session=False)
        now = datetime.utcnow()
        creators = [
            creator for creator in CreatorProfile.query.join(User).filter(
                User.is_active == True,
                User.is_verified == True,
            ).all()
            if creator.private_score and CreatorScoreService.is_ranking_eligible(creator)
        ]
        CreatorScoreService._rank_context(creators, 'overall', '', previous, now)
        CreatorScoreService.notify_new_leaderboard_creators(creators, limit=100, now=now)

        categories = sorted({
            str(category).strip().lower()
            for creator in creators
            for category in (creator.categories or [])
            if str(category).strip()
        })
        for category in categories:
            matching = [
                creator for creator in creators
                if category in {str(item).strip().lower() for item in (creator.categories or [])}
            ]
            CreatorScoreService._rank_context(matching, 'category', category, previous, now)

        primary_platforms = {
            creator.id: CreatorScoreService.primary_platform(creator.user_id)
            for creator in creators
        }
        platforms = sorted({
            CreatorScoreService.normalize_platform(row.platform)
            for row in primary_platforms.values()
            if row and CreatorScoreService.normalize_platform(row.platform)
        })
        for platform in platforms:
            matching = [
                creator for creator in creators
                if primary_platforms.get(creator.id)
                and CreatorScoreService.normalize_platform(
                    primary_platforms[creator.id].platform
                ) == platform
            ]
            CreatorScoreService._rank_context(matching, 'platform', platform, previous, now)

        cities = sorted({
            str(creator.city or creator.location or '').strip().lower()
            for creator in creators
            if str(creator.city or creator.location or '').strip()
        })
        for city in cities:
            matching = [
                creator for creator in creators
                if str(creator.city or creator.location or '').strip().lower() == city
            ]
            CreatorScoreService._rank_context(matching, 'city', city, previous, now)
        return len(creators)

    @staticmethod
    def leaderboard(category=None, platform=None, limit=50):
        category_key = (category or '').strip().lower()
        platform_key = CreatorScoreService.normalize_platform(platform)
        creators = [
            creator for creator in CreatorProfile.query.join(User).filter(
                User.is_active == True,
                User.is_verified == True,
            ).all()
            if creator.private_score and CreatorScoreService.is_ranking_eligible(creator)
        ]

        if category_key:
            creators = [
                creator for creator in creators
                if category_key in {
                    str(item).strip().lower()
                    for item in (creator.categories or [])
                }
            ]

        primary_platforms = {
            creator.id: CreatorScoreService.primary_platform(creator.user_id)
            for creator in creators
        }
        if platform_key:
            creators = [
                creator for creator in creators
                if primary_platforms.get(creator.id)
                and CreatorScoreService.normalize_platform(
                    primary_platforms[creator.id].platform
                ) == platform_key
            ]

        ordered = sorted(
            creators,
            key=CreatorScoreService._ranking_sort_key,
        )

        entries = []
        for position, creator in enumerate(ordered[:limit], start=1):
            primary = primary_platforms.get(creator.id)
            platform_name = CreatorScoreService.normalize_platform(primary.platform) if primary else None
            categories = creator.categories or []
            display_category = next(
                (item for item in categories if str(item).strip().lower() == category_key),
                categories[0] if categories else None,
            )
            entries.append({
                'rank': position,
                'creator_id': creator.id,
                'username': creator.username,
                'display_name': creator.username or 'Creator',
                'profile_picture': creator.profile_picture,
                'profile_picture_sizes': creator.profile_picture_sizes or {},
                'category': display_category,
                'categories': categories,
                'platform': platform_name,
                'platform_account_name': primary.account_name if primary else None,
                'platform_followers': int(primary.followers or 0) if primary else 0,
                'profile_path': f'/{creator.username}' if creator.username else f'/creators/{creator.id}',
                'overall_rank': CreatorScoreService.public_rank(creator.id),
                'badges': creator.get_leaderboard_badges(),
                'all_badges': CreatorScoreService.achievement_badges(creator),
                'show_score': bool(creator.leaderboard_show_score),
                'creator_score': (
                    round(float(creator.private_score.final_score or 0), 1)
                    if creator.leaderboard_show_score else None
                ),
            })

        return {
            'creators': entries,
            'total': len(ordered),
            'limit': limit,
            'category': category_key or None,
            'platform': platform_key or None,
            'calculated_at': (
                max(
                    (creator.private_score.calculated_at for creator in ordered if creator.private_score),
                    default=None,
                )
            ),
        }

    @staticmethod
    def recalculate_all():
        max_followers = CreatorScoreService.max_platform_followers()
        creators = CreatorProfile.query.all()
        for creator in creators:
            CreatorScoreService.calculate(creator.id, max_followers=max_followers)
        CreatorScoreService.rebuild_rankings()
        return len(creators)

    @staticmethod
    def public_rank(creator_profile_id, ranking_type='overall', context_key=''):
        ranking = CreatorRanking.query.filter_by(
            creator_profile_id=creator_profile_id,
            ranking_type=ranking_type,
            context_key=(context_key or '').strip().lower(),
        ).first()
        if not ranking:
            return None
        movement = None
        if ranking.previous_position is not None:
            movement = ranking.previous_position - ranking.position
        return {
            'position': ranking.position,
            'previous_position': ranking.previous_position,
            'movement': movement,
            'type': ranking.ranking_type,
            'context': ranking.context_key or None,
            'calculated_at': ranking.calculated_at.isoformat(),
        }

    @staticmethod
    def _score_float(score, field):
        return float(getattr(score, field, 0) or 0) if score else 0.0

    @staticmethod
    def _badge_rank(creator):
        badges = CreatorScoreService.achievement_badges(creator)
        return max([BADGE_PRIORITY.get(badge, 0) for badge in badges] or [0])

    @staticmethod
    def _subscription_rank(creator):
        try:
            from app.models import CreatorSubscription, CreatorSubscriptionPlan
            active = CreatorSubscription.query.join(CreatorSubscriptionPlan).filter(
                CreatorSubscription.creator_id == creator.id,
                CreatorSubscription.status == 'active',
                CreatorSubscription.payment_verified == True,
                CreatorSubscriptionPlan.subscription_type == 'platform',
            ).order_by(CreatorSubscriptionPlan.price.desc()).first()
            if not active or not active.plan:
                return 0
            plan_name = (active.plan.name or '').lower()
            if 'pro' in plan_name:
                return 20
            if 'rising' in plan_name:
                return 10
        except Exception:
            pass
        return 0

    @staticmethod
    def _last_active_timestamp(creator):
        snapshot = getattr(creator.private_score, 'input_snapshot', {}) or {}
        value = snapshot.get('last_session_at')
        if value:
            try:
                return datetime.fromisoformat(value).timestamp()
            except Exception:
                pass
        return creator.user.last_login.timestamp() if creator.user and creator.user.last_login else 0

    @staticmethod
    def _ranking_sort_key(creator):
        score = creator.private_score
        return (
            -CreatorScoreService._badge_rank(creator),
            -CreatorScoreService._subscription_rank(creator),
            -float(score.final_score or 0),
            -float(score.on_time_delivery_score or 0),
            -float(score.response_rate_score or 0),
            -float(score.engagement_score or 0),
            -CreatorScoreService._last_active_timestamp(creator),
            creator.id,
        )

    @staticmethod
    def notify_new_leaderboard_creators(creators, limit=100, now=None):
        now = now or datetime.utcnow()
        ordered = sorted(creators, key=CreatorScoreService._ranking_sort_key)[:limit]
        for position, creator in enumerate(ordered, start=1):
            if creator.leaderboard_notified_at or not creator.user or not creator.user.email:
                continue
            creator.leaderboard_notified_at = now
            db.session.add(Notification(
                user_id=creator.user_id,
                type='leaderboard',
                title='You are on the BantuBuzz leaderboard',
                message=f'Your creator profile is now ranked #{position} on the BantuBuzz leaderboard.',
                action_url='/leaderboard',
            ))
            try:
                from app.services.email_service import send_email
                send_email(
                    'You made the BantuBuzz Creator Leaderboard',
                    creator.user.email,
                    (
                        f'Hi {creator.username or "Creator"},\n\n'
                        f'Your BantuBuzz creator profile is now ranked #{position} on the leaderboard.\n'
                        'You can manage whether your score is visible and which badges appear from your creator dashboard.\n\n'
                        'The BantuBuzz Team'
                    ),
                    f"""
                    <p>Hi {creator.username or 'Creator'},</p>
                    <p>Your BantuBuzz creator profile is now ranked <strong>#{position}</strong> on the leaderboard.</p>
                    <p>You can manage whether your score is visible and which badges appear from your creator dashboard.</p>
                    <p><a href="https://bantubuzz.com/creator/dashboard">Manage leaderboard display</a></p>
                    <p>The BantuBuzz Team</p>
                    """,
                )
            except Exception:
                pass

    @staticmethod
    def achievement_badges(creator):
        score = getattr(creator, 'private_score', None)
        if not score:
            return ['buzz_creator']

        snapshot = score.input_snapshot or {}
        review_snapshot = snapshot.get('reviews') or {}
        reliability_snapshot = snapshot.get('marketplace_reliability') or {}
        total_followers = int(snapshot.get('followers') or creator.get_total_followers() or 0)
        total_orders = int(reliability_snapshot.get('total_orders') or 0)
        completed_orders = int(reliability_snapshot.get('completed_orders') or 0)
        completed_campaigns = int(reliability_snapshot.get('completed_campaigns') or 0)
        verified_reviews = int(review_snapshot.get('total_verified_reviews') or 0)

        final_score = CreatorScoreService._score_float(score, 'final_score')
        reach_score = CreatorScoreService._score_float(score, 'reach_score')
        engagement_score = CreatorScoreService._score_float(score, 'engagement_score')
        review_score = CreatorScoreService._score_float(score, 'review_score')
        profile_trust_score = CreatorScoreService._score_float(score, 'profile_trust_score')
        marketplace_reliability_score = CreatorScoreService._score_float(score, 'marketplace_reliability_score')
        order_completion_score = CreatorScoreService._score_float(score, 'order_completion_score')
        response_rate_score = CreatorScoreService._score_float(score, 'response_rate_score')
        on_time_delivery_score = CreatorScoreService._score_float(score, 'on_time_delivery_score')

        badges = []
        last_active_days = 999
        last_session_at = snapshot.get('last_session_at')
        if last_session_at:
            try:
                last_active_days = (datetime.utcnow() - datetime.fromisoformat(last_session_at)).total_seconds() / 86400
            except Exception:
                pass

        if (
            final_score >= 98
            and review_score >= 95
            and creator.is_verified
            and profile_trust_score >= 95
            and completed_campaigns >= 5
            and total_orders >= 20
            and order_completion_score >= 95
            and response_rate_score >= 95
            and on_time_delivery_score >= 95
            and last_active_days <= 7
        ):
            badges.append('elite_creator')
        if (
            final_score >= 90
            and review_score >= 90
            and creator.is_verified
            and profile_trust_score >= 90
            and completed_campaigns >= 3
            and total_orders >= 10
            and order_completion_score >= 90
            and response_rate_score >= 90
            and on_time_delivery_score >= 90
        ):
            badges.append('top_creator')
        if review_score >= 90 and verified_reviews >= 5 and order_completion_score >= 80 and response_rate_score >= 90:
            badges.append('trusted_creator')
        if final_score >= 80 and marketplace_reliability_score >= 20:
            badges.append('brand_magnet')
        if final_score >= 70 and completed_campaigns >= 1:
            badges.append('campaign_pro')
        if final_score >= 70 and engagement_score >= 90:
            badges.append('engagement_leader')
        if reach_score >= 80:
            badges.append('audience_builder')
        if final_score >= 70 and total_followers >= 10000 and profile_trust_score >= 70 and last_active_days <= 14:
            badges.append('rising_creator')

        city_key = str(creator.city or creator.location or '').strip().lower()
        city_rank = CreatorScoreService.public_rank(creator.id, 'city', city_key) if city_key else None
        if city_rank and city_rank.get('position') and city_rank['position'] <= 10:
            badges.append('city_top_10')

        for category in creator.categories or []:
            context = str(category or '').strip().lower()
            if not context:
                continue
            rank = CreatorScoreService.public_rank(creator.id, 'category', context)
            total = CreatorRanking.query.filter_by(
                ranking_type='category',
                context_key=context,
            ).count()
            if rank and total and rank.get('position') <= max(1, math.ceil(total * 0.10)):
                badges.append('category_leader')
                break

        if creator.is_verified and 'top_creator' not in badges:
            badges.append('verified_creator')

        if not badges:
            badges.append('creator_to_watch' if final_score >= 60 else 'buzz_creator')

        return sorted(dict.fromkeys(badges), key=lambda badge: -BADGE_PRIORITY.get(badge, 0))

    @staticmethod
    def owner_score_payload(creator):
        score = getattr(creator, 'private_score', None)
        if not score:
            return {
                'score': None,
                'formula_version': FORMULA_VERSION,
                'message': 'Your score will appear after your profile has enough activity to calculate it.',
                'improvement_tips': [
                    'Connect at least one social platform.',
                    'Complete your profile and add a profile photo.',
                    'Create an active package so brands can book you.',
                ],
            }

        dimensions = {
            'public_performance': round(weighted_component_score({
                'engagement': score.engagement_score,
                'reach': score.reach_score,
                'followers': score.follower_score,
                'sentiment': score.sentiment_score,
            }, ['engagement', 'reach', 'followers', 'sentiment']), 2),
            'marketplace_reliability': round(float(score.marketplace_reliability_score or 0), 2),
            'reviews': round(float(score.review_score or 0), 2),
            'profile_trust': round(float(score.profile_trust_score or score.profile_quality_score or 0), 2),
            'activity': round(float(score.activity_score or 0), 2),
        }
        raw_dimensions = {
            'engagement': round(float(score.engagement_score or 0), 2),
            'reach': round(float(score.reach_score or 0), 2),
            'followers': round(float(score.follower_score or 0), 2),
            'sentiment': round(float(score.sentiment_score or 0), 2),
            'order_completion': round(float(score.order_completion_score or 0), 2),
            'response_rate': round(float(score.response_rate_score or 0), 2),
            'on_time_delivery': round(float(score.on_time_delivery_score or 0), 2),
            'reviews': round(float(score.review_score or 0), 2),
            'profile_trust': round(float(score.profile_trust_score or score.profile_quality_score or 0), 2),
            'activity': round(float(score.activity_score or 0), 2),
        }
        tips = []
        if raw_dimensions['profile_trust'] < 80:
            tips.append('Improve profile trust by adding a strong bio, photo, connected platforms, packages, and portfolio work.')
        if raw_dimensions['engagement'] < 70:
            tips.append('Connect and sync platforms with stronger engagement so brands can see your audience responds.')
        if raw_dimensions['reach'] < 70:
            tips.append('Submit live post URLs and keep your platforms synced so reach and views can be measured.')
        if raw_dimensions['reviews'] == 0:
            tips.append('Complete collaborations and ask brands to leave verified reviews after delivery.')
        elif raw_dimensions['reviews'] < 80:
            tips.append('Aim for more 4-5 star reviews from completed collaborations.')
        if raw_dimensions['response_rate'] and raw_dimensions['response_rate'] < 90:
            tips.append('Reply to brand messages faster to improve your response rate.')
        if raw_dimensions['on_time_delivery'] and raw_dimensions['on_time_delivery'] < 90:
            tips.append('Deliver before deadlines to improve your on-time delivery score.')
        if raw_dimensions['activity'] < 60:
            tips.append('Log in regularly and stay active so brands know you are available.')

        return {
            'score': round(float(score.final_score or 0), 1),
            'formula_version': score.formula_version,
            'calculated_at': score.calculated_at.isoformat() if score.calculated_at else None,
            'rank': CreatorScoreService.public_rank(creator.id),
            'badges': CreatorScoreService.achievement_badges(creator),
            'leaderboard_preferences': {
                'show_score': bool(creator.leaderboard_show_score),
                'selected_badges': creator.leaderboard_badges or [],
                'display_badges': creator.get_leaderboard_badges(),
                'notified_at': creator.leaderboard_notified_at.isoformat() if creator.leaderboard_notified_at else None,
            },
            'dimensions': dimensions,
            'raw_dimensions': raw_dimensions,
            'excluded_dimensions': (score.data_quality or {}).get('excluded_dimensions', []),
            'improvement_tips': tips[:5],
        }


def queue_creator_score_recalculation(creator_profile_id):
    if not creator_profile_id:
        return
    try:
        from app.tasks.creator_score_tasks import recalculate_creator
        recalculate_creator.delay(int(creator_profile_id))
    except Exception:
        try:
            existing = CreatorScore.query.filter_by(creator_profile_id=int(creator_profile_id)).first()
            previous_max = (existing.input_snapshot or {}).get('max_followers') if existing else None
            current_max = CreatorScoreService.max_platform_followers()
            if previous_max is None or int(previous_max or 0) != int(current_max or 0):
                CreatorScoreService.recalculate_all()
            else:
                CreatorScoreService.calculate(int(creator_profile_id), rebuild_ranks=True)
            db.session.commit()
        except Exception as scoring_error:
            db.session.rollback()
            try:
                from flask import current_app
                current_app.logger.warning(
                    'Creator score recalculation failed for creator %s: %s',
                    creator_profile_id,
                    scoring_error,
                )
            except Exception:
                pass
