import hashlib
import secrets
import string
from datetime import datetime, timedelta
from decimal import Decimal

from sqlalchemy import func, or_

from app import db
from app.models import (
    AccountCreditTransaction,
    CreatorProfile,
    Notification,
    Referral,
    ReferralClick,
    ReferralCode,
    ReferralFulfillmentTask,
    ReferralReward,
    SpotlightBoost,
    Subscription,
    User,
)


QUALIFICATION_DAYS = 30
MONTHLY_CREDIT_CAP = Decimal('50.00')
CODE_ALPHABET = string.ascii_uppercase + string.digits


def get_or_create_referral_code(user_id):
    existing = ReferralCode.query.filter_by(user_id=user_id).first()
    if existing:
        return existing

    while True:
        code = ''.join(secrets.choice(CODE_ALPHABET) for _ in range(7))
        if not ReferralCode.query.filter_by(code=code).first():
            break
    referral_code = ReferralCode(user_id=user_id, code=code)
    db.session.add(referral_code)
    db.session.flush()
    return referral_code


def record_click(code, visitor_token=None, referrer_url=None, user_agent=None, source=None):
    referral_code = ReferralCode.query.filter(
        func.upper(ReferralCode.code) == (code or '').strip().upper(),
        ReferralCode.is_active == True,
    ).first()
    if not referral_code:
        return None

    visitor_hash = None
    if visitor_token:
        visitor_hash = hashlib.sha256(visitor_token.encode('utf-8')).hexdigest()
        recent = ReferralClick.query.filter(
            ReferralClick.referral_code_id == referral_code.id,
            ReferralClick.visitor_hash == visitor_hash,
            ReferralClick.clicked_at >= datetime.utcnow() - timedelta(hours=24),
        ).first()
        if recent:
            return referral_code

    db.session.add(ReferralClick(
        referral_code_id=referral_code.id,
        visitor_hash=visitor_hash,
        referrer_url=(referrer_url or '')[:500] or None,
        user_agent=(user_agent or '')[:500] or None,
        source=(source or '')[:80] or None,
    ))
    return referral_code


def attach_referral(user, code):
    if not user or not code or Referral.query.filter_by(referred_user_id=user.id).first():
        return None
    referral_code = ReferralCode.query.filter(
        func.upper(ReferralCode.code) == str(code).strip().upper(),
        ReferralCode.is_active == True,
    ).first()
    if not referral_code or referral_code.user_id == user.id:
        return None

    referral = Referral(
        referral_code_id=referral_code.id,
        referrer_user_id=referral_code.user_id,
        referred_user_id=user.id,
        referred_user_type=user.user_type,
    )
    db.session.add(referral)
    db.session.flush()
    return referral


def mark_referral_activated(user_id):
    referral = Referral.query.filter_by(referred_user_id=user_id).first()
    if not referral or referral.status in ('qualified', 'disqualified'):
        return referral
    now = datetime.utcnow()
    referral.status = 'qualifying'
    referral.activated_at = referral.activated_at or now
    referral.qualification_due_at = referral.qualification_due_at or now + timedelta(days=QUALIFICATION_DAYS)
    return referral


def mark_referred_subscription_paid(user_id, plan_slug):
    referral = Referral.query.filter_by(referred_user_id=user_id).first()
    if referral:
        referral.first_paid_at = referral.first_paid_at or datetime.utcnow()
        referral.first_paid_plan_slug = referral.first_paid_plan_slug or (plan_slug or '')
    return referral


def _active_subscription(user_id):
    return Subscription.query.filter_by(user_id=user_id, status='active').order_by(Subscription.created_at.desc()).first()


def _plan_slug(user_id):
    subscription = _active_subscription(user_id)
    return (subscription.plan.slug or '').lower() if subscription and subscription.plan else 'free'


def _notify(user_id, title, message):
    db.session.add(Notification(
        user_id=user_id,
        type='referral',
        title=title,
        message=message,
        action_url='/referrals',
    ))


def _create_reward(user_id, reward_key, reward_type, referral_id=None, amount=None, value=None,
                   starts_at=None, ends_at=None, metadata=None):
    reward = ReferralReward.query.filter_by(user_id=user_id, reward_key=reward_key).first()
    if reward:
        return reward, False
    reward = ReferralReward(
        referral_id=referral_id,
        user_id=user_id,
        reward_key=reward_key,
        reward_type=reward_type,
        amount=amount,
        value=value,
        starts_at=starts_at,
        ends_at=ends_at,
        metadata_json=metadata or {},
    )
    db.session.add(reward)
    db.session.flush()
    return reward, True


def account_credit_balance(user_id):
    total = db.session.query(func.coalesce(func.sum(AccountCreditTransaction.amount), 0)).filter(
        AccountCreditTransaction.user_id == user_id,
        AccountCreditTransaction.status == 'available',
    ).scalar()
    return Decimal(str(total or 0)).quantize(Decimal('0.01'))


def _credit_earned_this_month(user_id, now=None):
    now = now or datetime.utcnow()
    start = datetime(now.year, now.month, 1)
    total = db.session.query(func.coalesce(func.sum(AccountCreditTransaction.amount), 0)).filter(
        AccountCreditTransaction.user_id == user_id,
        AccountCreditTransaction.transaction_type == 'grant',
        AccountCreditTransaction.amount > 0,
        AccountCreditTransaction.created_at >= start,
    ).scalar()
    return Decimal(str(total or 0))


def release_credit_reward(reward, now=None):
    now = now or datetime.utcnow()
    target = Decimal(str(reward.amount or 0))
    already = db.session.query(func.coalesce(func.sum(AccountCreditTransaction.amount), 0)).filter(
        AccountCreditTransaction.referral_reward_id == reward.id,
        AccountCreditTransaction.transaction_type == 'grant',
    ).scalar()
    already = Decimal(str(already or 0))
    remaining = max(Decimal('0.00'), target - already)
    monthly_room = max(Decimal('0.00'), MONTHLY_CREDIT_CAP - _credit_earned_this_month(reward.user_id, now))
    release = min(remaining, monthly_room)
    if release <= 0:
        reward.status = 'pending_release'
        return Decimal('0.00')

    sequence = AccountCreditTransaction.query.filter_by(
        referral_reward_id=reward.id,
        transaction_type='grant',
    ).count() + 1
    db.session.add(AccountCreditTransaction(
        user_id=reward.user_id,
        referral_reward_id=reward.id,
        amount=release,
        transaction_type='grant',
        status='available',
        reference=f'REFERRAL-{reward.id}-{sequence}',
        description='Referral account credit',
    ))
    reward.status = 'active' if release == remaining else 'pending_release'
    return release


def apply_account_credit(user_id, amount, reference, metadata=None):
    requested = Decimal(str(amount or 0)).quantize(Decimal('0.01'))
    applied = min(requested, account_credit_balance(user_id))
    if applied <= 0:
        return Decimal('0.00')
    existing = AccountCreditTransaction.query.filter_by(reference=reference).first()
    if existing:
        return abs(Decimal(str(existing.amount)))
    db.session.add(AccountCreditTransaction(
        user_id=user_id,
        amount=-applied,
        transaction_type='applied',
        status='available',
        reference=reference,
        description='Account credit applied to subscription',
        metadata_json=metadata or {},
    ))
    return applied


def _paid_credit_amount(referrer, referral):
    referrer_plan = _plan_slug(referrer.id)
    referred_plan = (referral.first_paid_plan_slug or '').lower()
    if not referral.first_paid_at or referrer_plan == 'free':
        return Decimal('0.00')

    if referrer.user_type == 'creator':
        if referrer_plan == 'rising':
            return Decimal('15.00') if referral.referred_user_type == 'brand' else Decimal('5.00')
        if referrer_plan == 'pro':
            return Decimal('15.00') if referral.referred_user_type == 'brand' else Decimal('10.00')
        return Decimal('0.00')

    if referrer.user_type == 'brand':
        if referrer_plan in ('agency', 'brand-agency') and referred_plan in ('agency', 'brand-agency'):
            return Decimal('150.00')
        matrix = {
            'starter': {'starter': '20.00', 'pro': '40.00', 'premium': '40.00'},
            'pro': {'starter': '20.00', 'pro': '40.00', 'premium': '80.00'},
            'premium': {'starter': '40.00', 'pro': '80.00', 'premium': '120.00'},
        }
        return Decimal(matrix.get(referrer_plan, {}).get(referred_plan, '0.00'))
    return Decimal('0.00')


def _grant_free_creator_milestones(referrer):
    if referrer.user_type != 'creator' or _plan_slug(referrer.id) != 'free':
        return
    qualified_creators = Referral.query.filter_by(
        referrer_user_id=referrer.id,
        referred_user_type='creator',
        status='qualified',
    ).count()
    now = datetime.utcnow()

    if qualified_creators >= 1:
        _, created = _create_reward(
            referrer.id, 'creator_milestone_1', 'commission_override',
            value='12', starts_at=now, ends_at=now + timedelta(days=183),
            metadata={'qualified_creators': qualified_creators},
        )
        if created:
            _notify(referrer.id, 'Referral reward unlocked', 'Your creator commission is now 12% for six months.')

    if qualified_creators >= 5:
        _, created = _create_reward(
            referrer.id, 'creator_milestone_5', 'promotional_badge',
            value='referral_verified', starts_at=now, ends_at=now + timedelta(days=30),
            metadata={'qualified_creators': qualified_creators},
        )
        if created:
            _notify(referrer.id, 'Referral badge unlocked', 'You unlocked a 30-day referral achievement badge.')

    if qualified_creators >= 10:
        _, created = _create_reward(
            referrer.id, 'creator_milestone_10', 'commission_override',
            value='10', starts_at=now, metadata={'qualified_creators': qualified_creators},
        )
        if created:
            _notify(referrer.id, 'Permanent referral reward unlocked', 'Your creator commission is now permanently 10%.')


def _grant_brand_referral_boost(referrer, referral):
    if referrer.user_type != 'creator' or referral.referred_user_type != 'brand':
        return
    profile = CreatorProfile.query.filter_by(user_id=referrer.id).first()
    if not profile:
        return
    reward, created = _create_reward(
        referrer.id,
        f'brand_referral_boost_{referral.id}',
        'spotlight_boost',
        referral_id=referral.id,
        value='7',
        starts_at=datetime.utcnow(),
        ends_at=datetime.utcnow() + timedelta(days=7),
    )
    if not created:
        return
    existing = SpotlightBoost.query.filter(
        SpotlightBoost.target_type == 'creator_profile',
        SpotlightBoost.target_id == profile.id,
        SpotlightBoost.status == 'active',
        SpotlightBoost.ends_at > datetime.utcnow(),
    ).order_by(SpotlightBoost.ends_at.desc()).first()
    if existing:
        existing.duration_days += 7
        existing.ends_at += timedelta(days=7)
        existing.updated_at = datetime.utcnow()
    else:
        starts_at = datetime.utcnow()
        db.session.add(SpotlightBoost(
            user_id=referrer.id,
            target_type='creator_profile',
            target_id=profile.id,
            duration_days=7,
            amount=0,
            status='active',
            payment_method='referral',
            payment_reference=f'REFERRAL-{referral.id}',
            starts_at=starts_at,
            ends_at=starts_at + timedelta(days=7),
        ))
    _notify(referrer.id, 'Featured placement unlocked', 'Your qualified brand referral earned you a free 7-day featured placement.')


def grant_qualified_referral_rewards(referral):
    referrer = User.query.get(referral.referrer_user_id)
    if not referrer:
        return
    _grant_free_creator_milestones(referrer)
    _grant_brand_referral_boost(referrer, referral)

    credit_amount = _paid_credit_amount(referrer, referral)
    if credit_amount > 0:
        reward, created = _create_reward(
            referrer.id,
            f'paid_referral_credit_{referral.id}',
            'account_credit',
            referral_id=referral.id,
            amount=credit_amount,
            metadata={'referred_plan': referral.first_paid_plan_slug},
        )
        if created:
            released = release_credit_reward(reward)
            _notify(
                referrer.id,
                'Referral credit earned',
                f'You earned ${credit_amount:.2f} in account credit. ${released:.2f} is available now.',
            )
            if credit_amount >= Decimal('150.00'):
                db.session.add(ReferralFulfillmentTask(
                    referral_reward_id=reward.id,
                    task_type='agency_co_marketing',
                    notes='Contact the referring agency to arrange the co-marketing feature.',
                ))


def qualify_due_referrals(now=None):
    now = now or datetime.utcnow()
    referrals = Referral.query.filter(
        Referral.status == 'qualifying',
        Referral.qualification_due_at <= now,
    ).all()
    qualified = 0
    for referral in referrals:
        referred = User.query.get(referral.referred_user_id)
        has_activity = bool(referred and referred.last_login and referral.activated_at and referred.last_login >= referral.activated_at)
        if not referred or not referred.is_active or not referred.is_verified or not has_activity:
            referral.status = 'disqualified'
            referral.disqualification_reason = 'Account did not remain active, verified, and used during the 30-day period'
            continue
        referral.status = 'qualified'
        referral.qualified_at = now
        grant_qualified_referral_rewards(referral)
        qualified += 1

    pending_rewards = ReferralReward.query.filter_by(
        reward_type='account_credit',
        status='pending_release',
    ).all()
    for reward in pending_rewards:
        release_credit_reward(reward, now)
    return qualified


def effective_creator_commission(user_id, plan_rate):
    now = datetime.utcnow()
    rewards = ReferralReward.query.filter(
        ReferralReward.user_id == user_id,
        ReferralReward.reward_type == 'commission_override',
        ReferralReward.status == 'active',
        or_(ReferralReward.starts_at.is_(None), ReferralReward.starts_at <= now),
        or_(ReferralReward.ends_at.is_(None), ReferralReward.ends_at > now),
    ).all()
    rates = [Decimal(str(plan_rate))]
    rates.extend(Decimal(str(reward.value)) for reward in rewards if reward.value)
    return float(min(rates))


def referral_dashboard(user_id):
    referral_code = get_or_create_referral_code(user_id)
    referrals = Referral.query.filter_by(referrer_user_id=user_id).order_by(Referral.created_at.desc()).all()
    rewards = ReferralReward.query.filter_by(user_id=user_id).order_by(ReferralReward.created_at.desc()).all()
    clicks = ReferralClick.query.filter_by(referral_code_id=referral_code.id).count()
    signups = len(referrals)
    activations = sum(1 for referral in referrals if referral.activated_at)
    qualified = sum(1 for referral in referrals if referral.status == 'qualified')
    return {
        'code': referral_code.code,
        'link': f'https://bantubuzz.com/r/{referral_code.code}',
        'stats': {
            'clicks': clicks,
            'signups': signups,
            'activations': activations,
            'qualified': qualified,
        },
        'credit_balance': float(account_credit_balance(user_id)),
        'referrals': [{
            'id': referral.id,
            'user_type': referral.referred_user_type,
            'status': referral.status,
            'signed_up_at': referral.signed_up_at.isoformat(),
            'qualification_due_at': referral.qualification_due_at.isoformat() if referral.qualification_due_at else None,
            'qualified_at': referral.qualified_at.isoformat() if referral.qualified_at else None,
        } for referral in referrals],
        'rewards': [{
            'id': reward.id,
            'type': reward.reward_type,
            'amount': float(reward.amount or 0),
            'value': reward.value,
            'status': reward.status,
            'starts_at': reward.starts_at.isoformat() if reward.starts_at else None,
            'ends_at': reward.ends_at.isoformat() if reward.ends_at else None,
            'created_at': reward.created_at.isoformat(),
        } for reward in rewards],
    }
