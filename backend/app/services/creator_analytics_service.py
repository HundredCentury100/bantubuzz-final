"""
Creator Platform Analytics Service
Fetches platform analytics data from ThunziAI API and calculates detailed metrics
"""
from typing import Dict, List, Optional
from datetime import datetime, timedelta
from flask import current_app
from statistics import mean

from app.models import ThunziAccount
from app.services.thunzi_service import thunzi_service
from app.utils.thunzi_metrics import normalize_engagement_rate_percent, normalize_sentiment_fraction


class CreatorAnalyticsService:
    """Service for fetching creator platform analytics from ThunziAI"""

    @staticmethod
    def get_creator_platform_analytics(creator_user_id: int) -> Dict:
        """
        Get analytics for all connected platforms for a creator from ThunziAI

        Uses the NEW ThunziAI endpoint (Mar 2026) that returns pre-calculated
        analytics averages including:
        - averageEngagementRate
        - averageSentimentScore
        - averageViews, averageReach, averageComments
        - averageLikes, averageShares, averageSaves

        Args:
            creator_user_id: The user_id of the creator

        Returns:
            Dictionary with platform analytics data from ThunziAI
        """
        try:
            # Get ThunziAI account for this creator
            thunzi_account = ThunziAccount.query.filter_by(user_id=creator_user_id).first()

            if not thunzi_account:
                return {
                    'success': True,
                    'has_platforms': False,
                    'platforms': [],
                    'verified_by': 'ThunziAI',
                    'last_updated': datetime.utcnow().isoformat()
                }

            # Ensure authenticated with ThunziAI (handles both verified and unverified accounts)
            # Uses ensure_user_registered which works for API key-registered users
            user_registered = thunzi_service.ensure_user_registered(
                email=thunzi_account.thunzi_email
            )

            if not user_registered:
                current_app.logger.error(
                    f"Failed to authenticate with ThunziAI for creator {creator_user_id}"
                )
                return {
                    'success': False,
                    'has_platforms': False,
                    'platforms': [],
                    'error': 'Failed to authenticate with ThunziAI'
                }

            # Get platforms from company (more reliable than creator-specific endpoint)
            # This returns all platforms under the creator's ThunziAI company
            # Note: We're NOT syncing here because it's too slow (takes 2+ minutes for 4 platforms)
            # ThunziAI syncs platforms on their own schedule
            # This is much more efficient than manually calculating from posts
            thunzi_platforms = thunzi_service.get_platforms(
                thunzi_account.thunzi_company_id
            )

            if not thunzi_platforms:
                return {
                    'success': True,
                    'has_platforms': False,
                    'platforms': [],
                    'verified_by': 'ThunziAI',
                    'last_updated': datetime.utcnow().isoformat()
                }

            # Format platforms with pre-calculated analytics from ThunziAI
            platform_analytics = []

            for thunzi_platform in thunzi_platforms:
                # Skip platforms that are not connected OR have been explicitly deleted/inactive
                # Note: We show platforms even if they haven't synced yet (posts may be null)
                is_connected = thunzi_platform.get('isConnected')

                # Only skip if explicitly false (not None, which means pending sync)
                if is_connected is False:
                    # But if it has data (followers or posts), still include it
                    has_followers = thunzi_platform.get('followers') and thunzi_platform.get('followers') > 0
                    has_posts = thunzi_platform.get('posts') and thunzi_platform.get('posts') > 0

                    if not (has_followers or has_posts):
                        continue

                # Format platform analytics with pre-calculated averages
                analytics = CreatorAnalyticsService._format_platform_analytics(
                    thunzi_platform
                )

                if analytics:
                    platform_analytics.append(analytics)

            return {
                'success': True,
                'has_platforms': len(platform_analytics) > 0,
                'platforms': platform_analytics,
                'verified_by': 'ThunziAI',
                'last_updated': datetime.utcnow().isoformat()
            }

        except Exception as e:
            current_app.logger.error(
                f"Error getting creator platform analytics: {str(e)}"
            )
            return {
                'success': False,
                'has_platforms': False,
                'platforms': [],
                'error': str(e)
            }

    @staticmethod
    def _format_platform_analytics(thunzi_platform: Dict) -> Optional[Dict]:
        """
        Format platform analytics from ThunziAI's pre-calculated data (NEW - Mar 2026)

        ThunziAI now provides pre-calculated averages, so we don't need to manually
        calculate from individual posts. This is much more efficient and accurate.

        Args:
            thunzi_platform: Platform data from ThunziAI API with pre-calculated averages

        Returns:
            Formatted analytics dictionary or None if invalid
        """
        try:
            platform_name = thunzi_platform.get('platform', '').lower()
            account_name = thunzi_platform.get('accountName', '')
            followers = thunzi_platform.get('followers', 0)
            posts = thunzi_platform.get('posts', 0)

            # Extract pre-calculated averages from ThunziAI (NEW fields)
            avg_engagement_rate = thunzi_platform.get('averageEngagementRate', 0)
            avg_sentiment_score = thunzi_platform.get('averageSentimentScore', 0)
            avg_engagement_rate = normalize_engagement_rate_percent(avg_engagement_rate) or 0
            avg_sentiment_score = normalize_sentiment_fraction(avg_sentiment_score) or 0
            avg_views = thunzi_platform.get('averageViews', 0)
            avg_reach = thunzi_platform.get('averageReach', 0)
            avg_comments = thunzi_platform.get('averageComments', 0)
            avg_likes = thunzi_platform.get('averageLikes', 0)
            avg_shares = thunzi_platform.get('averageShares', 0)
            avg_saves = thunzi_platform.get('averageSaves', 0)

            # Base analytics structure
            analytics = {
                'platform': platform_name,
                'account_name': account_name,
                'account_id': thunzi_platform.get('accountId'),
                'profile_url': thunzi_platform.get('profileUrl'),
                'followers': followers,
                'total_posts': posts,
                'last_synced': thunzi_platform.get('lastSyncedAt'),
                'has_data': posts > 0
            }

            # Format platform-specific metrics using pre-calculated averages
            if platform_name == 'youtube':
                analytics['metrics'] = {
                    'subscribers': followers,
                    'total_posts': posts,
                    'avg_engagement_rate': round(float(avg_engagement_rate or 0), 2),
                    'avg_sentiment_score': round(float(avg_sentiment_score or 0), 2),
                    'avg_views': int(avg_views or 0),
                    'avg_comments': int(avg_comments or 0),
                    'avg_likes': int(avg_likes or 0),
                    'avg_shares': int(avg_shares or 0)
                }
            elif platform_name == 'facebook':
                analytics['metrics'] = {
                    'followers': followers,
                    'total_posts': posts,
                    'avg_engagement_rate': round(float(avg_engagement_rate or 0), 2),
                    'avg_sentiment_score': round(float(avg_sentiment_score or 0), 2),
                    'avg_views': int(avg_views or 0),
                    'avg_reach': int(avg_reach or 0),
                    'avg_comments': int(avg_comments or 0),
                    'avg_likes': int(avg_likes or 0),
                    'avg_shares': int(avg_shares or 0)
                }
            elif platform_name == 'instagram':
                analytics['metrics'] = {
                    'followers': followers,
                    'total_posts': posts,
                    'avg_engagement_rate': round(float(avg_engagement_rate or 0), 2),
                    'avg_sentiment_score': round(float(avg_sentiment_score or 0), 2),
                    'avg_views': int(avg_views or 0),
                    'avg_reach': int(avg_reach or 0),
                    'avg_comments': int(avg_comments or 0),
                    'avg_likes': int(avg_likes or 0),
                    'avg_shares': int(avg_shares or 0),
                    'avg_saves': int(avg_saves or 0)
                }
            elif platform_name == 'tiktok':
                analytics['metrics'] = {
                    'followers': followers,
                    'total_posts': posts,
                    'avg_engagement_rate': round(float(avg_engagement_rate or 0), 2),
                    'avg_sentiment_score': round(float(avg_sentiment_score or 0), 2),
                    'avg_views': int(avg_views or 0),
                    'avg_comments': int(avg_comments or 0),
                    'avg_likes': int(avg_likes or 0),
                    'avg_shares': int(avg_shares or 0),
                    'avg_saves': int(avg_saves or 0)
                }
            else:
                # Generic platform metrics
                analytics['metrics'] = {
                    'followers': followers,
                    'total_posts': posts,
                    'avg_engagement_rate': round(float(avg_engagement_rate or 0), 2),
                    'avg_sentiment_score': round(float(avg_sentiment_score or 0), 2),
                    'avg_views': int(avg_views or 0),
                    'avg_reach': int(avg_reach or 0),
                    'avg_comments': int(avg_comments or 0),
                    'avg_likes': int(avg_likes or 0),
                    'avg_shares': int(avg_shares or 0),
                    'avg_saves': int(avg_saves or 0)
                }

            return analytics

        except Exception as e:
            current_app.logger.error(
                f"Error formatting platform analytics: {str(e)}"
            )
            return None
