from datetime import datetime

from app import db


class ReferralCode(db.Model):
    __tablename__ = 'referral_codes'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True, index=True)
    code = db.Column(db.String(20), nullable=False, unique=True, index=True)
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    user = db.relationship('User', foreign_keys=[user_id])


class ReferralClick(db.Model):
    __tablename__ = 'referral_clicks'

    id = db.Column(db.Integer, primary_key=True)
    referral_code_id = db.Column(db.Integer, db.ForeignKey('referral_codes.id', ondelete='CASCADE'), nullable=False, index=True)
    visitor_hash = db.Column(db.String(64), index=True)
    referrer_url = db.Column(db.String(500))
    user_agent = db.Column(db.String(500))
    source = db.Column(db.String(80))
    clicked_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, index=True)

    referral_code = db.relationship('ReferralCode', foreign_keys=[referral_code_id])


class Referral(db.Model):
    __tablename__ = 'referrals'

    id = db.Column(db.Integer, primary_key=True)
    referral_code_id = db.Column(db.Integer, db.ForeignKey('referral_codes.id', ondelete='RESTRICT'), nullable=False, index=True)
    referrer_user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    referred_user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True, index=True)
    referred_user_type = db.Column(db.String(20), nullable=False)
    status = db.Column(db.String(30), nullable=False, default='signed_up', index=True)
    signed_up_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    activated_at = db.Column(db.DateTime)
    qualification_due_at = db.Column(db.DateTime, index=True)
    qualified_at = db.Column(db.DateTime)
    first_paid_at = db.Column(db.DateTime)
    first_paid_plan_slug = db.Column(db.String(80))
    disqualification_reason = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    referral_code = db.relationship('ReferralCode', foreign_keys=[referral_code_id])
    referrer = db.relationship('User', foreign_keys=[referrer_user_id])
    referred_user = db.relationship('User', foreign_keys=[referred_user_id])


class ReferralReward(db.Model):
    __tablename__ = 'referral_rewards'

    id = db.Column(db.Integer, primary_key=True)
    referral_id = db.Column(db.Integer, db.ForeignKey('referrals.id', ondelete='CASCADE'), index=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    reward_key = db.Column(db.String(100), nullable=False)
    reward_type = db.Column(db.String(40), nullable=False)
    amount = db.Column(db.Numeric(10, 2))
    value = db.Column(db.String(100))
    status = db.Column(db.String(30), nullable=False, default='active')
    starts_at = db.Column(db.DateTime)
    ends_at = db.Column(db.DateTime)
    metadata_json = db.Column(db.JSON, default=dict)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    referral = db.relationship('Referral', foreign_keys=[referral_id])
    user = db.relationship('User', foreign_keys=[user_id])

    __table_args__ = (
        db.UniqueConstraint('user_id', 'reward_key', name='uq_referral_reward_user_key'),
    )


class AccountCreditTransaction(db.Model):
    __tablename__ = 'account_credit_transactions'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    referral_reward_id = db.Column(db.Integer, db.ForeignKey('referral_rewards.id', ondelete='SET NULL'), index=True)
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    transaction_type = db.Column(db.String(30), nullable=False)  # grant, applied, reversal
    status = db.Column(db.String(30), nullable=False, default='available')
    reference = db.Column(db.String(120), unique=True)
    description = db.Column(db.String(255))
    metadata_json = db.Column(db.JSON, default=dict)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, index=True)

    user = db.relationship('User', foreign_keys=[user_id])
    referral_reward = db.relationship('ReferralReward', foreign_keys=[referral_reward_id])


class ReferralFulfillmentTask(db.Model):
    __tablename__ = 'referral_fulfillment_tasks'

    id = db.Column(db.Integer, primary_key=True)
    referral_reward_id = db.Column(db.Integer, db.ForeignKey('referral_rewards.id', ondelete='CASCADE'), nullable=False, index=True)
    task_type = db.Column(db.String(50), nullable=False)
    status = db.Column(db.String(30), nullable=False, default='requested')
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    completed_at = db.Column(db.DateTime)

    referral_reward = db.relationship('ReferralReward', foreign_keys=[referral_reward_id])
