"""
Brand Analytics Service

Provides comprehensive analytics for brand campaigns including:
- Raw performance data
- Actionable insights
- Sentiment analysis
- ROI calculations
"""

from app import db
from app.models import (
    Collaboration, PostMetrics, User, CreatorProfile,
    BrandProfile, PackageDeliverable
)
from sqlalchemy import func, desc
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from flask import current_app


class AnalyticsService:
    """Service for calculating brand analytics"""

    @staticmethod
    def get_collaboration_analytics(collaboration_id: int, brand_id: int) -> Optional[Dict]:
        """
        Get comprehensive analytics for a single collaboration/campaign

        Args:
            collaboration_id: ID of the collaboration
            brand_id: ID of the brand (for authorization)

        Returns:
            Dict with comprehensive analytics or None if not found
        """
        try:
            # Get collaboration and verify ownership
            collaboration = Collaboration.query.get(collaboration_id)
            if not collaboration:
                return None

            # Verify brand owns this collaboration
            brand_profile = BrandProfile.query.filter_by(user_id=brand_id).first()
            if not brand_profile or collaboration.brand_id != brand_profile.id:
                return None

            # Get all deliverables with metrics
            deliverables = PackageDeliverable.query.filter_by(
                collaboration_id=collaboration_id
            ).all()

            # Get all post metrics for this collaboration
            metrics_records = PostMetrics.query.filter_by(
                collaboration_id=collaboration_id,
                deliverable_type='package'
            ).all()

            # Calculate raw performance data
            raw_data = AnalyticsService._calculate_raw_data(metrics_records)

            # Calculate actionable insights
            insights = AnalyticsService._calculate_insights(
                collaboration, metrics_records, raw_data
            )

            # Get sentiment analysis
            sentiment = AnalyticsService._calculate_sentiment(metrics_records)

            # Get mentions (from post titles/descriptions)
            mentions = AnalyticsService._extract_mentions(metrics_records)

            # Get creator info
            creator = User.query.get(collaboration.creator_id)
            creator_profile = CreatorProfile.query.filter_by(user_id=collaboration.creator_id).first()

            # Get deliverable details
            deliverable_details = []
            for deliverable in deliverables:
                metrics = next(
                    (m for m in metrics_records if m.deliverable_id == deliverable.id),
                    None
                )
                deliverable_details.append({
                    'id': deliverable.id,
                    'title': deliverable.title,
                    'platform': deliverable.post_platform,
                    'url': deliverable.url,
                    'status': deliverable.status,
                    'submitted_at': deliverable.submitted_at.isoformat() if deliverable.submitted_at else None,
                    'has_metrics': metrics is not None,
                    'metrics': metrics.to_dict() if metrics else None
                })

            return {
                'collaboration': {
                    'id': collaboration.id,
                    'status': collaboration.status,
                    'created_at': collaboration.created_at.isoformat(),
                    'package_price': float(collaboration.package_price) if collaboration.package_price else 0,
                },
                'creator': {
                    'id': creator.id,
                    'display_name': creator_profile.display_name if creator_profile else creator.email,
                    'username': creator_profile.username if creator_profile else None,
                    'profile_picture': creator_profile.profile_picture if creator_profile else None,
                },
                'deliverables': deliverable_details,
                'raw_data': raw_data,
                'insights': insights,
                'sentiment': sentiment,
                'mentions': mentions,
                'last_updated': datetime.utcnow().isoformat()
            }

        except Exception as e:
            current_app.logger.error(
                f"Error calculating collaboration analytics: {str(e)}"
            )
            return None

    @staticmethod
    def _calculate_raw_data(metrics_records: List[PostMetrics]) -> Dict:
        """Calculate raw performance data from metrics records"""
        if not metrics_records:
            return {
                'total_posts': 0,
                'reach': 0,
                'impressions': 0,
                'likes': 0,
                'comments': 0,
                'shares': 0,
                'saves': 0,
                'video_views': 0,
                'total_engagement': 0,
                'avg_engagement_rate': 0,
                'platforms': []
            }

        total_reach = sum(m.reach or 0 for m in metrics_records)
        total_impressions = sum(m.impressions or 0 for m in metrics_records)
        total_likes = sum(m.likes or 0 for m in metrics_records)
        total_comments = sum(m.comments or 0 for m in metrics_records)
        total_shares = sum(m.shares or 0 for m in metrics_records)
        total_saves = sum(m.saves or 0 for m in metrics_records)
        total_video_views = sum(m.video_views or 0 for m in metrics_records)
        total_engagement = sum(m.total_engagement or 0 for m in metrics_records)

        # Calculate average engagement rate
        engagement_rates = [m.engagement_rate for m in metrics_records if m.engagement_rate]
        avg_engagement_rate = (
            sum(engagement_rates) / len(engagement_rates)
            if engagement_rates else 0
        )

        # Get unique platforms
        platforms = list(set(m.post_platform for m in metrics_records if m.post_platform))

        return {
            'total_posts': len(metrics_records),
            'reach': total_reach,
            'impressions': total_impressions,
            'likes': total_likes,
            'comments': total_comments,
            'shares': total_shares,
            'saves': total_saves,
            'video_views': total_video_views,
            'total_engagement': total_engagement,
            'avg_engagement_rate': round(avg_engagement_rate, 2),
            'platforms': platforms
        }

    @staticmethod
    def _calculate_insights(
        collaboration: Collaboration,
        metrics_records: List[PostMetrics],
        raw_data: Dict
    ) -> Dict:
        """Calculate actionable insights from the data"""
        insights = {}

        # Cost per engagement
        package_price = float(collaboration.package_price) if collaboration.package_price else 0
        total_engagement = raw_data['total_engagement']

        if total_engagement > 0:
            insights['cost_per_engagement'] = round(package_price / total_engagement, 2)
        else:
            insights['cost_per_engagement'] = 0

        # Cost per reach
        total_reach = raw_data['reach']
        if total_reach > 0:
            insights['cost_per_reach'] = round(package_price / total_reach, 4)
        else:
            insights['cost_per_reach'] = 0

        # ROI calculation (simplified - engagement value vs cost)
        # Assuming $0.10 per engagement as industry standard
        engagement_value = total_engagement * 0.10
        if package_price > 0:
            roi_percentage = ((engagement_value - package_price) / package_price) * 100
            insights['roi_percentage'] = round(roi_percentage, 2)
        else:
            insights['roi_percentage'] = 0

        # On-time delivery
        # Check if deliverables were submitted on time
        # For now, just track completion
        insights['on_time_delivery'] = collaboration.status == 'completed'

        # Performance rating based on engagement rate
        avg_engagement_rate = raw_data['avg_engagement_rate']
        if avg_engagement_rate >= 5:
            insights['performance_rating'] = 'Excellent'
        elif avg_engagement_rate >= 3:
            insights['performance_rating'] = 'Good'
        elif avg_engagement_rate >= 1:
            insights['performance_rating'] = 'Average'
        else:
            insights['performance_rating'] = 'Below Average'

        return insights

    @staticmethod
    def _calculate_sentiment(metrics_records: List[PostMetrics]) -> Dict:
        """Calculate sentiment analysis from metrics records"""
        if not metrics_records:
            return {
                'overall': 'neutral',
                'positive': 0,
                'negative': 0,
                'neutral': 0,
                'critical': 0,
                'total_comments': 0,
                'sentiment_score': 0
            }

        total_positive = sum(m.positive_comments or 0 for m in metrics_records)
        total_negative = sum(m.negative_comments or 0 for m in metrics_records)
        total_neutral = sum(m.neutral_comments or 0 for m in metrics_records)
        total_critical = sum(m.critical_comments or 0 for m in metrics_records)
        total_comments = sum(m.comments or 0 for m in metrics_records)

        # Calculate overall sentiment
        if total_positive > total_negative:
            overall = 'positive'
        elif total_negative > total_positive:
            overall = 'negative'
        else:
            overall = 'neutral'

        # Calculate sentiment score (0-100)
        if total_comments > 0:
            sentiment_score = ((total_positive - total_negative) / total_comments) * 100
            sentiment_score = max(-100, min(100, sentiment_score))  # Clamp between -100 and 100
            sentiment_score = (sentiment_score + 100) / 2  # Convert to 0-100 scale
        else:
            sentiment_score = 50  # Neutral

        return {
            'overall': overall,
            'positive': total_positive,
            'negative': total_negative,
            'neutral': total_neutral,
            'critical': total_critical,
            'total_comments': total_comments,
            'sentiment_score': round(sentiment_score, 2)
        }

    @staticmethod
    def _extract_mentions(metrics_records: List[PostMetrics]) -> Dict:
        """Extract brand mentions from post content"""
        mentions = {
            'total': 0,
            'posts_with_mentions': 0,
            'platforms': {}
        }

        if not metrics_records:
            return mentions

        for metrics in metrics_records:
            # Simple mention detection in post title and description
            # In production, this would use more sophisticated NLP
            content = f"{metrics.post_title or ''} {metrics.post_description or ''}".lower()

            # Count as mention if content exists (simplified)
            if content.strip():
                mentions['total'] += 1
                mentions['posts_with_mentions'] += 1

                # Track by platform
                platform = metrics.post_platform
                if platform:
                    mentions['platforms'][platform] = mentions['platforms'].get(platform, 0) + 1

        return mentions

    @staticmethod
    def get_all_collaborations_summary(brand_id: int) -> Dict:
        """
        Get summary analytics across all collaborations for a brand

        Args:
            brand_id: ID of the brand

        Returns:
            Dict with aggregated analytics
        """
        try:
            # Get brand profile
            brand_profile = BrandProfile.query.filter_by(user_id=brand_id).first()
            if not brand_profile:
                return None

            # Get all collaborations for this brand
            collaborations = Collaboration.query.filter_by(
                brand_id=brand_profile.id
            ).all()

            if not collaborations:
                return {
                    'total_collaborations': 0,
                    'total_spend': 0,
                    'total_reach': 0,
                    'total_engagement': 0,
                    'avg_engagement_rate': 0,
                    'top_performing_collaborations': [],
                    'sentiment_overview': {
                        'overall': 'neutral',
                        'positive': 0,
                        'negative': 0,
                        'neutral': 0
                    }
                }

            # Get all metrics for these collaborations
            collaboration_ids = [c.id for c in collaborations]
            all_metrics = PostMetrics.query.filter(
                PostMetrics.collaboration_id.in_(collaboration_ids),
                PostMetrics.deliverable_type == 'package'
            ).all()

            # Calculate totals
            total_spend = sum(
                float(c.package_price) if c.package_price else 0
                for c in collaborations
            )
            total_reach = sum(m.reach or 0 for m in all_metrics)
            total_engagement = sum(m.total_engagement or 0 for m in all_metrics)

            # Calculate average engagement rate
            engagement_rates = [m.engagement_rate for m in all_metrics if m.engagement_rate]
            avg_engagement_rate = (
                sum(engagement_rates) / len(engagement_rates)
                if engagement_rates else 0
            )

            # Get top performing collaborations
            top_performing = sorted(
                [
                    {
                        'id': c.id,
                        'engagement': sum(
                            m.total_engagement or 0
                            for m in all_metrics
                            if m.collaboration_id == c.id
                        )
                    }
                    for c in collaborations
                ],
                key=lambda x: x['engagement'],
                reverse=True
            )[:5]

            # Overall sentiment
            total_positive = sum(m.positive_comments or 0 for m in all_metrics)
            total_negative = sum(m.negative_comments or 0 for m in all_metrics)
            total_neutral = sum(m.neutral_comments or 0 for m in all_metrics)

            if total_positive > total_negative:
                overall_sentiment = 'positive'
            elif total_negative > total_positive:
                overall_sentiment = 'negative'
            else:
                overall_sentiment = 'neutral'

            return {
                'total_collaborations': len(collaborations),
                'total_spend': round(total_spend, 2),
                'total_reach': total_reach,
                'total_engagement': total_engagement,
                'avg_engagement_rate': round(avg_engagement_rate, 2),
                'top_performing_collaborations': top_performing,
                'sentiment_overview': {
                    'overall': overall_sentiment,
                    'positive': total_positive,
                    'negative': total_negative,
                    'neutral': total_neutral
                }
            }

        except Exception as e:
            current_app.logger.error(
                f"Error calculating summary analytics: {str(e)}"
            )
            return None
