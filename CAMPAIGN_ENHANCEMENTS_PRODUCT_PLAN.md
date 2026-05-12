# Campaign Enhancements - Product Team Feedback Implementation Plan

## Issues Reported

1. **Failed to load applications** when opening applications inside campaigns
2. **Failed to load creators** when inviting creators inside a campaign
3. **Missing "Back to Campaign" navigation** from browse packages
4. **Browse packages lacks creator info** (followers, engagement rate, avatars)
5. **Broadcast chat stuck on "Connecting to chat service..."** - cannot send messages
6. **Campaign payment workflow needs complete redesign** - Allow unpaid additions, then pay in bulk or individually

---

## Phase 1: Critical Bug Fixes (IMMEDIATE)

### 1.1 Fix Backend Startup Issue ✅
**Status**: COMPLETED
- Fixed syntax error in `email_service.py` that prevented Gunicorn from starting
- Redeployed and restarted backend successfully

### 1.2 Investigate Applications Loading Failure
**Current Issue**: Frontend shows "Failed to load applications"
**Investigation Steps**:
1. Check `CampaignDetails.jsx` - where applications are displayed
2. Check backend `/api/campaigns/<id>/applications` endpoint
3. Test endpoint response format
4. Check for missing fields or serialization issues

**Expected Root Cause**:
- Backend endpoint error
- Missing/incorrect serialization in Proposal model
- Frontend expecting different data structure

### 1.3 Investigate Invite Creators Loading Failure
**Current Issue**: "Failed to load creators" when inviting
**Investigation Steps**:
1. Check InviteCreatorsModal component
2. Check `/api/creators` or related endpoint being called
3. Verify creator serialization includes necessary fields

### 1.4 Fix Broadcast Chat Connection
**Current Issue**: Stuck on "Connecting to chat service..." - cannot send messages
**Investigation Steps**:
1. Check `CampaignChatWindow.jsx` or similar component
2. Check Socket.IO connection to messaging service
3. Verify campaign chat rooms are created properly
4. Check backend campaign chat message endpoints

---

## Phase 2: Navigation & UX Improvements (HIGH PRIORITY)

### 2.1 Add "Back to Campaign" Navigation
**Requirement**: When visiting `/browse/packages` from a campaign, show back button

**Implementation**:
1. Pass campaign context via URL param or state when navigating from campaign
2. Update `BrowsePackages.jsx` or `CampaignPackageBrowser.jsx`:
   ```jsx
   // Check for campaign context from location state or URL
   const { state } = useLocation();
   const campaignId = state?.campaignId || searchParams.get('campaign_id');

   {campaignId && (
     <Link to={`/campaigns/${campaignId}`} className="...">
       ← Back to Campaign
     </Link>
   )}
   ```

### 2.2 Enhance Package Cards with Creator Information
**Requirement**: Show creator followers, engagement rate, avatar on package cards

**Current State**: Package cards likely only show package details
**Target State**: Each package card should prominently display:
- Creator avatar (top-left or left side)
- Creator name/username
- Follower count (formatted: 10.5K, 1.2M)
- Engagement rate (if available)
- Package title & price
- "Which creator offers which package" must be immediately visible

**Implementation**:
1. Update `PackageCard` component (or create `CreatorPackageCard.jsx`)
2. Ensure backend `/api/packages` includes creator details in response
3. Layout suggestion:
   ```
   ┌─────────────────────────────────────┐
   │ [Avatar] Creator Name        10.5K  │
   │          @username           📊 3.2%│
   │                                      │
   │ Package: Instagram Story Post       │
   │ Price: R 500                         │
   │ Deliverables: ...                    │
   │                                      │
   │         [Add to Campaign]            │
   └─────────────────────────────────────┘
   ```

---

## Phase 3: Campaign Cart & Payment System (MAJOR FEATURE)

### 3.1 Overview of New Workflow

**Current Flow** (PROBLEMATIC):
1. Brand invites creator → Creator accepts → Payment happens → Collaboration starts
2. Brand accepts application → Payment happens → Collaboration starts
3. Brand adds package → Payment happens → Collaboration starts

**New Flow** (REQUESTED):
1. Brand can invite creators WITHOUT paying (saved to campaign as "pending payment")
2. Brand can accept applications WITHOUT paying (saved as "pending payment")
3. Brand can add packages WITHOUT paying (saved as "pending payment")
4. Brand reviews all pending additions in campaign "cart"
5. Brand chooses to:
   - **Pay All** - Single payment for all pending items
   - **Pay in Batches** - Select multiple items to pay together
   - **Pay Individually** - Pay for each item separately
6. **Only after payment** are creators notified and collaborations activated

### 3.2 Database Schema Changes

**New Table: `campaign_cart_items`**
```sql
CREATE TABLE campaign_cart_items (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    brand_id INTEGER NOT NULL REFERENCES brand_profiles(id),
    item_type VARCHAR(50) NOT NULL, -- 'invitation', 'application', 'package'

    -- References (only one will be populated based on item_type)
    invitation_id INTEGER REFERENCES campaign_invitations(id) ON DELETE CASCADE,
    proposal_id INTEGER REFERENCES proposals(id) ON DELETE CASCADE,
    package_id INTEGER REFERENCES packages(id) ON DELETE SET NULL,
    creator_id INTEGER NOT NULL REFERENCES creator_profiles(id),

    -- Payment details
    amount DECIMAL(10,2) NOT NULL,
    payment_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'paid', 'failed'
    paid_at TIMESTAMP,
    payment_reference VARCHAR(255),

    -- Metadata
    notes TEXT,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(campaign_id, item_type, invitation_id),
    UNIQUE(campaign_id, item_type, proposal_id),
    UNIQUE(campaign_id, item_type, package_id, creator_id)
);

CREATE INDEX idx_campaign_cart_campaign ON campaign_cart_items(campaign_id);
CREATE INDEX idx_campaign_cart_brand ON campaign_cart_items(brand_id);
CREATE INDEX idx_campaign_cart_payment_status ON campaign_cart_items(payment_status);
```

**Updated Workflow States**:
- `campaign_invitations.status`: Add 'pending_payment' state
- `proposals.status`: Add 'accepted_pending_payment' state
- Create cart item when invitation sent/application accepted/package added
- Mark cart item as 'paid' when payment succeeds
- Only THEN activate the collaboration and notify creator

### 3.3 Backend API Endpoints

**Campaign Cart Management**:
```python
# GET /api/campaigns/<id>/cart
# Get all unpaid cart items for a campaign
def get_campaign_cart(campaign_id):
    # Return list of cart items with creator details
    pass

# POST /api/campaigns/<id>/cart/add-invitation
# Add invitation to cart (send invite but don't charge)
def add_invitation_to_cart(campaign_id):
    # Create invitation with status='pending_payment'
    # Create cart_item
    # Send notification to creator (different from paid notification)
    pass

# POST /api/campaigns/<id>/cart/add-application
# Accept application and add to cart
def add_application_to_cart(campaign_id):
    # Update proposal status='accepted_pending_payment'
    # Create cart_item
    pass

# POST /api/campaigns/<id>/cart/add-package
# Add package to cart
def add_package_to_cart(campaign_id):
    # Create cart_item for package
    pass

# DELETE /api/campaigns/<id>/cart/<item_id>
# Remove item from cart before payment
def remove_from_cart(campaign_id, item_id):
    # Delete cart item
    # Update invitation/proposal status if needed
    pass

# POST /api/campaigns/<id>/cart/pay-all
# Pay for all pending items in one transaction
def pay_all_cart_items(campaign_id):
    # Calculate total
    # Process payment (Paynow/wallet/bank transfer)
    # Create collaborations for all items
    # Send notifications to all creators
    # Mark all cart items as 'paid'
    pass

# POST /api/campaigns/<id>/cart/pay-selected
# Pay for selected items
def pay_selected_cart_items(campaign_id):
    # cart_item_ids: [1, 3, 5]
    # Process payment for selected items only
    pass

# POST /api/campaigns/<id>/cart/pay-individual/<item_id>
# Pay for single item
def pay_individual_cart_item(campaign_id, item_id):
    # Process payment for one item
    # Create collaboration
    # Notify creator
    # Mark cart item as 'paid'
    pass
```

### 3.4 Frontend Components

**New Components to Create**:

1. **`CampaignCart.jsx`** - Main cart view
   - Lists all unpaid cart items
   - Shows total amount
   - Checkboxes to select items for batch payment
   - "Pay All", "Pay Selected", individual "Pay" buttons
   - Remove item buttons

2. **`CampaignCartItem.jsx`** - Single cart item card
   - Creator info (avatar, name, followers)
   - Item type badge (Invitation/Application/Package)
   - Package/proposal details
   - Amount
   - Individual pay button
   - Remove button

3. **`CampaignPaymentModal.jsx`** - Updated payment flow
   - Shows items being paid for
   - Payment method selection (Paynow/Wallet/Bank Transfer)
   - Total amount
   - Processes payment for multiple items at once

**Updated Components**:

1. **`InviteCreatorsModal.jsx`**
   - Change "Send Invitation" to "Add to Campaign"
   - No immediate payment
   - Adds to cart instead

2. **`CampaignDetails.jsx`** (Brand view)
   - Add "Campaign Cart" tab/section
   - Show unpaid items count badge
   - "Applications" tab shows all (paid + unpaid)
   - Mark unpaid items with "Pending Payment" badge

3. **`CreatorProfilePage.jsx`** (Brand viewing creator)
   - "Invite to Campaign" → Add to cart workflow
   - When selecting package → Add to cart

4. **`ProposalCard.jsx`** (in Applications tab)
   - "Accept" button → Add to cart (not immediate payment)
   - Show "Added to Cart" state

### 3.5 Updated Invitation Flow

**Two Types of Invitations**:

1. **Invite to Apply** (unchanged)
   - Creator receives invitation
   - Creator can submit proposal
   - If brand accepts → Added to cart
   - Brand pays → Collaboration starts

2. **Invite with Package** (NEW workflow)
   - Brand selects creator + specific package
   - Creates invitation with `package_id` and `amount`
   - Added to campaign cart immediately
   - Creator receives "You've been invited!" notification (not "payment confirmed")
   - When brand pays → Creator receives "Collaboration started!" notification
   - Collaboration becomes active

### 3.6 Migration Strategy

**Backward Compatibility**:
- Existing paid collaborations continue working
- New cart system only applies to new invitations/applications/packages
- Old "immediate payment" flow can coexist initially

**Migration Steps**:
1. Create `campaign_cart_items` table
2. Add new endpoints (don't break existing ones)
3. Update frontend to use cart for new additions
4. Test thoroughly
5. Gradually phase out immediate payment for campaign items

---

## Phase 4: Broadcast Chat Fix (CRITICAL)

### 4.1 Investigation
**Check**:
1. Socket.IO connection initialization in `CampaignChatWindow.jsx`
2. Backend socket events for campaign chat rooms
3. Room creation/joining logic
4. Message sending/receiving events

**Common Issues**:
- Socket not connecting to correct namespace
- Room not created or joined properly
- Missing authentication in socket connection
- Backend not handling campaign chat events

### 4.2 Expected Fix
1. Verify socket connects: `socket.on('connect', ...)`
2. Join campaign room: `socket.emit('join_campaign_room', {campaign_id: ...})`
3. Send message: `socket.emit('send_campaign_message', {campaign_id, message, ...})`
4. Receive message: `socket.on('campaign_message', ...)`

---

## Implementation Priority

### Immediate (Today):
1. ✅ Fix backend startup (DONE)
2. Fix applications loading failure
3. Fix invite creators loading failure
4. Fix broadcast chat connection

### High Priority (This Week):
1. Add "Back to Campaign" navigation
2. Enhance package cards with creator info

### Major Feature (Next Sprint):
1. Design & implement campaign cart system (Phases 3.2 - 3.6)
2. Full testing of cart workflow
3. Deployment and user training

---

## Testing Plan

### Bug Fixes Testing:
- [ ] Applications load successfully in campaign details
- [ ] Invite creators modal loads creator list
- [ ] Broadcast chat connects and sends messages
- [ ] Back button appears when navigating from campaign
- [ ] Package cards show creator avatars, followers, engagement

### Cart System Testing:
- [ ] Add invitation to cart without payment
- [ ] Accept application to cart without payment
- [ ] Add package to cart without payment
- [ ] Remove items from cart
- [ ] Pay all items at once
- [ ] Pay selected items in batch
- [ ] Pay individual items
- [ ] Verify collaborations only start after payment
- [ ] Verify correct notifications sent at each stage

---

## Files to Modify

### Backend:
- `app/models/__init__.py` - Add CampaignCartItem model
- `app/models/campaign_cart.py` - NEW
- `app/routes/campaigns.py` - Update existing endpoints
- `app/routes/campaign_cart.py` - NEW - Cart management endpoints
- `app/routes/campaign_invitations.py` - Update to support cart workflow
- `app/routes/proposals.py` - Update application acceptance
- `app/services/email_service.py` - New email templates for cart notifications
- `migrations/create_campaign_cart.sql` - NEW

### Frontend:
- `src/pages/CampaignDetails.jsx` - Add cart section
- `src/components/CampaignCart.jsx` - NEW
- `src/components/CampaignCartItem.jsx` - NEW
- `src/components/CampaignPaymentModal.jsx` - Update or NEW
- `src/components/InviteCreatorsModal.jsx` - Update to add to cart
- `src/components/CreatorPackageCard.jsx` - Enhance with creator info
- `src/pages/BrowsePackages.jsx` or `CampaignPackageBrowser.jsx` - Back button
- `src/pages/CreatorProfile.jsx` - Update invite flow
- `src/components/ProposalCard.jsx` - Update accept button

---

## Notes

- The campaign cart system is a **major architectural change**
- Requires careful planning to avoid breaking existing workflows
- Should be implemented incrementally with feature flags
- Extensive testing required before production deployment
- User documentation and tutorials will be needed
