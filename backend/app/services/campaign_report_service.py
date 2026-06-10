"""Shared campaign reporting data used by PDF, CSV, email, and public links."""
import csv
from collections import Counter
from datetime import datetime, time, timedelta
from io import StringIO

from app.models import Campaign, CreatorProfile, PostMetrics, PostSentimentComment
from app.services.campaign_analytics_service import CampaignAnalyticsService


class CampaignReportService:
    @staticmethod
    def normalize_range(start_date=None, end_date=None, days=30):
        today = datetime.utcnow().date()
        if start_date and end_date:
            if start_date > end_date:
                raise ValueError('Start date must be before or equal to end date')
            if (end_date - start_date).days > 366:
                raise ValueError('Report date range cannot exceed 366 days')
            return start_date, end_date
        days = days if days in {7, 30, 90} else 30
        return today - timedelta(days=days - 1), today

    @staticmethod
    def build_payload(
        campaign_id,
        start_date=None,
        end_date=None,
        include_sentiment=False,
        days=30,
    ):
        campaign = Campaign.query.get(campaign_id)
        if not campaign:
            return None

        start_date, end_date = CampaignReportService.normalize_range(start_date, end_date, days)
        collaborations = CampaignAnalyticsService._get_campaign_collaborations(campaign_id)
        collaboration_ids = [item.id for item in collaborations]

        query = PostMetrics.query.filter(PostMetrics.collaboration_id.in_(collaboration_ids))
        start_at = datetime.combine(start_date, time.min)
        end_at = datetime.combine(end_date + timedelta(days=1), time.min)
        query = query.filter(
            (PostMetrics.published_at.isnot(None) & (PostMetrics.published_at >= start_at) & (PostMetrics.published_at < end_at))
            | (PostMetrics.published_at.is_(None) & (PostMetrics.created_at >= start_at) & (PostMetrics.created_at < end_at))
        )
        metrics = query.order_by(PostMetrics.published_at.asc(), PostMetrics.created_at.asc()).all()

        creators = {
            creator.id: creator
            for creator in CreatorProfile.query.filter(
                CreatorProfile.id.in_({collab.creator_id for collab in collaborations})
            ).all()
        } if collaborations else {}
        collaboration_map = {collab.id: collab for collab in collaborations}

        overview = {
            'total_spend': round(sum(float(collab.amount or 0) for collab in collaborations), 2),
            'total_creators': len({collab.creator_id for collab in collaborations}),
            'total_posts': len(metrics),
            'total_reach': sum(item.reach or 0 for item in metrics),
            'total_impressions': sum(item.impressions or 0 for item in metrics),
            'total_views': sum((item.video_views or 0) or (item.impressions or 0) for item in metrics),
            'total_likes': sum(item.likes or 0 for item in metrics),
            'total_comments': sum(item.comments or 0 for item in metrics),
            'total_shares': sum(item.shares or 0 for item in metrics),
            'total_saves': sum(item.saves or 0 for item in metrics),
            'total_clicks': sum(item.clicks or 0 for item in metrics),
            'total_conversions': sum(item.conversions or 0 for item in metrics),
        }
        overview['total_engagements'] = (
            overview['total_likes']
            + overview['total_comments']
            + overview['total_shares']
            + overview['total_saves']
        )
        overview['engagement_rate'] = round(
            overview['total_engagements'] / overview['total_reach'] * 100,
            2,
        ) if overview['total_reach'] else 0
        overview['cost_per_engagement'] = round(
            overview['total_spend'] / overview['total_engagements'],
            2,
        ) if overview['total_engagements'] else 0
        estimated_value = overview['total_engagements'] * 0.10
        overview['estimated_roi'] = round(
            (estimated_value - overview['total_spend']) / overview['total_spend'] * 100,
            2,
        ) if overview['total_spend'] else 0

        posts = []
        by_creator = {}
        by_platform = {}
        for item in metrics:
            collaboration = collaboration_map.get(item.collaboration_id)
            creator = creators.get(collaboration.creator_id) if collaboration else None
            creator_name = creator.display_name if creator else 'Creator'
            platform = (item.post_platform or 'unknown').lower()
            engagements = (
                (item.likes or 0)
                + (item.comments or 0)
                + (item.shares or 0)
                + (item.saves or 0)
            )
            row = {
                'post_metrics_id': item.id,
                'collaboration_id': item.collaboration_id,
                'creator_id': creator.id if creator else None,
                'creator_name': creator_name,
                'platform': platform,
                'post_url': item.post_url,
                'post_id': item.post_id,
                'published_at': item.published_at.isoformat() if item.published_at else None,
                'reach': item.reach or 0,
                'impressions': item.impressions or 0,
                'views': (item.video_views or 0) or (item.impressions or 0),
                'likes': item.likes or 0,
                'comments': item.comments or 0,
                'shares': item.shares or 0,
                'saves': item.saves or 0,
                'clicks': item.clicks or 0,
                'conversions': item.conversions or 0,
                'engagements': engagements,
                'engagement_rate': float(item.engagement_rate or 0),
                'sentiment': item.sentiment,
                'sentiment_score': float(item.sentiment_score or 0),
                'sync_status': item.sync_status,
                'last_synced_at': item.last_synced_at.isoformat() if item.last_synced_at else None,
            }
            posts.append(row)
            CampaignReportService._add_breakdown(by_creator, creator_name, row, 'creator_name')
            CampaignReportService._add_breakdown(by_platform, platform, row, 'platform')

        campaign_data = campaign.to_dict(include_milestones=True, include_brand=False)
        campaign_data['brand'] = {
            'company_name': campaign.brand.company_name if campaign.brand else None,
            'logo': campaign.brand.logo if campaign.brand else None,
        }
        return {
            'campaign': campaign_data,
            'date_range': {'start_date': start_date.isoformat(), 'end_date': end_date.isoformat()},
            'generated_at': datetime.utcnow().isoformat(),
            'last_synced_at': max(
                (item.last_synced_at for item in metrics if item.last_synced_at),
                default=None,
            ).isoformat() if any(item.last_synced_at for item in metrics) else None,
            'overview': overview,
            'by_creator': CampaignReportService._finish_breakdowns(by_creator),
            'by_platform': CampaignReportService._finish_breakdowns(by_platform),
            'posts': posts,
            'sentiment': CampaignReportService._sentiment_for_metrics(
                metrics,
                include_comments=include_sentiment,
            ),
        }

    @staticmethod
    def _add_breakdown(target, key, row, label_key):
        if key not in target:
            target[key] = {
                label_key: key,
                'posts_count': 0,
                'reach': 0,
                'impressions': 0,
                'views': 0,
                'engagements': 0,
                'likes': 0,
                'comments': 0,
                'shares': 0,
                'saves': 0,
                'clicks': 0,
                'conversions': 0,
            }
        result = target[key]
        result['posts_count'] += 1
        for field in (
            'reach', 'impressions', 'views', 'engagements', 'likes', 'comments',
            'shares', 'saves', 'clicks', 'conversions',
        ):
            result[field] += row[field]

    @staticmethod
    def _finish_breakdowns(rows):
        result = list(rows.values())
        for row in result:
            row['engagement_rate'] = round(
                row['engagements'] / row['reach'] * 100,
                2,
            ) if row['reach'] else 0
        result.sort(key=lambda item: item['engagements'], reverse=True)
        return result

    @staticmethod
    def _sentiment_for_metrics(metrics, include_comments=False):
        metric_ids = [item.id for item in metrics]
        comments = PostSentimentComment.query.filter(
            PostSentimentComment.post_metrics_id.in_(metric_ids)
        ).all() if metric_ids else []
        if comments:
            counts = Counter(item.sentiment or 'neutral' for item in comments)
            languages = Counter(item.language or 'unknown' for item in comments)
            positive_themes = Counter()
            negative_themes = Counter()
            for item in comments:
                if item.sentiment == 'positive':
                    positive_themes.update(item.themes or [])
                elif item.sentiment == 'negative':
                    negative_themes.update(item.themes or [])
        else:
            counts = Counter({
                'positive': sum(item.positive_comments or 0 for item in metrics),
                'neutral': sum(item.neutral_comments or 0 for item in metrics),
                'negative': sum(item.negative_comments or 0 for item in metrics),
            })
            languages = Counter()
            positive_themes = Counter()
            negative_themes = Counter()
        total = sum(counts.values())
        percentages = {
            key: round(counts.get(key, 0) / total * 100, 1) if total else 0
            for key in ('positive', 'neutral', 'negative')
        }
        result = {
            'overall': max(percentages, key=percentages.get) if total else 'neutral',
            'total_analyzed': total,
            'counts': {key: counts.get(key, 0) for key in ('positive', 'neutral', 'negative')},
            'percentages': percentages,
            'languages': dict(languages.most_common()),
            'drivers': {
                'positive': [
                    {'theme': theme, 'count': count}
                    for theme, count in positive_themes.most_common(5)
                ],
                'negative': [
                    {'theme': theme, 'count': count}
                    for theme, count in negative_themes.most_common(5)
                ],
            },
            'top_comments': [],
        }
        if include_comments:
            ranked = sorted(
                comments,
                key=lambda item: (item.likes or 0, abs(float(item.sentiment_score or 0))),
                reverse=True,
            )
            result['top_comments'] = [item.to_dict() for item in ranked[:20]]
        return result

    @staticmethod
    def csv_bytes(payload):
        output = StringIO()
        writer = csv.writer(output)
        campaign = payload['campaign']
        writer.writerow(['Campaign', campaign.get('title')])
        writer.writerow(['Report Start', payload['date_range']['start_date']])
        writer.writerow(['Report End', payload['date_range']['end_date']])
        writer.writerow(['Generated At', payload['generated_at']])
        writer.writerow([])
        writer.writerow([
            'Creator', 'Platform', 'Post URL', 'Post ID', 'Published At', 'Reach',
            'Impressions', 'Views', 'Likes', 'Comments', 'Shares', 'Saves',
            'Clicks', 'Conversions', 'Total Engagement', 'Engagement Rate',
            'Sentiment', 'Sentiment Score', 'Sync Status', 'Last Synced At',
        ])
        for post in payload['posts']:
            writer.writerow([
                post['creator_name'], post['platform'], post['post_url'], post['post_id'],
                post['published_at'], post['reach'], post['impressions'], post['views'],
                post['likes'], post['comments'], post['shares'], post['saves'],
                post['clicks'], post['conversions'], post['engagements'],
                post['engagement_rate'], post['sentiment'], post['sentiment_score'],
                post['sync_status'], post['last_synced_at'],
            ])
        return output.getvalue().encode('utf-8-sig')


campaign_report_service = CampaignReportService()
