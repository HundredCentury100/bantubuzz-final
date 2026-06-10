import math
from datetime import datetime


WEIGHTS = {
    'engagement': 0.35,
    'reach': 0.25,
    'followers': 0.10,
    'sentiment': 0.10,
    'activity': 0.10,
    'profile_quality': 0.10,
}


def clamp(value, minimum=0.0, maximum=100.0):
    return max(minimum, min(maximum, float(value or 0)))


def interpolate(value, points):
    value = float(value or 0)
    if value <= points[0][0]:
        return float(points[0][1])
    for index in range(1, len(points)):
        left_x, left_y = points[index - 1]
        right_x, right_y = points[index]
        if value <= right_x:
            ratio = (value - left_x) / (right_x - left_x)
            return left_y + ((right_y - left_y) * ratio)
    return float(points[-1][1])


def engagement_dimension(average_engagement_rate):
    return clamp(float(average_engagement_rate or 0) * 10)


def reach_dimension(reach_ratio, has_data=True):
    if not has_data or reach_ratio is None or reach_ratio <= 0:
        return 0.0
    return clamp(interpolate(reach_ratio, [
        (0.0, 10.0),
        (0.05, 10.0),
        (0.10, 25.0),
        (0.30, 50.0),
        (0.50, 70.0),
        (1.00, 100.0),
    ]))


def follower_dimension(followers, max_followers):
    followers = max(0, int(followers or 0))
    max_followers = max(0, int(max_followers or 0))
    if followers <= 0 or max_followers <= 1:
        return 0.0
    if followers >= max_followers:
        return 100.0
    return clamp((math.log10(max(followers, 1)) / math.log10(max_followers)) * 100)


def normalize_sentiment(value):
    if value is None:
        return None
    value = float(value)
    if 0 <= value <= 1:
        return value * 100
    if -1 <= value < 0:
        return (value + 1) * 50
    if -100 <= value < -1:
        return (value + 100) / 2
    return clamp(value)


def sentiment_dimension(base_sentiment, negative_percentage=0, critical_percentage=0):
    score = normalize_sentiment(base_sentiment)
    if score is None:
        return 0.0
    negative_penalty = max(0.0, float(negative_percentage or 0) - 10.0) * 20.0
    critical_penalty = max(0.0, float(critical_percentage or 0) - 10.0) * 40.0
    return clamp(score - negative_penalty - critical_penalty)


def activity_dimension(session_count, last_session_at, now=None):
    now = now or datetime.utcnow()
    score = interpolate(max(0, int(session_count or 0)), [
        (0, 0),
        (10, 10),
        (20, 40),
        (40, 60),
        (80, 80),
        (100, 100),
    ])
    if last_session_at:
        inactive_days = (now - last_session_at).total_seconds() / 86400
        if inactive_days > 60:
            score -= 40
        elif inactive_days > 30:
            score -= 20
    return clamp(score)


def profile_quality_dimension(has_photo, has_bio, has_platform, has_package, has_portfolio):
    return float(sum([
        bool(has_photo),
        bool(has_bio),
        bool(has_platform),
        bool(has_package),
        bool(has_portfolio),
    ]) * 20)


def final_creator_score(dimensions):
    return clamp(sum(
        float(dimensions[key]) * WEIGHTS[key]
        for key in WEIGHTS
    ))


def normalize_platform_name(platform):
    normalized = (platform or '').strip().lower()
    if normalized in {'x', 'x/twitter', 'twitter/x'}:
        return 'twitter'
    return normalized


def select_primary_platform(platforms):
    connected = [platform for platform in platforms if getattr(platform, 'is_connected', True)]
    if not connected:
        return None
    return sorted(
        connected,
        key=lambda platform: (
            -(getattr(platform, 'followers', 0) or 0),
            normalize_platform_name(getattr(platform, 'platform', '')),
            getattr(platform, 'id', 0) or 0,
        ),
    )[0]
