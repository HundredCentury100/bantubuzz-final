"""Helpers for normalizing ThunziAI metric scale drift."""


def normalize_engagement_rate_percent(value):
    """Return engagement rate as a percentage value.

    ThunziAI integrations have returned engagement as both fractions
    (0.052 for 5.2%) and percentages (5.2 for 5.2%). BantuBuzz analytics
    and scoring store/display engagement as percent.
    """
    if value is None:
        return None
    try:
        rate = float(value)
    except (TypeError, ValueError):
        return None
    if 0 < abs(rate) <= 1:
        rate *= 100
    return rate


def normalize_sentiment_fraction(value):
    """Return sentiment as 0..1 for frontend components that render percent."""
    if value is None:
        return None
    try:
        score = float(value)
    except (TypeError, ValueError):
        return None
    if -1 <= score <= 1:
        return max(0.0, min(1.0, score if score >= 0 else (score + 1) / 2))
    if -100 <= score < 0:
        return max(0.0, min(1.0, (score + 100) / 200))
    return max(0.0, min(1.0, score / 100))


def normalize_sentiment_0_100(value):
    """Return sentiment on a 0..100 scale."""
    fraction = normalize_sentiment_fraction(value)
    return None if fraction is None else fraction * 100


def normalize_post_sentiment_score(value):
    """Return post sentiment on BantuBuzz's -100..100 scale."""
    if value is None:
        return None
    try:
        score = float(value)
    except (TypeError, ValueError):
        return None
    if 0 <= score <= 1:
        return (score * 200) - 100
    if -1 <= score < 0:
        return score * 100
    if -100 <= score < 0:
        return score
    if 0 <= score <= 100:
        return (score * 2) - 100
    return max(-100.0, min(100.0, score))


def sentiment_label_from_score(score):
    if score is None:
        return None
    try:
        score = float(score)
    except (TypeError, ValueError):
        return None
    if score <= -20:
        return 'negative'
    if score >= 20:
        return 'positive'
    return 'neutral'
