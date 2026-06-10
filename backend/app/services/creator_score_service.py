from datetime import datetime, timedelta

from sqlalchemy import func

from app import db
from app.models import (
    ConnectedPlatform,
    CreatorProfile,
    CreatorRanking,
    CreatorScore,
    CreatorScoreHistory,
    Package,
    PortfolioItem,
    PostMetrics,
    User,
    UserSession,
)
from app.services.creator_score_formula import (
    activity_dimension,
    clamp,
    engagement_dimension,
    final_creator_score,
    follower_dimension,
    normalize_sentiment,
    profile_quality_dimension,
    reach_dimension,
    sentiment_dimension,
)


FORMULA_VERSION = '1.0'


class CreatorScoreService:
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
        has_bio = len((creator.bio or '').strip()) >= 40

        dimensions = {
            'engagement': engagement_dimension(average_engagement),
            'reach': reach_dimension(reach_ratio, reach_count > 0),
            'followers': follower_dimension(followers, max_followers),
            'sentiment': sentiment_dimension(average_sentiment, negative_pct, critical_pct),
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
            'profile_elements': {
                'photo': has_photo,
                'bio': has_bio,
                'connected_platform': has_platform,
                'active_package': has_package,
                'visible_portfolio': has_portfolio,
            },
        }
        quality = {
            'engagement_records': engagement_count,
            'reach_records': reach_count,
            'sentiment_comments': comment_count,
            'sentiment_source': sentiment_source,
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
            key=lambda creator: (
                -float(creator.private_score.final_score or 0),
                -float(creator.private_score.engagement_score or 0),
                -float(creator.private_score.reach_score or 0),
                creator.id,
            ),
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

        platforms = sorted({
            row.platform.lower()
            for creator in creators
            for row in ConnectedPlatform.query.filter_by(user_id=creator.user_id, is_connected=True).all()
            if row.platform
        })
        for platform in platforms:
            user_ids = {
                row.user_id for row in ConnectedPlatform.query.filter(
                    func.lower(ConnectedPlatform.platform) == platform,
                    ConnectedPlatform.is_connected == True,
                ).all()
            }
            matching = [creator for creator in creators if creator.user_id in user_ids]
            CreatorScoreService._rank_context(matching, 'platform', platform, previous, now)
        return len(creators)

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
