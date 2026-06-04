from datetime import datetime, timedelta
import secrets
from app import db


class ClientWorkspace(db.Model):
    """Client workspace owned by an agency brand account."""
    __tablename__ = 'client_workspaces'

    id = db.Column(db.Integer, primary_key=True)
    agency_brand_id = db.Column(db.Integer, db.ForeignKey('brand_profiles.id', ondelete='CASCADE'), nullable=False, index=True)
    name = db.Column(db.String(160), nullable=False)
    slug = db.Column(db.String(180), nullable=False)
    logo = db.Column(db.String(255))
    industry = db.Column(db.String(100))
    website = db.Column(db.String(255))
    description = db.Column(db.Text)
    billing_email = db.Column(db.String(120))
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    agency_brand = db.relationship('BrandProfile', backref=db.backref('client_workspaces', lazy='dynamic'))
    member_permissions = db.relationship(
        'WorkspaceMemberPermission',
        backref='workspace',
        lazy='dynamic',
        cascade='all, delete-orphan',
    )
    addons = db.relationship(
        'WorkspaceAddon',
        backref='workspace',
        lazy='dynamic',
        cascade='all, delete-orphan',
    )

    __table_args__ = (
        db.UniqueConstraint('agency_brand_id', 'slug', name='uq_client_workspace_agency_slug'),
    )

    def to_dict(self, include_counts=False):
        data = {
            'id': self.id,
            'agency_brand_id': self.agency_brand_id,
            'name': self.name,
            'slug': self.slug,
            'logo': self.logo,
            'industry': self.industry,
            'website': self.website,
            'description': self.description,
            'billing_email': self.billing_email,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }

        if include_counts:
            from app.models.campaign import Campaign
            from app.models.collaboration import Collaboration
            from app.models.booking import Booking

            data.update({
                'campaigns_count': Campaign.query.filter_by(workspace_id=self.id).count(),
                'active_collaborations_count': Collaboration.query.filter_by(
                    workspace_id=self.id,
                    status='in_progress',
                ).count(),
                'bookings_count': Booking.query.filter_by(workspace_id=self.id).count(),
            })

        return data


class WorkspaceMemberPermission(db.Model):
    """Per-client workspace permissions for agency team members."""
    __tablename__ = 'workspace_member_permissions'

    id = db.Column(db.Integer, primary_key=True)
    workspace_id = db.Column(db.Integer, db.ForeignKey('client_workspaces.id', ondelete='CASCADE'), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    role = db.Column(db.String(30), default='viewer', nullable=False)
    permissions = db.Column(db.JSON, default=dict)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = db.relationship('User', backref=db.backref('workspace_permissions', lazy='dynamic'))

    __table_args__ = (
        db.UniqueConstraint('workspace_id', 'user_id', name='uq_workspace_member_user'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'workspace_id': self.workspace_id,
            'user_id': self.user_id,
            'email': self.user.email if self.user else None,
            'role': self.role,
            'permissions': self.permissions or {},
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }


class WorkspaceInvitation(db.Model):
    """Pending invitation to join a client workspace."""
    __tablename__ = 'workspace_invitations'

    id = db.Column(db.Integer, primary_key=True)
    workspace_id = db.Column(db.Integer, db.ForeignKey('client_workspaces.id', ondelete='CASCADE'), nullable=False, index=True)
    invited_by_user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    email = db.Column(db.String(120), nullable=False, index=True)
    role = db.Column(db.String(30), default='viewer', nullable=False)
    permissions = db.Column(db.JSON, default=dict)
    token = db.Column(db.String(120), unique=True, nullable=False, index=True)
    status = db.Column(db.String(20), default='pending', nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    accepted_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    workspace = db.relationship('ClientWorkspace', backref=db.backref('invitations', lazy='dynamic', cascade='all, delete-orphan'))
    invited_by = db.relationship('User', foreign_keys=[invited_by_user_id], backref=db.backref('workspace_invitations_sent', lazy='dynamic'))

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
            'workspace_id': self.workspace_id,
            'email': self.email,
            'role': self.role,
            'permissions': self.permissions or {},
            'status': self.status,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'accepted_at': self.accepted_at.isoformat() if self.accepted_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }


class WorkspaceAuditLog(db.Model):
    """Audit trail for workspace team membership changes."""
    __tablename__ = 'workspace_audit_logs'

    id = db.Column(db.Integer, primary_key=True)
    workspace_id = db.Column(db.Integer, db.ForeignKey('client_workspaces.id', ondelete='CASCADE'), nullable=False, index=True)
    actor_user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True, index=True)
    target_user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True, index=True)
    target_email = db.Column(db.String(120), nullable=False, index=True)
    action = db.Column(db.String(50), nullable=False)
    role = db.Column(db.String(30))
    details = db.Column(db.JSON, default=dict)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    workspace = db.relationship('ClientWorkspace', backref=db.backref('audit_logs', lazy='dynamic', cascade='all, delete-orphan'))
    actor = db.relationship('User', foreign_keys=[actor_user_id], backref=db.backref('workspace_audit_events', lazy='dynamic'))
    target_user = db.relationship('User', foreign_keys=[target_user_id])

    def to_dict(self):
        return {
            'id': self.id,
            'workspace_id': self.workspace_id,
            'actor_user_id': self.actor_user_id,
            'actor_email': self.actor.email if self.actor else None,
            'target_user_id': self.target_user_id,
            'target_email': self.target_email,
            'action': self.action,
            'role': self.role,
            'details': self.details or {},
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class WorkspaceAddon(db.Model):
    """Billing marker for extra client workspaces beyond the plan allowance."""
    __tablename__ = 'workspace_addons'

    id = db.Column(db.Integer, primary_key=True)
    workspace_id = db.Column(db.Integer, db.ForeignKey('client_workspaces.id', ondelete='CASCADE'), nullable=False, index=True)
    subscription_id = db.Column(db.Integer, db.ForeignKey('subscriptions.id', ondelete='SET NULL'))
    billing_cycle = db.Column(db.String(20), default='monthly', nullable=False)
    amount = db.Column(db.Numeric(10, 2), default=30.00, nullable=False)
    status = db.Column(db.String(20), default='pending', nullable=False)
    payment_method = db.Column(db.String(30))
    payment_status = db.Column(db.String(30))
    payment_proof_path = db.Column(db.String(255))
    payment_reference = db.Column(db.String(120))
    smilepay_order_reference = db.Column(db.String(100))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    activated_at = db.Column(db.DateTime)

    subscription = db.relationship('Subscription', backref=db.backref('workspace_addons', lazy='dynamic'))

    def to_dict(self):
        return {
            'id': self.id,
            'workspace_id': self.workspace_id,
            'subscription_id': self.subscription_id,
            'billing_cycle': self.billing_cycle,
            'amount': float(self.amount or 0),
            'status': self.status,
            'payment_method': self.payment_method,
            'payment_status': self.payment_status,
            'payment_proof_path': self.payment_proof_path,
            'payment_reference': self.payment_reference,
            'smilepay_order_reference': self.smilepay_order_reference,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'activated_at': self.activated_at.isoformat() if self.activated_at else None,
        }
