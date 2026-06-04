"""
Campaign Cart Models
Handles unpaid campaign additions before payment
"""

from app import db
from datetime import datetime
from decimal import Decimal


class CampaignCartItem(db.Model):
    """
    Represents an item in a campaign's cart (unpaid addition)
    Items can be: invitations, applications, or packages
    Brand can pay all at once, in batches, or individually
    """

    __tablename__ = 'campaign_cart_items'

    id = db.Column(db.Integer, primary_key=True)
    campaign_id = db.Column(db.Integer, db.ForeignKey('campaigns.id', ondelete='CASCADE'), nullable=False)
    brand_id = db.Column(db.Integer, db.ForeignKey('brand_profiles.id', ondelete='CASCADE'), nullable=False)

    # Item type and references
    item_type = db.Column(db.String(50), nullable=False)  # 'invitation', 'application', 'package'
    invitation_id = db.Column(db.Integer, db.ForeignKey('campaign_invitations.id', ondelete='CASCADE'))
    proposal_id = db.Column(db.Integer, db.ForeignKey('campaign_proposals.id', ondelete='CASCADE'))
    package_id = db.Column(db.Integer, db.ForeignKey('packages.id', ondelete='SET NULL'))
    creator_id = db.Column(db.Integer, db.ForeignKey('creator_profiles.id', ondelete='CASCADE'), nullable=False)

    # Pricing
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    currency = db.Column(db.String(10), default='USD')

    # Payment tracking
    payment_status = db.Column(db.String(50), default='pending')
    paid_at = db.Column(db.DateTime)
    payment_reference = db.Column(db.String(255))
    booking_id = db.Column(db.Integer, db.ForeignKey('bookings.id', ondelete='SET NULL'))

    # Collaboration created after payment
    collaboration_id = db.Column(db.Integer, db.ForeignKey('collaborations.id', ondelete='SET NULL'))

    # Metadata
    notes = db.Column(db.Text)
    custom_deliverables = db.Column(db.JSON)  # For package customization
    added_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    campaign = db.relationship('Campaign', backref='cart_items', foreign_keys=[campaign_id])
    brand = db.relationship('BrandProfile', backref='campaign_cart_items', foreign_keys=[brand_id])
    creator = db.relationship('CreatorProfile', backref='cart_items_received', foreign_keys=[creator_id])
    invitation = db.relationship('CampaignInvitation', backref='cart_item', foreign_keys=[invitation_id])
    proposal = db.relationship('CampaignProposal', backref='cart_item', foreign_keys=[proposal_id])
    package = db.relationship('Package', backref='cart_items', foreign_keys=[package_id])
    booking = db.relationship('Booking', backref='cart_item', foreign_keys=[booking_id])
    collaboration = db.relationship('Collaboration', backref='cart_source_item', foreign_keys=[collaboration_id])

    def __repr__(self):
        return f'<CampaignCartItem {self.id} - {self.item_type} - Campaign {self.campaign_id}>'

    def to_dict(self, include_relations=True):
        """Convert cart item to dictionary"""
        data = {
            'id': self.id,
            'campaign_id': self.campaign_id,
            'brand_id': self.brand_id,
            'item_type': self.item_type,
            'creator_id': self.creator_id,
            'amount': float(self.amount) if self.amount else 0.0,
            'currency': self.currency,
            'payment_status': self.payment_status,
            'paid_at': self.paid_at.isoformat() if self.paid_at else None,
            'payment_reference': self.payment_reference,
            'booking_id': self.booking_id,
            'collaboration_id': self.collaboration_id,
            'notes': self.notes,
            'custom_deliverables': self.custom_deliverables,
            'added_at': self.added_at.isoformat() if self.added_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }

        if include_relations:
            # Include creator details
            if self.creator:
                data['creator'] = {
                    'id': self.creator.id,
                    'user_id': self.creator.user_id,
                    'username': self.creator.username,
                    'display_name': self.creator.display_name,
                    'profile_picture': self.creator.profile_picture,
                    'follower_count': self.creator.follower_count,
                    'engagement_rate': getattr(self.creator, 'engagement_rate', None),
                    'rating': self.creator.get_effective_rating() if hasattr(self.creator, 'get_effective_rating') else None,
                }

            # Include package details if applicable
            if self.item_type == 'package' and self.package:
                data['package'] = {
                    'id': self.package.id,
                    'title': self.package.title,
                    'description': self.package.description,
                    'price': float(self.package.price) if self.package.price else 0.0,
                    'deliverables': self.package.deliverables,
                    'duration_days': self.package.duration_days,
                    'platforms': self.package.platforms,
                }

            # Include invitation details if applicable
            if self.item_type == 'invitation' and self.invitation:
                data['invitation'] = {
                    'id': self.invitation.id,
                    'invitation_type': self.invitation.invitation_type,
                    'status': self.invitation.status,
                    'message': self.invitation.message,
                    'package_id': self.invitation.package_id,
                }

            # Include proposal details if applicable
            if self.item_type == 'application' and self.proposal:
                data['proposal'] = {
                    'id': self.proposal.id,
                    'status': self.proposal.status,
                    'proposed_amount': float(self.proposal.proposed_price) if self.proposal.proposed_price else None,
                    'pitch': self.proposal.proposal_message,
                    'deliverables': self.proposal.deliverables,
                    'timeline_days': self.proposal.delivery_timeline_days,
                }

        return data

    @staticmethod
    def get_cart_total(campaign_id, item_ids=None):
        """
        Calculate total amount for cart items
        If item_ids provided, only calculate for those items
        """
        query = CampaignCartItem.query.filter_by(
            campaign_id=campaign_id,
            payment_status='pending'
        )

        if item_ids:
            query = query.filter(CampaignCartItem.id.in_(item_ids))

        items = query.all()
        total = sum(item.amount for item in items)
        return float(total), len(items)

    @staticmethod
    def get_pending_count(campaign_id):
        """Get count of pending (unpaid) cart items for a campaign"""
        return CampaignCartItem.query.filter_by(
            campaign_id=campaign_id,
            payment_status='pending'
        ).count()

    def mark_as_paid(self, payment_reference, booking_id=None):
        """Mark cart item as paid"""
        self.payment_status = 'paid'
        self.paid_at = datetime.utcnow()
        self.payment_reference = payment_reference
        if booking_id:
            self.booking_id = booking_id
        self.updated_at = datetime.utcnow()

    def link_collaboration(self, collaboration_id):
        """Link cart item to created collaboration"""
        self.collaboration_id = collaboration_id
        self.updated_at = datetime.utcnow()
