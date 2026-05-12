"""
Campaign Invitation Model
Represents invitations sent by brands to creators for campaigns
"""
from datetime import datetime, timedelta
from app import db


class CampaignInvitation(db.Model):
    """Model for campaign invitations sent to creators"""
    __tablename__ = 'campaign_invitations'

    id = db.Column(db.Integer, primary_key=True)
    campaign_id = db.Column(db.Integer, db.ForeignKey('campaigns.id', ondelete='CASCADE'), nullable=False)
    creator_user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    invited_by_user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    invitation_type = db.Column(db.String(20), nullable=False)  # 'apply' or 'join'
    package_id = db.Column(db.Integer, db.ForeignKey('packages.id', ondelete='SET NULL'))  # For 'join' invitations
    proposed_amount = db.Column(db.Numeric(10, 2))  # Custom amount for 'join' invitations
    status = db.Column(db.String(20), nullable=False, default='pending')  # pending, accepted, declined, expired, cancelled
    message = db.Column(db.Text)
    response_message = db.Column(db.Text)  # Creator's response message
    invited_at = db.Column(db.DateTime, default=datetime.utcnow)
    responded_at = db.Column(db.DateTime)
    expires_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    campaign = db.relationship('Campaign', backref=db.backref('invitations', lazy='dynamic', cascade='all, delete-orphan'))
    creator = db.relationship('User', foreign_keys=[creator_user_id], backref='campaign_invitations_received')
    invited_by = db.relationship('User', foreign_keys=[invited_by_user_id], backref='campaign_invitations_sent')
    package = db.relationship('Package', foreign_keys=[package_id])

    # Unique constraint: One invitation per creator per campaign
    __table_args__ = (
        db.UniqueConstraint('campaign_id', 'creator_user_id', name='unique_campaign_creator_invitation'),
    )

    def __repr__(self):
        return f'<CampaignInvitation {self.id}: Campaign {self.campaign_id} -> Creator {self.creator_user_id} ({self.status})>'

    @property
    def is_expired(self):
        """Check if invitation has expired"""
        if self.expires_at and datetime.utcnow() > self.expires_at:
            return True
        return False

    @property
    def is_pending(self):
        """Check if invitation is still pending"""
        return self.status == 'pending' and not self.is_expired

    def accept(self):
        """Mark invitation as accepted"""
        self.status = 'accepted'
        self.responded_at = datetime.utcnow()
        db.session.commit()

    def decline(self):
        """Mark invitation as declined"""
        self.status = 'declined'
        self.responded_at = datetime.utcnow()
        db.session.commit()

    def expire(self):
        """Mark invitation as expired"""
        self.status = 'expired'
        db.session.commit()

    def to_dict(self):
        """Convert invitation to dictionary"""
        from app.models import CreatorProfile, BrandProfile

        # Get creator profile
        creator_profile = CreatorProfile.query.filter_by(user_id=self.creator_user_id).first()

        # Get brand profile (inviter)
        brand_profile = BrandProfile.query.filter_by(user_id=self.invited_by_user_id).first()

        return {
            'id': self.id,
            'campaign_id': self.campaign_id,
            'campaign_title': self.campaign.title if self.campaign else None,
            'creator': {
                'user_id': self.creator_user_id,
                'display_name': creator_profile.display_name if creator_profile else self.creator.email,
                'profile_picture': creator_profile.profile_picture if creator_profile else None,
                'follower_count': creator_profile.follower_count if creator_profile else 0,
            },
            'invited_by': {
                'user_id': self.invited_by_user_id,
                'company_name': brand_profile.company_name if brand_profile else self.invited_by.email,
                'logo': brand_profile.logo if brand_profile else None,
            },
            'invitation_type': self.invitation_type,
            'status': self.status,
            'message': self.message,
            'invited_at': self.invited_at.isoformat() if self.invited_at else None,
            'responded_at': self.responded_at.isoformat() if self.responded_at else None,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'is_expired': self.is_expired,
            'is_pending': self.is_pending,
        }

    @staticmethod
    def create_invitation(campaign_id, creator_user_id, invited_by_user_id,
                         invitation_type='invite_to_apply', message=None,
                         expires_in_days=7):
        """
        Create a new campaign invitation

        Args:
            campaign_id: ID of the campaign
            creator_user_id: ID of the creator being invited
            invited_by_user_id: ID of the brand user sending the invitation
            invitation_type: 'invite_to_apply' or 'invite_to_join'
            message: Optional personalized message
            expires_in_days: Number of days until invitation expires (default: 7)

        Returns:
            CampaignInvitation object or None if invitation already exists
        """
        # Check if invitation already exists
        existing = CampaignInvitation.query.filter_by(
            campaign_id=campaign_id,
            creator_user_id=creator_user_id
        ).first()

        if existing:
            # Update existing invitation if it was declined or expired
            if existing.status in ['declined', 'expired']:
                existing.status = 'pending'
                existing.invitation_type = invitation_type
                existing.message = message
                existing.invited_at = datetime.utcnow()
                existing.responded_at = None
                existing.expires_at = datetime.utcnow() + timedelta(days=expires_in_days)
                db.session.commit()
                return existing
            else:
                return None  # Already has active invitation

        # Create new invitation
        invitation = CampaignInvitation(
            campaign_id=campaign_id,
            creator_user_id=creator_user_id,
            invited_by_user_id=invited_by_user_id,
            invitation_type=invitation_type,
            message=message,
            expires_at=datetime.utcnow() + timedelta(days=expires_in_days)
        )

        db.session.add(invitation)
        db.session.commit()

        return invitation

    @staticmethod
    def get_pending_invitations_for_creator(creator_user_id):
        """Get all pending invitations for a creator"""
        return CampaignInvitation.query.filter_by(
            creator_user_id=creator_user_id,
            status='pending'
        ).filter(
            db.or_(
                CampaignInvitation.expires_at.is_(None),
                CampaignInvitation.expires_at > datetime.utcnow()
            )
        ).all()

    @staticmethod
    def get_invitations_for_campaign(campaign_id, status=None):
        """Get all invitations for a campaign, optionally filtered by status"""
        query = CampaignInvitation.query.filter_by(campaign_id=campaign_id)

        if status:
            query = query.filter_by(status=status)

        return query.all()
