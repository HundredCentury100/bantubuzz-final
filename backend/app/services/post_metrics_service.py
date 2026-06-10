"""
Post Metrics Service

Handles syncing post performance metrics from ThunziAI to BantuBuzz database.
Part of: Brand Analytics Implementation - Phase 2
"""

from app import db
from app.models import (
    MilestoneDeliverable,
    PackageDeliverable,
    PostMetrics,
    PostMetricsSnapshot,
    PostSentimentComment,
    ConnectedPlatform,
    User,
    CreatorProfile
)
from app.services.thunzi_service import thunzi_service
from datetime import datetime, timedelta
from typing import Optional, Dict, Union
import hashlib
import re
import traceback


class PostMetricsService:
    """Service for syncing post metrics from ThunziAI"""

    THEME_KEYWORDS = {
        'product_quality': {
            'quality', 'beautiful', 'amazing', 'perfect', 'broken', 'poor',
            'fake', 'zvakanaka', 'kunaka', 'kubi', 'kuhle', 'enhle', 'mooi', 'sleg'
        },
        'price_value': {
            'price', 'cost', 'expensive', 'cheap', 'value', 'affordable',
            'inodhura', 'mutengo', 'duur', 'goedkoop', 'ibiza'
        },
        'customer_service': {
            'service', 'support', 'helpful', 'rude', 'response', 'delivery',
            'rubatsiro', 'inkonzo', 'usizo', 'diens', 'aflewering'
        },
        'trust_authenticity': {
            'trust', 'trusted', 'authentic', 'real', 'scam', 'fraud', 'legit',
            'chokwadi', 'ukuthembeka', 'betroubaar', 'egte'
        },
        'campaign_creative': {
            'creative', 'content', 'video', 'music', 'funny', 'boring',
            'ad', 'advert', 'creator', 'umculo', 'ividiyo', 'vhidhiyo'
        },
        'purchase_intent': {
            'buy', 'bought', 'order', 'want', 'need', 'where can i get',
            'ndinoda', 'ngifuna', 'ukuthenga', 'bestel', 'koop'
        },
    }

    LANGUAGE_HINTS = {
        'shona': {'zvakanaka', 'ndinoda', 'mutengo', 'chokwadi', 'rubatsiro', 'vhidhiyo', 'inodhura'},
        'ndebele': {'kuhle', 'ngifuna', 'inkonzo', 'ukuthenga', 'kubi'},
        'zulu': {'ngiyathanda', 'kuhle', 'ngifuna', 'usizo', 'ukuthenga', 'kubi'},
        'afrikaans': {'lekker', 'mooi', 'duur', 'goedkoop', 'diens', 'aflewering', 'betroubaar', 'koop'},
    }

    @staticmethod
    def _first_dict(value):
        if isinstance(value, dict):
            return value
        if isinstance(value, list):
            return next((item for item in value if isinstance(item, dict)), None)
        return None

    @staticmethod
    def _normalize_sentiment(value):
        sentiment = str(value or 'neutral').strip().lower()
        if sentiment in {'positive', 'negative', 'neutral'}:
            return sentiment
        if sentiment == 'critical':
            return 'negative'
        return 'neutral'

    @staticmethod
    def _detect_language(content, supplied_language=None):
        supplied = str(supplied_language or '').strip().lower()
        aliases = {
            'en': 'english',
            'eng': 'english',
            'sn': 'shona',
            'nd': 'ndebele',
            'zu': 'zulu',
            'af': 'afrikaans',
        }
        supplied = aliases.get(supplied, supplied)
        if supplied in {'english', 'shona', 'ndebele', 'zulu', 'afrikaans'}:
            return supplied

        words = set(re.findall(r"[a-z']+", (content or '').lower()))
        scores = {
            language: len(words.intersection(hints))
            for language, hints in PostMetricsService.LANGUAGE_HINTS.items()
        }
        language, score = max(scores.items(), key=lambda item: item[1])
        return language if score > 0 else 'english'

    @staticmethod
    def _extract_themes(content):
        normalized = (content or '').lower()
        words = set(re.findall(r"[a-z']+", normalized))
        themes = []
        for theme, keywords in PostMetricsService.THEME_KEYWORDS.items():
            if words.intersection(keywords) or any(
                ' ' in keyword and keyword in normalized
                for keyword in keywords
            ):
                themes.append(theme)
        return themes

    @staticmethod
    def _parse_datetime(value):
        if not value:
            return None
        try:
            return datetime.fromisoformat(str(value).replace('Z', '+00:00')).replace(tzinfo=None)
        except (TypeError, ValueError):
            return None

    @staticmethod
    def _sync_sentiment_comments(metrics, original_post_id):
        """Best-effort comment cache used by Premium sentiment analytics."""
        from flask import current_app

        try:
            response = thunzi_service.get_post_comments_by_original_id(original_post_id)
            if isinstance(response, dict):
                comments = response.get('comments') or response.get('data') or []
            elif isinstance(response, list):
                comments = response
            else:
                comments = []

            if not isinstance(comments, list):
                return 0

            normalized_comments = []
            for comment in comments:
                if not isinstance(comment, dict):
                    continue
                content = str(comment.get('content') or comment.get('text') or '').strip()
                if not content:
                    continue
                author = str(comment.get('username') or comment.get('author') or '').strip()
                published_at_value = comment.get('publishedAt') or comment.get('createdAt')
                external_id = comment.get('id') or comment.get('commentId')
                if external_id is None:
                    fingerprint = f'{author}|{content}|{published_at_value}'.encode('utf-8')
                    external_id = hashlib.sha1(fingerprint).hexdigest()
                normalized_comments.append({
                    'external_id': str(external_id),
                    'platform': comment.get('platform') or metrics.post_platform,
                    'author': author or None,
                    'content': content,
                    'sentiment': PostMetricsService._normalize_sentiment(comment.get('sentiment')),
                    'sentiment_score': comment.get('sentimentScore'),
                    'language': PostMetricsService._detect_language(
                        content,
                        comment.get('language') or comment.get('languageCode')
                    ),
                    'likes': int(comment.get('likes') or comment.get('likeCount') or 0),
                    'views': int(comment.get('views') or 0),
                    'themes': PostMetricsService._extract_themes(content),
                    'published_at': PostMetricsService._parse_datetime(published_at_value),
                })

            normalized_comments.sort(
                key=lambda item: (
                    item['likes'],
                    abs(float(item['sentiment_score'] or 0)),
                ),
                reverse=True,
            )

            for comment in normalized_comments[:100]:
                record = PostSentimentComment.query.filter_by(
                    post_metrics_id=metrics.id,
                    external_id=comment['external_id'],
                ).first()
                if not record:
                    record = PostSentimentComment(
                        post_metrics_id=metrics.id,
                        external_id=comment['external_id'],
                    )
                    db.session.add(record)
                for field, value in comment.items():
                    if field != 'external_id':
                        setattr(record, field, value)

            return min(len(normalized_comments), 100)
        except Exception:
            current_app.logger.warning(
                'Unable to sync sentiment comments for post %s',
                original_post_id,
                exc_info=True,
            )
            return 0

    @staticmethod
    def _add_metrics_snapshot(metrics):
        db.session.add(PostMetricsSnapshot(
            post_metrics_id=metrics.id,
            reach=metrics.reach or 0,
            impressions=metrics.impressions or 0,
            video_views=metrics.video_views or 0,
            likes=metrics.likes or 0,
            comments=metrics.comments or 0,
            shares=metrics.shares or 0,
            saves=metrics.saves or 0,
            clicks=metrics.clicks or 0,
            conversions=metrics.conversions or 0,
            total_engagement=metrics.total_engagement or 0,
            positive_comments=metrics.positive_comments or 0,
            negative_comments=metrics.negative_comments or 0,
            neutral_comments=metrics.neutral_comments or 0,
            captured_at=datetime.utcnow(),
        ))

    @staticmethod
    def sync_deliverable_metrics(deliverable_id: int, deliverable_type: str = 'milestone') -> Dict:
        """
        Sync metrics for a specific deliverable from ThunziAI

        This is the main method that:
        1. Gets the deliverable with post URL
        2. Finds creator's connected platform in ThunziAI
        3. Fetches posts from that platform
        4. Matches post by post_id
        5. Fetches detailed insights
        6. Stores/updates metrics in database

        Args:
            deliverable_id: Deliverable ID (milestone or package)
            deliverable_type: 'milestone' or 'package' (default: 'milestone')

        Returns:
            {
                'success': bool,
                'message': str,
                'metrics': PostMetrics.to_dict() or None,
                'error': str or None
            }
        """
        from flask import current_app

        try:
            # Get deliverable based on type
            if deliverable_type == 'milestone':
                deliverable = MilestoneDeliverable.query.get(deliverable_id)
            elif deliverable_type == 'package':
                deliverable = PackageDeliverable.query.get(deliverable_id)
            else:
                return {
                    'success': False,
                    'message': f'Invalid deliverable type: {deliverable_type}',
                    'metrics': None,
                    'error': 'Invalid deliverable type'
                }

            if not deliverable:
                return {
                    'success': False,
                    'message': 'Deliverable not found',
                    'metrics': None,
                    'error': 'Deliverable not found'
                }

            # Check if post URL was submitted
            if not deliverable.url or not deliverable.post_url_validated:
                return {
                    'success': False,
                    'message': 'No validated post URL for this deliverable',
                    'metrics': None,
                    'error': 'Post URL not submitted or not validated'
                }

            # Get creator and collaboration based on deliverable type
            if deliverable_type == 'milestone':
                collaboration = deliverable.milestone.collaboration
            else:  # package
                from app.models import Collaboration
                collaboration = Collaboration.query.get(deliverable.collaboration_id)

            creator_id = collaboration.creator_id

            # Get creator's ThunziAI account to login with their credentials
            from app.models import ThunziAccount, CreatorProfile
            creator_profile = CreatorProfile.query.get(creator_id)
            if not creator_profile:
                return {
                    'success': False,
                    'message': 'Creator profile not found',
                    'metrics': None,
                    'error': 'Creator profile not found'
                }

            thunzi_account = ThunziAccount.query.filter_by(user_id=creator_profile.user_id).first()
            if not thunzi_account:
                return {
                    'success': False,
                    'message': 'Creator has not connected to ThunziAI',
                    'metrics': None,
                    'error': 'ThunziAI account not found'
                }

            # Login to ThunziAI with creator's credentials (password = email)
            login_success = thunzi_service.login(email=thunzi_account.thunzi_email, password=thunzi_account.thunzi_email)
            if not login_success:
                return {
                    'success': False,
                    'message': 'Failed to authenticate with ThunziAI',
                    'metrics': None,
                    'error': 'ThunziAI login failed'
                }

            # Check if creator has a ThunziAI creator entity (BantuBuzz ID)
            if not thunzi_account.bantubuzz_id:
                return {
                    'success': False,
                    'message': 'Creator has not been set up in ThunziAI. Please contact support.',
                    'metrics': None,
                    'error': 'ThunziAI BantuBuzz ID not found'
                }

            # Get connected platforms to verify creator has the platform connected
            connected_platforms = ConnectedPlatform.query.filter_by(
                user_id=creator_profile.user_id,
                platform=deliverable.post_platform,
                is_connected=True
            ).all()

            if not connected_platforms:
                return {
                    'success': False,
                    'message': f'Creator has not connected their {deliverable.post_platform.title()} account',
                    'metrics': None,
                    'error': f'{deliverable.post_platform} not connected'
                }

            post_reference = (deliverable.url or '').strip()
            looks_like_url = post_reference.startswith(('http://', 'https://')) or '.' in post_reference

            # Prefer ThunziAI's direct URL lookup when available. Facebook can also
            # be submitted as a numeric/original Post ID because public Facebook URLs
            # often expose alphanumeric IDs while Graph/Thunzi use numeric IDs.
            thunzi_posts = []
            if looks_like_url:
                matching_post = PostMetricsService._first_dict(thunzi_service.find_post_by_url(
                    post_reference,
                    thunzi_account.thunzi_company_id
                ))
            else:
                matching_post = PostMetricsService._first_dict(thunzi_service.get_post_by_original_id(post_reference))
                if (matching_post and matching_post.get('companyId') and
                    str(matching_post.get('companyId')) != str(thunzi_account.thunzi_company_id)):
                    matching_post = None
            connected_platform = connected_platforms[0] if connected_platforms else None

            # Use ThunziAI creator posts API with date range as fallback.
            # Get posts from past 90 days
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=90)

            if matching_post:
                current_app.logger.info(
                    f"Found post via ThunziAI find-by-url for deliverable {deliverable_id}"
                )
            else:
                current_app.logger.info(
                    f"Fetching posts for ThunziAI company {thunzi_account.thunzi_company_id} "
                    f"from {start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}"
                )

                # Use company ID endpoint instead of bantubuzz_id
                # The creator-specific endpoint returns empty results, but company endpoint works
                thunzi_posts = thunzi_service.get_posts_by_company_id(
                    thunzi_account.thunzi_company_id,
                    start_date.strftime('%Y-%m-%d'),
                    end_date.strftime('%Y-%m-%d')
                )

                if not thunzi_posts:
                    return {
                        'success': False,
                        'message': 'No posts found for this creator in ThunziAI. Make sure platforms are syncing.',
                        'metrics': None,
                        'error': 'No posts found in date range'
                    }

                current_app.logger.info(
                    f"Searching {len(thunzi_posts)} posts for post_id={deliverable.post_id} "
                    f"on platform={deliverable.post_platform}"
                )

                for post in thunzi_posts:
                    # Match by originalId/originalPostId and platform type.
                    original_id = post.get('originalId') or post.get('originalPostId') or ''
                    post_platform = post.get('platform', '').lower()

                    # originalId is often formatted as "accountId_postId", so extract postId.
                    if '_' in original_id:
                        extracted_post_id = original_id.split('_', 1)[1]
                    else:
                        extracted_post_id = original_id

                    if (str(extracted_post_id) == str(deliverable.post_id) and
                        post_platform == deliverable.post_platform.lower()):
                        matching_post = post
                        connected_platform = connected_platforms[0] if connected_platforms else None

                        current_app.logger.info(
                            f"Found matching post: originalId={original_id}, extracted_post_id={extracted_post_id}, platform={post_platform}"
                        )
                        break

            if not matching_post:
                current_app.logger.warning(
                    f"Post {deliverable.post_id} not found in ThunziAI creator posts. "
                    f"Platform: {deliverable.post_platform}, Posts found: {len(thunzi_posts)}"
                )
                return {
                    'success': False,
                    'message': f'Post not found in ThunziAI. Make sure the post has been synced from {deliverable.post_platform.title()}.',
                    'metrics': None,
                    'error': 'Post not found in creator posts'
                }

            # Get detailed insights using NEW endpoint (Mar 2026) - uses originalId instead of ThunziAI post ID
            # This is more efficient as it directly queries by the original post ID
            original_post_id = (
                matching_post.get('originalId') or
                matching_post.get('originalPostId') or
                deliverable.post_id
            )
            insights = PostMetricsService._first_dict(thunzi_service.get_post_insights_by_original_id(original_post_id))

            if not insights:
                current_app.logger.warning(
                    f"Failed to fetch insights for original post ID {original_post_id}"
                )
                # Continue with basic metrics from post list
                insights = {'post': matching_post, 'commentSentiment': {}}

            # Get or create PostMetrics record
            metrics = PostMetrics.query.filter_by(
                deliverable_id=deliverable_id,
                deliverable_type=deliverable_type
            ).first()

            if not metrics:
                metrics = PostMetrics(
                    collaboration_id=collaboration.id,
                    deliverable_id=deliverable_id,
                    deliverable_type=deliverable_type,
                    creator_id=creator_id,
                    thunzi_platform_id=connected_platform.thunzi_platform_id,
                    post_url=deliverable.url,  # Use .url for both types
                    post_platform=deliverable.post_platform,
                    post_id=deliverable.post_id
                )
                db.session.add(metrics)

            # Update metrics from ThunziAI data
            post_data = insights.get('post') or matching_post or {}
            sentiment_data = insights.get('commentSentiment') or {}

            # Update ThunziAI post ID from insights or matching post
            thunzi_post_id = insights.get('postId') or matching_post.get('id')
            metrics.thunzi_post_id = str(thunzi_post_id) if thunzi_post_id else None

            # Post info (creator API uses 'content', platform API uses 'description')
            metrics.post_title = post_data.get('title') or post_data.get('username')
            metrics.post_description = post_data.get('description') or post_data.get('content')

            # Parse published date
            if post_data.get('publishedAt'):
                try:
                    # Handle ISO format with Z suffix
                    published_str = post_data['publishedAt'].replace('Z', '+00:00')
                    metrics.published_at = datetime.fromisoformat(published_str)
                except:
                    pass

            # Core metrics - Store only non-null values from ThunziAI
            # Platform-specific availability:
            # - reach: YouTube✅, TikTok❌, Facebook✅, Instagram✅
            # - saves: YouTube✅, TikTok❌, Facebook❌, Instagram✅
            # - engagementRate: YouTube❌, TikTok✅, Facebook✅, Instagram✅

            # Only store values if they are not None (preserving 0 as valid data)
            reach_value = post_data.get('reach')
            if reach_value is not None:
                metrics.reach = reach_value

            impressions_value = post_data.get('impressions')
            if impressions_value is not None:
                metrics.impressions = impressions_value
            elif reach_value is not None:
                metrics.impressions = reach_value

            likes_value = post_data.get('likes')
            if likes_value is not None:
                metrics.likes = likes_value

            comments_value = post_data.get('comments')
            if comments_value is not None:
                metrics.comments = comments_value

            shares_value = post_data.get('shares')
            if shares_value is not None:
                metrics.shares = shares_value

            saves_value = post_data.get('saves')
            if saves_value is not None:
                metrics.saves = saves_value

            clicks_value = (
                post_data.get('clicks')
                if post_data.get('clicks') is not None
                else post_data.get('linkClicks', post_data.get('websiteClicks'))
            )
            if clicks_value is not None:
                metrics.clicks = clicks_value

            conversions_value = (
                post_data.get('conversions')
                if post_data.get('conversions') is not None
                else post_data.get('conversionCount')
            )
            if conversions_value is not None:
                metrics.conversions = conversions_value

            # Store ThunziAI's engagement rate if available (TikTok, Facebook, Instagram)
            engagement_rate_value = post_data.get('engagementRate')
            if engagement_rate_value is not None:
                metrics.engagement_rate = engagement_rate_value

            # Video metrics (if available)
            video_views_value = post_data.get('videoViews') or post_data.get('views')
            if video_views_value is not None:
                metrics.video_views = video_views_value

            # Calculate total engagement from available metrics
            metrics.calculate_engagement()

            # Sentiment analysis (YouTube-only has sentiment score)
            sentiment_value = post_data.get('sentiment')
            if sentiment_value is not None:
                if isinstance(sentiment_value, (int, float)):
                    # ThunziAI sometimes returns sentiment as a percentage.
                    if sentiment_value <= 33:
                        metrics.sentiment = 'negative'
                        metrics.sentiment_score = sentiment_value - 50
                    elif sentiment_value <= 66:
                        metrics.sentiment = 'neutral'
                        metrics.sentiment_score = 0
                    else:
                        metrics.sentiment = 'positive'
                        metrics.sentiment_score = sentiment_value - 50
                else:
                    metrics.sentiment = PostMetricsService._normalize_sentiment(sentiment_value)

            # Handle ThunziAI's typo: they return "postive" instead of "positive"
            metrics.positive_comments = sentiment_data.get('positive', sentiment_data.get('postive', 0))
            metrics.negative_comments = sentiment_data.get('negative', 0)
            metrics.neutral_comments = sentiment_data.get('neutral', 0)
            metrics.critical_comments = sentiment_data.get('critical', 0)

            # Sync metadata
            metrics.last_synced_at = datetime.utcnow()
            metrics.sync_status = 'synced'
            metrics.sync_error = None
            metrics.updated_at = datetime.utcnow()

            db.session.flush()
            comments_synced = PostMetricsService._sync_sentiment_comments(
                metrics,
                original_post_id,
            )
            PostMetricsService._add_metrics_snapshot(metrics)
            db.session.commit()
            from app.services.creator_score_service import queue_creator_score_recalculation
            creator_for_score = CreatorProfile.query.get(creator_id)
            if creator_for_score:
                queue_creator_score_recalculation(creator_for_score.id)

            current_app.logger.info(
                f"Successfully synced metrics for deliverable {deliverable_id} - "
                f"Reach: {metrics.reach}, Engagement: {metrics.total_engagement}"
            )

            return {
                'success': True,
                'message': 'Metrics synced successfully',
                'metrics': metrics.to_dict(),
                'comments_synced': comments_synced,
                'error': None
            }

        except Exception as e:
            db.session.rollback()

            error_msg = str(e)
            current_app.logger.error(
                f"Error syncing metrics for deliverable {deliverable_id}: {error_msg}\n"
                f"{traceback.format_exc()}"
            )

            # Try to update sync status in database
            try:
                metrics = PostMetrics.query.filter_by(
                    deliverable_id=deliverable_id,
                    deliverable_type=deliverable_type
                ).first()
                if metrics:
                    metrics.sync_status = 'failed'
                    metrics.sync_error = error_msg[:500]  # Truncate error message
                    metrics.last_synced_at = datetime.utcnow()
                    db.session.commit()
            except:
                pass

            return {
                'success': False,
                'message': f'Error syncing metrics: {error_msg}',
                'metrics': None,
                'error': error_msg
            }

    @staticmethod
    def sync_collaboration_metrics(collaboration_id: int) -> Dict:
        """
        Sync metrics for all deliverables in a collaboration

        Args:
            collaboration_id: Collaboration ID

        Returns:
            {
                'success': bool,
                'total': int,
                'synced': int,
                'failed': int,
                'results': List[Dict]
            }
        """
        from flask import current_app
        from app.models import Collaboration, CollaborationMilestone

        try:
            collaboration = Collaboration.query.get(collaboration_id)

            if not collaboration:
                return {
                    'success': False,
                    'message': 'Collaboration not found',
                    'total': 0,
                    'synced': 0,
                    'failed': 0,
                    'results': []
                }

            # Get all deliverables with submitted URLs
            deliverables = []

            milestones = CollaborationMilestone.query.filter_by(
                collaboration_id=collaboration.id
            ).all()
            for milestone in milestones:
                for deliverable in milestone.deliverables:
                    if deliverable.post_url_validated:
                        deliverables.append(('milestone', deliverable))

            package_deliverables = PackageDeliverable.query.filter_by(
                collaboration_id=collaboration_id
            ).all()
            for deliverable in package_deliverables:
                if deliverable.post_url_validated:
                    deliverables.append(('package', deliverable))

            if not deliverables:
                return {
                    'success': True,
                    'message': 'No deliverables with URLs to sync',
                    'total': 0,
                    'synced': 0,
                    'failed': 0,
                    'results': []
                }

            results = []
            synced = 0
            failed = 0

            for deliverable_type, deliverable in deliverables:
                result = PostMetricsService.sync_deliverable_metrics(
                    deliverable.id,
                    deliverable_type=deliverable_type
                )
                results.append({
                    'deliverable_id': deliverable.id,
                    'deliverable_type': deliverable_type,
                    'deliverable_title': deliverable.title,
                    'success': result['success'],
                    'message': result['message']
                })

                if result['success']:
                    synced += 1
                else:
                    failed += 1

            return {
                'success': True,
                'total': len(deliverables),
                'synced': synced,
                'failed': failed,
                'results': results
            }

        except Exception as e:
            current_app.logger.error(
                f"Error syncing collaboration {collaboration_id} metrics: {str(e)}\n"
                f"{traceback.format_exc()}"
            )

            return {
                'success': False,
                'message': f'Error: {str(e)}',
                'total': 0,
                'synced': 0,
                'failed': 0,
                'results': []
            }

    @staticmethod
    def get_deliverable_metrics(deliverable_id: int, deliverable_type: str = 'milestone') -> Optional[Dict]:
        """
        Get cached metrics for a deliverable

        Args:
            deliverable_id: Deliverable ID
            deliverable_type: 'milestone' or 'package' (default: 'milestone')

        Returns:
            Metrics dict or None if not found
        """
        metrics = PostMetrics.query.filter_by(
            deliverable_id=deliverable_id,
            deliverable_type=deliverable_type
        ).first()

        if metrics:
            return metrics.to_dict()

        return None

    @staticmethod
    def get_collaboration_analytics(collaboration_id: int) -> Dict:
        """
        Get aggregated analytics for all posts in a collaboration
        Only aggregates non-null metrics (platform-specific availability)

        Platform availability matrix:
        - reach: YouTube✅, TikTok❌, Facebook✅, Instagram✅
        - saves: YouTube✅, TikTok❌, Facebook❌, Instagram✅
        - engagementRate: YouTube❌, TikTok✅, Facebook✅, Instagram✅
        - sentiment: YouTube✅, TikTok❌, Facebook❌, Instagram❌

        Args:
            collaboration_id: Collaboration ID

        Returns:
            {
                'total_posts': int,
                'total_reach': int,
                'total_likes': int,
                'total_comments': int,
                'total_shares': int,
                'total_saves': int,
                'total_engagement': int,
                'avg_engagement_rate': float,
                'platforms': {platform: count},
                'posts': [post metrics list]
            }
        """
        from app.models import Collaboration

        collaboration = Collaboration.query.filter_by(id=collaboration_id).first()
        if not collaboration:
            return {
                'success': False,
                'message': 'Collaboration not found',
                'analytics': None
            }

        # Get all post metrics for this collaboration
        all_metrics = PostMetrics.query.filter_by(collaboration_id=collaboration_id).all()

        if not all_metrics:
            return {
                'success': True,
                'analytics': {
                    'total_posts': 0,
                    'total_reach': 0,
                    'total_likes': 0,
                    'total_comments': 0,
                    'total_shares': 0,
                    'total_saves': 0,
                    'total_engagement': 0,
                    'avg_engagement_rate': 0,
                    'platforms': {},
                    'posts': []
                }
            }

        # Initialize aggregation counters
        analytics = {
            'total_posts': len(all_metrics),
            'total_reach': 0,
            'total_likes': 0,
            'total_comments': 0,
            'total_shares': 0,
            'total_saves': 0,
            'total_engagement': 0,
            'platforms': {},
            'posts': []
        }

        # Counters for averaging (only count non-null values)
        reach_count = 0
        engagement_rate_sum = 0
        engagement_rate_count = 0

        for metrics in all_metrics:
            # Track platform distribution
            platform = metrics.post_platform
            analytics['platforms'][platform] = analytics['platforms'].get(platform, 0) + 1

            # Aggregate only non-null metrics
            if metrics.reach is not None:
                analytics['total_reach'] += metrics.reach
                reach_count += 1

            if metrics.likes is not None:
                analytics['total_likes'] += metrics.likes

            if metrics.comments is not None:
                analytics['total_comments'] += metrics.comments

            if metrics.shares is not None:
                analytics['total_shares'] += metrics.shares

            if metrics.saves is not None:
                analytics['total_saves'] += metrics.saves

            if metrics.total_engagement is not None:
                analytics['total_engagement'] += metrics.total_engagement

            if metrics.engagement_rate is not None and metrics.engagement_rate > 0:
                engagement_rate_sum += metrics.engagement_rate
                engagement_rate_count += 1

            # Add individual post data
            analytics['posts'].append({
                'deliverable_id': metrics.deliverable_id,
                'deliverable_type': metrics.deliverable_type,
                'platform': metrics.post_platform,
                'post_url': metrics.post_url,
                'reach': metrics.reach,
                'likes': metrics.likes,
                'comments': metrics.comments,
                'shares': metrics.shares,
                'saves': metrics.saves,
                'total_engagement': metrics.total_engagement,
                'engagement_rate': metrics.engagement_rate,
                'published_at': metrics.published_at.isoformat() if metrics.published_at else None,
                'last_synced_at': metrics.last_synced_at.isoformat() if metrics.last_synced_at else None
            })

        # Calculate average engagement rate (only from platforms that provide it)
        if engagement_rate_count > 0:
            analytics['avg_engagement_rate'] = round(engagement_rate_sum / engagement_rate_count, 2)
        else:
            analytics['avg_engagement_rate'] = 0

        # Add metadata about metric availability
        analytics['metrics_availability'] = {
            'reach_available': reach_count > 0,
            'reach_post_count': reach_count,
            'engagement_rate_available': engagement_rate_count > 0,
            'engagement_rate_post_count': engagement_rate_count
        }

        return {
            'success': True,
            'analytics': analytics
        }

    @staticmethod
    def get_creator_analytics(creator_id: int) -> Dict:
        """
        Get aggregated analytics for all of a creator's posts across all collaborations
        Only aggregates non-null metrics (platform-specific availability)
        Groups data by platform for comparison

        Args:
            creator_id: Creator profile ID

        Returns:
            {
                'success': bool,
                'has_platforms': bool,
                'platforms': [
                    {
                        'platform': str,
                        'account_name': str,
                        'total_posts': int,
                        'followers': int,
                        'metrics': {
                            'avg_engagement_rate': float,
                            'avg_likes': int,
                            'avg_comments': int,
                            'avg_reach': int,
                            'avg_views': int,
                            'avg_shares': int,
                            'avg_saves': int,
                            'avg_sentiment_score': float
                        },
                        'last_synced': str
                    }
                ],
                'last_updated': str
            }
        """
        from app.models import Collaboration, ConnectedPlatform
        from sqlalchemy import func

        try:
            # Get creator profile
            creator = CreatorProfile.query.get(creator_id)
            if not creator:
                return {
                    'success': False,
                    'has_platforms': False,
                    'platforms': [],
                    'error': 'Creator not found'
                }

            # Get all post metrics for this creator
            all_metrics = PostMetrics.query.filter_by(creator_id=creator_id).all()

            if not all_metrics:
                return {
                    'success': True,
                    'has_platforms': False,
                    'platforms': [],
                    'verified_by': 'ThunziAI',
                    'last_updated': datetime.utcnow().isoformat()
                }

            # Get connected platforms for account names and followers
            connected_platforms = ConnectedPlatform.query.filter_by(
                user_id=creator.user_id,
                is_connected=True
            ).all()

            platform_map = {}
            for cp in connected_platforms:
                key = cp.platform
                if key not in platform_map or (cp.thunzi_platform_id and not platform_map[key].get('thunzi_platform_id')):
                    platform_map[key] = {
                        'account_name': cp.account_name or 'Unknown',
                        'followers': cp.follower_count or 0,
                        'thunzi_platform_id': cp.thunzi_platform_id
                    }

            # Group metrics by platform
            platform_analytics = {}

            for metrics in all_metrics:
                platform = metrics.post_platform
                if platform not in platform_analytics:
                    platform_analytics[platform] = {
                        'posts': [],
                        'last_synced': None
                    }

                platform_analytics[platform]['posts'].append(metrics)

                # Track latest sync time
                if metrics.last_synced_at:
                    if (not platform_analytics[platform]['last_synced'] or
                        metrics.last_synced_at > platform_analytics[platform]['last_synced']):
                        platform_analytics[platform]['last_synced'] = metrics.last_synced_at

            # Calculate aggregated metrics per platform
            platforms = []

            for platform, data in platform_analytics.items():
                posts = data['posts']
                total_posts = len(posts)

                # Get platform info
                platform_info = platform_map.get(platform, {
                    'account_name': 'Unknown',
                    'followers': 0
                })

                # Calculate averages (conditional based on availability)
                # Only count non-null values for each metric

                # Engagement Rate (TikTok✅, Facebook✅, Instagram✅, YouTube❌)
                engagement_rates = [p.engagement_rate for p in posts if p.engagement_rate is not None and p.engagement_rate > 0]
                avg_engagement_rate = round(sum(engagement_rates) / len(engagement_rates), 2) if engagement_rates else 0

                # Likes (all platforms✅)
                likes = [p.likes for p in posts if p.likes is not None]
                avg_likes = round(sum(likes) / len(likes)) if likes else 0

                # Comments (all platforms✅)
                comments = [p.comments for p in posts if p.comments is not None]
                avg_comments = round(sum(comments) / len(comments)) if comments else 0

                # Reach (YouTube✅, Facebook✅, Instagram✅, TikTok❌)
                reaches = [p.reach for p in posts if p.reach is not None]
                avg_reach = round(sum(reaches) / len(reaches)) if reaches else 0

                # Views (all video platforms)
                views = [p.video_views for p in posts if p.video_views is not None]
                avg_views = round(sum(views) / len(views)) if views else 0

                # Shares (all platforms✅)
                shares = [p.shares for p in posts if p.shares is not None]
                avg_shares = round(sum(shares) / len(shares)) if shares else 0

                # Saves (YouTube✅, Instagram✅, TikTok❌, Facebook❌)
                saves = [p.saves for p in posts if p.saves is not None]
                avg_saves = round(sum(saves) / len(saves)) if saves else 0

                # Sentiment Score (YouTube✅ only)
                sentiment_scores = [p.sentiment_score for p in posts if p.sentiment_score is not None]
                avg_sentiment_score = round(sum(sentiment_scores) / len(sentiment_scores), 2) if sentiment_scores else 0

                platforms.append({
                    'platform': platform,
                    'account_name': platform_info['account_name'],
                    'followers': platform_info['followers'],
                    'total_posts': total_posts,
                    'metrics': {
                        'avg_engagement_rate': avg_engagement_rate,
                        'avg_likes': avg_likes,
                        'avg_comments': avg_comments,
                        'avg_reach': avg_reach,
                        'avg_views': avg_views,
                        'avg_shares': avg_shares,
                        'avg_saves': avg_saves,
                        'avg_sentiment_score': avg_sentiment_score
                    },
                    'last_synced': data['last_synced'].isoformat() if data['last_synced'] else None
                })

            # Sort platforms by followers (descending)
            platforms.sort(key=lambda x: x['followers'], reverse=True)

            return {
                'success': True,
                'has_platforms': len(platforms) > 0,
                'platforms': platforms,
                'verified_by': 'ThunziAI',
                'last_updated': datetime.utcnow().isoformat()
            }

        except Exception as e:
            from flask import current_app
            current_app.logger.error(
                f"Error getting creator analytics for creator {creator_id}: {str(e)}\n"
                f"{traceback.format_exc()}"
            )
            return {
                'success': False,
                'has_platforms': False,
                'platforms': [],
                'error': str(e)
            }


# Singleton instance
post_metrics_service = PostMetricsService()
