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
    ConnectedPlatform,
    User,
    CreatorProfile
)
from app.services.thunzi_service import thunzi_service
from datetime import datetime, timedelta
from typing import Optional, Dict, Union
import traceback


class PostMetricsService:
    """Service for syncing post metrics from ThunziAI"""

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

            # Use ThunziAI creator posts API with date range
            # Get posts from past 90 days
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=90)

            current_app.logger.info(
                f"Fetching posts for ThunziAI creator {thunzi_account.bantubuzz_id} "
                f"from {start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}"
            )

            thunzi_posts = thunzi_service.get_creator_posts_by_bantubuzz_id(
                thunzi_account.bantubuzz_id,
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

            # Find matching post by originalId and platform
            matching_post = None
            connected_platform = None

            current_app.logger.info(
                f"Searching {len(thunzi_posts)} posts for post_id={deliverable.post_id} "
                f"on platform={deliverable.post_platform}"
            )

            for post in thunzi_posts:
                # Match by originalId (format: "accountId_postId") and platform type
                # Extract post ID from the originalId field
                original_id = post.get('originalId', '')
                post_platform = post.get('platform', '').lower()

                # originalId is formatted as "accountId_postId", we need to extract the postId part
                if '_' in original_id:
                    extracted_post_id = original_id.split('_', 1)[1]  # Get everything after first underscore
                else:
                    extracted_post_id = original_id

                if (str(extracted_post_id) == str(deliverable.post_id) and
                    post_platform == deliverable.post_platform.lower()):
                    matching_post = post
                    # Find the connected platform for this post
                    for platform in connected_platforms:
                        connected_platform = platform
                        break

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
            original_post_id = matching_post.get('originalId')
            insights = thunzi_service.get_post_insights_by_original_id(original_post_id)

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
            post_data = insights.get('post', matching_post)
            sentiment_data = insights.get('commentSentiment', {})

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

            # Core metrics
            # Note: Thunzi's post API returns views:0 for Instagram/most posts
            # but reach has the actual view/impression count. Use reach for impressions
            # since that's the only field with real data
            metrics.reach = post_data.get('reach') or 0
            metrics.impressions = post_data.get('reach') or 0  # Use reach since views field is broken in Thunzi
            metrics.likes = post_data.get('likes') or 0
            metrics.comments = post_data.get('comments') or 0
            metrics.shares = post_data.get('shares') or 0
            metrics.saves = post_data.get('saves') or 0

            # Video metrics (if available)
            # For video posts, try videoViews first, then fall back to reach
            metrics.video_views = post_data.get('videoViews') or post_data.get('reach') or 0

            # Calculate engagement
            metrics.calculate_engagement()

            # Sentiment analysis
            metrics.sentiment = post_data.get('sentiment')
            metrics.sentiment_score = post_data.get('sentimentScore')
            # Handle ThunziAI's typo: they return "postive" instead of "positive"
            metrics.positive_comments = sentiment_data.get('positive', sentiment_data.get('postive', 0))
            metrics.negative_comments = sentiment_data.get('negative', 0)
            metrics.neutral_comments = sentiment_data.get('neutral', 0)
            metrics.critical_comments = sentiment_data.get('critical', 0)  # From ThunziAI insights

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

            # For milestone-based collaborations
            if collaboration.collaboration_type == 'campaign' and collaboration.milestones:
                for milestone in collaboration.milestones:
                    for deliverable in milestone.deliverables:
                        if deliverable.post_url_validated:
                            deliverables.append(('milestone', deliverable))

            # For package-based collaborations
            elif collaboration.collaboration_type == 'package':
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


# Singleton instance
post_metrics_service = PostMetricsService()
