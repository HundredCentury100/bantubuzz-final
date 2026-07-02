import re
from datetime import datetime, timedelta

from app import db
from app.models import (
    BrandProfile,
    Brief,
    BulkBriefRecipient,
    BulkBriefSend,
    CreatorProfile,
    Proposal,
    Subscription,
)
from app.utils.notifications import create_notification

PREMIUM_TOKENS = ('premium', 'agency', 'enterprise')
TAG_RE = re.compile(r'\{([a-zA-Z0-9_]+)\}')


def get_bulk_brief_access(brand_user_id):
    subscription = Subscription.query.filter_by(user_id=brand_user_id, status='active').first()
    plan = subscription.plan if subscription else None
    slug = (getattr(plan, 'slug', '') or '').lower()
    name = (getattr(plan, 'name', '') or '').lower()
    enabled = any(token in slug or token in name for token in PREMIUM_TOKENS)
    return {
        'enabled': enabled,
        'plan_name': getattr(plan, 'name', None) or 'Free',
        'plan_slug': getattr(plan, 'slug', None) or 'free',
        'message': None if enabled else 'Bulk brief sending is available on Premium and Agency plans.',
    }


def _creator_tags(creator):
    followers = creator.get_total_followers()
    top_platform = ''
    platform_stats = creator.get_platform_stats()
    if platform_stats:
        top = max(platform_stats, key=lambda item: int(item.get('followers') or 0))
        top_platform = top.get('platform') or ''
    return {
        'creator_name': creator.username or 'Creator',
        'username': creator.username or 'Creator',
        'follower_count': f'{followers:,}',
        'category': ', '.join(creator.categories or []),
        'location': creator.location or creator.city or creator.country or '',
        'top_platform': top_platform,
    }


def render_template(template, creator):
    tags = _creator_tags(creator)
    return TAG_RE.sub(lambda match: str(tags.get(match.group(1), match.group(0))), template or '')


def _recipient_schedule(start_at, spread_hours, index, total):
    if total <= 1 or spread_hours <= 0:
        return start_at
    spacing_minutes = (spread_hours * 60) / max(total - 1, 1)
    return start_at + timedelta(minutes=round(spacing_minutes * index))


def create_bulk_send(brand_user_id, brief_id, data):
    brand = BrandProfile.query.filter_by(user_id=brand_user_id).first()
    brief = Brief.query.get(brief_id)
    if not brand or not brief or brief.brand_id != brand.id:
        raise ValueError('Brief not found')

    raw_creator_ids = data.get('creator_ids') or []
    if not isinstance(raw_creator_ids, list) or not raw_creator_ids:
        raise ValueError('Select at least one creator')
    creator_ids = list(dict.fromkeys([int(item) for item in raw_creator_ids]))
    if len(creator_ids) > 50:
        raise ValueError('You can select up to 50 creators')

    subject = (data.get('subject') or f'Brief invitation: {brief.title}').strip()
    message_template = (data.get('message_template') or '').strip()
    if not message_template:
        raise ValueError('Message template is required')

    schedule_mode = data.get('schedule_mode') or 'now'
    start_at = datetime.utcnow()
    if schedule_mode == 'scheduled' and data.get('scheduled_start_at'):
        start_at = datetime.fromisoformat(data['scheduled_start_at'].replace('Z', '+00:00')).replace(tzinfo=None)
    spread_hours = max(0, int(data.get('spread_hours') or 0))

    creators = CreatorProfile.query.filter(CreatorProfile.id.in_(creator_ids)).all()
    creators_by_id = {creator.id: creator for creator in creators}
    if len(creators_by_id) != len(creator_ids):
        raise ValueError('One or more creators could not be found')

    bulk_send = BulkBriefSend(
        brief_id=brief.id,
        brand_id=brand.id,
        workspace_id=brief.workspace_id,
        subject=subject,
        message_template=message_template,
        schedule_mode=schedule_mode,
        scheduled_start_at=start_at,
        spread_hours=spread_hours,
        status='scheduled',
    )
    db.session.add(bulk_send)
    db.session.flush()

    for index, creator_id in enumerate(creator_ids):
        creator = creators_by_id[creator_id]
        scheduled_at = _recipient_schedule(start_at, spread_hours, index, len(creator_ids))
        db.session.add(BulkBriefRecipient(
            bulk_send_id=bulk_send.id,
            creator_id=creator.id,
            creator_user_id=creator.user_id,
            rendered_subject=render_template(subject, creator),
            rendered_message=render_template(message_template, creator),
            scheduled_at=scheduled_at,
            status='scheduled',
        ))

    db.session.commit()
    send_due_bulk_briefs()
    return bulk_send


def send_due_bulk_briefs(now=None):
    now = now or datetime.utcnow()
    recipients = BulkBriefRecipient.query.join(BulkBriefSend).filter(
        BulkBriefRecipient.status == 'scheduled',
        BulkBriefRecipient.scheduled_at <= now,
    ).limit(200).all()

    for recipient in recipients:
        bulk_send = recipient.bulk_send
        brief = bulk_send.brief
        create_notification(
            user_id=recipient.creator_user_id,
            notification_type='brief_invitation',
            title=recipient.rendered_subject,
            message=recipient.rendered_message[:240],
            action_url=f'/briefs/{brief.id}?bulk_recipient={recipient.id}',
        )
        recipient.status = 'sent'
        recipient.sent_at = now
        bulk_send.status = 'sending'

    touched_send_ids = {recipient.bulk_send_id for recipient in recipients}
    for send_id in touched_send_ids:
        pending = BulkBriefRecipient.query.filter_by(bulk_send_id=send_id, status='scheduled').count()
        if pending == 0:
            BulkBriefSend.query.get(send_id).status = 'sent'

    if recipients:
        db.session.commit()
    return len(recipients)


def sync_response_tracking(brief_id=None):
    query = BulkBriefRecipient.query.join(BulkBriefSend)
    if brief_id:
        query = query.filter(BulkBriefSend.brief_id == brief_id)
    recipients = query.all()
    for recipient in recipients:
        proposal = Proposal.query.filter_by(
            brief_id=recipient.bulk_send.brief_id,
            creator_id=recipient.creator_id,
        ).first()
        if proposal and not recipient.responded_at:
            recipient.responded_at = proposal.created_at or datetime.utcnow()
            recipient.status = 'responded'
    db.session.commit()


def mark_recipient_opened(recipient_id, user_id):
    recipient = BulkBriefRecipient.query.get(recipient_id)
    if not recipient or recipient.creator_user_id != int(user_id):
        return None
    if not recipient.opened_at:
        recipient.opened_at = datetime.utcnow()
        db.session.commit()
    return recipient
