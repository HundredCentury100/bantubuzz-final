from datetime import datetime

from app import db


class CreatorScore(db.Model):
    __tablename__ = 'creator_scores'

    id = db.Column(db.Integer, primary_key=True)
    creator_profile_id = db.Column(
        db.Integer,
        db.ForeignKey('creator_profiles.id', ondelete='CASCADE'),
        nullable=False,
        unique=True,
        index=True,
    )
    engagement_score = db.Column(db.Numeric(6, 3), nullable=False, default=0)
    reach_score = db.Column(db.Numeric(6, 3), nullable=False, default=0)
    follower_score = db.Column(db.Numeric(6, 3), nullable=False, default=0)
    sentiment_score = db.Column(db.Numeric(6, 3), nullable=False, default=0)
    activity_score = db.Column(db.Numeric(6, 3), nullable=False, default=0)
    profile_quality_score = db.Column(db.Numeric(6, 3), nullable=False, default=0)
    final_score = db.Column(db.Numeric(6, 3), nullable=False, default=0, index=True)
    input_snapshot = db.Column(db.JSON, nullable=False, default=dict)
    data_quality = db.Column(db.JSON, nullable=False, default=dict)
    formula_version = db.Column(db.String(20), nullable=False, default='1.0')
    calculated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, index=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    creator = db.relationship(
        'CreatorProfile',
        backref=db.backref('private_score', uselist=False, cascade='all, delete-orphan'),
    )


class CreatorScoreHistory(db.Model):
    __tablename__ = 'creator_score_history'

    id = db.Column(db.Integer, primary_key=True)
    creator_profile_id = db.Column(
        db.Integer,
        db.ForeignKey('creator_profiles.id', ondelete='CASCADE'),
        nullable=False,
        index=True,
    )
    engagement_score = db.Column(db.Numeric(6, 3), nullable=False)
    reach_score = db.Column(db.Numeric(6, 3), nullable=False)
    follower_score = db.Column(db.Numeric(6, 3), nullable=False)
    sentiment_score = db.Column(db.Numeric(6, 3), nullable=False)
    activity_score = db.Column(db.Numeric(6, 3), nullable=False)
    profile_quality_score = db.Column(db.Numeric(6, 3), nullable=False)
    final_score = db.Column(db.Numeric(6, 3), nullable=False)
    input_snapshot = db.Column(db.JSON, nullable=False, default=dict)
    formula_version = db.Column(db.String(20), nullable=False, default='1.0')
    calculated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, index=True)


class CreatorRanking(db.Model):
    __tablename__ = 'creator_rankings'

    id = db.Column(db.Integer, primary_key=True)
    creator_profile_id = db.Column(
        db.Integer,
        db.ForeignKey('creator_profiles.id', ondelete='CASCADE'),
        nullable=False,
        index=True,
    )
    ranking_type = db.Column(db.String(20), nullable=False, index=True)  # overall, category, platform
    context_key = db.Column(db.String(100), nullable=False, default='', index=True)
    position = db.Column(db.Integer, nullable=False, index=True)
    previous_position = db.Column(db.Integer)
    calculated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    creator = db.relationship('CreatorProfile', foreign_keys=[creator_profile_id])

    __table_args__ = (
        db.UniqueConstraint(
            'creator_profile_id',
            'ranking_type',
            'context_key',
            name='uq_creator_ranking_context',
        ),
    )


class UserSession(db.Model):
    __tablename__ = 'user_sessions'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    login_method = db.Column(db.String(30), nullable=False, default='password')
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, index=True)

    user = db.relationship('User', foreign_keys=[user_id])
