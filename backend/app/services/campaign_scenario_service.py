"""Campaign scenario prediction service.

This v1 uses calibrated marketplace data instead of an offline ML artifact.
It predicts from the exact cart selection, connected-platform averages, and
historical campaign/post metrics so the brand can see likely outcomes before
payment.
"""

from collections import Counter
from decimal import Decimal

from sqlalchemy import func

from app.models import (
    Campaign,
    CampaignCartItem,
    ConnectedPlatform,
    CreatorProfile,
    PostMetrics,
)


def _float(value, default=0.0):
    try:
        if value is None:
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


def _int(value, default=0):
    try:
        if value is None:
            return default
        return int(value)
    except (TypeError, ValueError):
        return default


def _clamp(value, low=0.0, high=100.0):
    return max(low, min(high, value))


class CampaignScenarioService:
    MODEL_VERSION = 'scenario-calibrated-v1'

    SCENARIO_FACTORS = {
        'worst': {
            'label': 'Worst Case',
            'description': 'Low-end outcome if resonance is weaker or the audience fit is off.',
            'reach': 0.55,
            'engagement': 0.72,
            'sentiment_delta': -12,
            'confidence_bound': '10th percentile estimate',
        },
        'base': {
            'label': 'Base Case',
            'description': 'Expected median performance from similar creators and campaign context.',
            'reach': 0.85,
            'engagement': 0.9,
            'sentiment_delta': -3,
            'confidence_bound': '50th percentile estimate',
        },
        'predicted': {
            'label': 'Predicted',
            'description': 'Most likely BantuBuzz estimate for this exact cart selection.',
            'reach': 1.0,
            'engagement': 1.0,
            'sentiment_delta': 0,
            'confidence_bound': 'Weighted calibrated estimate',
        },
        'best': {
            'label': 'Best Case',
            'description': 'High-end outcome if the content resonates strongly.',
            'reach': 1.35,
            'engagement': 1.18,
            'sentiment_delta': 8,
            'confidence_bound': '90th percentile estimate',
        },
    }

    @staticmethod
    def predict_for_cart(campaign_id, cart_item_ids=None):
        campaign = Campaign.query.get(campaign_id)
        if not campaign:
            return None

        query = CampaignCartItem.query.filter_by(
            campaign_id=campaign_id,
            payment_status='pending',
        )
        if cart_item_ids:
            query = query.filter(CampaignCartItem.id.in_(cart_item_ids))
        cart_items = query.order_by(CampaignCartItem.added_at.asc()).all()

        if not cart_items:
            return {
                'campaign_id': campaign_id,
                'model_version': CampaignScenarioService.MODEL_VERSION,
                'status': 'empty',
                'message': 'Add at least one creator to the campaign cart to see scenario predictions.',
                'scenarios': [],
                'suggestions': [],
            }

        creator_inputs = [CampaignScenarioService._creator_input(item) for item in cart_items]
        base = CampaignScenarioService._base_estimate(campaign, cart_items, creator_inputs)
        scenarios = [
            CampaignScenarioService._scenario_payload(key, base)
            for key in ['worst', 'base', 'predicted', 'best']
        ]
        confidence = CampaignScenarioService._confidence(base, creator_inputs)

        return {
            'campaign_id': campaign_id,
            'model_version': CampaignScenarioService.MODEL_VERSION,
            'status': 'ready',
            'cart_item_count': len(cart_items),
            'creator_count': len({item.creator_id for item in cart_items}),
            'similar_campaigns_count': base['similar_campaigns_count'],
            'cold_start': base['similar_campaigns_count'] < 10,
            'confidence': confidence,
            'confidence_label': CampaignScenarioService._confidence_label(confidence),
            'inputs_summary': {
                'total_cost': round(base['total_cost'], 2),
                'platforms': sorted(base['platforms']),
                'average_engagement_rate': round(base['engagement_rate'], 2),
                'average_sentiment': round(base['sentiment'], 1),
            },
            'scenarios': scenarios,
            'suggestions': CampaignScenarioService._suggestions(campaign, cart_items, creator_inputs, base),
        }

    @staticmethod
    def _creator_input(cart_item):
        creator = cart_item.creator or CreatorProfile.query.get(cart_item.creator_id)
        platforms = ConnectedPlatform.query.filter_by(
            user_id=creator.user_id,
            is_connected=True,
        ).all() if creator else []

        package = cart_item.package
        requested_platforms = CampaignScenarioService._item_platforms(cart_item)
        matching_platforms = [
            platform for platform in platforms
            if not requested_platforms or (platform.platform or '').lower() in requested_platforms
        ] or platforms

        follower_total = sum(_int(platform.followers) for platform in matching_platforms)
        if follower_total <= 0 and creator:
            follower_total = _int(creator.follower_count)

        reach_values = [
            _int(platform.average_reach) or _int(platform.average_views)
            for platform in matching_platforms
            if _int(platform.average_reach) or _int(platform.average_views)
        ]
        engagement_values = [
            _float(platform.average_engagement_rate)
            for platform in matching_platforms
            if platform.average_engagement_rate is not None
        ]
        sentiment_values = [
            _float(platform.average_sentiment_score)
            for platform in matching_platforms
            if platform.average_sentiment_score is not None
        ]

        average_reach = sum(reach_values) / len(reach_values) if reach_values else max(1, follower_total * 0.22)
        engagement_rate = (
            sum(engagement_values) / len(engagement_values)
            if engagement_values
            else _float(getattr(creator, 'engagement_rate', 0)) * (100 if _float(getattr(creator, 'engagement_rate', 0)) <= 1 else 1)
        )
        sentiment = sum(sentiment_values) / len(sentiment_values) if sentiment_values else 68.0
        deliverable_count = CampaignScenarioService._deliverable_count(package)

        return {
            'creator_id': cart_item.creator_id,
            'creator_name': (creator.display_name or creator.username) if creator else 'Creator',
            'cart_item_id': cart_item.id,
            'platforms': requested_platforms or {(platform.platform or '').lower() for platform in matching_platforms if platform.platform},
            'followers': follower_total,
            'average_reach': average_reach,
            'engagement_rate': _clamp(engagement_rate, 0, 35),
            'sentiment': _clamp(sentiment, 0, 100),
            'deliverable_count': deliverable_count,
            'cost': _float(cart_item.amount),
            'has_platform_metrics': bool(reach_values or engagement_values),
        }

    @staticmethod
    def _item_platforms(cart_item):
        package = cart_item.package
        platforms = set()
        if package:
            for platform in package.platforms or []:
                if platform:
                    platforms.add(str(platform).lower())
            if package.platform_type:
                platforms.add(str(package.platform_type).lower())
        for deliverable in cart_item.custom_deliverables or []:
            platform = deliverable.get('platform') if isinstance(deliverable, dict) else None
            if platform:
                platforms.add(str(platform).lower())
        return platforms

    @staticmethod
    def _deliverable_count(package):
        if not package:
            return 1
        deliverables = package.deliverables or []
        if isinstance(deliverables, list) and deliverables:
            total = 0
            for deliverable in deliverables:
                if isinstance(deliverable, dict):
                    total += _int(deliverable.get('quantity'), 1)
                else:
                    total += 1
            return max(1, total)
        return 1

    @staticmethod
    def _base_estimate(campaign, cart_items, creator_inputs):
        total_reach = sum(item['average_reach'] * item['deliverable_count'] for item in creator_inputs)
        weighted_engagement = CampaignScenarioService._weighted_average(creator_inputs, 'engagement_rate', 'average_reach')
        sentiment = CampaignScenarioService._weighted_average(creator_inputs, 'sentiment', 'average_reach') or 68.0
        total_cost = sum(_float(item.amount) for item in cart_items)
        platforms = set()
        for item in creator_inputs:
            platforms.update(item['platforms'])

        historical = CampaignScenarioService._historical_context(campaign, platforms)
        if historical['reach'] > 0:
            total_reach = (total_reach * 0.7) + (historical['reach'] * len(cart_items) * 0.3)
        if historical['engagement_rate'] > 0:
            weighted_engagement = (weighted_engagement * 0.75) + (historical['engagement_rate'] * 0.25)
        if historical['sentiment'] > 0:
            sentiment = (sentiment * 0.8) + (historical['sentiment'] * 0.2)

        return {
            'reach': max(0, total_reach),
            'engagement_rate': _clamp(weighted_engagement, 0, 35),
            'sentiment': _clamp(sentiment, 0, 100),
            'total_cost': total_cost,
            'platforms': platforms,
            'similar_campaigns_count': historical['similar_count'],
        }

    @staticmethod
    def _weighted_average(rows, value_key, weight_key):
        weighted_sum = 0.0
        total_weight = 0.0
        fallback = []
        for row in rows:
            value = _float(row.get(value_key))
            weight = max(1.0, _float(row.get(weight_key)))
            if value > 0:
                weighted_sum += value * weight
                total_weight += weight
                fallback.append(value)
        if total_weight > 0:
            return weighted_sum / total_weight
        return sum(fallback) / len(fallback) if fallback else 0.0

    @staticmethod
    def _historical_context(campaign, platforms):
        query = PostMetrics.query
        if platforms:
            query = query.filter(PostMetrics.post_platform.in_(list(platforms)))

        metrics = query.order_by(PostMetrics.last_synced_at.desc().nullslast()).limit(500).all()
        if not metrics:
            return {'reach': 0, 'engagement_rate': 0, 'sentiment': 0, 'similar_count': 0}

        reach_values = [(_int(metric.reach) or _int(metric.video_views) or _int(metric.impressions)) for metric in metrics]
        engagement_values = [_float(metric.engagement_rate) for metric in metrics if metric.engagement_rate is not None]
        sentiment_values = [_float(metric.sentiment_score) for metric in metrics if metric.sentiment_score is not None]
        collaboration_ids = {metric.collaboration_id for metric in metrics if metric.collaboration_id}

        return {
            'reach': sum(reach_values) / len(reach_values) if reach_values else 0,
            'engagement_rate': sum(engagement_values) / len(engagement_values) if engagement_values else 0,
            'sentiment': sum(sentiment_values) / len(sentiment_values) if sentiment_values else 0,
            'similar_count': len(collaboration_ids),
        }

    @staticmethod
    def _scenario_payload(key, base):
        factor = CampaignScenarioService.SCENARIO_FACTORS[key]
        reach = round(base['reach'] * factor['reach'])
        engagement_rate = _clamp(base['engagement_rate'] * factor['engagement'], 0, 100)
        engagements = round(reach * (engagement_rate / 100))
        sentiment = _clamp(base['sentiment'] + factor['sentiment_delta'], 0, 100)
        cpm = (base['total_cost'] / reach * 1000) if reach > 0 else 0

        return {
            'key': key,
            'label': factor['label'],
            'description': factor['description'],
            'confidence_bound': factor['confidence_bound'],
            'estimated_reach': reach,
            'estimated_engagements': engagements,
            'engagement_rate': round(engagement_rate, 2),
            'cpm': round(cpm, 2),
            'predicted_sentiment': round(sentiment, 1),
        }

    @staticmethod
    def _confidence(base, creator_inputs):
        with_metrics = sum(1 for item in creator_inputs if item['has_platform_metrics'])
        metric_coverage = with_metrics / max(1, len(creator_inputs))
        similar_score = min(1.0, base['similar_campaigns_count'] / 25)
        platform_mix_score = min(1.0, len(base['platforms']) / 3) if base['platforms'] else 0.35
        confidence = 42 + (metric_coverage * 28) + (similar_score * 20) + (platform_mix_score * 10)
        return round(_clamp(confidence, 35, 92))

    @staticmethod
    def _confidence_label(confidence):
        if confidence >= 80:
            return 'High confidence'
        if confidence >= 62:
            return 'Moderate confidence'
        return 'Directional estimate'

    @staticmethod
    def _suggestions(campaign, cart_items, creator_inputs, base):
        suggestions = []
        if len(cart_items) == 1:
            suggestions.append({
                'type': 'add_creator',
                'title': 'Add one more complementary creator',
                'description': 'A second creator can widen reach and reduce single-creator performance risk.',
                'predicted_improvement': '+18-35% reach stability',
                'additional_cost': 'Varies by package',
                'action': 'browse_packages',
            })

        platform_counter = Counter(platform for item in creator_inputs for platform in item['platforms'])
        if platform_counter and len(platform_counter) == 1:
            platform = next(iter(platform_counter))
            suggestions.append({
                'type': 'platform_mix',
                'title': 'Diversify the platform mix',
                'description': f'Your current cart is concentrated on {platform.title()}. Adding another channel can improve best-case upside.',
                'predicted_improvement': '+8-15% reach',
                'additional_cost': 'Depends on added package',
                'action': 'ai_matches',
            })

        low_engagement = [item for item in creator_inputs if item['engagement_rate'] and item['engagement_rate'] < 2]
        if low_engagement:
            suggestions.append({
                'type': 'engagement_quality',
                'title': 'Review creator engagement quality',
                'description': 'One or more selected creators has a lower engagement signal than the rest of the cart.',
                'predicted_improvement': '+1-2% engagement rate',
                'additional_cost': 'No extra cost if you swap before payment',
                'action': 'ai_matches',
            })

        if base['similar_campaigns_count'] < 10:
            suggestions.append({
                'type': 'confidence',
                'title': 'Add clearer targeting for better confidence',
                'description': 'Target locations, categories, and deliverable detail improve prediction confidence.',
                'predicted_improvement': '+10-20 confidence points',
                'additional_cost': '$0',
                'action': 'edit_campaign',
            })

        return suggestions[:3]
