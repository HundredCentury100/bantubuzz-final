from datetime import datetime
from decimal import Decimal

from app.models import AccountFeeOverride


def get_active_fee_override(user_id, override_type):
    now = datetime.utcnow()
    return (
        AccountFeeOverride.query.filter(
            AccountFeeOverride.user_id == user_id,
            AccountFeeOverride.override_type == override_type,
            AccountFeeOverride.is_active == True,
            AccountFeeOverride.starts_at <= now,
            (AccountFeeOverride.ends_at.is_(None)) | (AccountFeeOverride.ends_at > now),
        )
        .order_by(AccountFeeOverride.created_at.desc())
        .first()
    )


def get_effective_fee_percentage(user_id, override_type, fallback_percentage):
    override = get_active_fee_override(user_id, override_type)
    if override:
        return float(Decimal(str(override.percentage)))
    return float(fallback_percentage)
