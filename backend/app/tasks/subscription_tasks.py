"""Periodic subscription lifecycle tasks."""
from datetime import datetime, timedelta
import logging

from app import db
from app.celery_app import celery
from app.models import Subscription, Wallet, WalletTransaction
from app.services import email_service
from app.services.subscription_lifecycle_service import (
    apply_paid_subscription,
    apply_scheduled_downgrades,
    downgrade_to_free,
    mark_renewal_failed,
    plan_price,
)


logger = logging.getLogger(__name__)


@celery.task(name='app.tasks.subscription_tasks.send_renewal_reminders')
def send_renewal_reminders():
    """Send renewal reminder emails 7 days before the next charge."""
    now = datetime.utcnow()
    window_start = now + timedelta(days=7)
    window_end = now + timedelta(days=8)

    subscriptions = Subscription.query.filter(
        Subscription.status == 'active',
        Subscription.auto_renew == True,
        Subscription.cancel_at_period_end == False,
        Subscription.renewal_reminder_sent_at.is_(None),
        Subscription.next_payment_date >= window_start,
        Subscription.next_payment_date < window_end,
    ).all()

    sent = 0
    for subscription in subscriptions:
        try:
            amount = plan_price(subscription.plan, subscription.billing_cycle or 'monthly')
            if subscription.user and subscription.user.email:
                email_service.send_subscription_renewal_reminder_email(subscription.user, subscription, amount)
            subscription.renewal_reminder_sent_at = now
            subscription.updated_at = now
            sent += 1
        except Exception as error:
            logger.error("Failed to send renewal reminder for subscription %s: %s", subscription.id, error)

    db.session.commit()
    return {'status': 'success', 'reminders_sent': sent}


def _renew_with_wallet(subscription, amount):
    wallet = Wallet.query.filter_by(user_id=subscription.user_id).first()
    if not wallet or wallet.available_balance < amount:
        return False

    wallet.available_balance -= amount
    wallet.total_spent = float(wallet.total_spent or 0) + float(amount)
    wallet.updated_at = datetime.utcnow()

    transaction = WalletTransaction(
        wallet_id=wallet.id,
        user_id=subscription.user_id,
        amount=-abs(float(amount)),
        transaction_type='payment',
        status='available',
        clearance_required=False,
        description=f'Auto-renewal for {subscription.plan.name} subscription ({subscription.billing_cycle})',
        transaction_metadata={
            'payment_type': 'subscription_renewal',
            'subscription_id': subscription.id,
            'plan_id': subscription.plan_id,
            'billing_cycle': subscription.billing_cycle,
        },
    )
    db.session.add(transaction)
    db.session.flush()

    apply_paid_subscription(
        subscription,
        payment_method='wallet',
        payment_reference=f'WALLET-RENEWAL-{transaction.id}',
        amount=amount,
        billing_cycle=subscription.billing_cycle or 'monthly',
    )
    return True


@celery.task(name='app.tasks.subscription_tasks.process_subscription_renewals')
def process_subscription_renewals():
    """Process due renewals, retries, cancellations, and scheduled downgrades."""
    now = datetime.utcnow()

    downgrade_count = apply_scheduled_downgrades(now)

    ending = Subscription.query.filter(
        Subscription.status == 'active',
        Subscription.cancel_at_period_end == True,
        Subscription.current_period_end <= now,
    ).all()
    for subscription in ending:
        downgrade_to_free(subscription)

    due = Subscription.query.filter(
        Subscription.status == 'active',
        Subscription.auto_renew == True,
        Subscription.cancel_at_period_end == False,
        Subscription.next_payment_date <= now,
    ).all()

    renewed = 0
    failed = 0
    downgraded = 0
    for subscription in due:
        amount = plan_price(subscription.plan, subscription.billing_cycle or 'monthly')
        if amount <= 0:
            apply_paid_subscription(subscription, 'free', 'FREE-RENEWAL', amount, subscription.billing_cycle or 'monthly')
            renewed += 1
            continue

        if subscription.payment_method == 'wallet' and _renew_with_wallet(subscription, amount):
            renewed += 1
            continue

        mark_renewal_failed(subscription)
        failed += 1
        if subscription.status == 'active' and subscription.payment_method == 'free':
            downgraded += 1

        try:
            if subscription.user and subscription.user.email:
                if subscription.payment_status == 'downgraded_to_free':
                    email_service.send_subscription_downgraded_to_free_email(subscription.user, subscription)
                else:
                    email_service.send_subscription_payment_failed_email(
                        subscription.user,
                        subscription,
                        amount,
                        subscription.retry_count or 0,
                        subscription.next_retry_at,
                    )
        except Exception as error:
            logger.error("Failed to send renewal failure email for subscription %s: %s", subscription.id, error)

    retry_due = Subscription.query.filter(
        Subscription.status == 'past_due',
        Subscription.next_retry_at.isnot(None),
        Subscription.next_retry_at <= now,
    ).all()
    for subscription in retry_due:
        amount = plan_price(subscription.plan, subscription.billing_cycle or 'monthly')
        if subscription.payment_method == 'wallet' and _renew_with_wallet(subscription, amount):
            renewed += 1
            continue
        mark_renewal_failed(subscription)
        failed += 1

    db.session.commit()
    return {
        'status': 'success',
        'renewed': renewed,
        'failed': failed,
        'downgraded': downgraded,
        'scheduled_downgrades_applied': downgrade_count,
        'cancelled_to_free': len(ending),
    }
