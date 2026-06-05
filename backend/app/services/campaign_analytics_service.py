"""
Campaign Analytics Service
Calculates campaign performance metrics and analytics
"""
from app import db
from app.models import Campaign, Collaboration, PostMetrics, CampaignProposal, CreatorProfile, CampaignCartItem
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

        all_collaborations = CampaignAnalyticsService._get_campaign_collaborations(campaign_id)

        if not all_collaborations:
            return {
                'overview': CampaignAnalyticsService._get_empty_overview(),
                'creators': [],
                'platforms': {},
                'by_creator': [],
                'by_platform': [],
                'by_creator_platform': [],
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
        creator_platforms = CampaignAnalyticsService._calculate_creator_platform_breakdown(all_collaborations)
        timeline = CampaignAnalyticsService._calculate_timeline(all_collaborations)

        return {
            'overview': overview,
            'creators': creators,
            'platforms': platforms,
            'by_creator': creators,
            'by_platform': list(platforms.values()),
            'by_creator_platform': creator_platforms,
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
        total_creators = len({collab.creator_id for collab in collaborations})

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

            total_spend += float(collab.amount or 0)

            post_metrics = PostMetrics.query.filter_by(collaboration_id=collab.id).all()

            for metric in post_metrics:
                total_reach += metric.reach or 0
                total_impressions += metric.impressions or 0
                total_views += (metric.video_views or 0) or (metric.impressions or 0)
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
        creators_data = {}
        rates_by_creator = {}

        for collab in collaborations:
            # Get creator profile
            creator = CreatorProfile.query.get(collab.creator_id)
            if not creator:
                continue

            cart_item = CampaignAnalyticsService._get_cart_item_for_collaboration(collab.id)

            # Get post metrics
            post_metrics = PostMetrics.query.filter_by(collaboration_id=collab.id).all()
            creator_key = creator.id
            if creator_key not in creators_data:
                creators_data[creator_key] = {
                    'creator_id': creator.id,
                    'creator_name': creator.display_name,
                    'creator_picture': creator.profile_picture,
                    'platform': 'Multiple platforms',
                    'platforms': set(),
                    'reach': 0,
                    'impressions': 0,
                    'views': 0,
                    'engagements': 0,
                    'likes': 0,
                    'comments': 0,
                    'shares': 0,
                    'engagement_rate': 0,
                    'cost': 0,
                    'cost_per_engagement': 0,
                    'posts_count': 0,
                    'status': collab.status,
                    'source_count': 0,
                    'source_types': set()
                }
                rates_by_creator[creator_key] = []

            row = creators_data[creator_key]
            row['reach'] += sum(m.reach or 0 for m in post_metrics)
            row['impressions'] += sum(m.impressions or 0 for m in post_metrics)
            row['views'] += sum((m.video_views or 0) or (m.impressions or 0) for m in post_metrics)
            row['likes'] += sum(m.likes or 0 for m in post_metrics)
            row['comments'] += sum(m.comments or 0 for m in post_metrics)
            row['shares'] += sum(m.shares or 0 for m in post_metrics)
            row['engagements'] += sum((m.likes or 0) + (m.comments or 0) + (m.shares or 0) for m in post_metrics)
            cost = float(collab.amount or 0)
            row['cost'] += cost
            row['posts_count'] += len(post_metrics)
            row['source_count'] += 1
            if cart_item:
                row['source_types'].add(cart_item.item_type)
            for metric in post_metrics:
                if metric.post_platform:
                    row['platforms'].add(metric.post_platform)
                if metric.engagement_rate is not None and metric.engagement_rate > 0:
                    rates_by_creator[creator_key].append(float(metric.engagement_rate))

        creator_rows = []
        for creator_id, row in creators_data.items():
            rates = rates_by_creator.get(creator_id, [])
            if rates:
                row['engagement_rate'] = round(sum(rates) / len(rates), 2)
            elif row['reach'] > 0:
                row['engagement_rate'] = round(row['engagements'] / row['reach'] * 100, 2)
            row['cost_per_engagement'] = round(row['cost'] / row['engagements'], 2) if row['engagements'] > 0 else 0
            platforms = sorted(row['platforms'])
            row['platforms'] = platforms
            row['platform'] = ', '.join(platforms) if platforms else CampaignAnalyticsService._platform_for_cart_item(
                CampaignAnalyticsService._get_cart_item_for_creator(collaborations, creator_id)
            )
            row['source_types'] = sorted(row['source_types'])
            creator_rows.append(row)

        # Sort by engagements (descending)
        creator_rows.sort(key=lambda x: x['engagements'], reverse=True)

        return creator_rows

    @staticmethod
    def _calculate_platform_breakdown(collaborations):
        """Calculate performance breakdown by platform"""
        platforms = {}

        for collab in collaborations:
            # Get creator profile
            creator = CreatorProfile.query.get(collab.creator_id)
            if not creator:
                continue

            post_metrics = PostMetrics.query.filter_by(collaboration_id=collab.id).all()
            metrics_by_platform = {}
            for metric in post_metrics:
                platform = (metric.post_platform or 'unknown').lower()
                metrics_by_platform.setdefault(platform, []).append(metric)

            if not metrics_by_platform:
                fallback_platform = CampaignAnalyticsService._platform_for_cart_item(
                    CampaignAnalyticsService._get_cart_item_for_collaboration(collab.id)
                )
                metrics_by_platform[fallback_platform] = []

            for platform, platform_metrics in metrics_by_platform.items():
                if platform not in platforms:
                    platforms[platform] = {
                        'platform': platform,
                        'creators': set(),
                        'creators_count': 0,
                        'total_spend': 0,
                        'total_reach': 0,
                        'total_impressions': 0,
                        'total_engagements': 0,
                        'total_views': 0,
                        'total_likes': 0,
                        'total_comments': 0,
                        'total_shares': 0,
                        'posts_count': 0,
                        '_engagement_rates': []
                    }

                platforms[platform]['creators'].add(creator.id)
                platforms[platform]['total_spend'] += float(collab.amount or 0)
                platforms[platform]['posts_count'] += len(platform_metrics)
                platforms[platform]['total_reach'] += sum(m.reach or 0 for m in platform_metrics)
                platforms[platform]['total_impressions'] += sum(m.impressions or 0 for m in platform_metrics)
                platforms[platform]['total_views'] += sum((m.video_views or 0) or (m.impressions or 0) for m in platform_metrics)
                platforms[platform]['total_likes'] += sum(m.likes or 0 for m in platform_metrics)
                platforms[platform]['total_comments'] += sum(m.comments or 0 for m in platform_metrics)
                platforms[platform]['total_shares'] += sum(m.shares or 0 for m in platform_metrics)
                platforms[platform]['total_engagements'] += sum(
                    (m.likes or 0) + (m.comments or 0) + (m.shares or 0)
                    for m in platform_metrics
                )
                platforms[platform]['_engagement_rates'].extend(
                    float(m.engagement_rate)
                    for m in platform_metrics
                    if m.engagement_rate is not None and m.engagement_rate > 0
                )

        # Calculate engagement rates and cost per engagement
        for platform_data in platforms.values():
            platform_data['creators_count'] = len(platform_data.pop('creators', []))
            rates = platform_data.pop('_engagement_rates', [])
            if rates:
                platform_data['engagement_rate'] = round(sum(rates) / len(rates), 2)
            elif platform_data['total_reach'] > 0:
                platform_data['engagement_rate'] = round(
                    platform_data['total_engagements'] / platform_data['total_reach'] * 100,
                    2
                )
            else:
                platform_data['engagement_rate'] = 0

            platform_data['cost_per_engagement'] = round(
                platform_data['total_spend'] / platform_data['total_engagements'],
                2
            ) if platform_data['total_engagements'] > 0 else 0

        return platforms

    @staticmethod
    def _calculate_creator_platform_breakdown(collaborations):
        """Calculate performance per creator per actual post platform."""
        rows = {}
        rates = {}

        for collab in collaborations:
            creator = CreatorProfile.query.get(collab.creator_id)
            if not creator:
                continue

            post_metrics = PostMetrics.query.filter_by(collaboration_id=collab.id).all()
            for metric in post_metrics:
                platform = (metric.post_platform or 'unknown').lower()
                key = (creator.id, platform)
                if key not in rows:
                    rows[key] = {
                        'creator_id': creator.id,
                        'creator_name': creator.display_name,
                        'creator_picture': creator.profile_picture,
                        'platform': platform,
                        'posts_count': 0,
                        'reach': 0,
                        'impressions': 0,
                        'views': 0,
                        'engagements': 0,
                        'likes': 0,
                        'comments': 0,
                        'shares': 0,
                        'engagement_rate': 0,
                        'collaboration_ids': set()
                    }
                    rates[key] = []

                row = rows[key]
                row['posts_count'] += 1
                row['reach'] += metric.reach or 0
                row['impressions'] += metric.impressions or 0
                row['views'] += (metric.video_views or 0) or (metric.impressions or 0)
                row['likes'] += metric.likes or 0
                row['comments'] += metric.comments or 0
                row['shares'] += metric.shares or 0
                row['engagements'] += (metric.likes or 0) + (metric.comments or 0) + (metric.shares or 0)
                row['collaboration_ids'].add(collab.id)
                if metric.engagement_rate is not None and metric.engagement_rate > 0:
                    rates[key].append(float(metric.engagement_rate))

        result = []
        for key, row in rows.items():
            row_rates = rates.get(key, [])
            if row_rates:
                row['engagement_rate'] = round(sum(row_rates) / len(row_rates), 2)
            elif row['reach'] > 0:
                row['engagement_rate'] = round(row['engagements'] / row['reach'] * 100, 2)
            row['collaboration_ids'] = sorted(row['collaboration_ids'])
            result.append(row)

        result.sort(key=lambda item: item['engagements'], reverse=True)
        return result

    @staticmethod
    def _legacy_calculate_platform_breakdown(collaborations):
        """Deprecated package-label platform breakdown kept for reference."""
        platforms = {}

        for collab in collaborations:
            creator = CreatorProfile.query.get(collab.creator_id)
            if not creator:
                continue

            cart_item = CampaignAnalyticsService._get_cart_item_for_collaboration(collab.id)
            platform = CampaignAnalyticsService._platform_for_cart_item(cart_item)

            if platform not in platforms:
                platforms[platform] = {
                    'platform': platform,
                    'creators_count': 0,
                    'total_spend': 0,
                    'total_reach': 0,
                    'total_engagements': 0,
                    'total_views': 0
                }

            post_metrics = PostMetrics.query.filter_by(collaboration_id=collab.id).all()

            platforms[platform]['creators_count'] += 1
            platforms[platform]['total_spend'] += float(collab.amount or 0)
            platforms[platform]['total_reach'] += creator.follower_count or 0
            platforms[platform]['total_views'] += sum((m.video_views or 0) or (m.impressions or 0) for m in post_metrics)

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
                        post_metrics = PostMetrics.query.filter(
                            PostMetrics.collaboration_id == collab.id,
                            func.date(PostMetrics.created_at) == current_date
                        ).all()

                        for metric in post_metrics:
                            day_metrics['views'] += (metric.video_views or 0) or (metric.impressions or 0)
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

    @staticmethod
    def _get_campaign_collaborations(campaign_id):
        cart_items = CampaignCartItem.query.filter(
            CampaignCartItem.campaign_id == campaign_id,
            CampaignCartItem.collaboration_id.isnot(None),
        ).all()
        collaboration_ids = [item.collaboration_id for item in cart_items]
        if not collaboration_ids:
            return []
        return Collaboration.query.filter(Collaboration.id.in_(collaboration_ids)).all()

    @staticmethod
    def _get_cart_item_for_collaboration(collaboration_id):
        return CampaignCartItem.query.filter_by(collaboration_id=collaboration_id).first()

    @staticmethod
    def _get_cart_item_for_creator(collaborations, creator_id):
        collaboration_ids = [
            collab.id for collab in collaborations
            if collab.creator_id == creator_id
        ]
        if not collaboration_ids:
            return None
        return CampaignCartItem.query.filter(
            CampaignCartItem.collaboration_id.in_(collaboration_ids)
        ).first()

    @staticmethod
    def _platform_for_cart_item(cart_item):
        if not cart_item:
            return 'Campaign'
        if cart_item.package:
            if cart_item.package.platform_type:
                return cart_item.package.platform_type
            platforms = cart_item.package.platforms or []
            return ', '.join(platforms) if platforms else 'Package'
        if cart_item.proposal:
            platforms = []
            for milestone in cart_item.proposal.milestones or []:
                for deliverable in milestone.get('deliverables') or []:
                    platform = deliverable.get('platform')
                    if platform and platform not in platforms:
                        platforms.append(platform)
            return ', '.join(platforms) if platforms else 'Proposal'
        return 'Campaign'


# Singleton instance
campaign_analytics_service = CampaignAnalyticsService()
