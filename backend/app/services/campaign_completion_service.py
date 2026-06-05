from datetime import datetime

from app import db
from app.models import Campaign, CampaignCartItem, Collaboration


def update_campaign_completion_for_collaboration(collaboration):
    """Mark a campaign complete once every paid cart collaboration is complete."""
    if not collaboration:
        return None

    cart_item = CampaignCartItem.query.filter_by(collaboration_id=collaboration.id).first()
    if not cart_item:
        return None

    campaign = Campaign.query.get(cart_item.campaign_id)
    if not campaign or campaign.status == 'completed':
        return campaign

    paid_items = CampaignCartItem.query.filter(
        CampaignCartItem.campaign_id == campaign.id,
        CampaignCartItem.payment_status == 'paid',
        CampaignCartItem.collaboration_id.isnot(None),
    ).all()
    if not paid_items:
        return campaign

    collaboration_ids = [item.collaboration_id for item in paid_items]
    completed_count = Collaboration.query.filter(
        Collaboration.id.in_(collaboration_ids),
        Collaboration.status == 'completed',
    ).count()

    if completed_count == len(collaboration_ids):
        campaign.status = 'completed'
        campaign.updated_at = datetime.utcnow()
        db.session.flush()

    return campaign

