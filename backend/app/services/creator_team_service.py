from datetime import datetime

from app import db
from app.models import (
    CreatorProfile,
    CreatorTeamAuditLog,
    CreatorTeamInvitation,
    CreatorTeamMember,
    Subscription,
    User,
)


CREATOR_TEAM_LIMITS = {
    'creator-free': 0,
    'free': 0,
    'rising': 2,
    'pro-creator': 5,
}

CREATOR_TEAM_ROLE_PERMISSIONS = {
    'owner': {
        'can_manage_profile': True,
        'can_manage_packages': True,
        'can_manage_collaborations': True,
        'can_manage_messages': True,
        'can_view_analytics': True,
        'can_manage_billing': True,
        'can_invite_members': True,
    },
    'manager': {
        'can_manage_profile': True,
        'can_manage_packages': True,
        'can_manage_collaborations': True,
        'can_manage_messages': True,
        'can_view_analytics': True,
        'can_manage_billing': False,
        'can_invite_members': False,
    },
    'agent': {
        'can_manage_profile': False,
        'can_manage_packages': False,
        'can_manage_collaborations': True,
        'can_manage_messages': True,
        'can_view_analytics': True,
        'can_manage_billing': False,
        'can_invite_members': False,
    },
}

INVITABLE_CREATOR_TEAM_ROLES = {'manager', 'agent'}


def get_creator_for_owner(user_id):
    return CreatorProfile.query.filter_by(user_id=int(user_id)).first()


def get_active_creator_plan(user_id):
    subscription = Subscription.query.filter_by(user_id=int(user_id), status='active').first()
    return subscription.plan if subscription and subscription.plan else None


def get_creator_team_limit(creator):
    plan = get_active_creator_plan(creator.user_id)
    slug = (plan.slug if plan else 'creator-free') or 'creator-free'
    return CREATOR_TEAM_LIMITS.get(slug.lower(), 0), plan


def expire_creator_team_invitations(creator_id):
    expired = CreatorTeamInvitation.query.filter(
        CreatorTeamInvitation.creator_id == creator_id,
        CreatorTeamInvitation.status == 'pending',
        CreatorTeamInvitation.expires_at < datetime.utcnow(),
    ).all()
    for invitation in expired:
        invitation.status = 'expired'
        invitation.updated_at = datetime.utcnow()
    return len(expired)


def get_creator_team_usage(creator, exclude_invitation_id=None):
    expire_creator_team_invitations(creator.id)
    member_count = CreatorTeamMember.query.filter_by(creator_id=creator.id).count()
    pending_query = CreatorTeamInvitation.query.filter(
        CreatorTeamInvitation.creator_id == creator.id,
        CreatorTeamInvitation.status == 'pending',
        CreatorTeamInvitation.expires_at >= datetime.utcnow(),
    )
    if exclude_invitation_id:
        pending_query = pending_query.filter(CreatorTeamInvitation.id != exclude_invitation_id)
    pending_count = pending_query.count()
    limit, plan = get_creator_team_limit(creator)
    used = member_count + pending_count
    return {
        'used': used,
        'members': member_count,
        'pending_invitations': pending_count,
        'limit': limit,
        'available': max(0, limit - used),
        'plan': plan,
        'plan_name': plan.name if plan else 'Free',
        'plan_slug': plan.slug if plan else 'creator-free',
    }


def save_creator_team_member(creator, user, role, permissions=None):
    membership = CreatorTeamMember.query.filter_by(
        creator_id=creator.id,
        user_id=user.id,
    ).first()
    if not membership:
        membership = CreatorTeamMember(creator_id=creator.id, user_id=user.id)
        db.session.add(membership)
    membership.role = role
    membership.permissions = permissions or CREATOR_TEAM_ROLE_PERMISSIONS[role]
    membership.updated_at = datetime.utcnow()
    return membership


def user_has_creator_team_permission(user, creator, permission):
    if not user or not creator:
        return False
    if creator.user_id == user.id:
        return True
    membership = CreatorTeamMember.query.filter_by(creator_id=creator.id, user_id=user.id).first()
    if not membership:
        return False
    permissions = {
        **CREATOR_TEAM_ROLE_PERMISSIONS.get(membership.role, {}),
        **(membership.permissions or {}),
    }
    return bool(permissions.get(permission))


def get_accessible_creator_profile(user, permission=None):
    if not user:
        return None
    owned = CreatorProfile.query.filter_by(user_id=user.id).first()
    if owned:
        return owned
    membership = CreatorTeamMember.query.filter_by(user_id=user.id).first()
    if not membership:
        return None
    if permission and not user_has_creator_team_permission(user, membership.creator, permission):
        return None
    return membership.creator


def log_creator_team_audit(creator, action, target_email, role=None, actor_user_id=None, target_user_id=None, details=None):
    db.session.add(CreatorTeamAuditLog(
        creator_id=creator.id,
        actor_user_id=actor_user_id,
        target_user_id=target_user_id,
        target_email=(target_email or '').lower(),
        action=action,
        role=role,
        details=details or {},
    ))
