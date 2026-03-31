# Campaign System Complete Rebuild Plan
**Date:** 2026-03-26
**Status:** Planning - Awaiting Approval
**Priority:** CRITICAL - Full System Rebuild

---

## Executive Summary

This plan outlines a complete rebuild of the campaign system from scratch, incorporating lessons learned from the previous implementation. The rebuild will focus on:

1. **NO ROUNDING** - Money values must NEVER be rounded anywhere in the system
2. **Proper NULL handling** - Budget fields must be handled correctly based on participation mode
3. **Clean architecture** - Single responsibility, no duplicate code
4. **Consistent design** - Following existing payment page patterns
5. **Timezone-aware datetimes** - All datetime operations use timezone-aware objects

---

## Critical Lessons Learned from Previous Implementation

### Issue 1: Money Rounding (100 → 97 or 99.99)
**Root Causes:**
- `.toFixed(2)` in JavaScript display code
- `step="0.01"` in HTML number inputs (causes browser rounding)
- `float()` conversion in Python (precision loss)

**Solutions:**
- ✅ NEVER use `.toFixed()` for money display
- ✅ NEVER use `step` attribute on money inputs
- ✅ Always return money as `str()` from API (e.g., `str(budget)`)
- ✅ Use `Decimal` type for calculations, convert to string for transport
- ✅ Frontend displays raw numeric values without formatting

### Issue 2: NULL Budget Constraint Violation
**Root Cause:**
```python
# Current model has budget as NOT NULL
budget = db.Column(db.Numeric(10, 2), nullable=False)
```

But for "proposals" mode, budget should be NULL (use budget_min/budget_max instead)

**Solution:**
```python
budget = db.Column(db.Numeric(10, 2), nullable=True)  # Allow NULL for proposals mode
```

### Issue 3: DateTime Comparison Errors
**Root Cause:**
- Using `datetime.utcnow()` (timezone-naive)
- Database stores timezone-aware datetimes

**Solution:**
- ✅ ALWAYS use `datetime.now(timezone.utc)` everywhere
- ✅ Never use `datetime.utcnow()`

### Issue 4: Duplicate Code (campaigns.py vs campaigns_extended.py)
**Root Cause:**
- Two separate route files with overlapping functionality
- Confusion about which file to modify

**Solution:**
- ✅ Single `campaigns.py` file with all endpoints
- ✅ Delete `campaigns_extended.py`

---

## Files to Delete

### Backend Files
```
backend/app/routes/campaigns.py
backend/app/routes/campaigns_extended.py
backend/app/models/campaign.py
backend/app/models/campaign_milestone.py
backend/migrations/versions/202603020923_add_brief_id_to_campaigns.py
backend/migrations/versions/202603201400_unified_campaign_system.py
backend/migrations/versions/202603251430_campaign_improvements.py
backend/migrations/versions/202603251500_add_milestone_budget_allocation.py
```

### Frontend Files
```
frontend/src/pages/Campaigns.jsx (Brand dashboard - will recreate)
frontend/src/pages/BrowseCampaigns.jsx (Delete - will recreate as Opportunities.jsx)
frontend/src/pages/CampaignDetails.jsx (Brand view - will recreate)
frontend/src/pages/CreatorCampaignDetails.jsx (Delete - will recreate as OpportunityDetails.jsx)
frontend/src/pages/CampaignForm.jsx (Delete - old version)
frontend/src/pages/CampaignFormNew.jsx (Delete - will recreate as CampaignForm.jsx)
frontend/src/pages/CampaignPayment.jsx (Will recreate)
frontend/src/pages/CampaignPackageBrowser.jsx (Will recreate)
frontend/src/components/CampaignSuccessModal.jsx (Will recreate)
```

**New Files to Create:**
```
frontend/src/pages/Opportunities.jsx (Creator: Browse opportunities)
frontend/src/pages/OpportunityDetails.jsx (Creator: View opportunity and apply)
frontend/src/pages/MyApplications.jsx (Creator: Track applications)
```

### Database Tables to Drop
```sql
DROP TABLE IF EXISTS campaign_milestones CASCADE;
DROP TABLE IF EXISTS campaign_proposals CASCADE;
DROP TABLE IF EXISTS campaign_packages CASCADE;
DROP TABLE IF EXISTS campaigns CASCADE;
```

---

## Phase 1: Database Schema (Clean Slate)

### 1.1 Campaigns Table

```sql
CREATE TABLE campaigns (
    id SERIAL PRIMARY KEY,
    brand_id INTEGER NOT NULL REFERENCES brand_profiles(id) ON DELETE CASCADE,
    brief_id INTEGER REFERENCES briefs(id) ON DELETE SET NULL,

    -- Basic Info
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100),

    -- Campaign Brief Fields
    campaign_objective VARCHAR(100),  -- 'Brand Awareness', 'Engagement', etc.
    target_audience TEXT,  -- Free text description
    content_guidelines TEXT,

    -- Participation Mode
    participation_mode VARCHAR(20) NOT NULL DEFAULT 'proposals',  -- 'packages', 'proposals', 'both'
    allows_applications BOOLEAN NOT NULL DEFAULT TRUE,
    allows_packages BOOLEAN NOT NULL DEFAULT FALSE,
    requires_milestones BOOLEAN NOT NULL DEFAULT TRUE,

    -- Budget (CRITICAL: Handle NULL correctly)
    -- For 'packages' mode: budget_min and budget_max are NULL, use budget
    -- For 'proposals' mode: budget is NULL, use budget_min and budget_max
    -- For 'both' mode: set all three
    budget NUMERIC(12, 2),  -- NULL for proposals mode
    budget_min NUMERIC(12, 2),  -- NULL for packages mode
    budget_max NUMERIC(12, 2),  -- NULL for packages mode

    -- Timeline
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    application_deadline TIMESTAMP WITH TIME ZONE,  -- NULL if not accepting proposals
    timeline_days INTEGER,

    -- Targeting
    target_categories TEXT[],  -- Array of category names
    target_locations TEXT[],  -- Array of locations
    target_min_followers INTEGER,
    target_max_followers INTEGER,

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'draft',  -- 'draft', 'active', 'paused', 'completed'

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT budget_mode_check CHECK (
        (participation_mode = 'packages' AND budget IS NOT NULL AND budget_min IS NULL AND budget_max IS NULL) OR
        (participation_mode = 'proposals' AND budget IS NULL AND budget_min IS NOT NULL AND budget_max IS NOT NULL) OR
        (participation_mode = 'both' AND budget IS NOT NULL AND budget_min IS NOT NULL AND budget_max IS NOT NULL)
    )
);

CREATE INDEX idx_campaigns_brand_id ON campaigns(brand_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_participation_mode ON campaigns(participation_mode);
```

### 1.2 Campaign Milestones Table

```sql
CREATE TABLE campaign_milestones (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,

    milestone_number INTEGER NOT NULL,  -- 1, 2, 3, etc.
    name VARCHAR(200) NOT NULL,
    description TEXT,

    -- Structured Deliverables (JSON array)
    -- Format: [{"platform": "Instagram", "content_type": "Post", "quantity": 2}, ...]
    deliverables JSONB NOT NULL DEFAULT '[]',

    -- Budget allocation (for proposals mode)
    budget_allocation NUMERIC(12, 2),  -- NULL for packages mode

    -- Timeline
    duration_days INTEGER,
    due_date TIMESTAMP WITH TIME ZONE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(campaign_id, milestone_number)
);

CREATE INDEX idx_campaign_milestones_campaign_id ON campaign_milestones(campaign_id);
```

### 1.3 Campaign Proposals Table (Applications)

```sql
CREATE TABLE campaign_proposals (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    creator_id INTEGER NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,

    -- Proposal Details
    status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- 'pending', 'awaiting_payment', 'accepted', 'rejected'
    proposed_price NUMERIC(12, 2) NOT NULL,
    proposal_message TEXT,
    deliverables TEXT,  -- Custom deliverables description
    delivery_timeline_days INTEGER,

    -- Brand Response
    brand_notes TEXT,

    -- Payment Link
    booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,

    -- Timestamps
    applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP WITH TIME ZONE,

    UNIQUE(campaign_id, creator_id)  -- One application per creator per campaign
);

CREATE INDEX idx_campaign_proposals_campaign_id ON campaign_proposals(campaign_id);
CREATE INDEX idx_campaign_proposals_creator_id ON campaign_proposals(creator_id);
CREATE INDEX idx_campaign_proposals_status ON campaign_proposals(status);
```

### 1.4 Campaign Packages Association Table

```sql
CREATE TABLE campaign_packages (
    campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    package_id INTEGER NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
    booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
    added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (campaign_id, package_id)
);

CREATE INDEX idx_campaign_packages_campaign_id ON campaign_packages(campaign_id);
CREATE INDEX idx_campaign_packages_package_id ON campaign_packages(package_id);
```

---

## Phase 2: Backend Models

### 2.1 Campaign Model (`backend/app/models/campaign.py`)

**Key Rules:**
- ✅ Return ALL money fields as `str()` in `to_dict()`
- ✅ Use `datetime.now(timezone.utc)` for all datetime operations
- ✅ Handle budget fields correctly based on participation_mode

```python
from datetime import datetime, timezone
from decimal import Decimal
from app import db

# Association table
campaign_packages = db.Table('campaign_packages',
    db.Column('campaign_id', db.Integer, db.ForeignKey('campaigns.id', ondelete='CASCADE'), primary_key=True),
    db.Column('package_id', db.Integer, db.ForeignKey('packages.id', ondelete='CASCADE'), primary_key=True),
    db.Column('booking_id', db.Integer, db.ForeignKey('bookings.id', ondelete='SET NULL')),
    db.Column('added_at', db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
)

class Campaign(db.Model):
    __tablename__ = 'campaigns'

    id = db.Column(db.Integer, primary_key=True)
    brand_id = db.Column(db.Integer, db.ForeignKey('brand_profiles.id', ondelete='CASCADE'), nullable=False)
    brief_id = db.Column(db.Integer, db.ForeignKey('briefs.id', ondelete='SET NULL'))

    # Basic Info
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    category = db.Column(db.String(100))

    # Campaign Brief
    campaign_objective = db.Column(db.String(100))
    target_audience = db.Column(db.Text)
    content_guidelines = db.Column(db.Text)

    # Participation Mode
    participation_mode = db.Column(db.String(20), nullable=False, default='proposals')
    allows_applications = db.Column(db.Boolean, nullable=False, default=True)
    allows_packages = db.Column(db.Boolean, nullable=False, default=False)
    requires_milestones = db.Column(db.Boolean, nullable=False, default=True)

    # Budget - CRITICAL: NULL handling
    budget = db.Column(db.Numeric(12, 2), nullable=True)  # NULL for proposals mode
    budget_min = db.Column(db.Numeric(12, 2), nullable=True)  # NULL for packages mode
    budget_max = db.Column(db.Numeric(12, 2), nullable=True)  # NULL for packages mode

    # Timeline
    start_date = db.Column(db.DateTime(timezone=True), nullable=False)
    end_date = db.Column(db.DateTime(timezone=True), nullable=False)
    application_deadline = db.Column(db.DateTime(timezone=True))
    timeline_days = db.Column(db.Integer)

    # Targeting
    target_categories = db.Column(db.ARRAY(db.Text), default=[])
    target_locations = db.Column(db.ARRAY(db.Text), default=[])
    target_min_followers = db.Column(db.Integer)
    target_max_followers = db.Column(db.Integer)

    # Status
    status = db.Column(db.String(20), nullable=False, default='draft')

    # Timestamps
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    brand = db.relationship('BrandProfile', backref='campaigns')
    milestones = db.relationship('CampaignMilestone', backref='campaign', lazy='dynamic', cascade='all, delete-orphan')
    proposals = db.relationship('CampaignProposal', backref='campaign', lazy='dynamic', cascade='all, delete-orphan')
    packages = db.relationship('Package', secondary=campaign_packages, backref='campaigns')

    def to_dict(self):
        """CRITICAL: Return money as strings, never rounded"""
        return {
            'id': self.id,
            'brand_id': self.brand_id,
            'brief_id': self.brief_id,
            'title': self.title,
            'description': self.description,
            'category': self.category,
            'campaign_objective': self.campaign_objective,
            'target_audience': self.target_audience,
            'content_guidelines': self.content_guidelines,
            'participation_mode': self.participation_mode,
            'allows_applications': self.allows_applications,
            'allows_packages': self.allows_packages,
            'requires_milestones': self.requires_milestones,

            # CRITICAL: Return as strings to avoid rounding
            'budget': str(self.budget) if self.budget is not None else None,
            'budget_min': str(self.budget_min) if self.budget_min is not None else None,
            'budget_max': str(self.budget_max) if self.budget_max is not None else None,

            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'application_deadline': self.application_deadline.isoformat() if self.application_deadline else None,
            'timeline_days': self.timeline_days,
            'target_categories': self.target_categories or [],
            'target_locations': self.target_locations or [],
            'target_min_followers': self.target_min_followers,
            'target_max_followers': self.target_max_followers,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'milestones': [m.to_dict() for m in self.milestones.all()],
            'proposals_count': self.proposals.count(),
            'packages_count': len(self.packages)
        }


class CampaignMilestone(db.Model):
    __tablename__ = 'campaign_milestones'

    id = db.Column(db.Integer, primary_key=True)
    campaign_id = db.Column(db.Integer, db.ForeignKey('campaigns.id', ondelete='CASCADE'), nullable=False)
    milestone_number = db.Column(db.Integer, nullable=False)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    deliverables = db.Column(db.JSON, default=[], nullable=False)
    budget_allocation = db.Column(db.Numeric(12, 2))  # NULL for packages mode
    duration_days = db.Column(db.Integer)
    due_date = db.Column(db.DateTime(timezone=True))
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        """CRITICAL: Return money as string"""
        return {
            'id': self.id,
            'campaign_id': self.campaign_id,
            'milestone_number': self.milestone_number,
            'name': self.name,
            'description': self.description,
            'deliverables': self.deliverables,
            'budget_allocation': str(self.budget_allocation) if self.budget_allocation is not None else None,
            'duration_days': self.duration_days,
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class CampaignProposal(db.Model):
    __tablename__ = 'campaign_proposals'

    id = db.Column(db.Integer, primary_key=True)
    campaign_id = db.Column(db.Integer, db.ForeignKey('campaigns.id', ondelete='CASCADE'), nullable=False)
    creator_id = db.Column(db.Integer, db.ForeignKey('creator_profiles.id', ondelete='CASCADE'), nullable=False)
    status = db.Column(db.String(20), nullable=False, default='pending')
    proposed_price = db.Column(db.Numeric(12, 2), nullable=False)
    proposal_message = db.Column(db.Text)
    deliverables = db.Column(db.Text)
    delivery_timeline_days = db.Column(db.Integer)
    brand_notes = db.Column(db.Text)
    booking_id = db.Column(db.Integer, db.ForeignKey('bookings.id', ondelete='SET NULL'))
    applied_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    reviewed_at = db.Column(db.DateTime(timezone=True))

    # Relationships
    creator = db.relationship('CreatorProfile', backref='campaign_proposals')
    booking = db.relationship('Booking', backref='campaign_proposal', uselist=False)

    def to_dict(self):
        """CRITICAL: Return money as string"""
        return {
            'id': self.id,
            'campaign_id': self.campaign_id,
            'creator_id': self.creator_id,
            'status': self.status,
            'proposed_price': str(self.proposed_price) if self.proposed_price is not None else None,
            'proposal_message': self.proposal_message,
            'deliverables': self.deliverables,
            'delivery_timeline_days': self.delivery_timeline_days,
            'brand_notes': self.brand_notes,
            'booking_id': self.booking_id,
            'applied_at': self.applied_at.isoformat() if self.applied_at else None,
            'reviewed_at': self.reviewed_at.isoformat() if self.reviewed_at else None,
            'creator': self.creator.to_dict() if self.creator else None
        }

# Backward compatibility alias
CampaignApplication = CampaignProposal
```

---

## Phase 3: Backend Routes (`backend/app/routes/campaigns.py`)

**Key Rules:**
- ✅ Use `datetime.now(timezone.utc)` for ALL datetime operations
- ✅ Parse money from frontend as `Decimal(str(value))`
- ✅ Handle budget fields correctly based on participation_mode
- ✅ Create bookings before accepting proposals or adding packages
- ✅ Only create collaborations AFTER payment confirmed

### 3.1 Campaign CRUD Endpoints

```python
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timezone
from decimal import Decimal
from app import db
from app.models.campaign import Campaign, CampaignMilestone, CampaignProposal
from app.models.user import User
from app.models.brand_profile import BrandProfile
from app.models.creator_profile import CreatorProfile
from app.models.package import Package
from app.models.booking import Booking
from app.models.collaboration import Collaboration

bp = Blueprint('campaigns', __name__, url_prefix='/api/campaigns')

@bp.route('/', methods=['POST'])
@jwt_required()
def create_campaign():
    """Create new campaign - CRITICAL: Handle budget fields correctly"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()

        # Get brand profile
        brand = BrandProfile.query.filter_by(user_id=user_id).first()
        if not brand:
            return jsonify({'error': 'Brand profile not found'}), 404

        # Validate participation mode
        participation_mode = data.get('participation_mode', 'proposals')
        if participation_mode not in ['packages', 'proposals', 'both']:
            return jsonify({'error': 'Invalid participation mode'}), 400

        # Parse dates as timezone-aware
        start_date = datetime.fromisoformat(data['start_date'].replace('Z', '+00:00'))
        end_date = datetime.fromisoformat(data['end_date'].replace('Z', '+00:00'))
        application_deadline = None
        if data.get('application_deadline'):
            application_deadline = datetime.fromisoformat(data['application_deadline'].replace('Z', '+00:00'))

        # CRITICAL: Handle budget fields based on participation mode
        budget = None
        budget_min = None
        budget_max = None

        if participation_mode == 'packages':
            # Packages mode: budget only (no min/max)
            if not data.get('budget'):
                return jsonify({'error': 'Budget required for packages mode'}), 400
            budget = Decimal(str(data['budget']))

        elif participation_mode == 'proposals':
            # Proposals mode: budget_min and budget_max only (no budget)
            if not data.get('budget_min') or not data.get('budget_max'):
                return jsonify({'error': 'Budget range required for proposals mode'}), 400
            budget_min = Decimal(str(data['budget_min']))
            budget_max = Decimal(str(data['budget_max']))

        elif participation_mode == 'both':
            # Both mode: all three fields required
            if not data.get('budget') or not data.get('budget_min') or not data.get('budget_max'):
                return jsonify({'error': 'Budget and budget range required for both mode'}), 400
            budget = Decimal(str(data['budget']))
            budget_min = Decimal(str(data['budget_min']))
            budget_max = Decimal(str(data['budget_max']))

        # Create campaign
        campaign = Campaign(
            brand_id=brand.id,
            brief_id=data.get('brief_id'),
            title=data['title'],
            description=data['description'],
            category=data.get('category'),
            campaign_objective=data.get('campaign_objective'),
            target_audience=data.get('target_audience'),
            content_guidelines=data.get('content_guidelines'),
            participation_mode=participation_mode,
            allows_applications=(participation_mode in ['proposals', 'both']),
            allows_packages=(participation_mode in ['packages', 'both']),
            requires_milestones=data.get('requires_milestones', True),
            budget=budget,
            budget_min=budget_min,
            budget_max=budget_max,
            start_date=start_date,
            end_date=end_date,
            application_deadline=application_deadline,
            timeline_days=data.get('timeline_days'),
            target_categories=data.get('target_categories', []),
            target_locations=data.get('target_locations', []),
            target_min_followers=data.get('target_min_followers'),
            target_max_followers=data.get('target_max_followers'),
            status=data.get('status', 'draft')
        )

        db.session.add(campaign)
        db.session.flush()  # Get campaign.id

        # Create milestones if provided
        if data.get('milestones'):
            for milestone_data in data['milestones']:
                budget_allocation = None
                if milestone_data.get('budget_allocation'):
                    budget_allocation = Decimal(str(milestone_data['budget_allocation']))

                milestone = CampaignMilestone(
                    campaign_id=campaign.id,
                    milestone_number=milestone_data['milestone_number'],
                    name=milestone_data['name'],
                    description=milestone_data.get('description'),
                    deliverables=milestone_data.get('deliverables', []),
                    budget_allocation=budget_allocation,
                    duration_days=milestone_data.get('duration_days')
                )
                db.session.add(milestone)

        db.session.commit()

        return jsonify({
            'message': 'Campaign created successfully',
            'campaign': campaign.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        print(f"Error creating campaign: {str(e)}")
        return jsonify({'error': str(e)}), 500


@bp.route('/', methods=['GET'])
@jwt_required()
def get_campaigns():
    """Get brand's campaigns"""
    try:
        user_id = get_jwt_identity()
        brand = BrandProfile.query.filter_by(user_id=user_id).first()

        if not brand:
            return jsonify({'error': 'Brand profile not found'}), 404

        campaigns = Campaign.query.filter_by(brand_id=brand.id).order_by(Campaign.created_at.desc()).all()

        return jsonify({
            'campaigns': [c.to_dict() for c in campaigns]
        }), 200

    except Exception as e:
        print(f"Error fetching campaigns: {str(e)}")
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:campaign_id>', methods=['GET'])
@jwt_required()
def get_campaign(campaign_id):
    """Get campaign details"""
    try:
        campaign = Campaign.query.get(campaign_id)
        if not campaign:
            return jsonify({'error': 'Campaign not found'}), 404

        return jsonify(campaign.to_dict()), 200

    except Exception as e:
        print(f"Error fetching campaign: {str(e)}")
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:campaign_id>', methods=['PUT'])
@jwt_required()
def update_campaign(campaign_id):
    """Update campaign"""
    try:
        user_id = get_jwt_identity()
        brand = BrandProfile.query.filter_by(user_id=user_id).first()

        if not brand:
            return jsonify({'error': 'Brand profile not found'}), 404

        campaign = Campaign.query.get(campaign_id)
        if not campaign or campaign.brand_id != brand.id:
            return jsonify({'error': 'Campaign not found'}), 404

        data = request.get_json()

        # Update fields (similar logic to create)
        # ... (implementation details)

        db.session.commit()

        return jsonify({
            'message': 'Campaign updated successfully',
            'campaign': campaign.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error updating campaign: {str(e)}")
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:campaign_id>', methods=['DELETE'])
@jwt_required()
def delete_campaign(campaign_id):
    """Delete campaign"""
    try:
        user_id = get_jwt_identity()
        brand = BrandProfile.query.filter_by(user_id=user_id).first()

        if not brand:
            return jsonify({'error': 'Brand profile not found'}), 404

        campaign = Campaign.query.get(campaign_id)
        if not campaign or campaign.brand_id != brand.id:
            return jsonify({'error': 'Campaign not found'}), 404

        db.session.delete(campaign)
        db.session.commit()

        return jsonify({'message': 'Campaign deleted successfully'}), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error deleting campaign: {str(e)}")
        return jsonify({'error': str(e)}), 500
```

### 3.2 Browse Campaigns (Creator View)

```python
@bp.route('/browse', methods=['GET'])
@jwt_required()
def browse_campaigns():
    """Creator browsing active campaigns - CRITICAL: Use timezone-aware datetime"""
    try:
        # Get current time (timezone-aware)
        now = datetime.now(timezone.utc)

        # Base query: active campaigns only
        query = Campaign.query.filter_by(status='active')

        # Filter by participation mode
        participation_mode = request.args.get('mode')
        if participation_mode == 'packages':
            query = query.filter_by(allows_packages=True)
        elif participation_mode == 'proposals':
            query = query.filter_by(allows_applications=True)
            # Only show campaigns with deadline in future or no deadline
            query = query.filter(
                db.or_(
                    Campaign.application_deadline == None,
                    Campaign.application_deadline > now  # CRITICAL: timezone-aware comparison
                )
            )

        # Filter by category
        category = request.args.get('category')
        if category:
            query = query.filter(Campaign.target_categories.contains([category]))

        campaigns = query.order_by(Campaign.created_at.desc()).all()

        return jsonify({
            'campaigns': [c.to_dict() for c in campaigns]
        }), 200

    except Exception as e:
        print(f"Error browsing campaigns: {str(e)}")
        return jsonify({'error': str(e)}), 500
```

### 3.3 Apply to Campaign (Create Proposal)

```python
@bp.route('/<int:campaign_id>/apply', methods=['POST'])
@jwt_required()
def apply_to_campaign(campaign_id):
    """Creator applies to campaign - CRITICAL: Use timezone-aware datetime"""
    try:
        user_id = get_jwt_identity()
        creator = CreatorProfile.query.filter_by(user_id=user_id).first()

        if not creator:
            return jsonify({'error': 'Creator profile not found'}), 404

        campaign = Campaign.query.get(campaign_id)
        if not campaign:
            return jsonify({'error': 'Campaign not found'}), 404

        if campaign.status != 'active':
            return jsonify({'error': 'Campaign is not active'}), 400

        if not campaign.allows_applications:
            return jsonify({'error': 'Campaign does not accept applications'}), 400

        # Check application deadline (timezone-aware comparison)
        if campaign.application_deadline:
            now = datetime.now(timezone.utc)
            if now > campaign.application_deadline:
                return jsonify({'error': 'Application deadline has passed'}), 400

        # Check if already applied
        existing = CampaignProposal.query.filter_by(
            campaign_id=campaign_id,
            creator_id=creator.id
        ).first()

        if existing:
            return jsonify({'error': 'You have already applied to this campaign'}), 400

        data = request.get_json()

        # Parse proposed price (no rounding!)
        proposed_price = Decimal(str(data['proposed_price']))

        # Validate price is within budget range
        if campaign.budget_min and proposed_price < campaign.budget_min:
            return jsonify({'error': f'Proposed price must be at least ${campaign.budget_min}'}), 400
        if campaign.budget_max and proposed_price > campaign.budget_max:
            return jsonify({'error': f'Proposed price cannot exceed ${campaign.budget_max}'}), 400

        # Create proposal
        proposal = CampaignProposal(
            campaign_id=campaign_id,
            creator_id=creator.id,
            status='pending',
            proposed_price=proposed_price,
            proposal_message=data.get('proposal_message'),
            deliverables=data.get('deliverables'),
            delivery_timeline_days=data.get('delivery_timeline_days')
        )

        db.session.add(proposal)
        db.session.commit()

        return jsonify({
            'message': 'Application submitted successfully',
            'proposal': proposal.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        print(f"Error applying to campaign: {str(e)}")
        return jsonify({'error': str(e)}), 500
```

### 3.4 Accept Proposal (Create Booking → Payment Required)

```python
@bp.route('/proposals/<int:proposal_id>/accept', methods=['POST'])
@jwt_required()
def accept_proposal(proposal_id):
    """
    Brand accepts proposal - CREATES BOOKING (not collaboration yet)
    Collaboration only created after payment confirmed
    """
    try:
        user_id = get_jwt_identity()
        brand = BrandProfile.query.filter_by(user_id=user_id).first()

        if not brand:
            return jsonify({'error': 'Brand profile not found'}), 404

        proposal = CampaignProposal.query.get(proposal_id)
        if not proposal:
            return jsonify({'error': 'Proposal not found'}), 404

        if proposal.campaign.brand_id != brand.id:
            return jsonify({'error': 'Unauthorized'}), 403

        if proposal.status != 'pending':
            return jsonify({'error': 'Proposal already processed'}), 400

        # Create booking (payment required before collaboration)
        booking = Booking(
            booking_type='campaign_proposal',
            brand_id=brand.id,
            creator_id=proposal.creator_id,
            campaign_id=proposal.campaign_id,
            amount=proposal.proposed_price,
            total_price=proposal.proposed_price,
            status='pending',
            payment_status='pending',
            payment_method='paynow',
            notes=f"Campaign proposal for: {proposal.campaign.title}"
        )

        db.session.add(booking)
        db.session.flush()  # Get booking.id

        # Link booking to proposal
        proposal.booking_id = booking.id
        proposal.status = 'awaiting_payment'

        db.session.commit()

        return jsonify({
            'message': 'Booking created. Please proceed to payment.',
            'booking_id': booking.id,
            'redirect_to': f'/bookings/{booking.id}/payment'
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error accepting proposal: {str(e)}")
        return jsonify({'error': str(e)}), 500


@bp.route('/proposals/<int:proposal_id>/complete-payment', methods=['POST'])
@jwt_required()
def complete_proposal_payment(proposal_id):
    """
    Called AFTER payment confirmed - Creates collaboration
    """
    try:
        proposal = CampaignProposal.query.get(proposal_id)
        if not proposal:
            return jsonify({'error': 'Proposal not found'}), 404

        if not proposal.booking_id:
            return jsonify({'error': 'No booking found'}), 400

        booking = Booking.query.get(proposal.booking_id)
        if booking.payment_status not in ['paid', 'verified']:
            return jsonify({'error': 'Payment not confirmed'}), 400

        # Update proposal status
        proposal.status = 'accepted'
        proposal.reviewed_at = datetime.now(timezone.utc)

        # Create collaboration NOW (after payment)
        collaboration = Collaboration(
            collaboration_type='campaign',
            campaign_id=proposal.campaign_id,
            booking_id=booking.id,
            brand_id=proposal.campaign.brand_id,
            creator_id=proposal.creator_id,
            title=proposal.campaign.title,
            description=proposal.campaign.description,
            amount=proposal.proposed_price,
            deliverables=proposal.deliverables,
            start_date=proposal.campaign.start_date,
            expected_completion_date=proposal.campaign.end_date,
            status='in_progress',
            progress_percentage=0
        )

        db.session.add(collaboration)
        db.session.commit()

        return jsonify({
            'message': 'Payment confirmed, collaboration started',
            'collaboration_id': collaboration.id
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error completing proposal payment: {str(e)}")
        return jsonify({'error': str(e)}), 500
```

### 3.5 Add Package to Campaign (Create Booking → Payment Required)

```python
@bp.route('/<int:campaign_id>/packages', methods=['POST'])
@jwt_required()
def add_package_to_campaign(campaign_id):
    """
    Brand adds package to campaign - CREATES BOOKING (not collaboration yet)
    """
    try:
        user_id = get_jwt_identity()
        brand = BrandProfile.query.filter_by(user_id=user_id).first()

        if not brand:
            return jsonify({'error': 'Brand profile not found'}), 404

        campaign = Campaign.query.get(campaign_id)
        if not campaign or campaign.brand_id != brand.id:
            return jsonify({'error': 'Campaign not found'}), 404

        if not campaign.allows_packages:
            return jsonify({'error': 'Campaign does not allow packages'}), 400

        data = request.get_json()
        package_id = data.get('package_id')

        package = Package.query.get(package_id)
        if not package:
            return jsonify({'error': 'Package not found'}), 404

        # Check if already added
        if package in campaign.packages:
            return jsonify({'error': 'Package already added to campaign'}), 400

        # Create booking (payment required before adding package)
        booking = Booking(
            booking_type='campaign_package',
            package_id=package.id,
            campaign_id=campaign.id,
            brand_id=brand.id,
            creator_id=package.creator_id,
            amount=package.price,
            total_price=package.price,
            status='pending',
            payment_status='pending',
            payment_method='paynow',
            notes=f"Package '{package.title}' for campaign: {campaign.title}"
        )

        db.session.add(booking)
        db.session.commit()

        return jsonify({
            'message': 'Booking created. Please proceed to payment.',
            'booking_id': booking.id,
            'redirect_to': f'/bookings/{booking.id}/payment'
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error adding package to campaign: {str(e)}")
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:campaign_id>/packages/<int:package_id>/complete-payment', methods=['POST'])
@jwt_required()
def complete_package_payment(campaign_id, package_id):
    """
    Called AFTER payment confirmed - Adds package and creates collaboration
    """
    try:
        data = request.get_json()
        booking_id = data.get('booking_id')

        booking = Booking.query.get(booking_id)
        if not booking or booking.payment_status not in ['paid', 'verified']:
            return jsonify({'error': 'Payment not confirmed'}), 400

        campaign = Campaign.query.get(campaign_id)
        package = Package.query.get(package_id)

        if not campaign or not package:
            return jsonify({'error': 'Campaign or package not found'}), 404

        # Add package to campaign NOW (after payment)
        campaign.packages.append(package)

        # Update association table with booking_id
        from sqlalchemy import text
        db.session.execute(text("""
            UPDATE campaign_packages
            SET booking_id = :booking_id
            WHERE campaign_id = :campaign_id AND package_id = :package_id
        """), {'booking_id': booking_id, 'campaign_id': campaign_id, 'package_id': package_id})

        # Create collaboration
        collaboration = Collaboration(
            collaboration_type='package',
            campaign_id=campaign_id,
            package_id=package_id,
            booking_id=booking.id,
            brand_id=campaign.brand_id,
            creator_id=package.creator_id,
            title=f"{campaign.title} - {package.title}",
            description=package.description,
            amount=package.price,
            deliverables=package.deliverables or [],
            start_date=campaign.start_date,
            expected_completion_date=campaign.end_date,
            status='in_progress',
            progress_percentage=0
        )

        db.session.add(collaboration)
        db.session.commit()

        return jsonify({
            'message': 'Payment confirmed, package added to campaign',
            'collaboration_id': collaboration.id
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error completing package payment: {str(e)}")
        return jsonify({'error': str(e)}), 500
```

---

## Phase 4: Frontend Pages

### 4.1 Terminology & User-Facing Language

**CRITICAL: Different terminology for different user types**

#### Brand-Facing (Business Side):
- **"Campaigns"** - Brands create and manage campaigns
- **"Applications"** - Brands review creator applications
- **"Accept Application"** - Brands accept proposals

#### Creator-Facing (Opportunity Side):
- **"Opportunities"** - Creators browse opportunities (NOT campaigns)
- **"Apply to Opportunity"** - Creators apply to opportunities
- **"My Applications"** - Creators view their applications
- **"Opportunity Details"** - Details page for creators

**File Naming Convention:**
- Brand pages: `Campaigns.jsx`, `CampaignForm.jsx`, `CampaignDetails.jsx`
- Creator pages: `Opportunities.jsx`, `OpportunityDetails.jsx`, `MyApplications.jsx`

### 4.2 Design Philosophy (Based on Existing Payment.jsx)

**UI Patterns to Follow:**
- ✅ Clean card-based layout with `rounded-3xl` corners
- ✅ Primary color: `#F15A29` (orange)
- ✅ Payment methods: Radio buttons with border highlighting
- ✅ Bank transfer: Blue info box with instructions
- ✅ File upload for proof of payment
- ✅ Loading states with spinners
- ✅ Success states with checkmark icons
- ✅ Navigation breadcrumbs

**Money Display:**
- ✅ NEVER use `.toFixed()`
- ✅ Display raw values: `${budget}` not `${budget.toFixed(2)}`
- ✅ Let browser handle decimal display naturally

**Input Fields:**
- ✅ NO `step` attribute on number inputs
- ✅ Plain `<input type="number">` without constraints
- ✅ Validation in backend, not browser

### 4.3 Brand Pages

#### 4.3.1 Campaign Creation Form
**File:** `frontend/src/pages/CampaignForm.jsx`

**Key Rules:**
- ✅ Multi-step wizard (Basic → Milestones → Budget → Participation)
- ✅ NO `.toFixed()` anywhere
- ✅ NO `step="0.01"` on inputs
- ✅ Send budget values as strings to API
- ✅ Conditional budget fields based on participation_mode
- ✅ Use brand terminology: "Campaign", "Create Campaign", "Campaign Budget"

```javascript
// CRITICAL: Budget input - NO step attribute, NO toFixed()
<input
  type="number"
  name="budget"
  value={formData.budget}
  onChange={handleChange}
  min="0"
  placeholder="1000"
  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary"
/>

// CRITICAL: Display budget - NO toFixed()
<span className="font-semibold">${totalBudget}</span>

// CRITICAL: Send to API as string
const payload = {
  ...formData,
  budget: formData.budget ? String(formData.budget) : null,
  budget_min: formData.budget_min ? String(formData.budget_min) : null,
  budget_max: formData.budget_max ? String(formData.budget_max) : null
};
```

#### 4.3.2 Campaign Dashboard
**File:** `frontend/src/pages/Campaigns.jsx`

- List all brand's campaigns
- Filters: Draft, Active, Paused, Completed
- Stats: Budget, Applications count
- Actions: Edit, Delete, Publish, Pause
- Terminology: "Campaigns", "Applications", "Manage Campaigns"

#### 4.3.3 Campaign Details (Brand View)
**File:** `frontend/src/pages/CampaignDetails.jsx`

- Tabs: Overview, Packages, Applications
- Review creator applications
- Accept applications (triggers payment flow)
- Add packages to campaign
- Terminology: "Campaign Details", "Review Applications", "Accept Application"

### 4.4 Creator Pages

#### 4.4.1 Browse Opportunities
**File:** `frontend/src/pages/Opportunities.jsx` (NOT BrowseCampaigns.jsx)

**Key Features:**
- Browse active opportunities
- Category filtering
- Shows budget range, timeline, requirements
- Clear call-to-action: "Apply to Opportunity"
- Terminology: "Browse Opportunities", "Available Opportunities", "Apply Now"

**UI Elements:**
```javascript
<h1 className="text-3xl font-bold">Browse Opportunities</h1>
<p className="text-gray-600">Find brand collaborations that match your style</p>

// Opportunity card
<div className="opportunity-card">
  <h3>{opportunity.title}</h3>
  <p className="text-gray-600">Budget Range: ${opportunity.budget_min} - ${opportunity.budget_max}</p>
  <button className="btn-primary">Apply to Opportunity</button>
</div>
```

#### 4.4.2 Opportunity Details (Creator View)
**File:** `frontend/src/pages/OpportunityDetails.jsx` (NOT CreatorCampaignDetails.jsx)

**Key Features:**
- Full opportunity description
- Deliverables breakdown
- Target audience and requirements
- Apply modal with proposal form
- Terminology: "Opportunity Details", "Apply to This Opportunity", "Submit Application"

**Apply Modal:**
```javascript
<Modal title="Apply to This Opportunity">
  <p className="text-gray-600 mb-4">
    Submit your proposal for this opportunity
  </p>

  <label>Proposed Price ($)</label>
  <input
    type="number"
    name="proposed_price"
    placeholder="Enter your proposed price"
    // NO step attribute!
  />

  <label>Why are you perfect for this opportunity?</label>
  <textarea name="proposal_message" />

  <button>Submit Application</button>
</Modal>
```

#### 4.4.3 My Applications
**File:** `frontend/src/pages/MyApplications.jsx`

**Key Features:**
- List all creator's applications
- Status badges: Pending, Awaiting Payment, Accepted, Rejected
- Filter by status
- Link to opportunity details
- Terminology: "My Applications", "Application Status", "View Opportunity"

### 4.5 Payment Page
**File:** `frontend/src/pages/CampaignPayment.jsx`

Follow EXACT design from `Payment.jsx`:
- Same card layout
- Same payment method selection
- Same bank transfer instructions
- Same file upload component
- Same success/error states
- Works for both application acceptance and package purchases

### 4.6 Frontend API Service (`frontend/src/services/api.js`)

**Backend endpoints remain as `/api/campaigns/*` but frontend uses appropriate naming in comments and variable names:**

```javascript
// Campaign API - Brand side
export const campaignsAPI = {
  // Brand: Campaign Management
  getCampaigns: () => api.get('/campaigns/'),
  getCampaign: (id) => api.get(`/campaigns/${id}`),
  createCampaign: (data) => api.post('/campaigns/', data),
  updateCampaign: (id, data) => api.put(`/campaigns/${id}`, data),
  deleteCampaign: (id) => api.delete(`/campaigns/${id}`),

  // Brand: Review Applications
  getCampaignProposals: (campaignId) => api.get(`/campaigns/${campaignId}/proposals`),
  acceptProposal: (proposalId) => api.post(`/campaigns/proposals/${proposalId}/accept`),
  completeProposalPayment: (proposalId) => api.post(`/campaigns/proposals/${proposalId}/complete-payment`),

  // Brand: Add Packages
  addPackageToCampaign: (campaignId, packageId) =>
    api.post(`/campaigns/${campaignId}/packages`, { package_id: packageId }),
  completePackagePayment: (campaignId, packageId, bookingId) =>
    api.post(`/campaigns/${campaignId}/packages/${packageId}/complete-payment`, { booking_id: bookingId }),
};

// Opportunities API - Creator side (same backend endpoints, different naming)
export const opportunitiesAPI = {
  // Creator: Browse Opportunities
  browseOpportunities: (params) => api.get('/campaigns/browse', { params }),

  // Creator: View Opportunity Details
  getOpportunity: (id) => api.get(`/campaigns/${id}`),

  // Creator: Apply to Opportunity
  applyToOpportunity: (opportunityId, proposalData) =>
    api.post(`/campaigns/${opportunityId}/apply`, proposalData),

  // Creator: My Applications
  getMyApplications: (params) => api.get('/campaigns/my-applications', { params }),
};
```

**Note:** Backend keeps `/campaigns/` endpoints for consistency, but frontend uses appropriate variable names (`opportunity`, `application`, etc.) in the UI code.

---

## Phase 5: Implementation Timeline

### Day 1: Database & Models
1. Create database migration script
2. Drop old tables
3. Create new tables with correct schema
4. Implement new models (Campaign, CampaignMilestone, CampaignProposal)
5. Test model creation and querying

### Day 2: Backend Routes (Part 1)
1. Implement campaign CRUD endpoints
2. Implement browse campaigns endpoint
3. Test with Postman/curl
4. Verify money values return as strings
5. Verify timezone-aware datetimes

### Day 3: Backend Routes (Part 2)
1. Implement apply to campaign endpoint
2. Implement accept proposal → create booking
3. Implement complete payment → create collaboration
4. Implement add package → create booking
5. Implement complete package payment → create collaboration
6. Test full payment flow

### Day 4: Frontend Pages - Brand Side
1. Create CampaignForm.jsx (campaign creation form)
2. Create Campaigns.jsx (brand campaign dashboard)
3. Create CampaignDetails.jsx (brand view with applications)
4. Test campaign creation end-to-end
5. Verify no rounding issues

### Day 5: Frontend Pages - Creator Side
1. Create Opportunities.jsx (browse opportunities page)
2. Create OpportunityDetails.jsx (view opportunity and apply)
3. Create MyApplications.jsx (track application status)
4. Test browsing and application flow
5. Verify proper terminology throughout

### Day 6: Payment Integration
1. Create CampaignPayment.jsx
2. Integrate with booking payment flow
3. Test Paynow payment
4. Test bank transfer with proof upload
5. Test collaboration creation after payment

### Day 7: Testing & Deployment
1. End-to-end testing of all flows
2. Test edge cases (deadline expiry, duplicate applications, etc.)
3. Deploy to production
4. Monitor for errors

---

## Testing Checklist

### Money Handling
- [ ] Enter 100 → displays as 100 (not 99.99 or 97)
- [ ] Enter 1000.50 → displays as 1000.50 (not 1000.5 or 1001)
- [ ] API returns money as strings
- [ ] No .toFixed() anywhere in frontend
- [ ] No step attribute on inputs

### Budget NULL Handling
- [ ] Packages mode: budget set, min/max NULL
- [ ] Proposals mode: budget NULL, min/max set
- [ ] Both mode: all three set
- [ ] Campaign creation succeeds for all modes

### DateTime Handling
- [ ] No "can't compare offset-naive and offset-aware" errors
- [ ] Application deadline comparison works
- [ ] Browse campaigns filters by deadline correctly

### Payment Flow
- [ ] Accept proposal → creates booking → redirects to payment
- [ ] Complete payment → creates collaboration
- [ ] Add package → creates booking → redirects to payment
- [ ] Complete package payment → creates collaboration
- [ ] Paynow payment works
- [ ] Bank transfer with POP works

---

## Rollback Plan

If critical issues arise:

1. **Immediate:** Disable campaign creation (show maintenance message)
2. **Database:** Have backup before migrations
3. **Code:** Revert to previous commit
4. **Communication:** Notify users of temporary unavailability

---

## Success Criteria

✅ No rounding errors (100 stays 100)
✅ No NULL constraint violations
✅ No datetime comparison errors
✅ Payment flow works end-to-end
✅ Clean, maintainable code
✅ Consistent design across pages
✅ No duplicate code

---

**END OF PLAN - AWAITING APPROVAL TO PROCEED**
