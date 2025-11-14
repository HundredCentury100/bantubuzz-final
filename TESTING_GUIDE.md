# Collaboration Features - Testing Guide

## ✅ Completed Implementation

### Backend (100%)
1. ✅ **Database Models Created**
   - CampaignApplication (with pricing & deliverables)
   - Collaboration (unified tracking)
   - Review (ratings & feedback)

2. ✅ **API Endpoints Implemented**
   - Campaign Applications: Apply, View, Accept/Reject
   - Collaborations: List, Details, Update Progress, Submit Deliverables, Complete, Cancel
   - Reviews: Create, List by Creator, Get Details, Add Response

3. ✅ **Migration File Created**
   - Location: `backend/migrations/add_collaboration_and_review_models.py`

### Frontend (95%)
1. ✅ **Updated Campaign Application Form**
   - Creators provide proposed price
   - Creators list deliverables
   - Optional application message
   - Location: [CreatorCampaignDetails.jsx](d:\Bantubuzz Platform\frontend\src\pages\CreatorCampaignDetails.jsx)

2. ✅ **Enhanced Application Review UI**
   - Brands see pricing, deliverables, and messages
   - Link to view creator profile
   - Accept/Reject buttons
   - Location: [CampaignDetails.jsx](d:\Bantubuzz Platform\frontend\src\pages\CampaignDetails.jsx#L350-L457)

3. ✅ **Collaborations Page Created**
   - Unified page for both brands and creators
   - Filter by status and type
   - Progress bars and stats
   - Location: [Collaborations.jsx](d:\Bantubuzz Platform\frontend\src\pages\Collaborations.jsx)

4. ✅ **Collaboration Details Page Created**
   - Progress tracking with update modal
   - Deliverable submission form
   - Expected vs submitted deliverables
   - Complete/cancel actions
   - Location: [CollaborationDetails.jsx](d:\Bantubuzz Platform\frontend\src\pages\CollaborationDetails.jsx)

5. ✅ **Routes Added**
   - `/brand/collaborations` and `/brand/collaborations/:id`
   - `/creator/collaborations` and `/creator/collaborations/:id`

6. ✅ **Navigation Added**
   - Navbar: "Collaborations" link (desktop and mobile)
   - BrandDashboard: Quick Actions link

## ⚠️ Required Before Testing

### 1. Run Database Migration

**CRITICAL:** You must run the migration to create the new database tables.

```bash
cd "d:\Bantubuzz Platform\backend"

# Option 1: Using Flask-Migrate
python -m flask db upgrade

# Option 2: Using the migration script directly
python migrations/add_collaboration_and_review_models.py
```

**What this does:**
- Drops old `campaign_applications` table
- Creates new `campaign_applications` with pricing & deliverables fields
- Creates `collaborations` table
- Creates `reviews` table

### 2. Restart Backend Server

```bash
cd "d:\Bantubuzz Platform\backend"
python run.py
```

### 3. Restart Frontend Server

```bash
cd "d:\Bantubuzz Platform\frontend"
npm run dev
```

## 🧪 Testing Workflow

### Test 1: Campaign Application with Pricing
**User:** Creator

1. Go to `/creator/campaigns`
2. Find an active campaign
3. Click to view details
4. Click "Apply to Campaign"
5. Fill in:
   - **Proposed Price**: e.g., $500
   - **Deliverables**:
     - "2 Instagram Posts"
     - "1 TikTok Video"
     - "Story mentions"
   - **Message**: Optional
6. Click "Submit Application"

**Expected Result:** Success message, application submitted

### Test 2: View Application Details
**User:** Brand (campaign owner)

1. Go to `/brand/campaigns`
2. Click on the campaign
3. Switch to "Applications" tab
4. See the application with:
   - Creator's profile picture
   - Proposed price highlighted
   - List of deliverables with checkmarks
   - Application message
   - Link to creator profile

**Expected Result:** All application details visible, clean UI

### Test 3: Accept Application (Creates Collaboration)
**User:** Brand

1. In the application details from Test 2
2. Click "Accept Application"
3. Get success message

**Expected Result:**
- Application status changes to "accepted"
- Collaboration automatically created
- Visible in both brand and creator collaboration lists

### Test 4: View Collaboration
**User:** Creator or Brand

1. Click "Collaborations" in navbar
2. See the new collaboration listed
3. Shows:
   - Title
   - Partner info (brand or creator)
   - Amount
   - Progress (0%)
   - Start & due dates
4. Click to view details

**Expected Result:** Collaboration appears in list, details page loads

### Test 5: Update Progress
**User:** Creator

1. In collaboration details
2. Click "Update Progress"
3. Set progress to 25%
4. Add update: "Completed first Instagram post"
5. Submit

**Expected Result:**
- Progress bar updates to 25%
- Update message shows with timestamp
- Brand can see the update

### Test 6: Submit Deliverable
**User:** Creator

1. In collaboration details
2. Click "Submit Deliverable"
3. Fill in:
   - **Title**: "Instagram Post #1"
   - **URL**: https://instagram.com/p/example
   - **Description**: "Product showcase post"
4. Submit

**Expected Result:**
- Deliverable appears in "Submitted" section
- URL is clickable
- Brand can view

### Test 7: Complete Collaboration
**User:** Brand

1. In collaboration details (after deliverables submitted)
2. Scroll to Actions sidebar
3. Click "Mark as Completed"
4. Confirm

**Expected Result:**
- Status changes to "completed"
- Progress auto-sets to 100%
- Completion date recorded
- "Leave a Review" button appears for brand

## 📊 Expected Database State After Tests

### campaign_applications Table
```
id | campaign_id | creator_id | status    | proposed_price | deliverables (JSON)
1  | 5           | 12         | accepted  | 500.00         | ["2 Instagram Posts", "1 TikTok Video", ...]
```

### collaborations Table
```
id | collaboration_type | campaign_application_id | brand_id | creator_id | title | amount | status      | progress_percentage
1  | campaign           | 1                       | 8        | 12         | ...   | 500    | completed   | 100
```

### submitted_deliverables (JSON in collaborations)
```json
[
  {
    "title": "Instagram Post #1",
    "url": "https://instagram.com/p/example",
    "description": "Product showcase post",
    "submitted_at": "2025-01-13T15:30:00",
    "type": "file"
  }
]
```

## 🔍 Common Issues & Solutions

### Issue: "Failed to load collaborations"
**Solution:** Migration not run. Run the migration script.

### Issue: Application submit fails with "Missing required fields"
**Solution:** Ensure proposed_price and deliverables are filled in.

### Issue: Collaboration not created after accepting
**Solution:** Check backend logs. Ensure Collaboration model is imported in routes.

### Issue: 404 on `/brand/collaborations`
**Solution:** Clear browser cache, restart frontend server.

## 📝 Pending Features (Optional)

### Review System (Medium Priority)
- Create ReviewForm component
- Add review submission after collaboration completes
- Display reviews on creator profiles with averages
- Allow creator responses to reviews

**Files to Create:**
- `frontend/src/components/ReviewForm.jsx`
- Update `frontend/src/pages/CreatorProfile.jsx`

### Sample Review Form Flow:
1. Brand completes collaboration
2. "Leave Review" button appears
3. Form shows:
   - Overall rating (1-5 stars)
   - Optional detailed ratings (communication, quality, professionalism, timeliness)
   - Comment textarea
   - "Would recommend" checkbox
4. Review appears on creator's profile

## 🎯 Success Criteria

**All tests pass if:**
- ✅ Creators can apply with pricing and deliverables
- ✅ Brands see full application details
- ✅ Accepting creates a collaboration automatically
- ✅ Both parties see the collaboration in their lists
- ✅ Creators can update progress and submit deliverables
- ✅ Brands can mark as completed
- ✅ UI is clean and responsive
- ✅ No console errors

## 📞 Support

If you encounter issues:
1. Check browser console for errors
2. Check backend terminal for API errors
3. Verify migration ran successfully
4. Check network tab for failed API calls
5. Refer to [IMPLEMENTATION_PROGRESS.md](d:\Bantubuzz Platform\IMPLEMENTATION_PROGRESS.md) for technical details
