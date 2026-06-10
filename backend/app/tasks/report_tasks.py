"""Periodic delivery of saved campaign report schedules."""
from datetime import datetime, timedelta

from dateutil.relativedelta import relativedelta

from app import db
from app.celery_app import celery
from app.models import BrandProfile, CampaignReportSchedule, User
from app.services.campaign_report_service import campaign_report_service
from app.services.email_service import send_email
from app.services.white_label_report_service import generate_campaign_report_pdf
from app.utils.subscription_helper import get_brand_report_entitlements


def _range_days(mode):
    return {
        'last_7_days': 7,
        'last_30_days': 30,
        'last_90_days': 90,
    }.get(mode, 30)


def _advance(schedule, from_time):
    if schedule.frequency == 'weekly':
        return from_time + timedelta(days=7)
    return from_time + relativedelta(months=1)


@celery.task(name='app.tasks.report_tasks.send_due_campaign_reports')
def send_due_campaign_reports():
    now = datetime.utcnow()
    schedules = CampaignReportSchedule.query.filter(
        CampaignReportSchedule.is_active.is_(True),
        CampaignReportSchedule.next_run_at <= now,
    ).all()
    sent = 0
    failed = 0
    for schedule in schedules:
        try:
            campaign = schedule.campaign
            brand = BrandProfile.query.get(campaign.brand_id)
            user = User.query.get(schedule.brand_user_id)
            entitlements = get_brand_report_entitlements(schedule.brand_user_id)
            if not entitlements['scheduled_reports']:
                schedule.is_active = False
                schedule.last_status = 'disabled'
                schedule.last_error = 'The subscription no longer includes scheduled reports'
                continue

            payload = campaign_report_service.build_payload(
                campaign.id,
                days=_range_days(schedule.date_range_mode),
                include_sentiment=entitlements['full_sentiment'],
            )
            pdf = generate_campaign_report_pdf(
                brand,
                payload,
                white_label=entitlements['white_label'],
            )
            sender_name = (
                brand.report_sender_name or brand.company_name
                if entitlements['white_label']
                else 'BantuBuzz'
            )
            reply_to = brand.report_reply_to_email or (user.email if user else None)
            subject = schedule.subject or f"{campaign.title} Campaign Performance Report"
            date_range = payload['date_range']
            text = (
                f"Attached is the campaign performance report for {campaign.title}, "
                f"covering {date_range['start_date']} to {date_range['end_date']}."
            )
            signature = (
                brand.report_email_signature
                if entitlements['white_label'] and brand.report_email_signature
                else 'BantuBuzz Reports'
            )
            send_email(
                subject,
                schedule.recipients,
                f"{text}\n\n{signature}\n\nPowered by BantuBuzz",
                (
                    f"<p>{text}</p><p>{signature.replace(chr(10), '<br>')}</p>"
                    "<p style='color:#6B7280;font-size:12px'>Powered by BantuBuzz</p>"
                ),
                sender_name=sender_name,
                reply_to=reply_to,
                attachments=[(
                    f"campaign-{campaign.id}-report.pdf",
                    'application/pdf',
                    pdf,
                )],
            )
            schedule.last_run_at = now
            schedule.last_status = 'sent'
            schedule.last_error = None
            schedule.next_run_at = _advance(schedule, schedule.next_run_at)
            sent += 1
        except Exception as exc:
            schedule.last_run_at = now
            schedule.last_status = 'failed'
            schedule.last_error = str(exc)[:2000]
            schedule.next_run_at = now + timedelta(hours=6)
            failed += 1
        db.session.commit()
    return {'processed': len(schedules), 'sent': sent, 'failed': failed}
