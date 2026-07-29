from datetime import datetime, timedelta
from html import escape
from io import StringIO
import csv
import os
import re

from flask import Blueprint, current_app, jsonify, make_response, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from werkzeug.utils import secure_filename

from app import db
from app.models import (
    Booking,
    BrandProfile,
    Campaign,
    ClientWorkspace,
    Collaboration,
    Subscription,
    User,
    Wallet,
    WalletTransaction,
    WorkspaceAddon,
    WorkspaceAuditLog,
    WorkspaceInvitation,
    WorkspaceMemberPermission,
)
from app.services.workspace_service import (
    DEFAULT_INCLUDED_WORKSPACES,
    EXTRA_WORKSPACE_MONTHLY_PRICE,
    EXTRA_WORKSPACE_YEARLY_PRICE,
    ROLE_PERMISSIONS,
    create_workspace_addon_if_needed,
    get_active_subscription,
    get_workspace_seat_usage,
    get_workspace_limit,
    is_agency_user,
    require_workspace_access,
    slugify,
    user_has_workspace_permission,
)
from app.services.email_service import send_email
from app.services.white_label_report_service import generate_master_dashboard_pdf

bp = Blueprint('workspaces', __name__)

UPLOAD_FOLDER = '/var/www/bantubuzz/backend/uploads/payment_proofs'
ALLOWED_PROOF_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'pdf'}
INVITABLE_WORKSPACE_ROLES = {'admin', 'manager', 'viewer'}


def _allowed_proof_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_PROOF_EXTENSIONS


def _workspace_language(brand):
    account_type = getattr(brand, 'account_type', None) or 'brand'
    if account_type == 'enterprise':
        return {
            'account_type': 'enterprise',
            'workspace_singular': 'brand',
            'workspace_plural': 'brands',
            'add_label': 'Add Brand',
            'dashboard_title': 'Enterprise Dashboard',
            'dashboard_subtitle': 'All brands at a glance',
            'empty_state': "You haven't added any brands yet. Add your first brand.",
        }
    if account_type == 'agency':
        return {
            'account_type': 'agency',
            'workspace_singular': 'client',
            'workspace_plural': 'clients',
            'add_label': 'Add Client',
            'dashboard_title': 'Agency Dashboard',
            'dashboard_subtitle': 'All clients at a glance',
            'empty_state': "You haven't added any clients yet. Add your first client.",
        }
    return {
        'account_type': 'brand',
        'workspace_singular': 'workspace',
        'workspace_plural': 'workspaces',
        'add_label': 'Add Workspace',
        'dashboard_title': 'Workspace Dashboard',
        'dashboard_subtitle': 'All workspaces at a glance',
        'empty_state': "You haven't added any workspaces yet.",
    }


def _current_brand():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return None, None, ('User not found', 404)
    if user.user_type != 'brand':
        return user, None, ('Only brand accounts can manage client workspaces', 403)
    brand = BrandProfile.query.filter_by(user_id=user.id).first()
    if not brand:
        return user, None, ('Brand profile not found', 404)
    return user, brand, None


def _unique_slug(brand_id, name, workspace_id=None):
    base = slugify(name)
    slug = base
    suffix = 2
    while True:
        query = ClientWorkspace.query.filter_by(agency_brand_id=brand_id, slug=slug)
        if workspace_id:
            query = query.filter(ClientWorkspace.id != workspace_id)
        if not query.first():
            return slug
        slug = f'{base}-{suffix}'
        suffix += 1


def _parse_date_range():
    start_value = request.args.get('start_date')
    end_value = request.args.get('end_date')
    start_date = None
    end_date = None
    try:
        if start_value:
            start_date = datetime.strptime(start_value, '%Y-%m-%d')
        if end_value:
            end_date = datetime.strptime(end_value, '%Y-%m-%d') + timedelta(days=1)
    except ValueError:
        return None, None, 'Dates must use YYYY-MM-DD format'
    return start_date, end_date, None


def _apply_date_range(query, model, start_date, end_date):
    if start_date and hasattr(model, 'created_at'):
        query = query.filter(model.created_at >= start_date)
    if end_date and hasattr(model, 'created_at'):
        query = query.filter(model.created_at < end_date)
    return query


def _workspace_summary(workspace, start_date=None, end_date=None):
    paid_statuses = ['paid', 'verified']
    campaigns_query = Campaign.query.filter_by(workspace_id=workspace.id)
    campaigns_count = _apply_date_range(campaigns_query, Campaign, start_date, end_date).count()
    active_collaborations_query = Collaboration.query.filter_by(
        workspace_id=workspace.id,
        status='in_progress',
    )
    active_collaborations_count = active_collaborations_query.count()
    pending_approvals_query = Collaboration.query.filter(
        Collaboration.workspace_id == workspace.id,
        Collaboration.status == 'in_progress',
        Collaboration.draft_deliverables.isnot(None),
    )
    pending_approvals_count = pending_approvals_query.count()
    paid_bookings_query = Booking.query.filter(
        Booking.workspace_id == workspace.id,
        Booking.payment_status.in_(paid_statuses),
    )
    paid_bookings_query = _apply_date_range(paid_bookings_query, Booking, start_date, end_date)
    spend = sum(
        float(booking.total_price or booking.amount or 0)
        for booking in paid_bookings_query.all()
    )

    return {
        **workspace.to_dict(),
        'campaigns_count': campaigns_count,
        'active_collaborations_count': active_collaborations_count,
        'pending_approvals_count': pending_approvals_count,
        'total_spend': spend,
    }


def _master_dashboard_payload(brand, start_date=None, end_date=None):
    workspaces = ClientWorkspace.query.filter_by(
        agency_brand_id=brand.id,
        is_active=True,
    ).order_by(ClientWorkspace.name.asc()).all()
    summaries = [_workspace_summary(workspace, start_date, end_date) for workspace in workspaces]
    return {
        'clients': summaries,
        'language': _workspace_language(brand),
        'date_range': {
            'start_date': start_date.date().isoformat() if start_date else None,
            'end_date': (end_date - timedelta(days=1)).date().isoformat() if end_date else None,
        },
        'totals': {
            'clients': len(summaries),
            'campaigns': sum(item['campaigns_count'] for item in summaries),
            'active_collaborations': sum(item['active_collaborations_count'] for item in summaries),
            'pending_approvals': sum(item['pending_approvals_count'] for item in summaries),
            'spend': sum(item['total_spend'] for item in summaries),
        },
    }


def _frontend_url(path):
    base_url = current_app.config.get('FRONTEND_URL', 'https://bantubuzz.com').rstrip('/')
    return f'{base_url}{path}'


def _report_filename(language, extension):
    return f"bantubuzz-{language['workspace_plural']}-report.{extension}"


def _report_email_body(brand, message, date_label):
    sender_name = brand.report_sender_name or brand.company_name or 'BantuBuzz'
    signature = brand.report_email_signature or f"{sender_name}\n"
    text_body = f"""
Hello,

{message or 'Please find the latest performance report attached.'}

Report period: {date_label}

{signature}

Powered by BantuBuzz
"""
    escaped_message = escape(message or 'Please find the latest performance report attached.')
    signature_html = ''.join(f"<p style='margin:0 0 6px'>{escape(line)}</p>" for line in signature.splitlines() if line.strip())
    html_body = f"""
<div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #1F2937;">
  <div style="border-top: 6px solid {escape(brand.report_brand_color or '#B5E61D')}; padding: 24px 0 12px;">
    <h1 style="margin: 0; font-size: 24px;">{escape(sender_name)}</h1>
    <p style="margin: 8px 0 0; color: #6B7280;">Performance report attached</p>
  </div>
  <div style="padding: 20px 0; line-height: 1.6;">
    <p>{escaped_message}</p>
    <p><strong>Report period:</strong> {escape(date_label)}</p>
  </div>
  <div style="border-top: 1px solid #E5E7EB; padding-top: 16px;">
    {signature_html}
  </div>
  <p style="margin-top: 28px; color: #9CA3AF; font-size: 12px;">Powered by BantuBuzz</p>
</div>
"""
    return text_body, html_body


def _send_workspace_invitation_email(invitation, workspace, inviter, brand):
    account_language = _workspace_language(brand)
    workspace_label = account_language['workspace_singular']
    invite_url = _frontend_url(f'/brand/workspace-invite/{invitation.token}')
    inviter_name = brand.company_name if brand else inviter.email
    subject = f'You have been invited to {workspace.name} on BantuBuzz'
    text_body = f"""
You have been invited to join {workspace.name} on BantuBuzz.

{inviter_name} invited you as a {invitation.role} on this {workspace_label} workspace.

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
    <h2 style="margin-top: 0;">Workspace Invitation</h2>
    <p>{inviter_name} invited you as a <strong>{invitation.role}</strong> on the <strong>{workspace.name}</strong> {workspace_label} workspace.</p>
    <p style="margin: 28px 0;">
      <a href="{invite_url}" style="background: #B5E61D; color: #1F2937; padding: 12px 18px; border-radius: 8px; text-decoration: none; font-weight: 700;">Accept Invitation</a>
    </p>
    <p style="color: #6B7280; font-size: 14px;">This invite expires on {invitation.expires_at.strftime('%Y-%m-%d')}.</p>
  </div>
</div>
"""
    return send_email(subject, invitation.email, text_body, html_body, async_send=False)


def _workspace_invitation_url(invitation):
    return _frontend_url(f'/brand/workspace-invite/{invitation.token}')


def _send_workspace_member_updated_email(member, workspace, inviter, brand):
    account_language = _workspace_language(brand)
    workspace_label = account_language['workspace_singular']
    invite_url = _frontend_url('/brand/agency')
    inviter_name = brand.company_name if brand else inviter.email
    subject = f'Your {workspace.name} workspace access was updated'
    text_body = f"""
Your BantuBuzz workspace access has been updated.

{inviter_name} set your role to {member.role} on the {workspace.name} {workspace_label} workspace.

Open your workspace:
{invite_url}
"""
    html_body = f"""
<div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; color: #1F2937;">
  <div style="background: #B5E61D; padding: 20px; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0; font-size: 24px;">BantuBuzz</h1>
  </div>
  <div style="border: 1px solid #E5E7EB; border-top: 0; padding: 28px; border-radius: 0 0 8px 8px;">
    <h2 style="margin-top: 0;">Workspace access updated</h2>
    <p>{inviter_name} set your role to <strong>{member.role}</strong> on the <strong>{workspace.name}</strong> {workspace_label} workspace.</p>
    <p style="margin: 28px 0;">
      <a href="{invite_url}" style="background: #B5E61D; color: #1F2937; padding: 12px 18px; border-radius: 8px; text-decoration: none; font-weight: 700;">Open Workspace</a>
    </p>
  </div>
</div>
"""
    return send_email(subject, member.user.email, text_body, html_body, async_send=False)


def _save_workspace_membership(workspace, user, role, permissions=None):
    membership = WorkspaceMemberPermission.query.filter_by(
        workspace_id=workspace.id,
        user_id=user.id,
    ).first()
    if not membership:
        membership = WorkspaceMemberPermission(workspace_id=workspace.id, user_id=user.id)
        db.session.add(membership)

    membership.role = role
    membership.permissions = permissions or ROLE_PERMISSIONS[role]
    membership.updated_at = datetime.utcnow()
    return membership


def _workspace_seat_payload(workspace):
    usage = get_workspace_seat_usage(workspace)
    plan = usage.get('plan')
    return {
        'used': usage['used'],
        'members': usage['members'],
        'pending_invitations': usage['pending_invitations'],
        'limit': usage['limit'],
        'available': usage['available'],
        'plan_name': plan.name if plan else 'Free',
        'plan_slug': plan.slug if plan else 'free',
    }


def _log_workspace_audit(workspace, action, target_email, role=None, target_user_id=None, details=None):
    db.session.add(WorkspaceAuditLog(
        workspace_id=workspace.id,
        actor_user_id=int(get_jwt_identity()) if get_jwt_identity() else None,
        target_user_id=target_user_id,
        target_email=(target_email or '').strip().lower(),
        action=action,
        role=role,
        details=details or {},
    ))


def _get_accessible_addon(user_id, addon_id):
    addon = WorkspaceAddon.query.get(addon_id)
    if not addon or not addon.workspace:
        return None, 'Workspace add-on not found', 404

    user = User.query.get(int(user_id))
    brand = BrandProfile.query.filter_by(user_id=user_id).first() if user and user.user_type == 'brand' else None
    if brand and addon.workspace.agency_brand_id == brand.id:
        return addon, None, None

    membership = WorkspaceMemberPermission.query.filter_by(
        workspace_id=addon.workspace_id,
        user_id=int(user_id),
    ).first()
    if membership:
        permissions = {**ROLE_PERMISSIONS.get(membership.role, {}), **(membership.permissions or {})}
        if permissions.get('can_manage_billing'):
            return addon, None, None

    return None, 'Workspace add-on not found or unauthorized', 403


def _activate_workspace_addon(addon, payment_method, payment_reference=None):
    addon.status = 'active'
    addon.payment_status = 'paid' if payment_method != 'manual' else 'verified'
    addon.payment_method = payment_method
    addon.payment_reference = payment_reference
    addon.activated_at = datetime.utcnow()
    if addon.workspace:
        addon.workspace.is_active = True
        addon.workspace.updated_at = datetime.utcnow()


def _pending_workspace_addons_for_brand(brand_id):
    return WorkspaceAddon.query.join(ClientWorkspace).filter(
        ClientWorkspace.agency_brand_id == brand_id,
        ClientWorkspace.is_active.is_(False),
        WorkspaceAddon.status.in_(['pending', 'rejected']),
    ).order_by(WorkspaceAddon.created_at.desc()).all()


def _agency_meta(user, brand):
    limit, plan = get_workspace_limit(user.id)
    subscription = get_active_subscription(user.id)
    active = is_agency_user(user)
    included_limit = limit or (DEFAULT_INCLUDED_WORKSPACES if active else 0)
    return {
        'is_agency': active,
        'account_type': brand.account_type or 'brand',
        'requires_agency_subscription': brand.account_type in ['agency', 'enterprise'] and not active,
        'included_limit': included_limit,
        'billing_cycle': subscription.billing_cycle if subscription else 'monthly',
        'plan': plan.to_dict() if plan else None,
    }


@bp.route('', methods=['GET'])
@jwt_required()
def list_workspaces():
    user, brand, error = _current_brand()
    if error:
        message, status = error
        return jsonify({'error': message}), status

    meta = _agency_meta(user, brand)
    own_workspaces = ClientWorkspace.query.filter_by(
        agency_brand_id=brand.id,
        is_active=True,
    ).order_by(ClientWorkspace.name.asc()).all()
    member_workspaces = [
        membership.workspace
        for membership in WorkspaceMemberPermission.query.filter_by(user_id=user.id).all()
        if membership.workspace and membership.workspace.is_active
    ]

    workspaces_by_id = {workspace.id: workspace for workspace in [*own_workspaces, *member_workspaces]}
    pending_addons = _pending_workspace_addons_for_brand(brand.id)

    return jsonify({
        **meta,
        'active_count': len(own_workspaces),
        'extra_count': max(0, len(own_workspaces) - meta['included_limit']),
        'extra_workspace_pricing': {
            'monthly': float(EXTRA_WORKSPACE_MONTHLY_PRICE),
            'yearly': float(EXTRA_WORKSPACE_YEARLY_PRICE),
        },
        'language': _workspace_language(brand),
        'workspaces': [workspace.to_dict(include_counts=True) for workspace in workspaces_by_id.values()],
        'pending_addons': [
            {
                **addon.to_dict(),
                'workspace': addon.workspace.to_dict(include_counts=True) if addon.workspace else None,
            }
            for addon in pending_addons
        ],
    }), 200


@bp.route('', methods=['POST'])
@jwt_required()
def create_workspace():
    user, brand, error = _current_brand()
    if error:
        message, status = error
        return jsonify({'error': message}), status
    if not is_agency_user(user):
        return jsonify({'error': 'Agency plan required to create client workspaces'}), 403

    data = request.get_json() or {}
    name = (data.get('name') or '').strip()
    if not name:
        return jsonify({'error': 'Workspace name is required'}), 400

    subscription = Subscription.query.filter_by(user_id=user.id, status='active').first()
    included_limit, plan = get_workspace_limit(user.id)
    included_limit = included_limit or DEFAULT_INCLUDED_WORKSPACES
    billing_cycle = data.get('billing_cycle') or (subscription.billing_cycle if subscription else 'monthly')

    workspace = ClientWorkspace(
        agency_brand_id=brand.id,
        name=name,
        slug=_unique_slug(brand.id, name),
        logo=data.get('logo'),
        industry=data.get('industry'),
        website=data.get('website'),
        description=data.get('description'),
        billing_email=data.get('billing_email'),
    )
    db.session.add(workspace)
    db.session.flush()

    owner_membership = WorkspaceMemberPermission(
        workspace_id=workspace.id,
        user_id=user.id,
        role='owner',
        permissions=ROLE_PERMISSIONS['owner'],
    )
    db.session.add(owner_membership)
    addon = create_workspace_addon_if_needed(workspace, subscription, included_limit, billing_cycle)

    db.session.commit()

    return jsonify({
        'message': 'Client workspace created successfully',
        'workspace': workspace.to_dict(include_counts=True),
        'addon_required': addon is not None,
        'addon': addon.to_dict() if addon else None,
    }), 201


@bp.route('/addons/<int:addon_id>/pay-with-wallet', methods=['POST'])
@jwt_required()
def pay_workspace_addon_with_wallet(addon_id):
    user_id = int(get_jwt_identity())
    addon, error, status = _get_accessible_addon(user_id, addon_id)
    if error:
        return jsonify({'error': error}), status

    if addon.status == 'active':
        return jsonify({'error': 'Workspace add-on is already active'}), 400

    wallet = Wallet.query.filter_by(user_id=user_id).first()
    if not wallet:
        return jsonify({'error': 'Wallet not found'}), 404

    amount = addon.amount or 0
    if wallet.available_balance < amount:
        return jsonify({
            'error': f'Insufficient wallet balance. Available: ${float(wallet.available_balance):.2f}, Required: ${float(amount):.2f}'
        }), 400

    wallet.available_balance -= amount
    wallet.total_spent = float(wallet.total_spent or 0) + float(amount)
    wallet.updated_at = datetime.utcnow()

    transaction = WalletTransaction(
        wallet_id=wallet.id,
        user_id=user_id,
        amount=-abs(float(amount)),
        transaction_type='payment',
        status='available',
        clearance_required=False,
        description=f'Extra workspace add-on payment for {addon.workspace.name}',
        transaction_metadata={
            'payment_type': 'workspace_addon',
            'workspace_addon_id': addon.id,
            'workspace_id': addon.workspace_id,
            'billing_cycle': addon.billing_cycle,
        }
    )
    db.session.add(transaction)
    db.session.flush()

    _activate_workspace_addon(addon, 'wallet', f'WALLET-{transaction.id}')
    db.session.commit()

    return jsonify({
        'success': True,
        'message': 'Extra workspace payment successful',
        'addon': addon.to_dict(),
        'workspace': addon.workspace.to_dict(include_counts=True),
        'wallet_balance': float(wallet.available_balance),
    }), 200


@bp.route('/addons/<int:addon_id>/upload-proof', methods=['POST'])
@jwt_required()
def upload_workspace_addon_payment_proof(addon_id):
    user_id = int(get_jwt_identity())
    addon, error, status = _get_accessible_addon(user_id, addon_id)
    if error:
        return jsonify({'error': error}), status

    if addon.status == 'active':
        return jsonify({'error': 'Workspace add-on is already active'}), 400

    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    if not _allowed_proof_file(file.filename):
        return jsonify({'error': 'Invalid file type. Allowed: PNG, JPG, JPEG, GIF, PDF'}), 400

    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    ext = file.filename.rsplit('.', 1)[1].lower()
    filename = secure_filename(f"workspace_addon_{addon.id}_{user_id}_{datetime.utcnow().timestamp()}.{ext}")
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    file.save(filepath)

    addon.payment_proof_path = f"/uploads/payment_proofs/{filename}"
    addon.payment_method = 'manual'
    addon.payment_status = 'pending_verification'
    addon.status = 'pending'
    db.session.commit()

    return jsonify({
        'success': True,
        'message': 'Payment proof uploaded successfully. Awaiting admin verification.',
        'addon': addon.to_dict(),
    }), 200


@bp.route('/master-dashboard', methods=['GET'])
@jwt_required()
def master_dashboard():
    user, brand, error = _current_brand()
    if error:
        message, status = error
        return jsonify({'error': message}), status

    start_date, end_date, date_error = _parse_date_range()
    if date_error:
        return jsonify({'error': date_error}), 400
    return jsonify({
        **_master_dashboard_payload(brand, start_date, end_date),
        **_agency_meta(user, brand),
    }), 200


@bp.route('/master-dashboard/export', methods=['GET'])
@jwt_required()
def export_master_dashboard():
    user, brand, error = _current_brand()
    if error:
        message, status = error
        return jsonify({'error': message}), status

    start_date, end_date, date_error = _parse_date_range()
    if date_error:
        return jsonify({'error': date_error}), 400

    payload = _master_dashboard_payload(brand, start_date, end_date)
    language = payload['language']
    export_format = (request.args.get('format') or 'csv').lower()
    filename_base = f"bantubuzz-{language['workspace_plural']}-report"

    if export_format == 'pdf':
        pdf_bytes = generate_master_dashboard_pdf(brand, payload)
        response = make_response(pdf_bytes)
        response.headers['Content-Type'] = 'application/pdf'
        response.headers['Content-Disposition'] = f'attachment; filename="{_report_filename(language, "pdf")}"'
        return response

    if export_format == 'html':
        rows = ''.join(
            f"""
            <tr>
                <td>{escape(item['name'] or '')}</td>
                <td>{escape(item.get('industry') or '')}</td>
                <td>{item['campaigns_count']}</td>
                <td>{item['active_collaborations_count']}</td>
                <td>{item['pending_approvals_count']}</td>
                <td>${item['total_spend']:.2f}</td>
            </tr>
            """
            for item in payload['clients']
        )
        date_label = 'All time'
        if payload['date_range']['start_date'] or payload['date_range']['end_date']:
            date_label = f"{payload['date_range']['start_date'] or 'Start'} to {payload['date_range']['end_date'] or 'Today'}"
        logo_html = f"<img src='{escape(brand.logo)}' alt='' style='height:44px;object-fit:contain'>" if brand.logo else ''
        accent_color = brand.report_brand_color or '#B5E61D'
        html = f"""
        <!doctype html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>{escape(language['dashboard_title'])} Report</title>
          <style>
            body {{ font-family: Arial, sans-serif; color: #1F2937; margin: 32px; }}
            header {{ display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid {escape(accent_color)}; padding-bottom: 16px; }}
            h1 {{ margin: 0; font-size: 28px; }}
            .muted {{ color: #6B7280; }}
            .stats {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 24px 0; }}
            .stat {{ border: 1px solid #E5E7EB; border-radius: 8px; padding: 14px; }}
            .stat strong {{ display: block; font-size: 22px; margin-top: 6px; }}
            table {{ width: 100%; border-collapse: collapse; margin-top: 16px; }}
            th, td {{ border-bottom: 1px solid #E5E7EB; padding: 10px; text-align: left; }}
            th {{ font-size: 12px; text-transform: uppercase; color: #6B7280; }}
            footer {{ margin-top: 32px; font-size: 12px; color: #6B7280; }}
          </style>
        </head>
        <body>
          <header>
            <div>
              <h1>{escape(language['dashboard_title'])} Report</h1>
              <p class="muted">{escape(brand.company_name or 'BantuBuzz')} · {escape(date_label)}</p>
            </div>
            {logo_html}
          </header>
          <section class="stats">
            <div class="stat">Total {escape(language['workspace_plural'])}<strong>{payload['totals']['clients']}</strong></div>
            <div class="stat">Campaigns<strong>{payload['totals']['campaigns']}</strong></div>
            <div class="stat">Active collaborations<strong>{payload['totals']['active_collaborations']}</strong></div>
            <div class="stat">Spend<strong>${payload['totals']['spend']:.2f}</strong></div>
          </section>
          <table>
            <thead>
              <tr>
                <th>{escape(language['workspace_singular'])}</th>
                <th>Industry</th>
                <th>Campaigns</th>
                <th>Active collaborations</th>
                <th>Pending approvals</th>
                <th>Spend</th>
              </tr>
            </thead>
            <tbody>{rows}</tbody>
          </table>
          <footer>Powered by BantuBuzz</footer>
        </body>
        </html>
        """
        response = make_response(html)
        response.headers['Content-Type'] = 'text/html; charset=utf-8'
        response.headers['Content-Disposition'] = f'inline; filename="{filename_base}.html"'
        return response

    output = StringIO()
    writer = csv.writer(output)
    writer.writerow([
        language['workspace_singular'].title(),
        'Industry',
        'Campaigns',
        'Active Collaborations',
        'Pending Approvals',
        'Spend',
    ])
    for item in payload['clients']:
        writer.writerow([
            item['name'],
            item.get('industry') or '',
            item['campaigns_count'],
            item['active_collaborations_count'],
            item['pending_approvals_count'],
            f"{item['total_spend']:.2f}",
        ])

    response = make_response(output.getvalue())
    response.headers['Content-Type'] = 'text/csv; charset=utf-8'
    response.headers['Content-Disposition'] = f'attachment; filename="{filename_base}.csv"'
    return response


@bp.route('/master-dashboard/email-report', methods=['POST'])
@jwt_required()
def email_master_dashboard_report():
    user, brand, error = _current_brand()
    if error:
        message, status = error
        return jsonify({'error': message}), status
    if brand.account_type not in ['agency', 'enterprise']:
        return jsonify({'error': 'White-label report emails require an Agency or Enterprise account'}), 403

    start_date, end_date, date_error = _parse_date_range()
    if date_error:
        return jsonify({'error': date_error}), 400

    data = request.get_json() or {}
    recipients = data.get('recipients') or []
    if isinstance(recipients, str):
        recipients = [email.strip() for email in recipients.split(',')]
    recipients = [email.strip() for email in recipients if email and email.strip()]
    if not recipients:
        return jsonify({'error': 'At least one recipient email is required'}), 400
    if len(recipients) > 10:
        return jsonify({'error': 'You can send a report to at most 10 recipients at a time'}), 400
    invalid_email = next((email for email in recipients if not re.match(r'^[^@\s]+@[^@\s]+\.[^@\s]+$', email)), None)
    if invalid_email:
        return jsonify({'error': f'Invalid recipient email: {invalid_email}'}), 400

    payload = _master_dashboard_payload(brand, start_date, end_date)
    language = payload['language']
    date_label = 'All time'
    if payload['date_range']['start_date'] or payload['date_range']['end_date']:
        date_label = f"{payload['date_range']['start_date'] or 'Start'} to {payload['date_range']['end_date'] or 'Today'}"

    subject = (data.get('subject') or f"{brand.company_name} {language['dashboard_title']} Report").strip()[:180]
    text_body, html_body = _report_email_body(brand, data.get('message'), date_label)
    pdf_bytes = generate_master_dashboard_pdf(brand, payload)
    sender_name = brand.report_sender_name or brand.company_name or 'BantuBuzz Reports'
    reply_to = brand.report_reply_to_email or user.email

    send_email(
        subject,
        recipients,
        text_body,
        html_body,
        sender_name=sender_name,
        reply_to=reply_to,
        attachments=[(_report_filename(language, 'pdf'), 'application/pdf', pdf_bytes)],
    )

    return jsonify({
        'message': 'Report email queued successfully',
        'recipients': recipients,
    }), 202


@bp.route('/<int:workspace_id>', methods=['GET'])
@jwt_required()
def get_workspace(workspace_id):
    workspace, error, status = require_workspace_access(get_jwt_identity(), workspace_id)
    if error:
        return jsonify({'error': error}), status
    return jsonify({'workspace': _workspace_summary(workspace)}), 200


@bp.route('/<int:workspace_id>', methods=['PUT'])
@jwt_required()
def update_workspace(workspace_id):
    workspace, error, status = require_workspace_access(get_jwt_identity(), workspace_id, 'can_invite_members')
    if error:
        return jsonify({'error': error}), status

    data = request.get_json() or {}
    if 'name' in data and data['name']:
        workspace.name = data['name'].strip()
        workspace.slug = _unique_slug(workspace.agency_brand_id, workspace.name, workspace.id)
    for field in ['logo', 'industry', 'website', 'description', 'billing_email']:
        if field in data:
            setattr(workspace, field, data.get(field))
    workspace.updated_at = datetime.utcnow()
    db.session.commit()

    return jsonify({'message': 'Workspace updated', 'workspace': workspace.to_dict(include_counts=True)}), 200


@bp.route('/<int:workspace_id>', methods=['DELETE'])
@jwt_required()
def deactivate_workspace(workspace_id):
    workspace, error, status = require_workspace_access(get_jwt_identity(), workspace_id, 'can_invite_members')
    if error:
        return jsonify({'error': error}), status
    workspace.is_active = False
    workspace.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify({'message': 'Workspace deactivated'}), 200


@bp.route('/<int:workspace_id>/members', methods=['GET'])
@jwt_required()
def list_members(workspace_id):
    workspace, error, status = require_workspace_access(get_jwt_identity(), workspace_id, 'can_invite_members')
    if error:
        return jsonify({'error': error}), status
    get_workspace_seat_usage(workspace)
    members = WorkspaceMemberPermission.query.filter_by(workspace_id=workspace.id).all()
    invitations = WorkspaceInvitation.query.filter_by(
        workspace_id=workspace.id,
        status='pending',
    ).order_by(WorkspaceInvitation.created_at.desc()).all()
    audit_logs = WorkspaceAuditLog.query.filter_by(
        workspace_id=workspace.id,
    ).order_by(WorkspaceAuditLog.created_at.desc()).limit(50).all()
    db.session.commit()
    return jsonify({
        'members': [member.to_dict() for member in members],
        'invitations': [invitation.to_dict() for invitation in invitations if not invitation.is_expired()],
        'seat_usage': _workspace_seat_payload(workspace),
        'audit_logs': [log.to_dict() for log in audit_logs],
    }), 200


@bp.route('/<int:workspace_id>/members', methods=['POST'])
@jwt_required()
def add_member(workspace_id):
    workspace, error, status = require_workspace_access(get_jwt_identity(), workspace_id, 'can_invite_members')
    if error:
        return jsonify({'error': error}), status

    data = request.get_json() or {}
    email = (data.get('email') or '').strip().lower()
    role = data.get('role') or 'viewer'
    if not email:
        return jsonify({'error': 'Email is required'}), 400
    if role not in INVITABLE_WORKSPACE_ROLES:
        return jsonify({'error': 'Invalid workspace role. Choose Admin, Manager, or Viewer.'}), 400

    member_user = User.query.filter_by(email=email).first()
    if member_user:
        existing_membership = WorkspaceMemberPermission.query.filter_by(
            workspace_id=workspace.id,
            user_id=member_user.id,
        ).first()
        if existing_membership:
            membership = _save_workspace_membership(
                workspace,
                member_user,
                role,
                ROLE_PERMISSIONS[role],
            )
            _log_workspace_audit(
                workspace,
                'member_role_updated',
                email,
                role,
                target_user_id=member_user.id,
            )
            db.session.commit()

            inviter = User.query.get(int(get_jwt_identity()))
            brand = BrandProfile.query.get(workspace.agency_brand_id)
            _send_workspace_member_updated_email(membership, workspace, inviter, brand)

            return jsonify({
                'message': 'Workspace member saved',
                'member': membership.to_dict(),
                'seat_usage': _workspace_seat_payload(workspace),
            }), 200

    invitation = WorkspaceInvitation.query.filter_by(
        workspace_id=workspace.id,
        email=email,
        status='pending',
    ).first()
    if invitation and invitation.is_expired():
        invitation.status = 'expired'
        invitation.updated_at = datetime.utcnow()
        invitation = None

    if not invitation and get_workspace_seat_usage(workspace)['available'] <= 0:
        seat_usage = _workspace_seat_payload(workspace)
        return jsonify({
            'error': f"Team seat limit reached for your {seat_usage['plan_name']} plan. Upgrade your plan or cancel a pending invitation before inviting another teammate.",
            'seat_usage': seat_usage,
        }), 403

    if not invitation:
        invitation = WorkspaceInvitation(
            workspace_id=workspace.id,
            invited_by_user_id=int(get_jwt_identity()),
            email=email,
            token=WorkspaceInvitation.generate_token(),
        )
        db.session.add(invitation)

    invitation.role = role
    invitation.permissions = ROLE_PERMISSIONS[role]
    invitation.expires_at = WorkspaceInvitation.default_expiry()
    invitation.updated_at = datetime.utcnow()
    _log_workspace_audit(
        workspace,
        'invitation_sent',
        email,
        role,
        details={'expires_at': invitation.expires_at.isoformat()},
    )
    db.session.commit()

    inviter = User.query.get(int(get_jwt_identity()))
    brand = BrandProfile.query.get(workspace.agency_brand_id)
    email_sent = _send_workspace_invitation_email(invitation, workspace, inviter, brand)
    if not email_sent:
        current_app.logger.warning(
            'Workspace invitation email could not be sent for invitation_id=%s email=%s',
            invitation.id,
            invitation.email,
        )

    return jsonify({
        'message': 'Workspace invitation sent' if email_sent else 'Workspace invitation created, but email delivery could not be confirmed',
        'invitation': invitation.to_dict(),
        'invitation_url': _workspace_invitation_url(invitation),
        'email_sent': email_sent,
        'seat_usage': _workspace_seat_payload(workspace),
    }), 202


@bp.route('/<int:workspace_id>/members/<int:member_id>', methods=['DELETE'])
@jwt_required()
def remove_member(workspace_id, member_id):
    workspace, error, status = require_workspace_access(get_jwt_identity(), workspace_id, 'can_invite_members')
    if error:
        return jsonify({'error': error}), status

    membership = WorkspaceMemberPermission.query.filter_by(
        workspace_id=workspace.id,
        id=member_id,
    ).first()
    if not membership:
        return jsonify({'error': 'Workspace member not found'}), 404
    if membership.role == 'owner':
        return jsonify({'error': 'Workspace owner cannot be removed'}), 400

    _log_workspace_audit(
        workspace,
        'member_removed',
        membership.user.email if membership.user else '',
        membership.role,
        target_user_id=membership.user_id,
    )
    db.session.delete(membership)
    db.session.commit()
    return jsonify({'message': 'Workspace member removed', 'seat_usage': _workspace_seat_payload(workspace)}), 200


@bp.route('/invitations/<token>', methods=['GET'])
def get_invitation(token):
    invitation = WorkspaceInvitation.query.filter_by(token=token, status='pending').first()
    if not invitation or invitation.is_expired():
        if invitation and invitation.status == 'pending':
            invitation.status = 'expired'
            invitation.updated_at = datetime.utcnow()
            db.session.commit()
        return jsonify({'error': 'Invitation not found or expired'}), 404

    brand = BrandProfile.query.get(invitation.workspace.agency_brand_id)
    return jsonify({
        'invitation': invitation.to_dict(),
        'workspace': invitation.workspace.to_dict(),
        'language': _workspace_language(brand),
    }), 200


@bp.route('/invitations/<token>/accept', methods=['POST'])
@jwt_required()
def accept_invitation(token):
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    invitation = WorkspaceInvitation.query.filter_by(token=token, status='pending').first()
    if not invitation or invitation.is_expired():
        return jsonify({'error': 'Invitation not found or expired'}), 404
    if not user or user.email.lower() != invitation.email.lower():
        return jsonify({'error': 'Please sign in with the email address that received this invitation'}), 403

    existing_membership = WorkspaceMemberPermission.query.filter_by(
        workspace_id=invitation.workspace_id,
        user_id=user.id,
    ).first()
    usage = get_workspace_seat_usage(invitation.workspace, exclude_invitation_id=invitation.id)
    if not existing_membership and usage['available'] <= 0:
        seat_payload = _workspace_seat_payload(invitation.workspace)
        return jsonify({
            'error': f"Team seat limit reached for the {seat_payload['plan_name']} plan. Ask an admin to upgrade the plan or free a seat.",
            'seat_usage': seat_payload,
        }), 403

    membership = _save_workspace_membership(
        invitation.workspace,
        user,
        invitation.role,
        invitation.permissions,
    )
    invitation.status = 'accepted'
    invitation.accepted_at = datetime.utcnow()
    invitation.updated_at = datetime.utcnow()
    _log_workspace_audit(
        invitation.workspace,
        'invitation_accepted',
        invitation.email,
        invitation.role,
        target_user_id=user.id,
    )
    db.session.commit()

    return jsonify({
        'message': 'Workspace invitation accepted',
        'member': membership.to_dict(),
        'workspace': invitation.workspace.to_dict(),
    }), 200


@bp.route('/invitations/<int:invitation_id>', methods=['DELETE'])
@jwt_required()
def cancel_invitation(invitation_id):
    invitation = WorkspaceInvitation.query.get(invitation_id)
    if not invitation:
        return jsonify({'error': 'Invitation not found'}), 404

    workspace, error, status = require_workspace_access(
        get_jwt_identity(),
        invitation.workspace_id,
        'can_invite_members',
    )
    if error:
        return jsonify({'error': error}), status

    invitation.status = 'cancelled'
    invitation.updated_at = datetime.utcnow()
    _log_workspace_audit(
        workspace,
        'invitation_cancelled',
        invitation.email,
        invitation.role,
        details={'invitation_id': invitation.id},
    )
    db.session.commit()
    return jsonify({'message': 'Workspace invitation cancelled', 'seat_usage': _workspace_seat_payload(workspace)}), 200
