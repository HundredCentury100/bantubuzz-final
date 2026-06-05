import json
import os
from datetime import datetime

from flask import current_app

from app import db
from app.models import PushSubscription


def _webpush_available():
    try:
        from pywebpush import WebPushException, webpush  # noqa: F401
        return True
    except Exception:
        return False


def send_push_notification(user_id, title, body, url='/messages', tag='message'):
    """Send a Web Push notification when VAPID and pywebpush are configured."""
    public_key = current_app.config.get('VAPID_PUBLIC_KEY') or os.getenv('VAPID_PUBLIC_KEY')
    private_key = current_app.config.get('VAPID_PRIVATE_KEY') or os.getenv('VAPID_PRIVATE_KEY')
    subject = current_app.config.get('VAPID_SUBJECT') or os.getenv('VAPID_SUBJECT') or 'mailto:noreply@bantubuzz.com'

    if not public_key or not private_key:
        current_app.logger.info('Skipping push notification: VAPID keys are not configured')
        return {'sent': 0, 'skipped': True}

    try:
        from pywebpush import WebPushException, webpush
    except Exception as exc:
        current_app.logger.info('Skipping push notification: pywebpush unavailable: %s', exc)
        return {'sent': 0, 'skipped': True}

    subscriptions = PushSubscription.query.filter_by(
        user_id=user_id,
        is_active=True
    ).all()
    payload = json.dumps({
        'title': title,
        'body': body,
        'url': url,
        'tag': tag,
        'timestamp': datetime.utcnow().isoformat()
    })

    sent = 0
    for subscription in subscriptions:
        try:
            webpush(
                subscription_info=subscription.to_webpush_dict(),
                data=payload,
                vapid_private_key=private_key,
                vapid_claims={'sub': subject}
            )
            subscription.last_used_at = datetime.utcnow()
            sent += 1
        except WebPushException as exc:
            current_app.logger.warning('Web Push failed for subscription %s: %s', subscription.id, exc)
            if getattr(exc, 'response', None) and exc.response.status_code in [404, 410]:
                subscription.is_active = False
        except Exception as exc:
            current_app.logger.warning('Web Push failed for subscription %s: %s', subscription.id, exc)

    db.session.commit()
    return {'sent': sent, 'skipped': False}
