# Phase 2: Enhanced Creator Invitations - COMPLETE ✅

**Date**: 2026-04-23
**Status**: DEPLOYED TO PRODUCTION

## Overview

Phase 2 of Campaign Enhancements introduces a comprehensive invitation system that allows brands to directly invite creators to their campaigns with two distinct invitation modes:

1. **Apply Mode**: Brand invites creator to review campaign and submit a proposal if interested
2. **Join Mode**: Brand directly invites creator with a specific package/offer (pre-approved collaboration)

## Features Implemented

### 1. Database Schema Updates

**File**: `backend/migrations/create_campaign_invitations_table.sql`

Added new columns to support enhanced invitation features:
```sql
ALTER TABLE campaign_invitations
ADD COLUMN IF NOT EXISTS package_id INTEGER REFERENCES packages(id) ON DELETE SET NULL;

ALTER TABLE campaign_invitations
ADD COLUMN IF NOT EXISTS proposed_amount NUMERIC(10, 2);

ALTER TABLE campaign_invitations
ADD COLUMN IF NOT EXISTS response_message TEXT;
```

**Schema Details**:
- `package_id`: Links to specific creator package for 'join' invitations
- `proposed_amount`: Custom collaboration amount proposed by brand
- `response_message`: Creator's message when accepting/declining
- `invitation_type`: 'apply' or 'join'
- `status`: 'pending', 'accepted', 'declined', 'expired', 'cancelled'

### 2. Backend Model Updates

**File**: `backend/app/models/campaign_invitation.py`

Enhanced CampaignInvitation model with:
- Package relationship for direct invitations
- Proposed amount tracking
- Response message field
- Updated `to_dict()` method to include package details
- Support for both invitation types

### 3. Backend API Routes

**File**: `backend/app/routes/campaign_invitations.py`

#### Endpoints Created/Updated:

1. **POST /api/campaign-invitations/invite**
   - Send invitations to multiple creators
   - Support for both 'apply' and 'join' invitation types
   - Package selection for 'join' invitations
   - Custom proposed amount option
   - Bulk invitation processing with success/failure tracking
   - Email notifications sent to creators
   - Request body:
     ```json
     {
       "campaign_id": 1,
       "creator_ids": [12, 15, 20],
       "invitation_type": "join",
       "package_id": 5,
       "proposed_amount": 500.00,
       "message": "Custom message",
       "expires_in_days": 7
     }
     ```

2. **POST /api/campaign-invitations/{id}/accept**
   - Creator accepts invitation
   - Optional response message
   - For 'apply' type: Redirects to campaign application
   - For 'join' type: Automatically creates proposal and collaboration
   - Returns next steps and collaboration ID
   - Request body:
     ```json
     {
       "response_message": "Thank you for this opportunity!"
     }
     ```

3. **POST /api/campaign-invitations/{id}/decline**
   - Creator declines invitation
   - Optional response message
   - Sends notification to brand
   - Request body:
     ```json
     {
       "response_message": "Unfortunately I'm not available"
     }
     ```

4. **GET /api/campaign-invitations/creator/pending**
   - Get all pending invitations for logged-in creator
   - Filters by status and expiration date

5. **GET /api/campaign-invitations/campaign/{id}**
   - Get all invitations for a campaign (brand view)
   - Optional status filter
   - Returns invitation statistics
   - Response includes:
     ```json
     {
       "invitations": [...],
       "stats": {
         "total": 10,
         "pending": 5,
         "accepted": 3,
         "declined": 1,
         "expired": 1,
         "cancelled": 0
       }
     }
     ```

6. **DELETE /api/campaign-invitations/{id}**
   - Brand cancels pending invitation
   - Sends cancellation email to creator

### 4. Frontend Components

#### A. InviteCreatorsModal (Enhanced)

**File**: `frontend/src/components/InviteCreatorsModal.jsx`

**Features**:
- Two invitation type modes with clear descriptions
- Creator search and selection with checkboxes
- Package selection dropdown (for 'join' invitations)
- Custom proposed amount input (for 'join' invitations)
- Personal message textarea with character counter
- Bulk invitation sending with success/failure feedback
- Real-time validation for 'join' type requirements

**UI Flow**:
1. Brand selects invitation type (Apply/Join)
2. If 'Join' selected, brand chooses package OR enters custom amount
3. Brand adds optional personal message
4. Brand searches and selects creators
5. Brand sends invitations
6. Toast notifications show success/failure for each invitation

**Validation**:
- At least one creator must be selected
- For 'join' invitations, either package or proposed amount required
- Proposed amount must be valid positive number
- Message limited to 500 characters

#### B. InvitationCard (Enhanced)

**File**: `frontend/src/components/InvitationCard.jsx`

**Features**:
- Displays invitation type badge (Apply/Join)
- Shows time remaining with color-coded urgency
- Brand information with logo
- Package details section (for 'join' invitations)
- Proposed amount display with prominent styling
- Personal message from brand
- Response modal for accept/decline actions
- Optional response message textarea
- Direct navigation to campaign or collaboration

**UI Elements**:
- Green badge for 'Join' invitations
- Blue badge for 'Apply' invitations
- Red warning for expiring soon invitations
- Package details box with green accent
- Prominent proposed amount display (R###.##)
- Response modal with 500-character limit
- Accept/Decline buttons with loading states

**Accept Flow**:
1. Creator clicks "Accept"
2. Modal appears for optional response message
3. Creator submits response
4. For 'apply' type: Redirects to campaign page
5. For 'join' type: Creates collaboration and redirects to booking

**Decline Flow**:
1. Creator clicks "Decline"
2. Modal appears for optional decline reason
3. Creator submits response
4. Invitation marked as declined
5. Brand receives notification with reason

#### C. API Service Updates

**File**: `frontend/src/services/campaignInvitationsAPI.js`

Updated endpoints to support response messages:
```javascript
acceptInvitation: (invitationId, data = {}) =>
  api.post(`/campaign-invitations/${invitationId}/accept`, data),

declineInvitation: (invitationId, data = {}) =>
  api.post(`/campaign-invitations/${invitationId}/decline`, data),
```

## Data Flow

### Invitation Creation (Brand Side)

```
Brand clicks "Invite Creators"
  → InviteCreatorsModal opens
  → Selects invitation type
  → If 'join': Selects package/amount
  → Searches and selects creators
  → Adds personal message
  → Clicks "Send Invitations"
  → POST /api/campaign-invitations/invite
  → Backend creates invitations
  → Email sent to each creator
  → In-app notifications created
  → Success/failure toast messages
```

### Invitation Acceptance (Creator Side)

```
Creator views invitation in dashboard
  → InvitationCard displays invitation details
  → For 'join' type: Shows package and amount
  → Clicks "Accept"
  → Response modal appears
  → Enters optional message
  → POST /api/campaign-invitations/{id}/accept
  → Backend processes acceptance

  If 'apply' type:
    → Invitation marked accepted
    → Redirects to campaign page

  If 'join' type:
    → Creates CampaignProposal (auto-approved)
    → Creates Collaboration (pending status)
    → Redirects to booking page
    → Brand receives notification
```

## Database Relationships

```
Campaign
  ↓ (has many)
CampaignInvitation
  ├── invited_by_user_id → User (Brand)
  ├── creator_user_id → User (Creator)
  ├── package_id → Package (optional, for 'join')
  └── campaign_id → Campaign

For 'join' accepted invitations:
CampaignInvitation (accepted)
  ↓ (creates)
CampaignProposal (auto-approved)
  ↓ (creates)
Collaboration (pending)
```

## Email Notifications

The following email notifications are triggered:

1. **Invitation Sent**: Creator receives invitation email
2. **Invitation Accepted**: Brand receives acceptance notification
3. **Invitation Declined**: Brand receives decline notification with reason
4. **Invitation Cancelled**: Creator receives cancellation notification
5. **Invitation Expired**: Auto-sent when invitation expires

## Technical Improvements

### 1. Backward Compatibility

The system supports both old and new invitation type values:
- Old: `'invite_to_apply'`, `'invite_to_join'`
- New: `'apply'`, `'join'`

Both are handled correctly in backend and frontend.

### 2. Data Model Navigation

Uses helper functions from `campaign_helpers.py` for proper multi-hop relationships:
- `user_owns_campaign()`: Verify brand ownership
- `get_campaign_owner_user_id()`: Get brand user ID from campaign

### 3. Validation

**Backend**:
- Campaign ownership verification
- Creator existence check
- Duplicate invitation prevention
- Package validation for 'join' type
- Proposed amount validation

**Frontend**:
- Required field validation
- Numeric amount validation
- Character limit enforcement
- At least one creator selection

## Deployment Summary

### Backend Deployment
- File: `backend/app/routes/campaign_invitations.py`
- Deployed to: `/var/www/bantubuzz/backend/app/routes/`
- Gunicorn restarted with 4 workers on port 8002

### Frontend Deployment
- Files:
  - `frontend/src/components/InviteCreatorsModal.jsx`
  - `frontend/src/components/InvitationCard.jsx`
  - `frontend/src/services/campaignInvitationsAPI.js`
- Built with Vite (v5.4.21)
- Deployed to: `/var/www/bantubuzz/frontend/dist/`
- Bundle size: 2,508.18 kB (603.33 kB gzipped)

## Testing Recommendations

1. **Brand Flow**:
   - Create campaign
   - Open Invite Creators modal
   - Test both invitation types
   - Select package for 'join' type
   - Enter custom amount for 'join' type
   - Send bulk invitations
   - View invitation status on campaign page

2. **Creator Flow**:
   - Receive invitation notification
   - View invitation details
   - Test accept with response message
   - Test decline with reason
   - Verify 'join' creates collaboration automatically
   - Verify 'apply' redirects to campaign

3. **Edge Cases**:
   - Expired invitations
   - Duplicate invitations
   - Non-existent packages
   - Invalid amounts
   - Empty response messages
   - Campaign without budget

## API Examples

### Send Join Invitation with Package

```bash
POST /api/campaign-invitations/invite
Authorization: Bearer <token>

{
  "campaign_id": 1,
  "creator_ids": [12, 15],
  "invitation_type": "join",
  "package_id": 5,
  "message": "We love your content and think you'd be perfect for our campaign!",
  "expires_in_days": 7
}
```

### Send Join Invitation with Custom Amount

```bash
POST /api/campaign-invitations/invite
Authorization: Bearer <token>

{
  "campaign_id": 1,
  "creator_ids": [20],
  "invitation_type": "join",
  "proposed_amount": 750.00,
  "message": "We'd like to offer you R750 for this collaboration.",
  "expires_in_days": 10
}
```

### Accept Invitation

```bash
POST /api/campaign-invitations/123/accept
Authorization: Bearer <token>

{
  "response_message": "Thank you! I'm excited to work with you on this campaign!"
}
```

### Get Campaign Invitations

```bash
GET /api/campaign-invitations/campaign/1?status=pending
Authorization: Bearer <token>
```

## Next Steps

Phase 2 is now complete! The next phases are:

### Phase 5: Performance Analytics Tab
- Create campaign analytics service
- Add performance metrics calculations
- Create performance visualization components
- Add campaign insights dashboard

### Email Notifications System
- Implement comprehensive email templates
- Add automated notification triggers
- Create email preference management
- Add email tracking and analytics

## Files Modified

**Backend**:
- ✅ `backend/app/routes/campaign_invitations.py` (updated)
- ✅ `backend/app/models/campaign_invitation.py` (previously created)
- ✅ `backend/migrations/create_campaign_invitations_table.sql` (updated)

**Frontend**:
- ✅ `frontend/src/components/InviteCreatorsModal.jsx` (updated)
- ✅ `frontend/src/components/InvitationCard.jsx` (updated)
- ✅ `frontend/src/services/campaignInvitationsAPI.js` (updated)

## Production URLs

- Backend API: `http://173.212.245.22:8002/api/campaign-invitations/`
- Frontend: `http://173.212.245.22/` (served via Nginx)

---

**Phase 2 Status**: ✅ **COMPLETE AND DEPLOYED**
**Completion Date**: 2026-04-23
**Next Phase**: Phase 5 (Performance Analytics) or Email Notifications System
