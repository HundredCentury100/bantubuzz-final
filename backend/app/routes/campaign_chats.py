"""
Campaign Chat Routes
Handles campaign-level messaging between brands and creators
Supports broadcast and one-to-one chats
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import (
    User, Campaign, Collaboration, CampaignChat, CampaignChatParticipant,
    CampaignChatMessage, Notification, CampaignProposal, CreatorProfile
)
from app.utils.campaign_helpers import (
    user_owns_campaign, is_user_campaign_collaborator,
    get_user_collaboration_for_campaign, user_can_access_campaign
)
from datetime import datetime
from sqlalchemy import or_, and_

bp = Blueprint('campaign_chats', __name__, url_prefix='/api/campaign-chats')


# ==================== Chat Management ====================

@bp.route('/campaign/<int:campaign_id>', methods=['GET'])
@jwt_required()
def get_campaign_chats(campaign_id):
    """
    Get all chats for a campaign (for the current user)
    Returns chats sorted by last message time
    """
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if not user:
            return jsonify({'error': 'User not found'}), 404

        # Verify campaign access
        campaign = Campaign.query.get(campaign_id)
        if not campaign:
            return jsonify({'error': 'Campaign not found'}), 404

        # Check if user is brand owner or a collaborator using helper functions
        if not user_can_access_campaign(campaign, user_id):
            return jsonify({'error': 'Unauthorized: You do not have access to this campaign'}), 403

        # Get chats where user is a participant
        participant_chat_ids = db.session.query(CampaignChatParticipant.chat_id).filter(
            CampaignChatParticipant.user_id == user_id,
            CampaignChatParticipant.left_at.is_(None)
        ).subquery()

        chats = CampaignChat.query.filter(
            CampaignChat.campaign_id == campaign_id,
            CampaignChat.id.in_(participant_chat_ids),
            CampaignChat.is_active == True
        ).order_by(
            CampaignChat.last_message_at.desc().nullsfirst(),
            CampaignChat.created_at.desc()
        ).all()

        return jsonify({
            'chats': [chat.to_dict(user_id=user_id) for chat in chats],
            'count': len(chats)
        }), 200

    except Exception as e:
        print(f"Error fetching campaign chats: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@bp.route('/create-one-to-one', methods=['POST'])
@jwt_required()
def create_one_to_one_chat():
    """
    Create one-to-one chat between brand and creator
    Body: {
        campaign_id: int,
        creator_user_id: int (if brand is creating)
        OR
        brand_user_id: int (if creator is creating)
    }
    """
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if not user:
            return jsonify({'error': 'User not found'}), 404

        data = request.get_json()
        campaign_id = data.get('campaign_id')

        if not campaign_id:
            return jsonify({'error': 'campaign_id is required'}), 400

        # Verify campaign access
        campaign = Campaign.query.get(campaign_id)
        if not campaign:
            return jsonify({'error': 'Campaign not found'}), 404

        # Determine brand and creator
        if user.user_type == 'brand':
            if not user_owns_campaign(campaign, user_id):
                return jsonify({'error': 'Unauthorized: You do not own this campaign'}), 403

            creator_user_id = data.get('creator_user_id')
            if not creator_user_id:
                return jsonify({'error': 'creator_user_id is required'}), 400

            brand_user_id = user_id

            # Verify collaboration exists using helper function
            collaboration = get_user_collaboration_for_campaign(campaign_id, creator_user_id)

            if not collaboration or collaboration.status in ('cancelled', 'rejected'):
                return jsonify({'error': 'No active collaboration with this creator'}), 404

        elif user.user_type == 'creator':
            # Creator creating chat with brand - verify collaboration using helper function
            collaboration = get_user_collaboration_for_campaign(campaign_id, user_id)

            if not collaboration or collaboration.status in ('cancelled', 'rejected'):
                return jsonify({'error': 'You are not a collaborator in this campaign'}), 403

            brand_user_id = campaign.brand.user_id if campaign.brand else None
            creator_user_id = user_id

        else:
            return jsonify({'error': 'Invalid user type'}), 400

        # Create or retrieve chat
        chat = CampaignChat.create_one_to_one_chat(
            campaign_id=campaign_id,
            brand_user_id=brand_user_id,
            creator_user_id=creator_user_id,
            collaboration_id=collaboration.id
        )

        return jsonify({
            'message': 'Chat created successfully',
            'chat': chat.to_dict(user_id=user_id)
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error creating one-to-one chat: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@bp.route('/create-broadcast', methods=['POST'])
@jwt_required()
def create_broadcast_chat():
    """
    Create broadcast chat for all campaign collaborators
    Body: {
        campaign_id: int,
        title: str (optional)
    }
    """
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if not user or user.user_type != 'brand':
            return jsonify({'error': 'Unauthorized: Brand access only'}), 403

        data = request.get_json()
        campaign_id = data.get('campaign_id')
        title = data.get('title')

        if not campaign_id:
            return jsonify({'error': 'campaign_id is required'}), 400

        # Verify campaign ownership
        campaign = Campaign.query.get(campaign_id)
        if not campaign:
            return jsonify({'error': 'Campaign not found'}), 404

        if not user_owns_campaign(campaign, user_id):
            return jsonify({'error': 'Unauthorized: You do not own this campaign'}), 403

        # Create broadcast chat
        chat = CampaignChat.create_broadcast_chat(
            campaign_id=campaign_id,
            brand_user_id=user_id,
            title=title
        )

        return jsonify({
            'message': 'Broadcast chat created successfully',
            'chat': chat.to_dict(user_id=user_id)
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error creating broadcast chat: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:chat_id>', methods=['GET'])
@jwt_required()
def get_chat_details(chat_id):
    """Get chat details including participants"""
    try:
        user_id = int(get_jwt_identity())

        chat = CampaignChat.query.get(chat_id)
        if not chat:
            return jsonify({'error': 'Chat not found'}), 404

        # Verify user is a participant
        participant = chat.get_participant_for_user(user_id)
        if not participant or participant.left_at is not None:
            return jsonify({'error': 'Unauthorized: You are not a participant in this chat'}), 403

        # Get participants
        participants = CampaignChatParticipant.query.filter_by(
            chat_id=chat_id
        ).filter(
            CampaignChatParticipant.left_at.is_(None)
        ).all()

        return jsonify({
            'chat': chat.to_dict(user_id=user_id),
            'participants': [p.to_dict() for p in participants]
        }), 200

    except Exception as e:
        print(f"Error fetching chat details: {str(e)}")
        return jsonify({'error': str(e)}), 500


# ==================== Message Management ====================

@bp.route('/<int:chat_id>/messages', methods=['GET'])
@jwt_required()
def get_chat_messages(chat_id):
    """
    Get messages for a chat with pagination
    Query params: page (default: 1), per_page (default: 50)
    """
    try:
        user_id = int(get_jwt_identity())

        chat = CampaignChat.query.get(chat_id)
        if not chat:
            return jsonify({'error': 'Chat not found'}), 404

        # Verify user is a participant
        participant = chat.get_participant_for_user(user_id)
        if not participant or participant.left_at is not None:
            return jsonify({'error': 'Unauthorized: You are not a participant in this chat'}), 403

        # Pagination
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 50, type=int)

        # Get messages (newest first)
        messages_query = CampaignChatMessage.query.filter_by(
            chat_id=chat_id,
            is_deleted=False
        ).order_by(CampaignChatMessage.created_at.desc())

        paginated_messages = messages_query.paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )

        # Mark messages as read
        chat.mark_as_read_for_user(user_id)

        return jsonify({
            'messages': [msg.to_dict() for msg in paginated_messages.items],
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': paginated_messages.total,
                'pages': paginated_messages.pages,
                'has_next': paginated_messages.has_next,
                'has_prev': paginated_messages.has_prev
            }
        }), 200

    except Exception as e:
        print(f"Error fetching messages: {str(e)}")
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:chat_id>/messages', methods=['POST'])
@jwt_required()
def send_message(chat_id):
    """
    Send a message in a chat
    Body: {
        content: str,
        message_type: 'text' | 'image' | 'file' | 'system' (default: 'text'),
        attachments: [{ url: str, name: str, type: str }] (optional)
    }
    """
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if not user:
            return jsonify({'error': 'User not found'}), 404

        chat = CampaignChat.query.get(chat_id)
        if not chat:
            return jsonify({'error': 'Chat not found'}), 404

        # Verify user is a participant
        participant = chat.get_participant_for_user(user_id)
        if not participant or participant.left_at is not None:
            return jsonify({'error': 'Unauthorized: You are not a participant in this chat'}), 403

        data = request.get_json()
        content = data.get('content', '').strip()
        message_type = data.get('message_type', 'text')
        attachments = data.get('attachments', [])

        if not content:
            return jsonify({'error': 'Message content is required'}), 400

        # Create message
        message = CampaignChatMessage(
            chat_id=chat_id,
            sender_id=user_id,
            sender_type=user.user_type,
            message_type=message_type,
            content=content,
            attachments=attachments
        )
        db.session.add(message)
        db.session.commit()

        # Send notifications to other participants
        send_message_notifications(chat, message, user)

        return jsonify({
            'message': 'Message sent successfully',
            'data': message.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        print(f"Error sending message: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@bp.route('/messages/<int:message_id>', methods=['PUT'])
@jwt_required()
def edit_message(message_id):
    """
    Edit a message
    Body: { content: str }
    """
    try:
        user_id = int(get_jwt_identity())

        message = CampaignChatMessage.query.get(message_id)
        if not message:
            return jsonify({'error': 'Message not found'}), 404

        # Verify user is the sender
        if message.sender_id != user_id:
            return jsonify({'error': 'Unauthorized: You can only edit your own messages'}), 403

        # Cannot edit deleted messages
        if message.is_deleted:
            return jsonify({'error': 'Cannot edit deleted message'}), 400

        data = request.get_json()
        new_content = data.get('content', '').strip()

        if not new_content:
            return jsonify({'error': 'Content is required'}), 400

        message.edit_content(new_content)

        return jsonify({
            'message': 'Message edited successfully',
            'data': message.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error editing message: {str(e)}")
        return jsonify({'error': str(e)}), 500


@bp.route('/messages/<int:message_id>', methods=['DELETE'])
@jwt_required()
def delete_message(message_id):
    """Delete (soft delete) a message"""
    try:
        user_id = int(get_jwt_identity())

        message = CampaignChatMessage.query.get(message_id)
        if not message:
            return jsonify({'error': 'Message not found'}), 404

        # Verify user is the sender
        if message.sender_id != user_id:
            return jsonify({'error': 'Unauthorized: You can only delete your own messages'}), 403

        message.soft_delete()

        return jsonify({
            'message': 'Message deleted successfully'
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error deleting message: {str(e)}")
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:chat_id>/mark-read', methods=['POST'])
@jwt_required()
def mark_chat_as_read(chat_id):
    """Mark all messages in a chat as read"""
    try:
        user_id = int(get_jwt_identity())

        chat = CampaignChat.query.get(chat_id)
        if not chat:
            return jsonify({'error': 'Chat not found'}), 404

        # Verify user is a participant
        participant = chat.get_participant_for_user(user_id)
        if not participant or participant.left_at is not None:
            return jsonify({'error': 'Unauthorized: You are not a participant in this chat'}), 403

        chat.mark_as_read_for_user(user_id)

        return jsonify({
            'message': 'Chat marked as read'
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error marking chat as read: {str(e)}")
        return jsonify({'error': str(e)}), 500


# ==================== Participant Management ====================

@bp.route('/<int:chat_id>/mute', methods=['POST'])
@jwt_required()
def toggle_mute(chat_id):
    """Toggle mute status for a chat"""
    try:
        user_id = int(get_jwt_identity())

        chat = CampaignChat.query.get(chat_id)
        if not chat:
            return jsonify({'error': 'Chat not found'}), 404

        participant = chat.get_participant_for_user(user_id)
        if not participant or participant.left_at is not None:
            return jsonify({'error': 'Unauthorized: You are not a participant in this chat'}), 403

        # Toggle mute
        participant.is_muted = not participant.is_muted
        db.session.commit()

        return jsonify({
            'message': f"Chat {'muted' if participant.is_muted else 'unmuted'} successfully",
            'is_muted': participant.is_muted
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error toggling mute: {str(e)}")
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:chat_id>/leave', methods=['POST'])
@jwt_required()
def leave_chat(chat_id):
    """Leave a chat (only for broadcast chats)"""
    try:
        user_id = int(get_jwt_identity())

        chat = CampaignChat.query.get(chat_id)
        if not chat:
            return jsonify({'error': 'Chat not found'}), 404

        if chat.chat_type != 'broadcast':
            return jsonify({'error': 'Can only leave broadcast chats'}), 400

        participant = chat.get_participant_for_user(user_id)
        if not participant or participant.left_at is not None:
            return jsonify({'error': 'You are not in this chat'}), 403

        # Mark as left
        participant.left_at = datetime.utcnow()
        db.session.commit()

        return jsonify({
            'message': 'Left chat successfully'
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error leaving chat: {str(e)}")
        return jsonify({'error': str(e)}), 500


# ==================== Helper Functions ====================

def send_message_notifications(chat, message, sender):
    """Send notifications to other chat participants about new message"""
    try:
        # Get all participants except sender
        participants = CampaignChatParticipant.query.filter(
            CampaignChatParticipant.chat_id == chat.id,
            CampaignChatParticipant.user_id != sender.id,
            CampaignChatParticipant.left_at.is_(None),
            CampaignChatParticipant.is_muted == False
        ).all()

        sender_name = sender.email
        if sender.user_type == 'creator' and hasattr(sender, 'creator_profile') and sender.creator_profile:
            sender_name = sender.creator_profile.display_name
        elif sender.user_type == 'brand' and hasattr(sender, 'brand_profile') and sender.brand_profile:
            sender_name = sender.brand_profile.company_name
            try:
                if chat.campaign and chat.campaign.workspace:
                    sender_name = chat.campaign.workspace.name or sender_name
                elif chat.campaign and chat.campaign.brand:
                    sender_name = chat.campaign.brand.company_name or sender_name
            except Exception:
                pass

        # Create notifications
        for participant in participants:
            notification = Notification(
                user_id=participant.user_id,
                type='campaign_message',
                title=f'New message from {sender_name}',
                message=f'{sender_name}: {message.content[:50]}{"..." if len(message.content) > 50 else ""}',
                action_url=f'/campaigns/{chat.campaign_id}?tab=chat'
            )
            db.session.add(notification)

        db.session.commit()

    except Exception as e:
        print(f"Error sending message notifications: {e}")
        # Don't fail the message send if notification fails
        pass
