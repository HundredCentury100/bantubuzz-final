from datetime import datetime

from app.models.spotlight_boost import SpotlightBoost


def active_boost_for(target_type, target_id):
    return SpotlightBoost.query.filter(
        SpotlightBoost.target_type == target_type,
        SpotlightBoost.target_id == target_id,
        SpotlightBoost.status == 'active',
        SpotlightBoost.ends_at > datetime.utcnow(),
    ).order_by(SpotlightBoost.ends_at.desc()).first()


def boost_payload_for(target_type, target_id):
    boost = active_boost_for(target_type, target_id)
    return boost.to_dict() if boost else None
