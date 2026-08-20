from datetime import datetime
from html import escape

from flask import Blueprint, Response, jsonify
from flask_jwt_extended import get_jwt_identity, jwt_required
from sqlalchemy import inspect

from app import db
from app.models import (
    Booking,
    BrandProfile,
    CampaignPayment,
    CreatorProfile,
    CreatorSubscription,
    SpotlightBoost,
    Subscription,
    User,
)
from app.services.workspace_service import get_request_workspace_id, require_workspace_access
from app.utils.subscription_helper import get_brand_service_fee_percentage
from app.services.referral_service import account_credit_balance

bp = Blueprint('billing', __name__)


def _campaign_payment_tables_available():
    try:
        inspector = inspect(db.engine)
        return inspector.has_table('campaign_payments')
    except Exception:
        return False


def _money(value):
    return float(value or 0)


def _date(value):
    return value.isoformat() if value else None


def _invoice_number(prefix, source_id):
    return f'{prefix}-{int(source_id):06d}'


def _brand_name(brand):
    return getattr(brand, 'company_name', None) or getattr(brand, 'business_name', None) or 'Brand'


def _creator_name(creator):
    return getattr(creator, 'display_name', None) or getattr(creator, 'username', None) or 'Creator'


def _booking_title(booking):
    package = getattr(booking, 'package', None)
    brief = getattr(booking, 'brief', None)
    campaign = getattr(booking, 'campaign', None)

    if package:
        return package.title
    if brief:
        return brief.title
    if campaign:
        return campaign.title
    if getattr(booking, 'campaign_id', None):
        return 'Campaign collaboration'
    if getattr(booking, 'brief_id', None):
        return 'Brief collaboration'
    return 'Package collaboration'


def _booking_invoice(booking, viewer_type):
    is_paid = booking.payment_status in ['paid', 'verified']
    source_type = 'collaboration'
    if booking.campaign_id or booking.booking_type in ['campaign_application', 'campaign_package']:
        source_type = 'campaign'
    subtotal = _money(booking.amount or booking.total_price)
    brand_user_id = booking.brand.user_id if getattr(booking, 'brand', None) else None
    service_fee_percentage = get_brand_service_fee_percentage(brand_user_id) if viewer_type == 'brand' and brand_user_id else 0
    service_fee = subtotal * (service_fee_percentage / 100)
    total = subtotal + service_fee if viewer_type == 'brand' else subtotal
    line_items = [
        {
            'label': _booking_title(booking),
            'description': 'Creator collaboration fee',
            'amount': subtotal,
        }
    ]
    if viewer_type == 'brand':
        line_items.append({
            'label': f'BantuBuzz service fee ({service_fee_percentage:.2f}%)',
            'description': 'Service fee based on your current brand plan',
            'amount': service_fee,
        })

    return {
        'id': f'booking-{booking.id}',
        'invoice_number': _invoice_number('INV-BKG', booking.id),
        'source_type': source_type,
        'source_id': booking.id,
        'title': _booking_title(booking),
        'description': f'{_brand_name(getattr(booking, "brand", None))} and {_creator_name(getattr(booking, "creator", None))}',
        'amount': total,
        'subtotal': subtotal,
        'service_fee': service_fee,
        'service_fee_percentage': service_fee_percentage,
        'line_items': line_items,
        'currency': 'USD',
        'status': 'paid' if is_paid else 'upcoming',
        'payment_status': booking.payment_status,
        'payment_method': booking.payment_method,
        'issued_at': _date(booking.created_at),
        'paid_at': _date(booking.completion_date if is_paid else None),
        'due_at': _date(booking.created_at),
        'direction': 'paid' if viewer_type == 'brand' else 'received',
        'download_url': f'/api/billing/invoices/booking/{booking.id}/download',
    }


def _campaign_payment_invoice(payment):
    items_count = payment.items.count() if hasattr(payment.items, 'count') else len(payment.items or [])
    return {
        'id': f'campaign-payment-{payment.id}',
        'invoice_number': _invoice_number('INV-CMP', payment.id),
        'source_type': 'campaign',
        'source_id': payment.id,
        'title': payment.campaign.title if payment.campaign else 'Campaign payment',
        'description': f'{items_count} campaign collaboration item(s)',
        'amount': _money(payment.total_amount),
        'subtotal': _money(payment.total_amount) - _money(payment.platform_fee),
        'service_fee': _money(payment.platform_fee),
        'line_items': [
            {
                'label': payment.campaign.title if payment.campaign else 'Campaign collaborations',
                'description': f'{items_count} campaign collaboration item(s)',
                'amount': _money(payment.total_amount) - _money(payment.platform_fee),
            },
            {
                'label': 'BantuBuzz service fee',
                'description': 'Service fee for campaign payment processing',
                'amount': _money(payment.platform_fee),
            },
        ],
        'currency': 'USD',
        'status': 'paid' if payment.status == 'completed' else 'upcoming',
        'payment_status': payment.status,
        'payment_method': payment.payment_method,
        'issued_at': _date(payment.initiated_at),
        'paid_at': _date(payment.completed_at),
        'due_at': _date(payment.initiated_at),
        'direction': 'paid',
        'download_url': f'/api/billing/invoices/campaign-payment/{payment.id}/download',
    }


def _subscription_invoice(subscription):
    plan_name = subscription.plan.name if subscription.plan else 'Subscription'
    billing_cycle = subscription.billing_cycle or 'monthly'
    price = subscription.plan.price_monthly if subscription.plan and billing_cycle == 'monthly' else None
    if subscription.plan and billing_cycle == 'yearly':
        price = subscription.plan.price_yearly
    is_paid = bool(subscription.payment_verified or subscription.payment_status in ['paid', 'verified'] or subscription.status == 'active')

    return {
        'id': f'subscription-{subscription.id}',
        'invoice_number': _invoice_number('INV-SUB', subscription.id),
        'source_type': 'subscription',
        'source_id': subscription.id,
        'title': plan_name,
        'description': f'{billing_cycle.title()} subscription',
        'amount': _money(subscription.last_payment_amount or price),
        'currency': 'USD',
        'status': 'paid' if is_paid else 'upcoming',
        'payment_status': subscription.payment_status or subscription.status,
        'payment_method': subscription.payment_method,
        'payment_reference': subscription.payment_reference,
        'issued_at': _date(subscription.created_at),
        'paid_at': _date(subscription.last_payment_date),
        'due_at': _date(subscription.next_payment_date or subscription.current_period_end),
        'direction': 'paid',
        'download_url': None,
    }


def _creator_subscription_invoice(subscription):
    plan = subscription.plan
    is_boost = bool(plan and plan.subscription_type == 'featured')
    return {
        'id': f'creator-subscription-{subscription.id}',
        'invoice_number': _invoice_number('INV-CRS', subscription.id),
        'source_type': 'boost' if is_boost else 'subscription',
        'source_id': subscription.id,
        'title': plan.name if plan else 'Creator subscription',
        'description': (f'Creator visibility boost - {plan.description}' if is_boost and plan.description else plan.description) if plan else 'Creator subscription',
        'amount': _money(plan.price if plan else 0),
        'currency': 'USD',
        'status': 'paid' if subscription.payment_verified else 'upcoming',
        'payment_status': subscription.payment_status or subscription.status,
        'payment_method': subscription.payment_method,
        'issued_at': _date(subscription.created_at),
        'paid_at': _date(subscription.start_date if subscription.payment_verified else None),
        'due_at': _date(subscription.end_date),
        'direction': 'paid',
        'download_url': None,
    }


def _spotlight_boost_invoice(boost):
    return {
        'id': f'spotlight-boost-{boost.id}',
        'invoice_number': _invoice_number('INV-BST', boost.id),
        'source_type': 'boost',
        'source_id': boost.id,
        'title': f'{boost.duration_days}-Day Spotlight Boost',
        'description': f'{boost.target_type.replace("_", " ").title()} visibility boost',
        'amount': _money(boost.amount),
        'currency': boost.currency or 'USD',
        'status': 'paid',
        'payment_status': boost.status,
        'payment_method': boost.payment_method,
        'issued_at': _date(boost.created_at),
        'paid_at': _date(boost.starts_at),
        'due_at': _date(boost.ends_at),
        'direction': 'paid',
        'download_url': f'/api/billing/invoices/spotlight-boost/{boost.id}/download',
    }


def _get_user_invoices(user, workspace_id=None):
    invoices = []

    if user.user_type == 'brand':
        brand = BrandProfile.query.filter_by(user_id=user.id).first()
        if brand:
            booking_query = Booking.query.filter_by(brand_id=brand.id)
            if workspace_id:
                booking_query = booking_query.filter_by(workspace_id=workspace_id)
            bookings = booking_query.order_by(Booking.created_at.desc()).all()
            invoices.extend(_booking_invoice(booking, 'brand') for booking in bookings)

            if _campaign_payment_tables_available():
                payment_query = CampaignPayment.query.filter_by(brand_user_id=user.id)
                if workspace_id:
                    payment_query = payment_query.filter_by(workspace_id=workspace_id)
                campaign_payments = payment_query.order_by(CampaignPayment.initiated_at.desc()).all()
                invoices.extend(_campaign_payment_invoice(payment) for payment in campaign_payments)

        subscriptions = Subscription.query.filter_by(user_id=user.id).order_by(Subscription.created_at.desc()).all()
        invoices.extend(_subscription_invoice(subscription) for subscription in subscriptions)

    elif user.user_type == 'creator':
        creator = CreatorProfile.query.filter_by(user_id=user.id).first()
        if creator:
            creator_subscriptions = CreatorSubscription.query.filter_by(creator_id=creator.id).order_by(CreatorSubscription.created_at.desc()).all()
            invoices.extend(_creator_subscription_invoice(subscription) for subscription in creator_subscriptions)

    boosts = SpotlightBoost.query.filter_by(user_id=user.id).order_by(SpotlightBoost.created_at.desc()).all()
    invoices.extend(_spotlight_boost_invoice(boost) for boost in boosts)

    invoices.sort(key=lambda item: item.get('issued_at') or '', reverse=True)
    return invoices


@bp.route('/invoices', methods=['GET'])
@jwt_required()
def get_invoices():
    user = User.query.get(int(get_jwt_identity()))
    if not user:
        return jsonify({'error': 'User not found'}), 404

    workspace_id = get_request_workspace_id() if user.user_type == 'brand' else None
    if user.user_type == 'brand' and workspace_id:
        workspace, workspace_error, workspace_status = require_workspace_access(user.id, workspace_id, 'can_manage_billing')
        if workspace_error:
            return jsonify({'error': workspace_error}), workspace_status

    invoices = _get_user_invoices(user, workspace_id=workspace_id)
    return jsonify({
        'past_invoices': [item for item in invoices if item['status'] == 'paid'],
        'upcoming_invoices': [item for item in invoices if item['status'] != 'paid'],
        'account_credit_balance': float(account_credit_balance(user.id)),
    }), 200


def _render_invoice_html(invoice, user):
    title = escape(invoice['title'])
    description = escape(invoice.get('description') or '')
    amount = f"${invoice['amount']:.2f}"
    status = escape(invoice['payment_status'] or invoice['status'])
    issued = escape(invoice.get('issued_at') or 'Not available')
    paid = escape(invoice.get('paid_at') or 'Not paid yet')
    user_label = escape(user.email)

    rows = ''.join(
        f"""<tr>
          <td>{escape(item.get('label') or '')}<br><span class="muted">{escape(item.get('description') or '')}</span></td>
          <td>{escape(invoice['source_type'])}</td>
          <td>${_money(item.get('amount')):.2f}</td>
        </tr>"""
        for item in invoice.get('line_items') or [{'label': title, 'description': description, 'amount': invoice['amount']}]
    )

    html = f"""<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>{escape(invoice['invoice_number'])}</title>
  <style>
    body {{ font-family: Arial, sans-serif; color: #1F2937; margin: 40px; }}
    .header {{ display: flex; justify-content: space-between; border-bottom: 4px solid #ccdb53; padding-bottom: 20px; }}
    h1 {{ margin: 0; }}
    .muted {{ color: #6B7280; }}
    .card {{ border: 1px solid #E5E7EB; border-radius: 16px; padding: 20px; margin-top: 24px; }}
    table {{ width: 100%; border-collapse: collapse; margin-top: 24px; }}
    th, td {{ text-align: left; padding: 12px; border-bottom: 1px solid #E5E7EB; }}
    .total {{ font-size: 24px; font-weight: bold; }}
    .print {{ margin-top: 24px; }}
    @media print {{ .print {{ display: none; }} body {{ margin: 20px; }} }}
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>BantuBuzz</h1>
      <p class="muted">Creator-brand collaboration invoice</p>
    </div>
    <div>
      <h2>{escape(invoice['invoice_number'])}</h2>
      <p class="muted">{status}</p>
    </div>
  </div>
  <div class="card">
    <p><strong>Billed account:</strong> {user_label}</p>
    <p><strong>Issued:</strong> {issued}</p>
    <p><strong>Paid:</strong> {paid}</p>
  </div>
  <table>
    <thead>
      <tr><th>Description</th><th>Type</th><th>Amount</th></tr>
    </thead>
    <tbody>
      {rows}
    </tbody>
  </table>
  <p class="total">Total: {amount}</p>
  <button class="print" onclick="window.print()">Print or Save as PDF</button>
</body>
</html>"""
    return html


@bp.route('/invoices/<source_type>/<int:source_id>/download', methods=['GET'])
@jwt_required()
def download_invoice(source_type, source_id):
    user = User.query.get(int(get_jwt_identity()))
    if not user:
        return jsonify({'error': 'User not found'}), 404

    invoice = next(
        (
            item for item in _get_user_invoices(user, workspace_id=get_request_workspace_id())
            if item['download_url'] and item['download_url'].endswith(f'/{source_type}/{source_id}/download')
        ),
        None
    )
    if not invoice:
        return jsonify({'error': 'Invoice not found'}), 404

    return Response(
        _render_invoice_html(invoice, user),
        mimetype='text/html',
        headers={'Content-Disposition': f'inline; filename={invoice["invoice_number"]}.html'}
    )
