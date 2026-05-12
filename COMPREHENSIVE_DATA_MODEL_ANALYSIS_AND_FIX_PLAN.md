# Comprehensive Data Model Analysis & Implementation Plan

## Analysis Date: April 22, 2026, 10:00 PM

---

## Part 1: Complete Data Model Architecture

### Overview
The BantuBuzz platform has a sophisticated dual-path collaboration model:
1. **Package Path**: Direct booking of creator packages
2. **Campaign Path**: Campaign proposals and applications

### Core Entities

```
User
  ├── BrandProfile (one-to-one via user_id)
  │     └── Campaigns (one-to-many)
  │           └── CampaignProposal (many-to-many with creators)
  │                 └── Booking (payment)
  │                       └── Collaboration
  │
  └── CreatorProfile (one-to-one via user_id)
        └── Packages (one-to-many)
              └── Booking (direct purchase)
                    └── Collaboration
```

### Detailed Entity Relationships

#### 1. Campaign Entity
```python
Campaign
  ├─ id (PK)
  ├─ brand_id (FK → brand_profiles.id)  # NOT user_id!
  ├─ brief_id (FK → briefs.id, nullable)
  ├─ title, description, category
  ├─ participation_mode ('packages', 'proposals', 'both')
  ├─ allows_applications (boolean)
  ├─ allows_packages (boolean)
  ├─ budget, budget_min, budget_max (Decimal, nullable based on mode)
  ├─ start_date, end_date, application_deadline
  ├─ status ('draft', 'active', 'paused', 'completed')
  └─ Relationships:
       ├─ brand → BrandProfile (via brand_id)
       ├─ milestones → CampaignMilestone[]
       ├─ proposals → CampaignProposal[]
       └─ packages → Package[] (many-to-many via campaign_packages table)
```

**KEY INSIGHT**: Campaign links to `brand_id` which is `brand_profiles.id`, NOT `users.id`
- To get user_id from campaign: `campaign.brand.user_id`

#### 2. BrandProfile Entity
```python
BrandProfile
  ├─ id (PK)
  ├─ user_id (FK → users.id, unique)  # THIS is the link to User!
  ├─ company_name, logo, description
  ├─ industry, company_size, location
  └─ Relationships:
       ├─ user → User (via user_id)
       ├─ campaigns → Campaign[]
       ├─ bookings_as_brand → Booking[]
       └─ collaborations → Collaboration[]
```

**KEY INSIGHT**: BrandProfile has `user_id`, Campaign has `brand_id`
- Campaign → User requires TWO hops: `Campaign.brand.user_id`

#### 3. CampaignProposal Entity
```python
CampaignProposal (aka CampaignApplication)
  ├─ id (PK)
  ├─ campaign_id (FK → campaigns.id)  # Link to campaign
  ├─ creator_id (FK → creator_profiles.id)  # NOT user_id!
  ├─ status ('pending', 'awaiting_payment', 'accepted', 'rejected')
  ├─ proposed_price (Decimal)
  ├─ proposal_message, deliverables
  ├─ booking_id (FK → bookings.id, nullable)  # Payment link
  └─ Relationships:
       ├─ campaign → Campaign (via campaign_id)
       ├─ creator → CreatorProfile (via creator_id)
       ├─ booking → Booking (via booking_id)
       └─ collaboration → Collaboration (backref, one-to-one)
```

**KEY INSIGHT**: CampaignProposal is the bridge between Campaign and Collaboration

#### 4. Collaboration Entity
```python
Collaboration  # UNIFIED tracking for ALL collaborations
  ├─ id (PK)
  ├─ collaboration_type ('campaign' or 'package')
  ├─ campaign_application_id (FK → campaign_proposals.id, nullable)
  ├─ booking_id (FK → bookings.id, nullable)
  ├─ brand_id (FK → brand_profiles.id)
  ├─ creator_id (FK → creator_profiles.id)  # NOT creator_user_id!
  ├─ title, description, amount
  ├─ status ('in_progress', 'completed', 'cancelled', etc.)
  ├─ deliverables, submitted_deliverables, draft_deliverables
  └─ Relationships:
       ├─ brand → BrandProfile (via brand_id)
       ├─ creator → CreatorProfile (via creator_id)
       ├─ campaign_application → CampaignProposal (via campaign_application_id)
       └─ booking → Booking (via booking_id)
```

**CRITICAL INSIGHTS**:
1. **NO `campaign_id` field** - Must go through `campaign_application.campaign_id`
2. **NO `creator_user_id` field** - Field is `creator_id` (FK to creator_profiles.id)
3. To get creator's user_id: `collaboration.creator.user_id`
4. To get campaign from collaboration: `collaboration.campaign_application.campaign_id`

#### 5. Booking Entity
```python
Booking  # Payment records
  ├─ id (PK)
  ├─ package_id (FK → packages.id, nullable)
  ├─ campaign_id (FK → campaigns.id, nullable)
  ├─ creator_id (FK → creator_profiles.id)
  ├─ brand_id (FK → brand_profiles.id)
  ├─ status ('pending', 'accepted', 'in_progress', 'completed', etc.)
  ├─ amount, total_price (Decimal)
  ├─ payment_status ('pending', 'paid', 'failed', 'refunded', 'verified')
  ├─ payment_method ('paynow', 'bank_transfer')
  ├─ booking_type ('direct', 'campaign_application', 'campaign_package')
  └─ Relationships:
       ├─ package → Package (via package_id)
       ├─ campaign → Campaign (via campaign_id)
       ├─ creator → CreatorProfile
       ├─ brand → BrandProfile
       └─ collaboration → Collaboration (backref)
```

---

## Part 2: Critical Path Mappings

### Path 1: User → Campaign → Collaborations

```python
# WRONG (what we coded):
campaign.brand_user_id == user_id
Collaboration.query.filter_by(campaign_id=campaign_id)

# CORRECT:
campaign.brand.user_id == user_id if campaign.brand else False

# Get collaborations for a campaign:
collaborations = db.session.query(Collaboration).join(
    CampaignProposal,
    Collaboration.campaign_application_id == CampaignProposal.id
).filter(
    Collaboration.collaboration_type == 'campaign',
    CampaignProposal.campaign_id == campaign_id
).all()
```

### Path 2: Collaboration → Campaign

```python
# WRONG:
collaboration.campaign_id

# CORRECT:
campaign_id = None
if collaboration.collaboration_type == 'campaign':
    if collaboration.campaign_application:
        campaign_id = collaboration.campaign_application.campaign_id
```

### Path 3: Check if User is Campaign Collaborator

```python
# WRONG:
Collaboration.query.filter_by(
    campaign_id=campaign_id,
    creator_user_id=user_id
).first()

# CORRECT Method 1 (via CampaignProposal):
campaign_proposal = CampaignProposal.query.filter_by(
    campaign_id=campaign_id
).join(CreatorProfile).filter(
    CreatorProfile.user_id == user_id
).first()

# CORRECT Method 2 (via Collaboration):
collaboration = db.session.query(Collaboration).join(
    CampaignProposal,
    Collaboration.campaign_application_id == CampaignProposal.id
).join(
    CreatorProfile,
    Collaboration.creator_id == CreatorProfile.id
).filter(
    Collaboration.collaboration_type == 'campaign',
    CampaignProposal.campaign_id == campaign_id,
    CreatorProfile.user_id == user_id,
    Collaboration.status == 'active'
).first()
```

### Path 4: Get All Collaborators for a Campaign

```python
# Get all active collaborations for a campaign
collaborations = db.session.query(Collaboration).join(
    CampaignProposal,
    Collaboration.campaign_application_id == CampaignProposal.id
).filter(
    Collaboration.collaboration_type == 'campaign',
    CampaignProposal.campaign_id == campaign_id,
    Collaboration.status == 'active'
).all()

# Get creator user IDs
creator_user_ids = [
    collab.creator.user_id
    for collab in collaborations
    if collab.creator
]
```

---

## Part 3: Files Requiring Fixes

### File 1: `app/routes/campaign_chats.py`

#### Lines to Fix:

**Line 41** - Check if user is brand owner:
```python
# BEFORE:
is_brand = campaign.brand_user_id == user_id

# AFTER:
is_brand = campaign.brand.user_id == user_id if campaign.brand else False
```

**Lines 42-46** - Check if user is collaborator:
```python
# BEFORE:
is_collaborator = Collaboration.query.filter_by(
    campaign_id=campaign_id,
    creator_user_id=user_id,
    status='active'
).first() is not None

# AFTER:
# Check via CampaignProposal first
campaign_proposal = CampaignProposal.query.filter_by(
    campaign_id=campaign_id
).join(CreatorProfile).filter(
    CreatorProfile.user_id == user_id
).first()

is_collaborator = False
if campaign_proposal:
    # Check if there's an active collaboration
    collaboration = Collaboration.query.filter_by(
        campaign_application_id=campaign_proposal.id,
        collaboration_type='campaign',
        status='active'
    ).first()
    is_collaborator = collaboration is not None
```

**Lines 110-111** - Campaign ownership check:
```python
# BEFORE:
if campaign.brand_user_id != user_id:

# AFTER:
if not campaign.brand or campaign.brand.user_id != user_id:
```

**Lines 120-124** - Get collaboration for creator:
```python
# BEFORE:
collaboration = Collaboration.query.filter_by(
    campaign_id=campaign_id,
    creator_user_id=user_id,
    status='active'
).first()

# AFTER:
# Get creator's proposal first
campaign_proposal = CampaignProposal.query.filter_by(
    campaign_id=campaign_id
).join(CreatorProfile).filter(
    CreatorProfile.user_id == user_id
).first()

if not campaign_proposal:
    return jsonify({'error': 'No proposal found for this campaign'}), 404

collaboration = Collaboration.query.filter_by(
    campaign_application_id=campaign_proposal.id,
    collaboration_type='campaign'
).first()
```

**Lines 131-141** - Get brand user ID:
```python
# BEFORE:
brand_user_id = campaign.brand_user_id
creator_user_id = user_id

# AFTER:
brand_user_id = campaign.brand.user_id if campaign.brand else None
if not brand_user_id:
    return jsonify({'error': 'Campaign brand not found'}), 404

# Get creator_id from creator profile
creator_profile = CreatorProfile.query.filter_by(user_id=user_id).first()
if not creator_profile:
    return jsonify({'error': 'Creator profile not found'}), 404

# Pass collaboration_id instead of creator_user_id
```

**Lines 196-197** - Campaign ownership in create_broadcast:
```python
# BEFORE:
if campaign.brand_user_id != user_id:

# AFTER:
if not campaign.brand or campaign.brand.user_id != user_id:
```

### File 2: `app/routes/campaign_payments.py`

Similar fixes needed for:
- Getting collaborations for payment calculation
- Verifying campaign ownership
- Processing payments for collaborations

### File 3: `migrations/create_campaign_chats_tables.sql`

#### Function: `create_broadcast_chat`

```sql
-- BEFORE:
FOR v_collaboration IN
    SELECT id, creator_user_id
    FROM collaborations
    WHERE campaign_id = p_campaign_id
      AND status = 'active'
LOOP
    INSERT INTO campaign_chat_participants (chat_id, user_id, role, collaboration_id)
    VALUES (v_chat_id, v_collaboration.creator_user_id, 'creator', v_collaboration.id)
    ON CONFLICT (chat_id, user_id) DO NOTHING;
END LOOP;

-- AFTER:
FOR v_collaboration_record IN
    SELECT
        c.id as collaboration_id,
        cp_user.user_id as creator_user_id
    FROM collaborations c
    INNER JOIN campaign_proposals cp ON c.campaign_application_id = cp.id
    INNER JOIN creator_profiles cp_prof ON c.creator_id = cp_prof.id
    INNER JOIN users cp_user ON cp_prof.user_id = cp_user.id
    WHERE c.collaboration_type = 'campaign'
      AND cp.campaign_id = p_campaign_id
      AND c.status = 'active'
LOOP
    INSERT INTO campaign_chat_participants (chat_id, user_id, role, collaboration_id)
    VALUES (
        v_chat_id,
        v_collaboration_record.creator_user_id,
        'creator',
        v_collaboration_record.collaboration_id
    )
    ON CONFLICT (chat_id, user_id) DO NOTHING;
END LOOP;
```

---

## Part 4: Correct Query Patterns Library

### Pattern 1: Get Campaign Owner User ID
```python
def get_campaign_owner_user_id(campaign):
    """Get the user_id of the campaign owner"""
    if not campaign or not campaign.brand:
        return None
    return campaign.brand.user_id
```

### Pattern 2: Check if User Owns Campaign
```python
def user_owns_campaign(campaign, user_id):
    """Check if user owns the campaign"""
    return (
        campaign and
        campaign.brand and
        campaign.brand.user_id == user_id
    )
```

### Pattern 3: Get Active Collaborations for Campaign
```python
def get_campaign_collaborations(campaign_id, status='active'):
    """Get all collaborations for a campaign"""
    return db.session.query(Collaboration).join(
        CampaignProposal,
        Collaboration.campaign_application_id == CampaignProposal.id
    ).filter(
        Collaboration.collaboration_type == 'campaign',
        CampaignProposal.campaign_id == campaign_id,
        Collaboration.status == status
    ).all()
```

### Pattern 4: Check if User is Campaign Collaborator
```python
def is_user_campaign_collaborator(campaign_id, user_id):
    """Check if user is an active collaborator in campaign"""
    # Get creator profile for user
    creator_profile = CreatorProfile.query.filter_by(user_id=user_id).first()
    if not creator_profile:
        return False

    # Check if they have an active collaboration
    collaboration = db.session.query(Collaboration).join(
        CampaignProposal,
        Collaboration.campaign_application_id == CampaignProposal.id
    ).filter(
        Collaboration.collaboration_type == 'campaign',
        Collaboration.creator_id == creator_profile.id,
        CampaignProposal.campaign_id == campaign_id,
        Collaboration.status == 'active'
    ).first()

    return collaboration is not None
```

### Pattern 5: Get Collaboration's Campaign ID
```python
def get_collaboration_campaign_id(collaboration):
    """Get campaign_id from collaboration"""
    if collaboration.collaboration_type != 'campaign':
        return None

    if not collaboration.campaign_application:
        return None

    return collaboration.campaign_application.campaign_id
```

### Pattern 6: Get Creator User ID from Collaboration
```python
def get_collaboration_creator_user_id(collaboration):
    """Get creator's user_id from collaboration"""
    if not collaboration.creator:
        return None
    return collaboration.creator.user_id
```

---

## Part 5: Implementation Plan

### Phase 1: Create Helper Functions (30 mins)

**File**: `app/utils/campaign_helpers.py` (NEW)

```python
"""
Campaign Helper Functions
Handles complex relationship navigation for campaign-related queries
"""
from app import db
from app.models import Campaign, Collaboration, CampaignProposal, CreatorProfile, BrandProfile


def get_campaign_owner_user_id(campaign):
    """Get user_id of campaign owner"""
    if not campaign or not campaign.brand:
        return None
    return campaign.brand.user_id


def user_owns_campaign(campaign, user_id):
    """Check if user owns campaign"""
    return (campaign and campaign.brand and
            campaign.brand.user_id == user_id)


def get_campaign_collaborations(campaign_id, status=None):
    """
    Get all collaborations for a campaign

    Args:
        campaign_id: ID of the campaign
        status: Filter by status ('active', 'completed', etc.) or None for all

    Returns:
        List of Collaboration objects
    """
    query = db.session.query(Collaboration).join(
        CampaignProposal,
        Collaboration.campaign_application_id == CampaignProposal.id
    ).filter(
        Collaboration.collaboration_type == 'campaign',
        CampaignProposal.campaign_id == campaign_id
    )

    if status:
        query = query.filter(Collaboration.status == status)

    return query.all()


def is_user_campaign_collaborator(campaign_id, user_id, status='active'):
    """
    Check if user is a collaborator in campaign

    Args:
        campaign_id: ID of the campaign
        user_id: ID of the user
        status: Required status (default: 'active')

    Returns:
        True if user is collaborator, False otherwise
    """
    # Get creator profile for user
    creator_profile = CreatorProfile.query.filter_by(user_id=user_id).first()
    if not creator_profile:
        return False

    # Check for active collaboration
    collaboration = db.session.query(Collaboration).join(
        CampaignProposal,
        Collaboration.campaign_application_id == CampaignProposal.id
    ).filter(
        Collaboration.collaboration_type == 'campaign',
        Collaboration.creator_id == creator_profile.id,
        CampaignProposal.campaign_id == campaign_id,
        Collaboration.status == status
    ).first()

    return collaboration is not None


def get_collaboration_campaign_id(collaboration):
    """Get campaign_id from collaboration"""
    if collaboration.collaboration_type != 'campaign':
        return None
    if not collaboration.campaign_application:
        return None
    return collaboration.campaign_application.campaign_id


def get_campaign_creator_user_ids(campaign_id, status='active'):
    """
    Get all creator user_ids for a campaign

    Args:
        campaign_id: ID of the campaign
        status: Filter by collaboration status

    Returns:
        List of user_ids
    """
    collaborations = get_campaign_collaborations(campaign_id, status)

    user_ids = []
    for collab in collaborations:
        if collab.creator:
            user_ids.append(collab.creator.user_id)

    return user_ids
```

### Phase 2: Fix campaign_chats.py (45 mins)

**Steps**:
1. Import helper functions
2. Replace all `campaign.brand_user_id` with `get_campaign_owner_user_id(campaign)`
3. Replace collaborator checks with `is_user_campaign_collaborator()`
4. Replace collaboration queries with `get_campaign_collaborations()`
5. Test each endpoint

### Phase 3: Fix campaign_payments.py (30 mins)

**Steps**:
1. Import helper functions
2. Update collaboration queries
3. Update payment calculation logic
4. Test payment endpoints

### Phase 4: Fix SQL Migration Functions (20 mins)

**Steps**:
1. Update `create_broadcast_chat()` function
2. Re-run migration or manually update functions in database
3. Test chat creation

### Phase 5: Testing (30 mins)

**Test Suite**:
1. GET /campaign-chats/campaign/1
2. POST /campaign-chats/create-broadcast
3. POST /campaign-chats/create-one-to-one
4. POST /campaign-chats/:id/messages
5. GET /campaigns/:id/performance
6. POST /campaign-payments/calculate

**Total Estimated Time**: 2.5 hours

---

## Part 6: Testing Strategy

### Test Data Requirements

```python
# We need:
1. A campaign (id=1) owned by user 26 (brand)
2. At least one CampaignProposal for that campaign
3. At least one Collaboration linked to that proposal
4. The collaboration should have status='active'
```

### Verification Queries

```python
# Check if test data exists:
campaign = Campaign.query.get(1)
print(f"Campaign owner user_id: {campaign.brand.user_id if campaign.brand else None}")

proposals = CampaignProposal.query.filter_by(campaign_id=1).all()
print(f"Proposals count: {len(proposals)}")

for proposal in proposals:
    collab = Collaboration.query.filter_by(
        campaign_application_id=proposal.id
    ).first()
    if collab:
        print(f"Collaboration {collab.id} for proposal {proposal.id}")
        print(f"  Creator user_id: {collab.creator.user_id if collab.creator else None}")
```

---

## Part 7: Rollback Strategy

If issues occur:

```bash
# Backup current files
ssh root@173.212.245.22 "
cd /var/www/bantubuzz/backend
cp app/routes/campaign_chats.py app/routes/campaign_chats.py.backup
cp app/routes/campaign_payments.py app/routes/campaign_payments.py.backup
"

# Restore if needed
ssh root@173.212.245.22 "
cd /var/www/bantubuzz/backend
mv app/routes/campaign_chats.py.backup app/routes/campaign_chats.py
pkill -9 -f gunicorn
./venv/bin/gunicorn --bind 0.0.0.0:8002 --workers 4 --timeout 300 'app:create_app()' --daemon
"
```

---

## Summary

### Root Cause
The chat and payment systems were built assuming a simplified data model where:
- Campaign had `brand_user_id` (it doesn't - it has `brand_id`)
- Collaboration had `campaign_id` (it doesn't - it has `campaign_application_id`)
- Collaboration had `creator_user_id` (it doesn't - it has `creator_id`)

### Solution
Create helper functions that abstract the complexity and update all routes to use proper relationship navigation through:
- Campaign → BrandProfile → User
- Collaboration → CampaignProposal → Campaign
- Collaboration → CreatorProfile → User

### Impact
Once fixed, all new features will work:
- ✅ Campaign chat (broadcast and one-to-one)
- ✅ Campaign payments (wallet, PayNow, bank transfer)
- ✅ Campaign analytics (ROI, engagement tracking)

---

**Document Created**: April 22, 2026, 10:15 PM
**Next Action**: Implement Phase 1 (Helper Functions)
