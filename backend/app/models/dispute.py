"""
Dispute model for BantuBuzz platform
"""
from datetime import datetime
from app import db


class Dispute(db.Model):
    __tablename__ = 'disputes'

    id = db.Column(db.Integer, primary_key=True)
    reference = db.Column(db.String(20), unique=True, nullable=False)  # DISP-0001

    # Linked collaboration
    collaboration_id = db.Column(db.Integer, db.ForeignKey('collaborations.id'), nullable=True)

    # Parties
    raised_by_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    against_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)

    # Dispute details
    issue_type = db.Column(db.String(30), nullable=False)
    # non_delivery | quality | payment | behaviour | other
    description = db.Column(db.Text, nullable=False)
    evidence_urls = db.Column(db.JSON, default=list)  # list of file URLs

    # Status lifecycle: open → under_review → resolved | closed
    status = db.Column(db.String(20), default='open', nullable=False)

    # Resolution
    resolution = db.Column(db.String(30), nullable=True)
    # release_funds | partial_release | refund | warning | suspension | no_action
    resolution_notes = db.Column(db.Text, nullable=True)
    payout_percentage = db.Column(db.Float, nullable=True)  # for partial_release

    # Admin handling
    assigned_admin_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    resolved_at = db.Column(db.DateTime, nullable=True)

    # Relationships
    collaboration = db.relationship('Collaboration', backref='disputes', foreign_keys=[collaboration_id])
    raised_by = db.relationship('User', foreign_keys=[raised_by_user_id], backref='disputes_raised')
    against_user = db.relationship('User', foreign_keys=[against_user_id], backref='disputes_against')
    assigned_admin = db.relationship('User', foreign_keys=[assigned_admin_id])

    def to_dict(self, include_details=False):
        data = {
            'id': self.id,
            'reference': self.reference,
            'collaboration_id': self.collaboration_id,
            'raised_by_user_id': self.raised_by_user_id,
            'against_user_id': self.against_user_id,
            'issue_type': self.issue_type,
            'description': self.description,
            'evidence_urls': self.evidence_urls or [],
            'status': self.status,
            'resolution': self.resolution,
            'resolution_notes': self.resolution_notes,
            'payout_percentage': self.payout_percentage,
            'assigned_admin_id': self.assigned_admin_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'resolved_at': self.resolved_at.isoformat() if self.resolved_at else None,
        }

        if include_details:
            # Raised by user info
            if self.raised_by:
                data['raised_by'] = {
                    'id': self.raised_by.id,
                    'email': self.raised_by.email,
                    'user_type': self.raised_by.user_type,
                }
            # Against user info
            if self.against_user:
                data['against_user'] = {
                    'id': self.against_user.id,
                    'email': self.against_user.email,
                    'user_type': self.against_user.user_type,
                }
            # Collaboration summary
            if self.collaboration:
                data['collaboration'] = {
                    'id': self.collaboration.id,
                    'title': self.collaboration.title,
                    'amount': self.collaboration.amount,
                    'status': self.collaboration.status,
                }
            # Assigned admin
            if self.assigned_admin:
                data['assigned_admin'] = {
                    'id': self.assigned_admin.id,
                    'email': self.assigned_admin.email,
                }

        return data

    @staticmethod
    def generate_reference():
        """Generate next DISP-XXXX reference"""
        last = Dispute.query.order_by(Dispute.id.desc()).first()
        next_id = (last.id + 1) if last else 1
        return f'DISP-{next_id:04d}'

    def __repr__(self):
        return f'<Dispute {self.reference} [{self.status}]>'
