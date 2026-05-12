from datetime import datetime
from app import db


class Collaboration(db.Model):
    """
    Unified model for tracking all collaborations between brands and creators.
    This includes both campaign applications (when accepted) and package bookings.
    """
    __tablename__ = 'collaborations'

    id = db.Column(db.Integer, primary_key=True)

    # Source of collaboration
    collaboration_type = db.Column(db.String(20), nullable=False)  # 'campaign' or 'package'
    campaign_application_id = db.Column(db.Integer, db.ForeignKey('campaign_proposals.id'), nullable=True)
    booking_id = db.Column(db.Integer, db.ForeignKey('bookings.id'), nullable=True)

    # Parties involved
    brand_id = db.Column(db.Integer, db.ForeignKey('brand_profiles.id'), nullable=False)
    creator_id = db.Column(db.Integer, db.ForeignKey('creator_profiles.id'), nullable=False)

    # Basic information
    title = db.Column(db.String(200), nullable=False)  # Campaign title or Package title
    description = db.Column(db.Text)
    amount = db.Column(db.Numeric(10, 2), nullable=False)

    # Status tracking
    status = db.Column(db.String(50), default='in_progress')  # pending_creator_acceptance, in_progress, completed, cancelled, creator_declined
    progress_percentage = db.Column(db.Integer, default=0)  # 0-100
    escrow_status = db.Column(db.String(20))  # pending, escrowed, released, failed

    # Creator response tracking (for package bookings)
    creator_response_at = db.Column(db.DateTime)  # When creator accepted/declined
    creator_decline_reason = db.Column(db.Text)  # Why creator declined (if applicable)
    refund_processed = db.Column(db.Boolean, default=False)  # Prevent double refunds

    # Deliverables tracking
    deliverables = db.Column(db.JSON, default=list)  # List of expected deliverables
    submitted_deliverables = db.Column(db.JSON, default=list)  # List of approved/final deliverables
    draft_deliverables = db.Column(db.JSON, default=list)  # List of deliverables pending review

    # Revision tracking
    revision_requests = db.Column(db.JSON, default=list)  # List of revision requests
    total_revisions_used = db.Column(db.Integer, default=0)  # Total revisions made
    paid_revisions = db.Column(db.Integer, default=0)  # Number of paid revisions

    # Cancellation tracking
    cancellation_request = db.Column(db.JSON)  # {requested_by, reason, requested_at, status: pending/approved/rejected}

    # Dates
    start_date = db.Column(db.DateTime, nullable=False)
    expected_completion_date = db.Column(db.DateTime)
    actual_completion_date = db.Column(db.DateTime)

    # Notes and updates
    notes = db.Column(db.Text)
    last_update = db.Column(db.Text)  # Latest progress update from creator
    last_update_date = db.Column(db.DateTime)

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    brand = db.relationship('BrandProfile', backref=db.backref('collaborations', lazy='dynamic'))
    creator = db.relationship('CreatorProfile', backref=db.backref('collaborations', lazy='dynamic'))
    campaign_application = db.relationship('CampaignProposal', backref=db.backref('collaboration', uselist=False))
    booking = db.relationship('Booking', backref=db.backref('collaboration', uselist=False))

    def calculate_progress(self):
        """Calculate progress based on approved deliverables vs expected deliverables"""
        if not self.deliverables or len(self.deliverables) == 0:
            return 0

        total_expected = len(self.deliverables)

        # For package collaborations, count approved deliverables from database
        if self.collaboration_type == 'package':
            from app.models.package_deliverable import PackageDeliverable
            total_approved = PackageDeliverable.query.filter_by(
                collaboration_id=self.id,
                status='approved'
            ).count()
        else:
            # For legacy or campaign collaborations, use JSON
            total_approved = len(self.submitted_deliverables or [])

        return int((total_approved / total_expected) * 100)

    def to_dict(self, include_relations=False):
        """Convert collaboration to dictionary"""
        data = {
            'id': self.id,
            'collaboration_type': self.collaboration_type,
            'campaign_application_id': self.campaign_application_id,
            'booking_id': self.booking_id,
            'brand_id': self.brand_id,
            'creator_id': self.creator_id,
            'title': self.title,
            'description': self.description,
            'amount': self.amount,
            'status': self.status,
            'progress_percentage': self.progress_percentage,
            'creator_response_at': self.creator_response_at.isoformat() if self.creator_response_at else None,
            'creator_decline_reason': self.creator_decline_reason,
            'refund_processed': self.refund_processed,
            'deliverables': self.deliverables or [],
            'submitted_deliverables': self.submitted_deliverables or [],
            'draft_deliverables': self.draft_deliverables or [],
            'revision_requests': self.revision_requests or [],
            'total_revisions_used': self.total_revisions_used or 0,
            'paid_revisions': self.paid_revisions or 0,
            'cancellation_request': self.cancellation_request,
            'cancelled_by_creator': getattr(self, 'cancelled_by_creator', False),
            'cancellation_reason': getattr(self, 'cancellation_reason', None),
            'cancelled_at': self.cancelled_at.isoformat() if hasattr(self, 'cancelled_at') and self.cancelled_at else None,
            'start_date': self.start_date.isoformat(),
            'expected_completion_date': self.expected_completion_date.isoformat() if self.expected_completion_date else None,
            'actual_completion_date': self.actual_completion_date.isoformat() if self.actual_completion_date else None,
            'notes': self.notes,
            'last_update': self.last_update,
            'last_update_date': self.last_update_date.isoformat() if self.last_update_date else None,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

        if include_relations:
            if self.brand:
                data['brand'] = self.brand.to_dict(include_user=True)
            if self.creator:
                data['creator'] = self.creator.to_dict(include_user=True)
            if self.campaign_application:
                data['campaign_application'] = self.campaign_application.to_dict(include_relations=True)
            if self.booking:
                data['booking'] = self.booking.to_dict(include_relations=True)

            # Include milestones for campaign-type collaborations
            if self.collaboration_type == 'campaign':
                from app.models.collaboration_milestone import CollaborationMilestone
                milestones = CollaborationMilestone.query.filter_by(collaboration_id=self.id).order_by(CollaborationMilestone.milestone_number).all()
                data['milestones'] = [milestone.to_dict(include_deliverables=True) for milestone in milestones]

            # Include package deliverables from database for package-type collaborations
            if self.collaboration_type == 'package':
                from app.models.package_deliverable import PackageDeliverable
                package_deliverables = PackageDeliverable.query.filter_by(
                    collaboration_id=self.id
                ).order_by(PackageDeliverable.submitted_at).all()
                data['package_deliverables'] = [d.to_dict() for d in package_deliverables]

                # Separate by status for frontend convenience
                data['draft_deliverables'] = [d.to_dict() for d in package_deliverables if d.status in ['pending_review', 'revision_requested']]
                data['submitted_deliverables'] = [d.to_dict() for d in package_deliverables if d.status == 'approved']

        return data

    def __repr__(self):
        return f'<Collaboration {self.id} - {self.title}>'
