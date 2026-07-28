"""
Campaign Invitations Routes
Handles inviting creators to campaigns
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import (
    User, Campaign, CampaignInvitation, CreatorProfile,
    Notification
)
from app.services.workspace_service import require_workspace_access
from datetime import datetime, timedelta

bp = Blueprint('campaign_invitations', __name__, url_prefix='/api/campaign-invitations')


@bp.route('/invite', methods=['POST'])
@jwt_required()
def send_invitation():
    """
    Send invitation(s) to creator(s) for a campaign
    Body: {
        campaign_id: int,
        creator_ids: [int],  # List of creator user IDs
        invitation_type: 'apply' | 'join',  # Updated from old types
        package_id: int (optional, for 'join' invitations),
        proposed_amount: float (optional, for 'join' invitations),
        message: str (optional),
        expires_in_days: int (optional, default: 7)
    }
    """
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if not user or user.user_type != 'brand':
            return jsonify({'error': 'Unauthorized: Brand access only'}), 403

        data = request.get_json()
        campaign_id = data.get('campaign_id')
        creator_ids = data.get('creator_ids', [])
        invitation_type = data.get('invitation_type', 'apply')
        package_id = data.get('package_id')
        proposed_amount = data.get('proposed_amount')
        message = data.get('message')
        expires_in_days = data.get('expires_in_days', 7)

        # Validate
        if not campaign_id or not creator_ids:
            return jsonify({'error': 'campaign_id and creator_ids are required'}), 400

        # Support both old and new invitation type values
        if invitation_type == 'invite_to_apply':
            invitation_type = 'apply'
        elif invitation_type == 'invite_to_join':
            invitation_type = 'join'

        if invitation_type not in ['apply', 'join']:
            return jsonify({'error': 'Invalid invitation_type. Use "apply" or "join"'}), 400
        stored_invitation_type = 'invite_to_join' if invitation_type == 'join' else 'invite_to_apply'

        # For 'join' invitations, validate package or amount
        if invitation_type == 'join':
            if not package_id and not proposed_amount:
                return jsonify({'error': 'For join invitations, either package_id or proposed_amount is required'}), 400

            # Validate package if provided
            if package_id:
                from app.models import Package
                package = Package.query.get(package_id)
                if not package:
                    return jsonify({'error': 'Package not found'}), 404
                if not package.has_deliverables():
                    return jsonify({'error': 'This package cannot be invited with because it has no deliverables'}), 400

        # Verify campaign ownership
        campaign = Campaign.query.get(campaign_id)
        if not campaign:
            return jsonify({'error': 'Campaign not found'}), 404

        if campaign.workspace_id:
            _, workspace_error, workspace_status = require_workspace_access(
                user_id,
                campaign.workspace_id,
                'can_manage_campaigns',
            )
            if workspace_error:
                return jsonify({'error': workspace_error}), workspace_status
        else:
            from app.utils.campaign_helpers import user_owns_campaign
            if not user_owns_campaign(campaign, user_id):
                return jsonify({'error': 'Unauthorized: You do not own this campaign'}), 403

        # Send invitations
        invitations_sent = []
        invitations_failed = []

        for creator_id in creator_ids:
            try:
                # Verify creator exists
                creator_profile = CreatorProfile.query.get(creator_id)
                if creator_profile:
                    creator = User.query.get(creator_profile.user_id)
                    creator_user_id = creator_profile.user_id
                    creator_profile_id = creator_profile.id
                else:
                    creator = User.query.get(creator_id)
                    creator_profile = CreatorProfile.query.filter_by(user_id=creator_id).first()
                    creator_user_id = creator_id
                    creator_profile_id = creator_profile.id if creator_profile else None

                if not creator or creator.user_type != 'creator' or not creator_profile_id:
                    invitations_failed.append({
                        'creator_id': creator_id,
                        'reason': 'Creator not found or invalid user type'
                    })
                    continue

                # Check if invitation already exists
                existing = CampaignInvitation.query.filter_by(
                    campaign_id=campaign_id,
                    creator_user_id=creator_user_id
                ).first()

                if existing:
                    # Update if previously declined or expired
                    if existing.status in ['declined', 'expired']:
                        existing.status = 'pending'
                        existing.invitation_type = stored_invitation_type
                        existing.package_id = package_id if invitation_type == 'join' else None
                        existing.proposed_amount = proposed_amount if invitation_type == 'join' else None
                        existing.message = message
                        existing.invited_at = datetime.utcnow()
                        existing.responded_at = None
                        existing.response_message = None
                        existing.expires_at = datetime.utcnow() + timedelta(days=expires_in_days)
                        invitation = existing
                    else:
                        invitations_failed.append({
                            'creator_id': creator_id,
                            'reason': 'Creator already has an active invitation for this campaign'
                        })
                        continue
                else:
                    # Create new invitation
                    invitation = CampaignInvitation(
                        campaign_id=campaign_id,
                        creator_user_id=creator_user_id,
                        invited_by_user_id=user_id,
                        invitation_type=stored_invitation_type,
                        package_id=package_id if invitation_type == 'join' else None,
                        proposed_amount=proposed_amount if invitation_type == 'join' else None,
                        message=message,
                        status='pending',
                        expires_at=datetime.utcnow() + timedelta(days=expires_in_days)
                    )
                    db.session.add(invitation)

                db.session.flush()

                # Create notification for creator
                notification = Notification(
                    user_id=creator_user_id,
                    type='campaign_invitation',
                    title=f'Campaign Invitation: {campaign.title}',
                    message=f'You have been invited to {"apply for" if invitation_type == "apply" else "join"} the campaign "{campaign.title}"',
                    related_id=invitation.id,
                    link=f'/campaigns/{campaign_id}'
                )
                db.session.add(notification)

                # Send email notification
                try:
                    from app.services.email_service import send_campaign_invitation_email
                    creator_name = creator_profile.display_name if creator_profile else creator.email
                    brand_profile = getattr(user, 'brand_profile', None)
                    brand_name = brand_profile.company_name if brand_profile else user.email

                    send_campaign_invitation_email(
                        creator_email=creator.email,
                        creator_name=creator_name,
                        campaign_title=campaign.title,
                        brand_name=brand_name,
                        invitation_type=invitation_type,
                        message=message,
                        campaign_url=f'{request.host_url}campaigns/{campaign_id}'
                    )
                except Exception as email_error:
                    print(f"Failed to send invitation email: {email_error}")

                invitations_sent.append(invitation.to_dict())

            except Exception as e:
                invitations_failed.append({
                    'creator_id': creator_id,
                    'reason': str(e)
                })
                db.session.rollback()

        db.session.commit()

        return jsonify({
            'message': f'Sent {len(invitations_sent)} invitation(s)',
            'invitations_sent': invitations_sent,
            'invitations_failed': invitations_failed
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/creator/pending', methods=['GET'])
@jwt_required()
def get_creator_pending_invitations():
    """Get all pending invitations for the logged-in creator"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if not user or user.user_type != 'creator':
            return jsonify({'error': 'Unauthorized: Creator access only'}), 403

        invitations = CampaignInvitation.get_pending_invitations_for_creator(user_id)

        return jsonify({
            'invitations': [inv.to_dict() for inv in invitations],
            'count': len(invitations)
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/campaign/<int:campaign_id>', methods=['GET'])
@jwt_required()
def get_campaign_invitations(campaign_id):
    """Get all invitations for a campaign (brand only)"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if not user or user.user_type != 'brand':
            return jsonify({'error': 'Unauthorized: Brand access only'}), 403

        # Verify campaign ownership
        campaign = Campaign.query.get(campaign_id)
        if not campaign:
            return jsonify({'error': 'Campaign not found'}), 404

        if campaign.workspace_id:
            _, workspace_error, workspace_status = require_workspace_access(
                user_id,
                campaign.workspace_id,
                'can_manage_campaigns',
            )
            if workspace_error:
                return jsonify({'error': workspace_error}), workspace_status
        else:
            from app.utils.campaign_helpers import user_owns_campaign
            if not user_owns_campaign(campaign, user_id):
                return jsonify({'error': 'Unauthorized: You do not own this campaign'}), 403

        # Get invitations with optional status filter
        status = request.args.get('status')
        invitations = CampaignInvitation.get_invitations_for_campaign(campaign_id, status)

        # Calculate statistics
        stats = {
            'total': len(invitations),
            'pending': len([i for i in invitations if i.status == 'pending']),
            'accepted': len([i for i in invitations if i.status == 'accepted']),
            'declined': len([i for i in invitations if i.status == 'declined']),
            'expired': len([i for i in invitations if i.status == 'expired']),
            'cancelled': len([i for i in invitations if i.status == 'cancelled'])
        }

        return jsonify({
            'invitations': [inv.to_dict() for inv in invitations],
            'stats': stats,
            'count': len(invitations)
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:invitation_id>/accept', methods=['POST'])
@jwt_required()
def accept_invitation(invitation_id):
    """
    Creator accepts an invitation
    For 'apply' type: Redirects to application/proposal flow
    For 'join' type: Directly creates proposal and collaboration
    Body (optional): {
        "response_message": "Thank you for the invitation!"
    }
    """
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if not user or user.user_type != 'creator':
            return jsonify({'error': 'Unauthorized: Creator access only'}), 403

        data = request.get_json() or {}
        response_message = data.get('response_message', '')

        invitation = CampaignInvitation.query.get(invitation_id)
        if not invitation:
            return jsonify({'error': 'Invitation not found'}), 404

        if invitation.creator_user_id != user_id:
            return jsonify({'error': 'Unauthorized: This invitation is not for you'}), 403

        if invitation.status != 'pending':
            return jsonify({'error': f'Invitation already {invitation.status}'}), 400

        if invitation.is_expired:
            invitation.expire()
            return jsonify({'error': 'Invitation has expired'}), 400

        # Accept the invitation
        invitation.status = 'accepted'
        invitation.responded_at = datetime.utcnow()
        invitation.response_message = response_message

        # Create notification for brand
        campaign = Campaign.query.get(invitation.campaign_id)
        from app.utils.campaign_helpers import get_campaign_owner_user_id
        brand_user_id = get_campaign_owner_user_id(campaign)

        creator_profile = CreatorProfile.query.filter_by(user_id=user_id).first()
        creator_name = creator_profile.display_name if creator_profile else user.email

        notification = Notification(
            user_id=brand_user_id,
            type='invitation_accepted',
            title='Invitation Accepted',
            message=f'{creator_name} accepted your invitation for "{campaign.title}"',
            related_id=invitation_id,
            link=f'/campaigns/{campaign.id}'
        )
        db.session.add(notification)

        response_data = {
            'message': 'Invitation accepted',
            'invitation': invitation.to_dict(),
            'next_step': None
        }

        # Support both old and new invitation type values
        inv_type = invitation.invitation_type
        if inv_type == 'invite_to_apply':
            inv_type = 'apply'
        elif inv_type == 'invite_to_join':
            inv_type = 'join'

        if inv_type == 'apply':
            # Creator should apply/propose to the campaign
            response_data['next_step'] = 'apply'
            response_data['redirect_url'] = f'/campaigns/{campaign.id}'

        elif inv_type == 'join':
            # Direct-join invitations are activated by the campaign cart payment flow.
            # Accepting the invitation records creator consent; the collaboration is
            # created only after the brand pays for the campaign cart item.
            response_data['next_step'] = 'awaiting_brand_payment'
            response_data['redirect_url'] = '/creator/applications'

        db.session.commit()

        # Send email notification to brand
        try:
            from app.services.email_service import send_invitation_accepted_email
            brand_user = User.query.get(brand_user_id)
            if brand_user:
                send_invitation_accepted_email(
                    brand_email=brand_user.email,
                    creator_name=creator_name,
                    campaign_title=campaign.title,
                    response_message=response_message
                )
        except Exception as email_error:
            print(f"Failed to send acceptance email: {email_error}")

        return jsonify(response_data), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:invitation_id>/decline', methods=['POST'])
@jwt_required()
def decline_invitation(invitation_id):
    """
    Creator declines an invitation
    Body (optional): {
        "response_message": "Reason for declining"
    }
    """
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if not user or user.user_type != 'creator':
            return jsonify({'error': 'Unauthorized: Creator access only'}), 403

        data = request.get_json() or {}
        response_message = data.get('response_message', '')

        invitation = CampaignInvitation.query.get(invitation_id)
        if not invitation:
            return jsonify({'error': 'Invitation not found'}), 404

        if invitation.creator_user_id != user_id:
            return jsonify({'error': 'Unauthorized: This invitation is not for you'}), 403

        if invitation.status != 'pending':
            return jsonify({'error': f'Invitation already {invitation.status}'}), 400

        # Decline the invitation
        invitation.status = 'declined'
        invitation.responded_at = datetime.utcnow()
        invitation.response_message = response_message

        # Create notification for brand
        campaign = Campaign.query.get(invitation.campaign_id)
        from app.utils.campaign_helpers import get_campaign_owner_user_id
        brand_user_id = get_campaign_owner_user_id(campaign)

        creator_profile = CreatorProfile.query.filter_by(user_id=user_id).first()
        creator_name = creator_profile.display_name if creator_profile else user.email

        notification = Notification(
            user_id=brand_user_id,
            type='invitation_declined',
            title='Invitation Declined',
            message=f'{creator_name} declined your invitation for "{campaign.title}"',
            related_id=invitation_id,
            link=f'/campaigns/{campaign.id}'
        )
        db.session.add(notification)
        db.session.commit()

        # Send email notification to brand
        try:
            from app.services.email_service import send_invitation_declined_email
            brand_user = User.query.get(brand_user_id)
            if brand_user:
                send_invitation_declined_email(
                    brand_email=brand_user.email,
                    creator_name=creator_name,
                    campaign_title=campaign.title,
                    response_message=response_message
                )
        except Exception as email_error:
            print(f"Failed to send decline email: {email_error}")

        return jsonify({
            'message': 'Invitation declined',
            'invitation': invitation.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:invitation_id>', methods=['DELETE'])
@jwt_required()
def cancel_invitation(invitation_id):
    """Brand cancels an invitation"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if not user or user.user_type != 'brand':
            return jsonify({'error': 'Unauthorized: Brand access only'}), 403

        invitation = CampaignInvitation.query.get(invitation_id)
        if not invitation:
            return jsonify({'error': 'Invitation not found'}), 404

        if invitation.invited_by_user_id != user_id:
            return jsonify({'error': 'Unauthorized: You did not send this invitation'}), 403

        # Delete the invitation
        db.session.delete(invitation)
        db.session.commit()

        return jsonify({'message': 'Invitation cancelled'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
