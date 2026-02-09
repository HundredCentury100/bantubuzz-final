# BantuBuzz Design Alignment & Feature Plan

## Design Philosophy (from Home.jsx)

### Core Design Elements:
1. **Rounded Corners**: `rounded-3xl` (cards), `rounded-2xl` (images), `rounded-full` (buttons, pills, status)
2. **Colors**:
   - Primary: `#F15A29` (orange) - accents, CTAs
   - Dark: `#1F2937` (navy) - text, buttons
   - Light: `#F3F4F6` - backgrounds
3. **Cards**: White bg, `rounded-3xl`, `shadow-sm hover:shadow-md`
4. **Buttons**: `rounded-full`, bold, high contrast
5. **Typography**: Bold headings, medium body
6. **Spacing**: Generous padding (`px-4 pb-4`), good whitespace
7. **Status Indicators**: `border border-gray-300 rounded-full text-xs px-3 py-1`

---

## Priority 1: Critical Frontend Fixes

### 1. Badge System Updates ✅
**File**: `frontend/src/components/CreatorBadge.jsx`
- [x] Add `responds_fast` badge type (green badge with clock icon)
- [x] Change "Verified Creator" to "Verified" (shorter)
- [x] Update PropTypes to include `responds_fast`

**Backend Logic Needed** (Priority 2):
- Top Creators: Show ONLY "Top Creator" badge (verified is implied)
- If badges array contains "top_creator", filter out "verified_creator"
- Regular verified: Show "Verified" badge
- Responds Fast: Show "Responds Fast" badge

### 2. Remove Engagement Rate
**Files to Update**:
- `frontend/src/pages/CreatorProfile.jsx` (lines 260-265)
- `frontend/src/pages/BrowseCreators.jsx` (creator cards)
- `frontend/src/pages/Creators.jsx` (creator cards)

**Action**: Remove engagement rate display from:
- Creator profile stats section
- Browse creators card stats
- All creator list cards

### 3. Redesign Availability Status Button
**Current**: Pill-style status with colored indicators
**New Design** (match Home.jsx line 205-207):
```jsx
<span className="text-xs px-3 py-1 border border-gray-300 rounded-full">
  {availability_status}
</span>
```
**Files**:
- `frontend/src/pages/CreatorProfile.jsx` (lines 283-296)
- `frontend/src/pages/BrowseCreators.jsx` (availability display)

### 4. Add Location to Creator Cards
**Format**: `City, COUNTRY_CODE` (e.g., "Harare, ZW")
**Files**:
- `frontend/src/pages/BrowseCreators.jsx` - Add location under name/followers
- `frontend/src/pages/Creators.jsx` - Add location to cards
- `frontend/src/pages/Home.jsx` - Add location if desired

**Display Position**: Between social icons and category badge

### 5. Add Social Platform Icons to Cards
**Files**:
- `frontend/src/pages/BrowseCreators.jsx` - Add icons row (like Home.jsx lines 190-204)

**Icons to Support**:
- Instagram, TikTok, YouTube, Twitter, Facebook, LinkedIn

**Logic**: Show icon only if creator has that platform in `social_links`

### 6. Update CreatorProfileEdit - Add City/Country Fields
**File**: `frontend/src/pages/CreatorProfileEdit.jsx`
**Add Fields**:
- City/Town (text input)
- Country (dropdown with country codes: ZW, ZA, KE, NG, etc.)

**Backend**: May need to add `city` and `country` columns to `creator_profiles` table

---

## Priority 2: Design Consistency Audit

### Pages Needing Design Alignment:

#### A. Dashboard Pages (HIGH PRIORITY)
1. **CreatorDashboard.jsx**
   - Update card styles to `rounded-3xl`
   - Update buttons to `rounded-full`
   - Ensure consistent spacing

2. **BrandDashboard.jsx**
   - Same as CreatorDashboard

3. **AdminDashboard.jsx**
   - Apply same design principles

#### B. Profile Pages
4. **CreatorProfile.jsx**
   - [x] Remove engagement (line 260-265)
   - [ ] Update availability button (lines 283-296)
   - [ ] Update card styling if needed
   - [ ] Ensure buttons are `rounded-full`

5. **BrowseCreators.jsx**
   - [ ] Remove engagement from cards
   - [ ] Add location display
   - [ ] Add social icons
   - [ ] Update availability display
   - [ ] Ensure card design matches Home.jsx

6. **Creators.jsx**
   - Same updates as BrowseCreators

#### C. Package/Booking Pages
7. **PackageDetails.jsx** - Align button/card styles
8. **BookingDetails.jsx** - Align styles
9. **Bookings.jsx** - Align card styles

#### D. Campaign Pages
10. **CampaignDetails.jsx** - Align styles
11. **Campaigns.jsx** - Align card styles
12. **CampaignForm.jsx** - Align input/button styles

#### E. Payment Pages
13. **Payment.jsx** - Already updated, verify consistency
14. **CampaignPayment.jsx** - Verify design consistency

#### F. Messaging/Collaboration
15. **Messages.jsx** - Align styles
16. **CollaborationDetails.jsx** - Align styles

---

## Priority 3: Backend Features

### 1. Badge Logic - Top Creator Priority
**File**: `backend/app/routes/creators.py` (or wherever badges are calculated)

**Current Logic**:
```python
badges = []
if creator.is_top_creator():
    badges.append('top_creator')
if creator.is_verified:
    badges.append('verified_creator')
```

**New Logic**:
```python
badges = []
# Top creator implies verified, so only show top_creator
if creator.is_top_creator():
    badges.append('top_creator')
elif creator.is_verified:
    # Only show verified if NOT a top creator
    badges.append('verified_creator')

# Add responds fast badge if applicable
if creator.responds_fast:
    badges.append('responds_fast')
```

### 2. Responds Fast Badge Logic
**Criteria**: Creator responds to messages within X minutes/hours on average

**Implementation**:
- Add `average_response_time` column to `creator_profiles` table
- Calculate based on messaging timestamps
- Threshold: < 2 hours average = "responds_fast"

**Files**:
- `backend/app/models/creator_profile.py` - Add field
- `backend/app/services/messaging_stats.py` - Calculate response times
- Migration: Add column

### 3. Featured Creators Sorting
**File**: `backend/app/routes/creators.py` - `/api/creators` endpoint

**Current**: Returns creators without featured priority
**New**:
```python
# Sort by: is_featured DESC, then other criteria
creators = CreatorProfile.query\
    .order_by(CreatorProfile.is_featured.desc(), CreatorProfile.created_at.desc())\
    .all()
```

**Frontend** (`frontend/src/pages/BrowseCreators.jsx`):
- Add "Featured" badge/indicator to featured creators
- They should already appear first due to backend sorting

### 4. Database Migrations Needed
```sql
-- Add city and country
ALTER TABLE creator_profiles ADD COLUMN city VARCHAR(100);
ALTER TABLE creator_profiles ADD COLUMN country VARCHAR(2); -- ISO country code

-- Add responds_fast indicator
ALTER TABLE creator_profiles ADD COLUMN average_response_time INTEGER; -- in minutes
ALTER TABLE creator_profiles ADD COLUMN responds_fast BOOLEAN DEFAULT FALSE;
```

---

## Priority 4: Testing Checklist

### Frontend Testing:
- [ ] Badges display correctly (only Top Creator for top creators)
- [ ] Responds Fast badge shows green
- [ ] Engagement rate removed from all pages
- [ ] Availability status uses pill design
- [ ] Location displays as "City, COUNTRY"
- [ ] Social icons show only for linked platforms
- [ ] Featured creators appear first
- [ ] All cards use `rounded-3xl`
- [ ] All buttons use `rounded-full`
- [ ] Cart floating button works

### Backend Testing:
- [ ] Badge logic returns correct badges
- [ ] Featured sorting works
- [ ] City/country fields save correctly
- [ ] Response time calculation accurate

---

## Implementation Order:

1. ✅ Update CreatorBadge component (responds_fast)
2. [ ] Remove engagement rate from all pages
3. [ ] Update availability status design
4. [ ] Add location display to cards
5. [ ] Add social icons to browse cards
6. [ ] Update CreatorProfileEdit (city/country fields)
7. [ ] Backend: Update badge logic
8. [ ] Backend: Add responds_fast calculation
9. [ ] Backend: Implement featured sorting
10. [ ] Design audit: Update all pages for consistency
11. [ ] Build and deploy frontend
12. [ ] Deploy backend changes
13. [ ] Test all features

---

## Notes:
- Home.jsx is the design reference
- Priority on visual consistency
- All changes should maintain mobile responsiveness
- Test on different screen sizes
