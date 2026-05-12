"""
Campaign Analytics Service
Calculates campaign performance metrics and analytics
"""
from app import db
from app.models import Campaign, Collaboration, PostMetrics, CampaignProposal, CreatorProfile
from app.utils.campaign_helpers import get_campaign_collaborations
from sqlalchemy import func
from datetime import datetime, timedelta


class CampaignAnalyticsService:
    """Service for calculating campaign performance metrics"""

    @staticmethod
    def get_campaign_performance(campaign_id):
        """
        Get comprehensive performance analytics for a campaign

        Returns:
            dict: Performance metrics including overview, creator breakdown, platform stats
        """
        campaign = Campaign.query.get(campaign_id)
        if not campaign:
            return None

        # Get all collaborations using helper (handles multi-hop relationship)
        collaborations = get_campaign_collaborations(campaign_id, status='active')

        # Also include pending and completed collaborations for full picture
        all_collaborations = get_campaign_collaborations(campaign_id)

        if not all_collaborations:
            return {
                'overview': CampaignAnalyticsService._get_empty_overview(),
                'creators': [],
                'platforms': {},
                'timeline': [],
                'campaign_info': {
                    'title': campaign.title,
                    'budget': float(campaign.budget) if campaign.budget else 0,
                    'start_date': campaign.start_date.isoformat() if campaign.start_date else None,
                    'end_date': campaign.end_date.isoformat() if campaign.end_date else None,
                    'status': campaign.status
                }
            }

        # Calculate metrics
        overview = CampaignAnalyticsService._calculate_overview(campaign, all_collaborations)
        creators = CampaignAnalyticsService._calculate_creator_performance(all_collaborations)
        platforms = CampaignAnalyticsService._calculate_platform_breakdown(all_collaborations)
        timeline = CampaignAnalyticsService._calculate_timeline(all_collaborations)

        return {
            'overview': overview,
            'creators': creators,
            'platforms': platforms,
            'timeline': timeline,
            'campaign_info': {
                'title': campaign.title,
                'budget': float(campaign.budget) if campaign.budget else 0,
                'start_date': campaign.start_date.isoformat() if campaign.start_date else None,
                'end_date': campaign.end_date.isoformat() if campaign.end_date else None,
                'status': campaign.status
            }
        }

    @staticmethod
    def _calculate_overview(campaign, collaborations):
        """Calculate campaign overview metrics"""
        total_spend = 0
        total_creators = len(collaborations)

        # Aggregate metrics from all creators
        total_reach = 0
        total_impressions = 0
        total_engagements = 0
        total_views = 0
        total_likes = 0
        total_comments = 0
        total_shares = 0

        for collab in collaborations:
            # Get creator profile from collaboration
            creator = CreatorProfile.query.get(collab.creator_id)
            if not creator:
                continue

            # Calculate spend from agreed_amount
            total_spend += float(collab.agreed_amount) if collab.agreed_amount else 0

            # Use creator's audience metrics
            total_reach += creator.follower_count or 0

            # Get post metrics for this collaboration
            # Note: PostMetrics may need to be linked differently
            # For now, use creator_id to get their posts
            post_metrics = PostMetrics.query.filter_by(
                creator_id=creator.id
            ).all()

            for metric in post_metrics:
                total_impressions += metric.impressions or 0
                total_views += metric.views or 0
                total_likes += metric.likes or 0
                total_comments += metric.comments or 0
                total_shares += metric.shares or 0

        total_engagements = total_likes + total_comments + total_shares

        # Calculate rates
        engagement_rate = (total_engagements / total_reach * 100) if total_reach > 0 else 0
        cpe = (total_spend / total_engagements) if total_engagements > 0 else 0  # Cost per engagement

        # Estimated ROI (simplified calculation)
        # Assuming each engagement is worth R0.10 (ZAR)
        estimated_value = total_engagements * 0.10
        roi_percentage = ((estimated_value - total_spend) / total_spend * 100) if total_spend > 0 else 0

        # Calculate budget utilization
        budget_utilization = (total_spend / float(campaign.budget) * 100) if campaign.budget and float(campaign.budget) > 0 else 0

        return {
            'total_spend': round(total_spend, 2),
            'total_creators': total_creators,
            'total_reach': total_reach,
            'total_impressions': total_impressions,
            'total_views': total_views,
            'total_engagements': total_engagements,
            'total_likes': total_likes,
            'total_comments': total_comments,
            'total_shares': total_shares,
            'engagement_rate': round(engagement_rate, 2),
            'cost_per_engagement': round(cpe, 2),
            'estimated_roi': round(roi_percentage, 2),
            'avg_cost_per_creator': round(total_spend / total_creators, 2) if total_creators > 0 else 0,
            'budget_utilization': round(budget_utilization, 2),
            'budget_remaining': round(float(campaign.budget) - total_spend, 2) if campaign.budget else 0
        }

    @staticmethod
    def _calculate_creator_performance(collaborations):
        """Calculate individual creator performance"""
        creators_data = []

        for collab in collaborations:
            # Get creator profile
            creator = CreatorProfile.query.get(collab.creator_id)
            if not creator:
                continue

            # Get campaign proposal to find package details
            proposal = CampaignProposal.query.get(collab.campaign_application_id)
            package = proposal.package if proposal and proposal.package else None

            # Get post metrics
            post_metrics = PostMetrics.query.filter_by(
                creator_id=creator.id
            ).all()

            reach = creator.follower_count or 0
            impressions = sum(m.impressions or 0 for m in post_metrics)
            views = sum(m.views or 0 for m in post_metrics)
            likes = sum(m.likes or 0 for m in post_metrics)
            comments = sum(m.comments or 0 for m in post_metrics)
            shares = sum(m.shares or 0 for m in post_metrics)
            engagements = likes + comments + shares

            engagement_rate = (engagements / reach * 100) if reach > 0 else 0
            cost = float(collab.agreed_amount) if collab.agreed_amount else 0
            cpe = (cost / engagements) if engagements > 0 else 0

            creators_data.append({
                'creator_id': creator.id,
                'creator_name': creator.display_name,
                'creator_picture': creator.profile_picture,
                'platform': package.platform_type if package else 'Unknown',
                'reach': reach,
                'impressions': impressions,
                'views': views,
                'engagements': engagements,
                'likes': likes,
                'comments': comments,
                'shares': shares,
                'engagement_rate': round(engagement_rate, 2),
                'cost': cost,
                'cost_per_engagement': round(cpe, 2),
                'posts_count': len(post_metrics),
                'status': collab.status
            })

        # Sort by engagements (descending)
        creators_data.sort(key=lambda x: x['engagements'], reverse=True)

        return creators_data

    @staticmethod
    def _calculate_platform_breakdown(collaborations):
        """Calculate performance breakdown by platform"""
        platforms = {}

        for collab in collaborations:
            # Get creator profile
            creator = CreatorProfile.query.get(collab.creator_id)
            if not creator:
                continue

            # Get campaign proposal to find package details
            proposal = CampaignProposal.query.get(collab.campaign_application_id)
            package = proposal.package if proposal and proposal.package else None
            platform = package.platform_type if package else 'Unknown'

            if platform not in platforms:
                platforms[platform] = {
                    'platform': platform,
                    'creators_count': 0,
                    'total_spend': 0,
                    'total_reach': 0,
                    'total_engagements': 0,
                    'total_views': 0
                }

            post_metrics = PostMetrics.query.filter_by(
                creator_id=creator.id
            ).all()

            platforms[platform]['creators_count'] += 1
            platforms[platform]['total_spend'] += float(collab.agreed_amount) if collab.agreed_amount else 0
            platforms[platform]['total_reach'] += creator.follower_count or 0
            platforms[platform]['total_views'] += sum(m.views or 0 for m in post_metrics)

            engagements = sum(
                (m.likes or 0) + (m.comments or 0) + (m.shares or 0)
                for m in post_metrics
            )
            platforms[platform]['total_engagements'] += engagements

        # Calculate engagement rates and cost per engagement
        for platform_data in platforms.values():
            if platform_data['total_reach'] > 0:
                platform_data['engagement_rate'] = round(
                    platform_data['total_engagements'] / platform_data['total_reach'] * 100,
                    2
                )
            else:
                platform_data['engagement_rate'] = 0

            if platform_data['total_engagements'] > 0:
                platform_data['cost_per_engagement'] = round(
                    platform_data['total_spend'] / platform_data['total_engagements'],
                    2
                )
            else:
                platform_data['cost_per_engagement'] = 0

        return platforms

    @staticmethod
    def _calculate_timeline(collaborations):
        """Calculate performance timeline (daily metrics)"""
        # Get date range
        if not collaborations:
            return []

        # Get earliest collaboration start date
        start_date = min(c.created_at for c in collaborations).date()
        end_date = datetime.utcnow().date()

        timeline = []
        current_date = start_date

        # Limit days to prevent excessive computation
        max_days = 30
        days_calculated = 0

        # Calculate from most recent backwards
        current_date = end_date

        while current_date >= start_date and days_calculated < max_days:
            # Get metrics for this date
            day_metrics = {
                'date': current_date.isoformat(),
                'reach': 0,
                'engagements': 0,
                'views': 0,
                'collaborations_active': 0
            }

            for collab in collaborations:
                # Check if collaboration was active on this date
                if collab.created_at.date() <= current_date:
                    day_metrics['collaborations_active'] += 1

                    # Get creator profile
                    creator = CreatorProfile.query.get(collab.creator_id)
                    if creator:
                        # Get post metrics for this date
                        post_metrics = PostMetrics.query.filter(
                            PostMetrics.creator_id == creator.id,
                            func.date(PostMetrics.created_at) == current_date
                        ).all()

                        for metric in post_metrics:
                            day_metrics['views'] += metric.views or 0
                            day_metrics['engagements'] += (
                                (metric.likes or 0) +
                                (metric.comments or 0) +
                                (metric.shares or 0)
                            )

            timeline.insert(0, day_metrics)  # Insert at beginning to maintain chronological order
            current_date -= timedelta(days=1)
            days_calculated += 1

        return timeline

    @staticmethod
    def _get_empty_overview():
        """Return empty overview when no data"""
        return {
            'total_spend': 0,
            'total_creators': 0,
            'total_reach': 0,
            'total_impressions': 0,
            'total_views': 0,
            'total_engagements': 0,
            'total_likes': 0,
            'total_comments': 0,
            'total_shares': 0,
            'engagement_rate': 0,
            'cost_per_engagement': 0,
            'estimated_roi': 0,
            'avg_cost_per_creator': 0
        }


# Singleton instance
campaign_analytics_service = CampaignAnalyticsService()
