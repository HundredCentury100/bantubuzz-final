from datetime import datetime, timedelta
import secrets

from app import db


class CreatorTeamMember(db.Model):
    __tablename__ = 'creator_team_members'

    id = db.Column(db.Integer, primary_key=True)
    creator_id = db.Column(db.Integer, db.ForeignKey('creator_profiles.id', ondelete='CASCADE'), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    role = db.Column(db.String(30), nullable=False, default='manager')
    permissions = db.Column(db.JSON, default=dict)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    creator = db.relationship('CreatorProfile', backref=db.backref('team_members', lazy='dynamic', cascade='all, delete-orphan'))
    user = db.relationship('User', backref=db.backref('creator_team_memberships', lazy='dynamic'))

    __table_args__ = (
        db.UniqueConstraint('creator_id', 'user_id', name='uq_creator_team_member_user'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'creator_id': self.creator_id,
            'user_id': self.user_id,
            'email': self.user.email if self.user else None,
            'role': self.role,
            'permissions': self.permissions or {},
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }


class CreatorTeamInvitation(db.Model):
    __tablename__ = 'creator_team_invitations'

    id = db.Column(db.Integer, primary_key=True)
    creator_id = db.Column(db.Integer, db.ForeignKey('creator_profiles.id', ondelete='CASCADE'), nullable=False, index=True)
    invited_by_user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    email = db.Column(db.String(120), nullable=False, index=True)
    role = db.Column(db.String(30), nullable=False, default='manager')
    permissions = db.Column(db.JSON, default=dict)
    token = db.Column(db.String(120), unique=True, nullable=False, index=True)
    status = db.Column(db.String(20), default='pending', nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    accepted_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    creator = db.relationship('CreatorProfile', backref=db.backref('team_invitations', lazy='dynamic', cascade='all, delete-orphan'))
    invited_by = db.relationship('User', foreign_keys=[invited_by_user_id], backref=db.backref('creator_team_invitations_sent', lazy='dynamic'))

    @staticmethod
    def generate_token():
        return secrets.token_urlsafe(32)

    @staticmethod
    def default_expiry():
        return datetime.utcnow() + timedelta(days=7)

    def is_expired(self):
        return self.expires_at and self.expires_at < datetime.utcnow()

    def to_dict(self):
        return {
            'id': self.id,
            'creator_id': self.creator_id,
            'email': self.email,
            'role': self.role,
            'permissions': self.permissions or {},
            'status': self.status,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'accepted_at': self.accepted_at.isoformat() if self.accepted_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }


class CreatorTeamAuditLog(db.Model):
    __tablename__ = 'creator_team_audit_logs'

    id = db.Column(db.Integer, primary_key=True)
    creator_id = db.Column(db.Integer, db.ForeignKey('creator_profiles.id', ondelete='CASCADE'), nullable=False, index=True)
    actor_user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True, index=True)
    target_user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True, index=True)
    target_email = db.Column(db.String(120), nullable=False, index=True)
    action = db.Column(db.String(50), nullable=False)
    role = db.Column(db.String(30))
    details = db.Column(db.JSON, default=dict)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    creator = db.relationship('CreatorProfile', backref=db.backref('team_audit_logs', lazy='dynamic', cascade='all, delete-orphan'))
    actor = db.relationship('User', foreign_keys=[actor_user_id], backref=db.backref('creator_team_audit_events', lazy='dynamic'))
    target_user = db.relationship('User', foreign_keys=[target_user_id])

    def to_dict(self):
        return {
            'id': self.id,
            'creator_id': self.creator_id,
            'actor_user_id': self.actor_user_id,
            'actor_email': self.actor.email if self.actor else None,
            'target_user_id': self.target_user_id,
            'target_email': self.target_email,
            'action': self.action,
            'role': self.role,
            'details': self.details or {},
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
