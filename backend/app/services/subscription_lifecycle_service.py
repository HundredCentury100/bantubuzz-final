"""Subscription billing lifecycle helpers.

This module keeps recurring subscription behavior consistent across wallet,
SmilePay, bank-transfer verification, and Paynow status polling.
"""
from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime, timedelta

from app import db
from app.models import Subscription, SubscriptionPlan
from app.services.agency_subscription_service import apply_brand_subscription_entitlements


RETRY_DELAYS = [timedelta(days=1), timedelta(days=3), timedelta(days=3)]


def money(value):
    return Decimal(str(value or 0)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)


def plan_price(plan, billing_cycle):
    if not plan:
        return Decimal('0.00')
    monthly = money(plan.price_monthly)
    if billing_cycle == 'yearly':
        yearly = money(plan.price_yearly)
        if yearly <= 0 and monthly > 0:
            return money(monthly * Decimal('10'))
        return yearly
    return monthly


def monthly_equivalent(plan, billing_cycle):
    price = plan_price(plan, billing_cycle)
    return money(price / Decimal('12')) if billing_cycle == 'yearly' else price


def get_default_free_plan(user_type):
    plan = SubscriptionPlan.query.filter_by(
        user_type=user_type,
        is_default=True,
        is_active=True,
    ).first()
    if plan:
        return plan
    return SubscriptionPlan.query.filter_by(
        user_type=user_type,
        is_active=True,
        price_monthly=0,
    ).first()


def calculate_unused_credit(subscription, now=None):
    now = now or datetime.utcnow()
    if not subscription or not subscription.plan:
        return Decimal('0.00')
    if not subscription.current_period_start or not subscription.current_period_end:
        return Decimal('0.00')

    period_seconds = (subscription.current_period_end - subscription.current_period_start).total_seconds()
    remaining_seconds = max(0, (subscription.current_period_end - now).total_seconds())
    if period_seconds <= 0 or remaining_seconds <= 0:
        return Decimal('0.00')

    current_price = plan_price(subscription.plan, subscription.billing_cycle or 'monthly')
    return money(current_price * Decimal(str(remaining_seconds / period_seconds)))


def calculate_upgrade_charge(subscription, new_plan, billing_cycle, now=None):
    new_price = plan_price(new_plan, billing_cycle)
    credit = calculate_unused_credit(subscription, now)
    return max(Decimal('0.00'), money(new_price - credit))


def is_downgrade(subscription, new_plan, billing_cycle):
    current_value = monthly_equivalent(subscription.plan, subscription.billing_cycle or 'monthly')
    new_value = monthly_equivalent(new_plan, billing_cycle)
    return new_value <= current_value


def clear_pending_change(subscription):
    subscription.pending_plan_id = None
    subscription.pending_billing_cycle = None
    subscription.pending_change_type = None
    subscription.pending_proration_amount = None
    subscription.pending_change_effective_at = None
    subscription.pending_change_created_at = None


def schedule_downgrade(subscription, new_plan, billing_cycle):
    subscription.pending_plan_id = new_plan.id
    subscription.pending_billing_cycle = billing_cycle
    subscription.pending_change_type = 'downgrade'
    subscription.pending_proration_amount = Decimal('0.00')
    subscription.pending_change_effective_at = subscription.current_period_end
    subscription.pending_change_created_at = datetime.utcnow()
    subscription.updated_at = datetime.utcnow()
    return subscription


def prepare_paid_upgrade(subscription, new_plan, billing_cycle):
    amount = calculate_upgrade_charge(subscription, new_plan, billing_cycle)
    subscription.pending_plan_id = new_plan.id
    subscription.pending_billing_cycle = billing_cycle
    subscription.pending_change_type = 'upgrade'
    subscription.pending_proration_amount = amount
    subscription.pending_change_effective_at = datetime.utcnow()
    subscription.pending_change_created_at = datetime.utcnow()
    subscription.payment_status = 'pending_upgrade_payment'
    subscription.updated_at = datetime.utcnow()
    return amount


def subscription_amount_due(subscription, fallback_billing_cycle=None):
    if not subscription or not subscription.plan:
        return Decimal('0.00')
    if subscription.pending_change_type == 'upgrade' and subscription.pending_proration_amount is not None:
        return money(subscription.pending_proration_amount)
    billing_cycle = fallback_billing_cycle or subscription.billing_cycle or 'monthly'
    return plan_price(subscription.plan, billing_cycle)


def apply_paid_subscription(subscription, payment_method, payment_reference=None, amount=None, billing_cycle=None):
    """Activate a subscription or apply a paid pending upgrade."""
    if not subscription:
        return None

    now = datetime.utcnow()
    paid_amount = money(amount if amount is not None else subscription_amount_due(subscription, billing_cycle))

    if subscription.pending_change_type == 'upgrade' and subscription.pending_plan_id:
        new_plan = SubscriptionPlan.query.get(subscription.pending_plan_id)
        if new_plan:
            subscription.plan_id = new_plan.id
            subscription.billing_cycle = subscription.pending_billing_cycle or billing_cycle or subscription.billing_cycle or 'monthly'
            clear_pending_change(subscription)

    subscription.status = 'active'
    subscription.payment_status = 'paid' if payment_method != 'manual' else 'verified'
    subscription.payment_verified = True
    subscription.payment_method = payment_method
    subscription.payment_reference = payment_reference or subscription.payment_reference
    subscription.last_payment_date = now
    subscription.last_payment_amount = paid_amount
    subscription.retry_count = 0
    subscription.next_retry_at = None
    subscription.last_retry_at = None
    subscription.failed_at = None
    subscription.renewal_reminder_sent_at = None
    subscription.updated_at = now
    subscription.set_billing_period(subscription.billing_cycle or billing_cycle or 'monthly')

    if subscription.plan and subscription.plan.user_type == 'brand':
        apply_brand_subscription_entitlements(subscription.user_id, subscription.plan)

    return subscription


def apply_scheduled_downgrades(now=None):
    now = now or datetime.utcnow()
    subscriptions = Subscription.query.filter(
        Subscription.status == 'active',
        Subscription.pending_change_type == 'downgrade',
        Subscription.pending_plan_id.isnot(None),
        Subscription.pending_change_effective_at <= now,
    ).all()

    changed = 0
    for subscription in subscriptions:
        new_plan = SubscriptionPlan.query.get(subscription.pending_plan_id)
        if not new_plan:
            clear_pending_change(subscription)
            continue

        subscription.plan_id = new_plan.id
        subscription.billing_cycle = subscription.pending_billing_cycle or subscription.billing_cycle
        clear_pending_change(subscription)
        subscription.updated_at = now
        if new_plan.user_type == 'brand':
            apply_brand_subscription_entitlements(subscription.user_id, new_plan)
        changed += 1

    return changed


def downgrade_to_free(subscription):
    if not subscription:
        return None
    user_type = subscription.plan.user_type if subscription.plan else 'brand'
    free_plan = get_default_free_plan(user_type)
    if not free_plan:
        subscription.status = 'expired'
        subscription.updated_at = datetime.utcnow()
        return subscription

    subscription.plan_id = free_plan.id
    subscription.billing_cycle = 'monthly'
    subscription.status = 'active'
    subscription.payment_method = 'free'
    subscription.payment_status = 'downgraded_to_free'
    subscription.payment_verified = True
    subscription.retry_count = 0
    subscription.next_retry_at = None
    subscription.last_retry_at = None
    subscription.failed_at = None
    clear_pending_change(subscription)
    subscription.set_billing_period('monthly')
    if free_plan.user_type == 'brand':
        apply_brand_subscription_entitlements(subscription.user_id, free_plan)
    return subscription


def mark_renewal_failed(subscription):
    now = datetime.utcnow()
    subscription.status = 'past_due'
    subscription.payment_status = 'renewal_failed'
    subscription.retry_count = int(subscription.retry_count or 0) + 1
    subscription.last_retry_at = now
    subscription.failed_at = subscription.failed_at or now
    if subscription.retry_count > 3:
        downgrade_to_free(subscription)
    else:
        delay = RETRY_DELAYS[min(subscription.retry_count - 1, len(RETRY_DELAYS) - 1)]
        subscription.next_retry_at = now + delay
    subscription.updated_at = now
    return subscription
