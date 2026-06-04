import re
from decimal import Decimal

from flask import request

from app import db
from app.models import (
    BrandProfile,
    ClientWorkspace,
    Subscription,
    User,
    WorkspaceAddon,
    WorkspaceMemberPermission,
)


DEFAULT_INCLUDED_WORKSPACES = 10
EXTRA_WORKSPACE_MONTHLY_PRICE = Decimal('30.00')
EXTRA_WORKSPACE_YEARLY_PRICE = Decimal('300.00')


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


def get_active_subscription(user_id):
    return Subscription.query.filter_by(user_id=user_id, status='active').first()


def get_workspace_limit(user_id):
    subscription = get_active_subscription(user_id)
    plan = subscription.plan if subscription else None
    if not plan:
        return 0, None
    return int(plan.max_client_workspaces or 0), plan


def is_agency_user(user):
    if not user or user.user_type != 'brand':
        return False
    limit, plan = get_workspace_limit(user.id)
    return bool(plan and (plan.slug in ['agency', 'brand-agency'] or limit > 0))


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

    if brand and workspace.agency_brand_id == brand.id:
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


def user_has_workspace_permission(user, workspace, permission):
    brand = get_agency_brand(user.id) if user.user_type == 'brand' else None
    if brand and workspace.agency_brand_id == brand.id:
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

    if active_count <= included_limit:
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
