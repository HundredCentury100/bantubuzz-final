from datetime import datetime
from html import escape

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app import db
from app.models import (
    CreatorProfile,
    CreatorTeamAuditLog,
    CreatorTeamInvitation,
    CreatorTeamMember,
    User,
)
from app.services.creator_team_service import (
    CREATOR_TEAM_ROLE_PERMISSIONS,
    INVITABLE_CREATOR_TEAM_ROLES,
    get_creator_team_usage,
    log_creator_team_audit,
    save_creator_team_member,
)
from app.services.email_service import send_email

bp = Blueprint('creator_team', __name__)


def _frontend_url(path):
    base = (request.host_url or 'https://bantubuzz.com/').rstrip('/')
    if 'localhost' not in base and '127.0.0.1' not in base:
        base = 'https://bantubuzz.com'
    return f"{base}{path}"


def _creator_display_name(creator):
    return (
        getattr(creator, 'username', None)
        or getattr(creator, 'display_name', None)
        or getattr(creator, 'full_name', None)
        or 'this creator'
    )


def _current_creator_owner():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return None, None, ('User not found', 404)
    if user.user_type != 'creator':
        return user, None, ('Only creator accounts can manage creator teams', 403)
    creator = CreatorProfile.query.filter_by(user_id=user.id).first()
    if not creator:
        return user, None, ('Creator profile not found', 404)
    return user, creator, None


def _send_creator_team_invitation_email(invitation, creator, inviter):
    creator_name = _creator_display_name(creator)
    invite_url = _frontend_url(f'/creator/team-invite/{invitation.token}')
    inviter_name = inviter.email
    subject = f'You have been invited to manage {creator_name} on BantuBuzz'
    text_body = f"""
You have been invited to help manage {creator_name} on BantuBuzz.

{inviter_name} invited you as a {invitation.role}.

Accept your invitation:
{invite_url}

This invite expires on {invitation.expires_at.strftime('%Y-%m-%d')}.
"""
    html_body = f"""
<div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; color: #1F2937;">
  <div style="background: #B5E61D; padding: 20px; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0; font-size: 24px;">BantuBuzz</h1>
  </div>
  <div style="border: 1px solid #E5E7EB; border-top: 0; padding: 28px; border-radius: 0 0 8px 8px;">
    <h2 style="margin-top: 0;">Creator Team Invitation</h2>
    <p>{escape(inviter_name)} invited you as a <strong>{escape(invitation.role)}</strong> to help manage <strong>{escape(creator_name)}</strong> on BantuBuzz.</p>
    <p style="margin: 28px 0;">
      <a href="{invite_url}" style="background: #B5E61D; color: #1F2937; padding: 12px 18px; border-radius: 8px; text-decoration: none; font-weight: 700;">Accept Invitation</a>
    </p>
    <p style="color: #6B7280; font-size: 14px;">This invite expires on {invitation.expires_at.strftime('%Y-%m-%d')}.</p>
  </div>
</div>
"""
    return send_email(subject, invitation.email, text_body, html_body, async_send=False)


@bp.route('', methods=['GET'])
@jwt_required()
def list_creator_team():
    user, creator, error = _current_creator_owner()
    if error:
        message, status = error
        return jsonify({'error': message}), status

    expire_count = 0
    for invitation in CreatorTeamInvitation.query.filter_by(creator_id=creator.id, status='pending').all():
        if invitation.is_expired():
            invitation.status = 'expired'
            invitation.updated_at = datetime.utcnow()
            expire_count += 1
    if expire_count:
        db.session.commit()

    members = CreatorTeamMember.query.filter_by(creator_id=creator.id).order_by(CreatorTeamMember.created_at.asc()).all()
    invitations = CreatorTeamInvitation.query.filter_by(
        creator_id=creator.id,
        status='pending',
    ).order_by(CreatorTeamInvitation.created_at.desc()).all()
    audit_logs = CreatorTeamAuditLog.query.filter_by(
        creator_id=creator.id,
    ).order_by(CreatorTeamAuditLog.created_at.desc()).limit(50).all()

    usage = get_creator_team_usage(creator)
    return jsonify({
        'creator': creator.to_dict() if hasattr(creator, 'to_dict') else {'id': creator.id, 'username': creator.username},
        'members': [member.to_dict() for member in members],
        'invitations': [invitation.to_dict() for invitation in invitations if not invitation.is_expired()],
        'seat_usage': {k: v for k, v in usage.items() if k != 'plan'},
        'audit_logs': [log.to_dict() for log in audit_logs],
        'roles': [
            {'value': 'manager', 'label': 'Manager'},
            {'value': 'agent', 'label': 'Agent'},
        ],
    }), 200


@bp.route('/members', methods=['POST'])
@jwt_required()
def invite_creator_team_member():
    inviter, creator, error = _current_creator_owner()
    if error:
        message, status = error
        return jsonify({'error': message}), status

    data = request.get_json() or {}
    email = (data.get('email') or '').strip().lower()
    role = (data.get('role') or 'manager').strip().lower()

    if not email:
        return jsonify({'error': 'Email is required'}), 400
    if role not in INVITABLE_CREATOR_TEAM_ROLES:
        return jsonify({'error': 'Invalid role. Choose Manager or Agent.'}), 400
    if email == inviter.email.lower():
        return jsonify({'error': 'You are already the creator account owner'}), 400

    existing_user = User.query.filter_by(email=email).first()
    if existing_user:
        existing_member = CreatorTeamMember.query.filter_by(creator_id=creator.id, user_id=existing_user.id).first()
        if existing_member:
            existing_member.role = role
            existing_member.permissions = CREATOR_TEAM_ROLE_PERMISSIONS[role]
            existing_member.updated_at = datetime.utcnow()
            log_creator_team_audit(
                creator,
                'member_role_updated',
                email,
                role,
                actor_user_id=inviter.id,
                target_user_id=existing_user.id,
            )
            db.session.commit()
            return jsonify({
                'message': 'Creator team member role updated',
                'member': existing_member.to_dict(),
                'seat_usage': {k: v for k, v in get_creator_team_usage(creator).items() if k != 'plan'},
            }), 200

    invitation = CreatorTeamInvitation.query.filter_by(
        creator_id=creator.id,
        email=email,
        status='pending',
    ).first()
    if invitation and invitation.is_expired():
        invitation.status = 'expired'
        invitation.updated_at = datetime.utcnow()
        invitation = None

    if not invitation and get_creator_team_usage(creator)['available'] <= 0:
        usage = get_creator_team_usage(creator)
        return jsonify({
            'error': f"Team seat limit reached for your {usage['plan_name']} plan. Rising includes 2 team members and Creator Pro includes 5.",
            'seat_usage': {k: v for k, v in usage.items() if k != 'plan'},
        }), 403

    if not invitation:
        invitation = CreatorTeamInvitation(
            creator_id=creator.id,
            invited_by_user_id=inviter.id,
            email=email,
            token=CreatorTeamInvitation.generate_token(),
        )
        db.session.add(invitation)

    invitation.role = role
    invitation.permissions = CREATOR_TEAM_ROLE_PERMISSIONS[role]
    invitation.expires_at = CreatorTeamInvitation.default_expiry()
    invitation.updated_at = datetime.utcnow()
    log_creator_team_audit(
        creator,
        'invitation_sent',
        email,
        role,
        actor_user_id=inviter.id,
        details={'expires_at': invitation.expires_at.isoformat()},
    )
    db.session.commit()

    if not _send_creator_team_invitation_email(invitation, creator, inviter):
        return jsonify({'error': 'Invitation was created, but the email could not be sent. Please check SMTP settings or resend the invite.'}), 502

    return jsonify({
        'message': 'Creator team invitation sent',
        'invitation': invitation.to_dict(),
        'seat_usage': {k: v for k, v in get_creator_team_usage(creator).items() if k != 'plan'},
    }), 202


@bp.route('/members/<int:member_id>', methods=['DELETE'])
@jwt_required()
def remove_creator_team_member(member_id):
    owner, creator, error = _current_creator_owner()
    if error:
        message, status = error
        return jsonify({'error': message}), status

    member = CreatorTeamMember.query.filter_by(creator_id=creator.id, id=member_id).first()
    if not member:
        return jsonify({'error': 'Creator team member not found'}), 404

    log_creator_team_audit(
        creator,
        'member_removed',
        member.user.email if member.user else '',
        member.role,
        actor_user_id=owner.id,
        target_user_id=member.user_id,
    )
    db.session.delete(member)
    db.session.commit()
    return jsonify({
        'message': 'Creator team member removed',
        'seat_usage': {k: v for k, v in get_creator_team_usage(creator).items() if k != 'plan'},
    }), 200


@bp.route('/invitations/<int:invitation_id>', methods=['DELETE'])
@jwt_required()
def cancel_creator_team_invitation(invitation_id):
    owner, creator, error = _current_creator_owner()
    if error:
        message, status = error
        return jsonify({'error': message}), status

    invitation = CreatorTeamInvitation.query.filter_by(creator_id=creator.id, id=invitation_id).first()
    if not invitation:
        return jsonify({'error': 'Invitation not found'}), 404

    invitation.status = 'cancelled'
    invitation.updated_at = datetime.utcnow()
    log_creator_team_audit(
        creator,
        'invitation_cancelled',
        invitation.email,
        invitation.role,
        actor_user_id=owner.id,
        details={'invitation_id': invitation.id},
    )
    db.session.commit()
    return jsonify({
        'message': 'Creator team invitation cancelled',
        'seat_usage': {k: v for k, v in get_creator_team_usage(creator).items() if k != 'plan'},
    }), 200


@bp.route('/invitations/<token>', methods=['GET'])
def get_creator_team_invitation(token):
    invitation = CreatorTeamInvitation.query.filter_by(token=token, status='pending').first()
    if not invitation or invitation.is_expired():
        if invitation and invitation.status == 'pending':
            invitation.status = 'expired'
            invitation.updated_at = datetime.utcnow()
            db.session.commit()
        return jsonify({'error': 'Invitation not found or expired'}), 404
    return jsonify({
        'invitation': invitation.to_dict(),
        'creator': {
            'id': invitation.creator.id,
            'username': invitation.creator.username,
            'display_name': _creator_display_name(invitation.creator),
            'profile_image': invitation.creator.profile_image,
        },
    }), 200


@bp.route('/invitations/<token>/accept', methods=['POST'])
@jwt_required()
def accept_creator_team_invitation(token):
    user = User.query.get(int(get_jwt_identity()))
    invitation = CreatorTeamInvitation.query.filter_by(token=token, status='pending').first()
    if not invitation or invitation.is_expired():
        return jsonify({'error': 'Invitation not found or expired'}), 404
    if not user or user.email.lower() != invitation.email.lower():
        return jsonify({'error': 'Please sign in with the email address that received this invitation'}), 403
    if invitation.creator.user_id == user.id:
        return jsonify({'error': 'You are already the creator account owner'}), 400

    existing_member = CreatorTeamMember.query.filter_by(
        creator_id=invitation.creator_id,
        user_id=user.id,
    ).first()
    usage = get_creator_team_usage(invitation.creator, exclude_invitation_id=invitation.id)
    if not existing_member and usage['available'] <= 0:
        return jsonify({
            'error': f"Team seat limit reached for the {usage['plan_name']} plan. Ask the creator to upgrade or remove a member.",
            'seat_usage': {k: v for k, v in usage.items() if k != 'plan'},
        }), 403

    member = save_creator_team_member(
        invitation.creator,
        user,
        invitation.role,
        invitation.permissions,
    )
    invitation.status = 'accepted'
    invitation.accepted_at = datetime.utcnow()
    invitation.updated_at = datetime.utcnow()
    log_creator_team_audit(
        invitation.creator,
        'invitation_accepted',
        invitation.email,
        invitation.role,
        target_user_id=user.id,
    )
    db.session.commit()

    return jsonify({
        'message': 'Creator team invitation accepted',
        'member': member.to_dict(),
        'creator': {
            'id': invitation.creator.id,
            'username': invitation.creator.username,
            'display_name': _creator_display_name(invitation.creator),
        },
    }), 200
