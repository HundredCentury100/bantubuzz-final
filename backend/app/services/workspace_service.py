import re
import secrets
from decimal import Decimal
from datetime import datetime

from flask import request
from flask_jwt_extended import get_jwt

from app import db
from app.models import (
    BrandProfile,
    ClientWorkspace,
    Subscription,
    User,
    WorkspaceAddon,
    WorkspaceInvitation,
    WorkspaceMemberPermission,
)
from app.services.agency_subscription_service import is_agency_plan


DEFAULT_INCLUDED_WORKSPACES = 10
EXTRA_WORKSPACE_MONTHLY_PRICE = Decimal('30.00')
EXTRA_WORKSPACE_YEARLY_PRICE = Decimal('300.00')
PLAN_TEAM_MEMBER_LIMITS = {
    'free': 1,
    'starter': 2,
    'pro': 3,
    'premium': 5,
    'agency': 10,
    'brand-agency': 10,
    'enterprise': 10,
}


ROLE_PERMISSIONS = {
    'owner': {
        'can_manage_campaigns': True,
        'can_manage_creators': True,
        'can_view_analytics': True,
        'can_manage_billing': True,
        'can_invite_members': True,
    },
    'admin': {
        'can_manage_campaigns': True,
        'can_manage_creators': True,
        'can_view_analytics': True,
        'can_manage_billing': True,
        'can_invite_members': True,
    },
    'manager': {
        'can_manage_campaigns': True,
        'can_manage_creators': True,
        'can_view_analytics': True,
        'can_manage_billing': False,
        'can_invite_members': False,
    },
    'viewer': {
        'can_manage_campaigns': False,
        'can_manage_creators': False,
        'can_view_analytics': True,
        'can_manage_billing': False,
        'can_invite_members': False,
    },
    'finance': {
        'can_manage_campaigns': False,
        'can_manage_creators': False,
        'can_view_analytics': True,
        'can_manage_billing': True,
        'can_invite_members': False,
    },
}


def slugify(value):
    slug = re.sub(r'[^a-z0-9]+', '-', (value or '').strip().lower()).strip('-')
    return slug or 'client'


def _unique_brand_username(base_name):
    base = slugify(base_name).replace('-', '_')[:40] or 'client_brand'
    username = base
    suffix = 2
    while BrandProfile.query.filter_by(username=username).first():
        username = f'{base[:36]}_{suffix}'
        suffix += 1
    return username


def _unique_managed_brand_email(workspace):
    base = slugify(workspace.slug or workspace.name or f'workspace-{workspace.id}')
    email = f'client+workspace-{workspace.id}-{base}@agency-managed.bantubuzz.local'
    suffix = 2
    while User.query.filter_by(email=email).first():
        email = f'client+workspace-{workspace.id}-{base}-{suffix}@agency-managed.bantubuzz.local'
        suffix += 1
    return email


def ensure_workspace_client_brand(workspace):
    """Ensure a client workspace has a real brand user/profile behind it."""
    if not workspace:
        return None

    if workspace.client_brand_id:
        existing = BrandProfile.query.get(workspace.client_brand_id)
        if existing:
            return existing

    email = (workspace.billing_email or '').strip().lower()
    user = User.query.filter_by(email=email).first() if email else None
    if user and user.user_type == 'brand' and user.brand_profile:
        client_brand = user.brand_profile
    else:
        if not email or user:
            email = _unique_managed_brand_email(workspace)
        user = User(email=email, user_type='brand', password=secrets.token_urlsafe(24))
        user.is_verified = True
        db.session.add(user)
        db.session.flush()
        client_brand = BrandProfile(
            user_id=user.id,
            username=_unique_brand_username(workspace.name),
            company_name=workspace.name,
            account_type='brand',
            logo=workspace.logo,
            industry=workspace.industry,
            website=workspace.website,
            description=workspace.description,
        )
        db.session.add(client_brand)
        db.session.flush()

    workspace.client_brand_id = client_brand.id
    workspace.name = client_brand.company_name or workspace.name
    if not workspace.logo and client_brand.logo:
        workspace.logo = client_brand.logo
    if not workspace.industry and client_brand.industry:
        workspace.industry = client_brand.industry
    if not workspace.website and client_brand.website:
        workspace.website = client_brand.website
    if not workspace.description and client_brand.description:
        workspace.description = client_brand.description
    return client_brand


def get_active_subscription(user_id):
    return Subscription.query.filter_by(user_id=user_id, status='active').first()


def get_workspace_limit(user_id):
    subscription = get_active_subscription(user_id)
    plan = subscription.plan if subscription else None
    if not plan:
        return 0, None
    return int(plan.max_client_workspaces or 0), plan


def get_team_member_limit(user_id):
    subscription = get_active_subscription(user_id)
    plan = subscription.plan if subscription else None
    if not plan:
        return PLAN_TEAM_MEMBER_LIMITS['free'], None

    slug = (plan.slug or '').lower()
    fallback_limit = PLAN_TEAM_MEMBER_LIMITS.get(slug)
    configured_limit = int(plan.max_team_members or 0)
    if is_agency_plan(plan):
        return max(configured_limit, PLAN_TEAM_MEMBER_LIMITS['agency']), plan
    if fallback_limit:
        return fallback_limit, plan
    return configured_limit or PLAN_TEAM_MEMBER_LIMITS['free'], plan


def expire_workspace_invitations(workspace_id):
    expired = WorkspaceInvitation.query.filter(
        WorkspaceInvitation.workspace_id == workspace_id,
        WorkspaceInvitation.status == 'pending',
        WorkspaceInvitation.expires_at < datetime.utcnow(),
    ).all()
    for invitation in expired:
        invitation.status = 'expired'
        invitation.updated_at = datetime.utcnow()
    return len(expired)


def get_workspace_seat_usage(workspace, exclude_invitation_id=None):
    expire_workspace_invitations(workspace.id)
    member_count = WorkspaceMemberPermission.query.filter(
        WorkspaceMemberPermission.workspace_id == workspace.id,
        WorkspaceMemberPermission.role != 'owner',
    ).count()
    pending_query = WorkspaceInvitation.query.filter(
        WorkspaceInvitation.workspace_id == workspace.id,
        WorkspaceInvitation.status == 'pending',
        WorkspaceInvitation.expires_at >= datetime.utcnow(),
    )
    if exclude_invitation_id:
        pending_query = pending_query.filter(WorkspaceInvitation.id != exclude_invitation_id)
    pending_count = pending_query.count()
    owner_user_id = workspace.agency_brand.user_id if workspace.agency_brand else None
    limit, plan = get_team_member_limit(owner_user_id) if owner_user_id else (PLAN_TEAM_MEMBER_LIMITS['free'], None)
    used = member_count + pending_count
    return {
        'used': used,
        'members': member_count,
        'pending_invitations': pending_count,
        'limit': limit,
        'available': max(0, limit - used) if limit >= 0 else None,
        'plan': plan,
    }


def is_agency_user(user):
    if not user or user.user_type != 'brand':
        return False
    limit, plan = get_workspace_limit(user.id)
    return bool(plan and is_agency_plan(plan))


def get_agency_brand(user_id):
    return BrandProfile.query.filter_by(user_id=user_id).first()


def get_request_workspace_id(data=None):
    raw_value = (
        request.headers.get('X-Workspace-Id')
        or request.args.get('workspace_id')
        or (data or {}).get('workspace_id')
    )
    if raw_value in [None, '', 'all', 'null', 'undefined']:
        return None
    try:
        return int(raw_value)
    except (TypeError, ValueError):
        return None


def get_accessible_workspace(user, workspace_id):
    if not workspace_id:
        return None

    brand = get_agency_brand(user.id) if user.user_type == 'brand' else None
    workspace = ClientWorkspace.query.filter_by(id=workspace_id, is_active=True).first()
    if not workspace:
        return None

    # A delegated client tab authenticates as the real client brand. Its JWT
    # also carries the agency actor that opened the tab, so workspace authority
    # remains available without pretending the agency profile is the client.
    try:
        claims = get_jwt()
    except RuntimeError:
        claims = {}
    delegated_actor_id = claims.get('agency_actor_user_id') if claims.get('managed_by_agency') else None
    delegated_actor = User.query.get(int(delegated_actor_id)) if delegated_actor_id else None
    delegated_brand = get_agency_brand(delegated_actor.id) if delegated_actor else None

    if brand and workspace.client_brand_id == brand.id:
        return workspace

    if brand and workspace.agency_brand_id == brand.id:
        return workspace

    if delegated_brand and workspace.agency_brand_id == delegated_brand.id:
        return workspace

    membership = WorkspaceMemberPermission.query.filter_by(
        workspace_id=workspace_id,
        user_id=user.id,
    ).first()
    if membership:
        return workspace

    return None


def require_workspace_access(user_id, workspace_id, permission=None):
    user = User.query.get(int(user_id))
    if not user:
        return None, 'User not found', 404

    if not workspace_id:
        return None, None, None

    workspace = get_accessible_workspace(user, workspace_id)
    if not workspace:
        return None, 'Workspace not found or unauthorized', 403

    if permission and not user_has_workspace_permission(user, workspace, permission):
        return None, 'You do not have permission for this workspace action', 403

    return workspace, None, None


def get_context_brand_profile(user):
    """Resolve the brand represented by this request, including agency-managed clients."""
    if not user or user.user_type != 'brand':
        return None

    try:
        claims = get_jwt()
    except RuntimeError:
        claims = {}

    # In a managed tab the JWT identity is the actual client-brand user. Never
    # fall back to the parent agency profile for this request.
    managed_brand_id = claims.get('client_brand_id') if claims.get('managed_by_agency') else None
    if managed_brand_id:
        managed_brand = BrandProfile.query.get(managed_brand_id)
        if managed_brand and managed_brand.user_id == user.id:
            return managed_brand

    workspace_id = get_request_workspace_id()
    if workspace_id:
        workspace = get_accessible_workspace(user, workspace_id)
        if workspace:
            return ensure_workspace_client_brand(workspace)

    return get_agency_brand(user.id)


def user_has_workspace_permission(user, workspace, permission):
    brand = get_agency_brand(user.id) if user.user_type == 'brand' else None
    if brand and workspace.client_brand_id == brand.id:
        # The represented client brand has normal brand capabilities within its
        # own workspace. Agency limits remain enforced by the calling route.
        return True
    if brand and workspace.agency_brand_id == brand.id:
        return True

    try:
        claims = get_jwt()
    except RuntimeError:
        claims = {}
    delegated_actor_id = claims.get('agency_actor_user_id') if claims.get('managed_by_agency') else None
    delegated_actor = User.query.get(int(delegated_actor_id)) if delegated_actor_id else None
    delegated_brand = get_agency_brand(delegated_actor.id) if delegated_actor else None
    if delegated_brand and workspace.agency_brand_id == delegated_brand.id:
        return True

    membership = WorkspaceMemberPermission.query.filter_by(
        workspace_id=workspace.id,
        user_id=user.id,
    ).first()
    if not membership:
        return False

    permissions = {**ROLE_PERMISSIONS.get(membership.role, {}), **(membership.permissions or {})}
    return bool(permissions.get(permission))


def scope_query_to_workspace(query, model, workspace_id):
    if workspace_id and hasattr(model, 'workspace_id'):
        return query.filter(model.workspace_id == workspace_id)
    return query


def create_workspace_addon_if_needed(workspace, subscription, included_limit, billing_cycle):
    active_count = ClientWorkspace.query.filter_by(
        agency_brand_id=workspace.agency_brand_id,
        is_active=True,
    ).count()

    # New workspaces are normally active before this helper is called, while an
    # approved existing-brand connection starts inactive. Count the candidate
    # once in both flows so approval cannot bypass the agency workspace limit.
    projected_count = active_count if workspace.is_active else active_count + 1
    if projected_count <= included_limit:
        return None

    amount = EXTRA_WORKSPACE_YEARLY_PRICE if billing_cycle == 'yearly' else EXTRA_WORKSPACE_MONTHLY_PRICE
    workspace.is_active = False
    addon = WorkspaceAddon(
        workspace_id=workspace.id,
        subscription_id=subscription.id if subscription else None,
        billing_cycle=billing_cycle,
        amount=amount,
        status='pending',
        payment_status='pending',
    )
    db.session.add(addon)
    return addon
