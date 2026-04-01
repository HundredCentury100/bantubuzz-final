"""
Collaboration Response Service - Handles creator acceptance/decline of package bookings
"""
from datetime import datetime, timezone
from app import db
from app.models import (
    Collaboration, CreatorProfile, BrandProfile,
    Notification, Booking
)
from app.services import brand_wallet_service


def get_pending_collaborations(creator_id, page=1, per_page=20):
    """
    Get collaborations pending creator acceptance
    """
    creator_profile = CreatorProfile.query.get(creator_id)
    if not creator_profile:
        raise ValueError('Creator profile not found')

    query = Collaboration.query.filter_by(
        creator_id=creator_id,
        status='pending_creator_acceptance'
    )

    total = query.count()
    offset = (page - 1) * per_page

    collaborations = query.order_by(
        Collaboration.created_at.desc()
    ).limit(per_page).offset(offset).all()

    return {
        'collaborations': [c.to_dict(include_relations=True) for c in collaborations],
        'total': total,
        'page': page,
        'per_page': per_page,
        'total_pages': (total + per_page - 1) // per_page
    }


def creator_accept_collaboration(collaboration_id, creator_user_id):
    """
    Creator accepts the collaboration
    Updates status from 'pending_creator_acceptance' to 'in_progress'
    """
    collaboration = Collaboration.query.get(collaboration_id)
    if not collaboration:
        raise ValueError('Collaboration not found')

    # Get creator profile from user_id
    from app.models import User
    user = User.query.get(creator_user_id)
    if not user or not user.creator_profile:
        raise ValueError('Creator profile not found')

    creator_profile = user.creator_profile

    # Verify ownership
    if collaboration.creator_id != creator_profile.id:
        raise ValueError('Unauthorized: You do not own this collaboration')

    # Verify status
    if collaboration.status != 'pending_creator_acceptance':
        raise ValueError(f'Cannot accept collaboration with status: {collaboration.status}')

    # Update collaboration status
    collaboration.status = 'in_progress'
    collaboration.creator_response_at = datetime.now(timezone.utc)

    # Update associated booking if exists
    if collaboration.booking:
        collaboration.booking.status = 'accepted'

    db.session.commit()

    # Send notification to brand
    send_collaboration_acceptance_notification(collaboration)

    return collaboration


def creator_decline_collaboration(collaboration_id, creator_user_id, reason, counter_offer=None):
    """
    Creator declines the collaboration
    Updates status to 'creator_declined' and processes refund to brand wallet
    """
    collaboration = Collaboration.query.get(collaboration_id)
    if not collaboration:
        raise ValueError('Collaboration not found')

    # Get creator profile from user_id
    from app.models import User
    user = User.query.get(creator_user_id)
    if not user or not user.creator_profile:
        raise ValueError('Creator profile not found')

    creator_profile = user.creator_profile

    # Verify ownership
    if collaboration.creator_id != creator_profile.id:
        raise ValueError('Unauthorized: You do not own this collaboration')

    # Verify status
    if collaboration.status != 'pending_creator_acceptance':
        raise ValueError(f'Cannot decline collaboration with status: {collaboration.status}')

    # Update collaboration status
    collaboration.status = 'creator_declined'
    collaboration.creator_response_at = datetime.now(timezone.utc)
    collaboration.creator_decline_reason = reason

    # Update associated booking if exists
    if collaboration.booking:
        collaboration.booking.status = 'rejected'

    db.session.commit()

    # Process refund to brand wallet
    try:
        refund_reason = f'Creator declined collaboration: {reason}'
        brand_wallet_service.refund_to_brand_wallet(collaboration_id, refund_reason)
    except Exception as e:
        # Log error but don't fail the decline
        print(f'Error processing refund for collaboration {collaboration_id}: {str(e)}')

    # Send notification to brand
    send_collaboration_decline_notification(collaboration, counter_offer)

    return collaboration


def send_collaboration_acceptance_notification(collaboration):
    """Send notification to brand when creator accepts"""
    brand = BrandProfile.query.get(collaboration.brand_id)
    if not brand:
        return

    creator = CreatorProfile.query.get(collaboration.creator_id)
    creator_name = creator.user.username if creator and creator.user else 'Creator'

    notification = Notification(
        user_id=brand.user_id,
        notification_type='collaboration_accepted',
        title='Collaboration Accepted!',
        message=f'{creator_name} has accepted your booking for "{collaboration.title}". The collaboration is now in progress.',
        link=f'/brand/collaborations/{collaboration.id}',
        metadata={
            'collaboration_id': collaboration.id,
            'creator_id': collaboration.creator_id,
            'amount': float(collaboration.amount)
        }
    )
    db.session.add(notification)
    db.session.commit()


def send_collaboration_decline_notification(collaboration, counter_offer=None):
    """Send notification to brand when creator declines"""
    brand = BrandProfile.query.get(collaboration.brand_id)
    if not brand:
        return

    creator = CreatorProfile.query.get(collaboration.creator_id)
    creator_name = creator.user.username if creator and creator.user else 'Creator'

    message = f'{creator_name} has declined your booking for "{collaboration.title}". '
    message += f'Reason: {collaboration.creator_decline_reason}. '
    message += 'The payment has been refunded to your wallet.'

    if counter_offer:
        message += f' Counter offer: ${counter_offer.get("amount")} for {counter_offer.get("duration")} days.'

    notification = Notification(
        user_id=brand.user_id,
        notification_type='collaboration_declined',
        title='Collaboration Declined',
        message=message,
        link=f'/brand/wallet',  # Send to wallet to see refund
        metadata={
            'collaboration_id': collaboration.id,
            'creator_id': collaboration.creator_id,
            'decline_reason': collaboration.creator_decline_reason,
            'refund_amount': float(collaboration.amount),
            'counter_offer': counter_offer
        }
    )
    db.session.add(notification)
    db.session.commit()


def get_collaboration_for_creator_response(collaboration_id, creator_user_id):
    """
    Get collaboration details for creator to review before accepting/declining
    """
    collaboration = Collaboration.query.get(collaboration_id)
    if not collaboration:
        raise ValueError('Collaboration not found')

    # Get creator profile from user_id
    from app.models import User
    user = User.query.get(creator_user_id)
    if not user or not user.creator_profile:
        raise ValueError('Creator profile not found')

    creator_profile = user.creator_profile

    # Verify ownership
    if collaboration.creator_id != creator_profile.id:
        raise ValueError('Unauthorized: You do not own this collaboration')

    return collaboration.to_dict(include_relations=True)


def bulk_get_pending_count(creator_user_id):
    """
    Get count of collaborations pending creator response
    Used for dashboard badges
    """
    from app.models import User
    user = User.query.get(creator_user_id)
    if not user or not user.creator_profile:
        return 0

    creator_profile = user.creator_profile

    count = Collaboration.query.filter_by(
        creator_id=creator_profile.id,
        status='pending_creator_acceptance'
    ).count()

    return count
