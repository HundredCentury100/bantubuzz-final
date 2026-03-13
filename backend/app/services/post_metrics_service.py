"""
Post Metrics Service

Handles syncing post performance metrics from ThunziAI to BantuBuzz database.
Part of: Brand Analytics Implementation - Phase 2
"""

from app import db
from app.models import (
    MilestoneDeliverable,
    PostMetrics,
    ConnectedPlatform,
    User,
    CreatorProfile
)
from app.services.thunzi_service import thunzi_service
from datetime import datetime, timedelta
from typing import Optional, Dict
import traceback


class PostMetricsService:
    """Service for syncing post metrics from ThunziAI"""

    @staticmethod
    def sync_deliverable_metrics(deliverable_id: int) -> Dict:
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
            deliverable_id: Milestone deliverable ID

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
            # Get deliverable
            deliverable = MilestoneDeliverable.query.get(deliverable_id)

            if not deliverable:
                return {
                    'success': False,
                    'message': 'Deliverable not found',
                    'metrics': None,
                    'error': 'Deliverable not found'
                }

            # Check if post URL was submitted
            if not deliverable.post_url or not deliverable.post_url_validated:
                return {
                    'success': False,
                    'message': 'No validated post URL for this deliverable',
                    'metrics': None,
                    'error': 'Post URL not submitted or not validated'
                }

            # Get creator
            collaboration = deliverable.milestone.collaboration
            creator_id = collaboration.creator_id

            # Get creator's connected platform for this platform type
            connected_platform = ConnectedPlatform.query.filter_by(
                user_id=creator_id,
                platform=deliverable.post_platform,
                is_connected=True
            ).first()

            if not connected_platform:
                return {
                    'success': False,
                    'message': f'Creator has not connected their {deliverable.post_platform.title()} account',
                    'metrics': None,
                    'error': f'{deliverable.post_platform} not connected'
                }

            if not connected_platform.thunzi_platform_id:
                return {
                    'success': False,
                    'message': f'Platform not synced with ThunziAI',
                    'metrics': None,
                    'error': 'ThunziAI platform ID missing'
                }

            # Fetch posts from ThunziAI
            current_app.logger.info(
                f"Fetching posts from ThunziAI platform {connected_platform.thunzi_platform_id} "
                f"for deliverable {deliverable_id}"
            )

            thunzi_posts = thunzi_service.get_platform_posts(connected_platform.thunzi_platform_id)

            if not thunzi_posts:
                return {
                    'success': False,
                    'message': 'No posts found in ThunziAI for this platform',
                    'metrics': None,
                    'error': 'No posts synced in ThunziAI yet'
                }

            # Match post by post_id (native platform ID)
            matching_post = None
            for post in thunzi_posts:
                # ThunziAI returns postId field with the native platform post ID
                if str(post.get('postId', '')) == str(deliverable.post_id):
                    matching_post = post
                    break

            if not matching_post:
                current_app.logger.warning(
                    f"Post {deliverable.post_id} not found in ThunziAI for deliverable {deliverable_id}. "
                    f"Available posts: {[p.get('postId') for p in thunzi_posts[:5]]}"
                )
                return {
                    'success': False,
                    'message': 'Post not found in ThunziAI. It may not be synced yet.',
                    'metrics': None,
                    'error': 'Post not found in ThunziAI'
                }

            # Get detailed insights for the post
            thunzi_post_id = matching_post['id']
            insights = thunzi_service.get_post_insights(thunzi_post_id)

            if not insights:
                current_app.logger.warning(
                    f"Failed to fetch insights for ThunziAI post {thunzi_post_id}"
                )
                # Continue with basic metrics from post list
                insights = {'post': matching_post, 'commentSentiment': {}}

            # Get or create PostMetrics record
            metrics = PostMetrics.query.filter_by(deliverable_id=deliverable_id).first()

            if not metrics:
                metrics = PostMetrics(
                    collaboration_id=collaboration.id,
                    deliverable_id=deliverable_id,
                    creator_id=creator_id,
                    thunzi_platform_id=connected_platform.thunzi_platform_id,
                    post_url=deliverable.post_url,
                    post_platform=deliverable.post_platform,
                    post_id=deliverable.post_id
                )
                db.session.add(metrics)

            # Update metrics from ThunziAI data
            post_data = insights.get('post', matching_post)
            sentiment_data = insights.get('commentSentiment', {})

            # Update ThunziAI post ID
            metrics.thunzi_post_id = str(thunzi_post_id)

            # Post info
            metrics.post_title = post_data.get('title')
            metrics.post_description = post_data.get('description')

            # Parse published date
            if post_data.get('publishedAt'):
                try:
                    # Handle ISO format with Z suffix
                    published_str = post_data['publishedAt'].replace('Z', '+00:00')
                    metrics.published_at = datetime.fromisoformat(published_str)
                except:
                    pass

            # Core metrics
            metrics.reach = post_data.get('reach') or 0
            metrics.impressions = post_data.get('impressions') or 0
            metrics.likes = post_data.get('likes') or 0
            metrics.comments = post_data.get('comments') or 0
            metrics.shares = post_data.get('shares') or 0
            metrics.saves = post_data.get('saves') or 0

            # Video metrics (if available)
            metrics.video_views = post_data.get('videoViews') or post_data.get('views') or 0

            # Calculate engagement
            metrics.calculate_engagement()

            # Sentiment analysis
            metrics.sentiment = post_data.get('sentiment')
            metrics.sentiment_score = post_data.get('sentimentScore')
            metrics.positive_comments = sentiment_data.get('positive', 0)
            metrics.negative_comments = sentiment_data.get('negative', 0)
            metrics.neutral_comments = sentiment_data.get('neutral', 0)

            # Sync metadata
            metrics.last_synced_at = datetime.utcnow()
            metrics.sync_status = 'synced'
            metrics.sync_error = None
            metrics.updated_at = datetime.utcnow()

            db.session.commit()

            current_app.logger.info(
                f"Successfully synced metrics for deliverable {deliverable_id} - "
                f"Reach: {metrics.reach}, Engagement: {metrics.total_engagement}"
            )

            return {
                'success': True,
                'message': 'Metrics synced successfully',
                'metrics': metrics.to_dict(),
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
                metrics = PostMetrics.query.filter_by(deliverable_id=deliverable_id).first()
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
        from app.models import Collaboration

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
            if collaboration.milestones:
                for milestone in collaboration.milestones:
                    for deliverable in milestone.deliverables:
                        if deliverable.post_url_validated:
                            deliverables.append(deliverable)

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

            for deliverable in deliverables:
                result = PostMetricsService.sync_deliverable_metrics(deliverable.id)
                results.append({
                    'deliverable_id': deliverable.id,
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
    def get_deliverable_metrics(deliverable_id: int) -> Optional[Dict]:
        """
        Get cached metrics for a deliverable

        Args:
            deliverable_id: Deliverable ID

        Returns:
            Metrics dict or None if not found
        """
        metrics = PostMetrics.query.filter_by(deliverable_id=deliverable_id).first()

        if metrics:
            return metrics.to_dict()

        return None


# Singleton instance
post_metrics_service = PostMetricsService()
