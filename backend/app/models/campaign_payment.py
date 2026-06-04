"""
Campaign Payment Models
Handles flexible payment options for campaigns (full, batch, individual)
"""
from datetime import datetime
from app import db
from sqlalchemy.dialects.postgresql import JSONB


class CampaignPayment(db.Model):
    """Parent table for campaign payment batches"""
    __tablename__ = 'campaign_payments'

    id = db.Column(db.Integer, primary_key=True)
    campaign_id = db.Column(db.Integer, db.ForeignKey('campaigns.id', ondelete='CASCADE'), nullable=False)
    brand_user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    workspace_id = db.Column(db.Integer, db.ForeignKey('client_workspaces.id', ondelete='SET NULL'), nullable=True, index=True)
    payment_type = db.Column(db.String(20), nullable=False)  # 'full_campaign', 'batch', 'individual'
    total_amount = db.Column(db.Numeric(10, 2), nullable=False)
    platform_fee = db.Column(db.Numeric(10, 2), default=0)
    net_amount = db.Column(db.Numeric(10, 2), nullable=False)
    payment_method = db.Column(db.String(50), default='paynow')
    payment_reference = db.Column(db.String(100))
    paynow_poll_url = db.Column(db.String(500))
    status = db.Column(db.String(20), nullable=False, default='pending')  # pending, processing, completed, failed, cancelled
    initiated_at = db.Column(db.DateTime, default=datetime.utcnow)
    completed_at = db.Column(db.DateTime)
    failed_reason = db.Column(db.Text)
    payment_metadata = db.Column(JSONB)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    campaign = db.relationship('Campaign', backref=db.backref('payments', lazy='dynamic'))
    brand = db.relationship('User', foreign_keys=[brand_user_id], backref='campaign_payments_made')
    workspace = db.relationship('ClientWorkspace', backref=db.backref('campaign_payments', lazy='dynamic'))
    items = db.relationship('CampaignPaymentItem', backref='payment', lazy='dynamic', cascade='all, delete-orphan')

    def __repr__(self):
        return f'<CampaignPayment {self.id}: {self.payment_type} - ${self.total_amount} ({self.status})>'

    def to_dict(self):
        """Convert payment to dictionary"""
        return {
            'id': self.id,
            'campaign_id': self.campaign_id,
            'campaign_title': self.campaign.title if self.campaign else None,
            'brand_user_id': self.brand_user_id,
            'workspace_id': self.workspace_id,
            'payment_type': self.payment_type,
            'total_amount': float(self.total_amount),
            'platform_fee': float(self.platform_fee) if self.platform_fee else 0,
            'net_amount': float(self.net_amount),
            'payment_method': self.payment_method,
            'payment_reference': self.payment_reference,
            'paynow_poll_url': self.paynow_poll_url,
            'status': self.status,
            'initiated_at': self.initiated_at.isoformat() if self.initiated_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'failed_reason': self.failed_reason,
            'items_count': self.items.count(),
            'metadata': self.payment_metadata,
        }

    @staticmethod
    def create_payment(campaign_id, brand_user_id, collaboration_ids, payment_type='batch'):
        """
        Create a new campaign payment with items

        Args:
            campaign_id: ID of the campaign
            brand_user_id: ID of the brand user making payment
            collaboration_ids: List of collaboration IDs to pay
            payment_type: 'full_campaign', 'batch', or 'individual'

        Returns:
            CampaignPayment object
        """
        from app.models import Collaboration, CampaignProposal

        # Get collaborations - verify they belong to this campaign
        collaborations = Collaboration.query.filter(
            Collaboration.id.in_(collaboration_ids),
            Collaboration.status == 'active'
        ).all()

        # Verify all collaborations belong to this campaign
        valid_collaborations = []
        for collab in collaborations:
            if collab.campaign_application and collab.campaign_application.campaign_id == campaign_id:
                valid_collaborations.append(collab)

        if not valid_collaborations:
            raise ValueError("No valid collaborations found")

        collaborations = valid_collaborations

        # Calculate total amount
        total_amount = sum(float(collab.package.price) for collab in collaborations)
        platform_fee = total_amount * 0.10  # 10% platform fee
        net_amount = total_amount - platform_fee

        # Create payment
        payment = CampaignPayment(
            campaign_id=campaign_id,
            brand_user_id=brand_user_id,
            workspace_id=collaborations[0].workspace_id if collaborations else None,
            payment_type=payment_type,
            total_amount=total_amount,
            platform_fee=platform_fee,
            net_amount=net_amount,
            status='pending'
        )

        db.session.add(payment)
        db.session.flush()  # Get payment ID

        # Create payment items
        for collab in collaborations:
            item_amount = float(collab.package.price)
            item_fee = item_amount * 0.10
            item_net = item_amount - item_fee

            # Get creator user_id from CreatorProfile relationship
            creator_user_id = collab.creator.user_id if collab.creator else None
            if not creator_user_id:
                continue  # Skip if creator not found

            item = CampaignPaymentItem(
                campaign_payment_id=payment.id,
                collaboration_id=collab.id,
                creator_user_id=creator_user_id,
                amount=item_amount,
                platform_fee=item_fee,
                net_amount=item_net,
                status='pending'
            )
            db.session.add(item)

        db.session.commit()
        return payment

    def mark_as_completed(self):
        """Mark payment as completed and update all items"""
        self.status = 'completed'
        self.completed_at = datetime.utcnow()

        # Update all items
        for item in self.items:
            item.status = 'paid'
            item.paid_at = datetime.utcnow()

            # Update collaboration payment status
            if item.collaboration:
                item.collaboration.payment_status = 'paid'
                item.collaboration.payment_id = self.id

        db.session.commit()

    def mark_as_failed(self, reason=None):
        """Mark payment as failed"""
        self.status = 'failed'
        self.failed_reason = reason

        # Update all items
        for item in self.items:
            item.status = 'failed'

        db.session.commit()


class CampaignPaymentItem(db.Model):
    """Individual collaboration payments within a payment batch"""
    __tablename__ = 'campaign_payment_items'

    id = db.Column(db.Integer, primary_key=True)
    campaign_payment_id = db.Column(db.Integer, db.ForeignKey('campaign_payments.id', ondelete='CASCADE'), nullable=False)
    collaboration_id = db.Column(db.Integer, db.ForeignKey('collaborations.id', ondelete='CASCADE'), nullable=False)
    creator_user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    platform_fee = db.Column(db.Numeric(10, 2), default=0)
    net_amount = db.Column(db.Numeric(10, 2), nullable=False)
    status = db.Column(db.String(20), nullable=False, default='pending')  # pending, paid, failed
    paid_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    collaboration = db.relationship('Collaboration', backref='payment_items')
    creator = db.relationship('User', foreign_keys=[creator_user_id], backref='campaign_payment_items_received')

    # Unique constraint
    __table_args__ = (
        db.UniqueConstraint('campaign_payment_id', 'collaboration_id', name='unique_payment_collaboration'),
    )

    def __repr__(self):
        return f'<CampaignPaymentItem {self.id}: Collab {self.collaboration_id} - ${self.amount} ({self.status})>'

    def to_dict(self):
        """Convert payment item to dictionary"""
        from app.models import CreatorProfile

        creator_profile = CreatorProfile.query.filter_by(user_id=self.creator_user_id).first()

        return {
            'id': self.id,
            'campaign_payment_id': self.campaign_payment_id,
            'collaboration_id': self.collaboration_id,
            'creator': {
                'user_id': self.creator_user_id,
                'display_name': creator_profile.display_name if creator_profile else self.creator.email,
                'profile_picture': creator_profile.profile_picture if creator_profile else None,
            },
            'amount': float(self.amount),
            'platform_fee': float(self.platform_fee) if self.platform_fee else 0,
            'net_amount': float(self.net_amount),
            'status': self.status,
            'paid_at': self.paid_at.isoformat() if self.paid_at else None,
        }
