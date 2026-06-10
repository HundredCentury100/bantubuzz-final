"""Campaign report exports, schedules, and public stakeholder links."""
import re
import secrets
from datetime import datetime, timedelta

from dateutil.relativedelta import relativedelta
from flask import Blueprint, current_app, jsonify, make_response, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app import db
from app.models import (
    BrandProfile,
    Campaign,
    CampaignReportSchedule,
    CampaignReportShare,
)
from app.services.campaign_report_service import campaign_report_service
from app.services.white_label_report_service import generate_campaign_report_pdf
from app.services.workspace_service import require_workspace_access
from app.utils.subscription_helper import get_brand_report_entitlements


bp = Blueprint('campaign_reports', __name__, url_prefix='/api/campaign-reports')
EMAIL_RE = re.compile(r'^[^@\s]+@[^@\s]+\.[^@\s]+$')


def _owned_campaign(campaign_id, permission='can_view_analytics'):
    user_id = int(get_jwt_identity())
    brand = BrandProfile.query.filter_by(user_id=user_id).first()
    campaign = Campaign.query.get(campaign_id)
    if not brand or not campaign or campaign.brand_id != brand.id:
        return None, None, user_id, ('Campaign not found or unauthorized', 404)
    if campaign.workspace_id:
        _, error, status = require_workspace_access(user_id, campaign.workspace_id, permission)
        if error:
            return None, None, user_id, (error, status)
    return brand, campaign, user_id, None


def _parse_date(value, field):
    if not value:
        return None
    try:
        return datetime.strptime(value, '%Y-%m-%d').date()
    except ValueError:
        raise ValueError(f'{field} must use YYYY-MM-DD format')


def _requested_range(entitlements):
    start_date = _parse_date(request.args.get('start_date'), 'start_date')
    end_date = _parse_date(request.args.get('end_date'), 'end_date')
    if (start_date or end_date) and not entitlements['custom_date_range']:
        raise PermissionError('Custom report date ranges require a Premium or higher brand plan')
    if bool(start_date) != bool(end_date):
        raise ValueError('Both start_date and end_date are required for a custom range')
    days = request.args.get('days', 30, type=int)
    return campaign_report_service.normalize_range(start_date, end_date, days)


def _validate_recipients(values):
    if isinstance(values, str):
        values = [item.strip() for item in values.split(',')]
    recipients = list(dict.fromkeys(item.strip().lower() for item in (values or []) if item and item.strip()))
    if not recipients:
        raise ValueError('At least one recipient email is required')
    if len(recipients) > 20:
        raise ValueError('A report can have at most 20 recipients')
    invalid = next((item for item in recipients if not EMAIL_RE.match(item)), None)
    if invalid:
        raise ValueError(f'Invalid recipient email: {invalid}')
    return recipients


@bp.route('/campaigns/<int:campaign_id>/capabilities', methods=['GET'])
@jwt_required()
def capabilities(campaign_id):
    _, _, user_id, error = _owned_campaign(campaign_id)
    if error:
        return jsonify({'error': error[0]}), error[1]
    return jsonify(get_brand_report_entitlements(user_id)), 200


@bp.route('/campaigns/<int:campaign_id>/data', methods=['GET'])
@jwt_required()
def campaign_report_data(campaign_id):
    _, campaign, user_id, error = _owned_campaign(campaign_id)
    if error:
        return jsonify({'error': error[0]}), error[1]
    entitlements = get_brand_report_entitlements(user_id)
    if not entitlements['enabled']:
        return jsonify({'error': 'Campaign reporting requires a Pro or higher brand plan'}), 403
    try:
        start_date, end_date = _requested_range(entitlements)
        payload = campaign_report_service.build_payload(
            campaign.id,
            start_date,
            end_date,
            include_sentiment=entitlements['full_sentiment'],
        )
        payload['access'] = entitlements
        payload['range_days'] = (end_date - start_date).days + 1
        return jsonify(payload), 200
    except PermissionError as exc:
        return jsonify({'error': str(exc)}), 403
    except ValueError as exc:
        return jsonify({'error': str(exc)}), 400


@bp.route('/campaigns/<int:campaign_id>/export.<string:export_format>', methods=['GET'])
@jwt_required()
def export_campaign_report(campaign_id, export_format):
    brand, campaign, user_id, error = _owned_campaign(campaign_id)
    if error:
        return jsonify({'error': error[0]}), error[1]
    entitlements = get_brand_report_entitlements(user_id)
    required = 'pdf_export' if export_format == 'pdf' else 'csv_export'
    if export_format not in {'pdf', 'csv'} or not entitlements.get(required):
        return jsonify({'error': 'Campaign report exports require a Pro or higher brand plan'}), 403
    try:
        start_date, end_date = _requested_range(entitlements)
        payload = campaign_report_service.build_payload(
            campaign.id,
            start_date,
            end_date,
            include_sentiment=entitlements['full_sentiment'],
        )
        if export_format == 'pdf':
            body = generate_campaign_report_pdf(
                brand,
                payload,
                white_label=entitlements['white_label'],
            )
            mimetype = 'application/pdf'
        else:
            body = campaign_report_service.csv_bytes(payload)
            mimetype = 'text/csv; charset=utf-8'
        response = make_response(body)
        response.headers['Content-Type'] = mimetype
        response.headers['Content-Disposition'] = (
            f'attachment; filename="campaign-{campaign.id}-report.{export_format}"'
        )
        return response
    except PermissionError as exc:
        return jsonify({'error': str(exc)}), 403
    except ValueError as exc:
        return jsonify({'error': str(exc)}), 400


@bp.route('/campaigns/<int:campaign_id>/schedules', methods=['GET', 'POST'])
@jwt_required()
def report_schedules(campaign_id):
    _, campaign, user_id, error = _owned_campaign(campaign_id)
    if error:
        return jsonify({'error': error[0]}), error[1]
    entitlements = get_brand_report_entitlements(user_id)
    if not entitlements['scheduled_reports']:
        return jsonify({'error': 'Scheduled reports require a Pro or higher brand plan'}), 403
    if request.method == 'GET':
        rows = CampaignReportSchedule.query.filter_by(
            campaign_id=campaign.id,
            brand_user_id=user_id,
        ).order_by(CampaignReportSchedule.created_at.desc()).all()
        return jsonify({'schedules': [row.to_dict() for row in rows]}), 200

    data = request.get_json() or {}
    frequency = (data.get('frequency') or '').lower()
    if frequency not in {'weekly', 'monthly'}:
        return jsonify({'error': 'Frequency must be weekly or monthly'}), 400
    try:
        recipients = _validate_recipients(data.get('recipients'))
    except ValueError as exc:
        return jsonify({'error': str(exc)}), 400
    range_mode = data.get('date_range_mode') or 'last_30_days'
    if range_mode not in {'last_7_days', 'last_30_days', 'last_90_days'}:
        return jsonify({'error': 'Invalid report date range mode'}), 400
    now = datetime.utcnow()
    schedule = CampaignReportSchedule(
        campaign_id=campaign.id,
        brand_user_id=user_id,
        frequency=frequency,
        recipients=recipients,
        subject=(data.get('subject') or '')[:180] or None,
        date_range_mode=range_mode,
        next_run_at=now + (timedelta(days=7) if frequency == 'weekly' else relativedelta(months=1)),
    )
    db.session.add(schedule)
    db.session.commit()
    return jsonify({'schedule': schedule.to_dict()}), 201


@bp.route('/schedules/<int:schedule_id>', methods=['PUT', 'DELETE'])
@jwt_required()
def manage_schedule(schedule_id):
    user_id = int(get_jwt_identity())
    schedule = CampaignReportSchedule.query.filter_by(
        id=schedule_id,
        brand_user_id=user_id,
    ).first()
    if not schedule:
        return jsonify({'error': 'Report schedule not found'}), 404
    if request.method == 'DELETE':
        db.session.delete(schedule)
        db.session.commit()
        return jsonify({'message': 'Report schedule deleted'}), 200
    data = request.get_json() or {}
    if 'is_active' in data:
        schedule.is_active = bool(data['is_active'])
    if 'recipients' in data:
        try:
            schedule.recipients = _validate_recipients(data['recipients'])
        except ValueError as exc:
            return jsonify({'error': str(exc)}), 400
    db.session.commit()
    return jsonify({'schedule': schedule.to_dict()}), 200


@bp.route('/campaigns/<int:campaign_id>/shares', methods=['GET', 'POST'])
@jwt_required()
def report_shares(campaign_id):
    _, campaign, user_id, error = _owned_campaign(campaign_id)
    if error:
        return jsonify({'error': error[0]}), error[1]
    entitlements = get_brand_report_entitlements(user_id)
    if not entitlements['shareable_links']:
        return jsonify({'error': 'Shareable reports require a Premium or higher brand plan'}), 403
    if request.method == 'GET':
        rows = CampaignReportShare.query.filter_by(
            campaign_id=campaign.id,
            brand_user_id=user_id,
        ).order_by(CampaignReportShare.created_at.desc()).all()
        return jsonify({'shares': [row.to_dict() for row in rows]}), 200

    data = request.get_json() or {}
    try:
        start_date = _parse_date(data.get('start_date'), 'start_date')
        end_date = _parse_date(data.get('end_date'), 'end_date')
        if bool(start_date) != bool(end_date):
            raise ValueError('Both start_date and end_date are required')
        start_date, end_date = campaign_report_service.normalize_range(start_date, end_date)
    except ValueError as exc:
        return jsonify({'error': str(exc)}), 400
    expires_in_days = max(1, min(int(data.get('expires_in_days') or 30), 365))
    share = CampaignReportShare(
        campaign_id=campaign.id,
        brand_user_id=user_id,
        token=secrets.token_urlsafe(36),
        label=(data.get('label') or '')[:120] or None,
        start_date=start_date,
        end_date=end_date,
        expires_at=datetime.utcnow() + timedelta(days=expires_in_days),
    )
    db.session.add(share)
    db.session.commit()
    result = share.to_dict()
    result['url'] = f"{current_app.config.get('FRONTEND_URL', 'https://bantubuzz.com')}/reports/{share.token}"
    return jsonify({'share': result}), 201


@bp.route('/shares/<int:share_id>/revoke', methods=['POST'])
@jwt_required()
def revoke_share(share_id):
    user_id = int(get_jwt_identity())
    share = CampaignReportShare.query.filter_by(id=share_id, brand_user_id=user_id).first()
    if not share:
        return jsonify({'error': 'Report link not found'}), 404
    share.revoked_at = datetime.utcnow()
    db.session.commit()
    return jsonify({'share': share.to_dict()}), 200


@bp.route('/public/<string:token>', methods=['GET'])
def public_report(token):
    share = CampaignReportShare.query.filter_by(token=token).first()
    if not share or not share.is_active:
        return jsonify({'error': 'This report link is invalid, expired, or revoked'}), 404
    campaign = share.campaign
    brand = BrandProfile.query.get(campaign.brand_id)
    entitlements = get_brand_report_entitlements(share.brand_user_id)
    if not entitlements['shareable_links']:
        return jsonify({'error': 'This report link is no longer available'}), 404
    payload = campaign_report_service.build_payload(
        campaign.id,
        share.start_date,
        share.end_date,
        include_sentiment=entitlements['full_sentiment'],
    )
    share.view_count = (share.view_count or 0) + 1
    share.last_viewed_at = datetime.utcnow()
    db.session.commit()
    return jsonify({
        'report': payload,
        'branding': {
            'name': (
                brand.report_sender_name or brand.company_name
                if entitlements['white_label']
                else 'BantuBuzz'
            ),
            'logo': (brand.report_logo or brand.logo) if entitlements['white_label'] else None,
            'primary_color': brand.report_brand_color if entitlements['white_label'] else '#B5E61D',
            'secondary_color': brand.report_secondary_color if entitlements['white_label'] else '#1F2937',
            'white_label': entitlements['white_label'],
            'powered_by_bantubuzz': True,
        },
        'share': share.to_dict(include_token=False),
    }), 200
