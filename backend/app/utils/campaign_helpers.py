"""
Campaign Helper Functions
Provides abstraction for complex relationship navigation in the BantuBuzz data model.

Data Model Relationships:
- Campaign → brand_id → BrandProfile → user_id (2 hops to get brand user)
- Collaboration → campaign_application_id → CampaignProposal → campaign_id (2 hops to get campaign)
- Collaboration → creator_id → CreatorProfile → user_id (2 hops to get creator user)
"""

from app.models.campaign import Campaign, CampaignProposal
from app.models.campaign_chat import CampaignChat, CampaignChatParticipant
from app.models.collaboration import Collaboration
from app.models.brand_profile import BrandProfile
from app.models.creator_profile import CreatorProfile
from app import db


def get_campaign_owner_user_id(campaign):
    """
    Get the user_id of the brand that owns this campaign.

    Args:
        campaign: Campaign object

    Returns:
        int: user_id of the brand owner, or None if not found
    """
    if not campaign:
        return None

    if campaign.brand:
        return campaign.brand.user_id

    return None


def user_owns_campaign(campaign, user_id):
    """
    Check if a user owns the given campaign.

    Args:
        campaign: Campaign object
        user_id: int

    Returns:
        bool: True if user owns the campaign
    """
    if not campaign or not user_id:
        return False

    return get_campaign_owner_user_id(campaign) == user_id


def get_campaign_collaborations(campaign_id, status=None):
    """
    Get all collaborations for a campaign.

    Args:
        campaign_id: int
        status: str (optional) - Filter by collaboration status

    Returns:
        list: List of Collaboration objects
    """
    query = db.session.query(Collaboration).join(
        CampaignProposal,
        Collaboration.campaign_application_id == CampaignProposal.id
    ).filter(
        CampaignProposal.campaign_id == campaign_id
    )

    direct_query = db.session.query(Collaboration).join(
        CampaignChatParticipant,
        CampaignChatParticipant.collaboration_id == Collaboration.id
    ).join(
        CampaignChat,
        CampaignChatParticipant.chat_id == CampaignChat.id
    ).filter(
        CampaignChat.campaign_id == campaign_id,
        Collaboration.campaign_application_id.is_(None),
    )

    if status:
        query = query.filter(Collaboration.status == status)
        direct_query = direct_query.filter(Collaboration.status == status)

    collaborations = query.all()
    seen_ids = {collaboration.id for collaboration in collaborations}
    for collaboration in direct_query.all():
        if collaboration.id not in seen_ids:
            collaborations.append(collaboration)
            seen_ids.add(collaboration.id)
    return collaborations


def is_user_campaign_collaborator(campaign_id, user_id):
    """
    Check if a user is a collaborator on the given campaign.

    Args:
        campaign_id: int
        user_id: int

    Returns:
        bool: True if user is a collaborator
    """
    if not campaign_id or not user_id:
        return False

    collaboration = db.session.query(Collaboration).join(
        CampaignProposal,
        Collaboration.campaign_application_id == CampaignProposal.id
    ).join(
        CreatorProfile,
        Collaboration.creator_id == CreatorProfile.id
    ).filter(
        CampaignProposal.campaign_id == campaign_id,
        CreatorProfile.user_id == user_id
    ).first()

    if collaboration is not None:
        return True

    direct_collaboration = db.session.query(Collaboration).join(
        CreatorProfile,
        Collaboration.creator_id == CreatorProfile.id
    ).join(
        CampaignChatParticipant,
        CampaignChatParticipant.collaboration_id == Collaboration.id
    ).join(
        CampaignChat,
        CampaignChatParticipant.chat_id == CampaignChat.id
    ).filter(
        CampaignChat.campaign_id == campaign_id,
        CreatorProfile.user_id == user_id,
        CampaignChatParticipant.user_id == user_id,
        CampaignChatParticipant.left_at.is_(None),
    ).first()

    return direct_collaboration is not None


def get_collaboration_campaign_id(collaboration):
    """
    Get the campaign_id from a collaboration.

    Args:
        collaboration: Collaboration object

    Returns:
        int: campaign_id, or None if not found
    """
    if not collaboration:
        return None

    if collaboration.campaign_application:
        return collaboration.campaign_application.campaign_id

    chat_participation = CampaignChatParticipant.query.filter_by(
        collaboration_id=collaboration.id
    ).first()
    if chat_participation and chat_participation.chat:
        return chat_participation.chat.campaign_id

    return None


def get_collaboration_creator_user_id(collaboration):
    """
    Get the creator user_id from a collaboration.

    Args:
        collaboration: Collaboration object

    Returns:
        int: creator user_id, or None if not found
    """
    if not collaboration:
        return None

    if collaboration.creator:
        return collaboration.creator.user_id

    return None


def get_user_collaboration_for_campaign(campaign_id, user_id):
    """
    Get a user's collaboration record for a specific campaign.

    Args:
        campaign_id: int
        user_id: int

    Returns:
        Collaboration: Collaboration object or None
    """
    if not campaign_id or not user_id:
        return None

    collaboration = db.session.query(Collaboration).join(
        CampaignProposal,
        Collaboration.campaign_application_id == CampaignProposal.id
    ).join(
        CreatorProfile,
        Collaboration.creator_id == CreatorProfile.id
    ).filter(
        CampaignProposal.campaign_id == campaign_id,
        CreatorProfile.user_id == user_id
    ).first()

    if collaboration:
        return collaboration

    return db.session.query(Collaboration).join(
        CreatorProfile,
        Collaboration.creator_id == CreatorProfile.id
    ).join(
        CampaignChatParticipant,
        CampaignChatParticipant.collaboration_id == Collaboration.id
    ).join(
        CampaignChat,
        CampaignChatParticipant.chat_id == CampaignChat.id
    ).filter(
        CampaignChat.campaign_id == campaign_id,
        CreatorProfile.user_id == user_id,
        CampaignChatParticipant.user_id == user_id,
        CampaignChatParticipant.left_at.is_(None),
    ).first()


def get_campaign_collaborator_user_ids(campaign_id, status=None):
    """
    Get all collaborator user_ids for a campaign.

    Args:
        campaign_id: int
        status: str (optional) - Filter by collaboration status

    Returns:
        list: List of user_ids
    """
    query = db.session.query(CreatorProfile.user_id).join(
        Collaboration,
        CreatorProfile.id == Collaboration.creator_id
    ).join(
        CampaignProposal,
        Collaboration.campaign_application_id == CampaignProposal.id
    ).filter(
        CampaignProposal.campaign_id == campaign_id
    )

    if status:
        query = query.filter(Collaboration.status == status)

    user_ids = {user_id for (user_id,) in query.all()}

    direct_query = db.session.query(CreatorProfile.user_id).join(
        Collaboration,
        CreatorProfile.id == Collaboration.creator_id
    ).join(
        CampaignChatParticipant,
        CampaignChatParticipant.collaboration_id == Collaboration.id
    ).join(
        CampaignChat,
        CampaignChatParticipant.chat_id == CampaignChat.id
    ).filter(
        CampaignChat.campaign_id == campaign_id,
        CampaignChatParticipant.role == "creator",
        CampaignChatParticipant.left_at.is_(None),
    )

    if status:
        direct_query = direct_query.filter(Collaboration.status == status)

    user_ids.update(user_id for (user_id,) in direct_query.all())
    return list(user_ids)


def get_brand_user_campaigns(user_id):
    """
    Get all campaigns owned by a brand user.

    Args:
        user_id: int

    Returns:
        list: List of Campaign objects
    """
    if not user_id:
        return []

    campaigns = db.session.query(Campaign).join(
        BrandProfile,
        Campaign.brand_id == BrandProfile.id
    ).filter(
        BrandProfile.user_id == user_id
    ).all()

    return campaigns


def get_creator_user_collaborations(user_id, status=None):
    """
    Get all collaborations for a creator user.

    Args:
        user_id: int
        status: str (optional) - Filter by collaboration status

    Returns:
        list: List of Collaboration objects
    """
    if not user_id:
        return []

    query = db.session.query(Collaboration).join(
        CreatorProfile,
        Collaboration.creator_id == CreatorProfile.id
    ).filter(
        CreatorProfile.user_id == user_id
    )

    if status:
        query = query.filter(Collaboration.status == status)

    return query.all()


def user_can_access_campaign(campaign, user_id):
    """
    Check if a user can access a campaign (either as owner or collaborator).

    Args:
        campaign: Campaign object
        user_id: int

    Returns:
        bool: True if user can access the campaign
    """
    if not campaign or not user_id:
        return False

    # Check if user owns the campaign
    if user_owns_campaign(campaign, user_id):
        return True

    # Check if user is a collaborator
    if is_user_campaign_collaborator(campaign.id, user_id):
        return True

    return False
