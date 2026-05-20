from app import db
from datetime import datetime


class PackageDeliverable(db.Model):
    """
    Deliverable model for package-based collaborations
    Mirrors MilestoneDeliverable structure to enable unified analytics system
    """
    __tablename__ = 'package_deliverables'

    id = db.Column(db.Integer, primary_key=True)
    collaboration_id = db.Column(db.Integer, db.ForeignKey('collaborations.id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    url = db.Column(db.Text, nullable=True)  # Made nullable since URL is submitted later
    description = db.Column(db.Text, nullable=True)
    platform = db.Column(db.String(50), nullable=True)  # For multi-platform packages: Instagram, Facebook, LinkedIn, TikTok, YouTube
    deliverable_type = db.Column(db.String(20), default='draft')  # draft, live_post - for YES/NO track differentiation
    status = db.Column(db.String(20), default='pending_review')  # pending_review, revision_requested, approved
    submitted_at = db.Column(db.DateTime, default=datetime.utcnow)
    approved_at = db.Column(db.DateTime, nullable=True)
    revision_notes = db.Column(db.Text, nullable=True)
    revision_requested_at = db.Column(db.DateTime, nullable=True)

    # Post tracking fields (Phase 1: Analytics Integration)
    post_platform = db.Column(db.String(50), nullable=True)  # instagram, facebook, youtube, tiktok, twitter
    post_id = db.Column(db.String(255), nullable=True)  # Platform's native post ID
    thunzi_post_id = db.Column(db.Integer, nullable=True)  # ThunziAI's post ID
    post_url_validated = db.Column(db.Boolean, default=False, nullable=False)
    url_submitted_at = db.Column(db.DateTime, nullable=True)

    def parse_and_validate_url(self) -> bool:
        """
        Parse URL and extract platform/post_id using PostURLParser

        Returns:
            True if URL was successfully parsed, False otherwise

        Side effects:
            Updates post_platform, post_id, post_url_validated, and url_submitted_at
        """
        from app.utils.post_url_parser import PostURLParser

        if not self.url:
            return False

        parsed = PostURLParser.parse_url(self.url)
        if parsed:
            self.post_platform = parsed['platform']
            self.post_id = parsed['post_id']
            self.post_url_validated = True
            self.url_submitted_at = datetime.utcnow()
            return True

        self.post_url_validated = False
        return False

    def to_dict(self):
        """Convert deliverable to dictionary"""
        return {
            'id': self.id,
            'collaboration_id': self.collaboration_id,
            'title': self.title,
            'url': self.url,
            'description': self.description,
            'platform': self.platform,  # Platform for multi-platform packages
            'deliverable_type': self.deliverable_type,  # draft or live_post
            'status': self.status,
            'submitted_at': self.submitted_at.isoformat() if self.submitted_at else None,
            'approved_at': self.approved_at.isoformat() if self.approved_at else None,
            'revision_notes': self.revision_notes,
            'revision_requested_at': self.revision_requested_at.isoformat() if self.revision_requested_at else None,
            # Post tracking fields
            'post_platform': self.post_platform,
            'post_id': self.post_id,
            'thunzi_post_id': self.thunzi_post_id,
            'post_url_validated': self.post_url_validated,
            'url_submitted_at': self.url_submitted_at.isoformat() if self.url_submitted_at else None,
            # Analytics compatibility
            'url_validation_status': 'valid' if self.post_url_validated else 'invalid',
            'post_url': self.url if self.post_url_validated else None
        }

    def __repr__(self):
        return f'<PackageDeliverable {self.id}: {self.title}>'
