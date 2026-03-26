# Campaign System Implementation - March 26, 2026

## Overview

Complete rebuild of the campaign creation flow with proper 4-step wizard structure, fixed money handling (NO rounding), and implemented participation-based branching logic.

---

## Critical Rules - Money Handling

### **NEVER USE `type="number"` FOR MONEY FIELDS**

**CORRECT:**
```jsx
<input
  type="text"
  inputMode="decimal"
  pattern="[0-9]*\.?[0-9]*"
  value={formData.budget}
  onChange={(e) => setFormData({...formData, budget: e.target.value})}
  placeholder="1500.00"
/>
```

**WRONG:**
```jsx
// ❌ NEVER DO THIS - causes rounding
<input
  type="number"
  step="0.01"
  value={formData.budget}
/>
```

### Why?

- `type="number"` causes JavaScript to parse values as floats
- Float arithmetic introduces rounding errors
- Example: `1500.55` might become `1500.5499999`
- Using `type="text"` with `inputMode="decimal"` preserves exact decimal values
- Always send money as **strings** to backend
- Backend stores as `Numeric(12, 2)` in PostgreSQL

---

## Campaign Flow - 4-Step Wizard

### Step 1: Basic Details
**Purpose:** Define campaign identity

**Fields:**
- Campaign Title (text, required)
- Campaign Description (textarea, required, max 150 chars)

**File:** [`frontend/src/pages/CampaignForm.jsx:465-501`](frontend/src/pages/CampaignForm.jsx#L465-L501)

---

### Step 2: Campaign Brief
**Purpose:** Define how the campaign should be executed

**Fields:**
- Objective (dropdown, required)
  - Options: Brand Awareness, Engagement, Product Promotion, App Installs/Signups, Sales/Conversions, Content Creation, Other
- Target Audience (textarea, optional)
- **Deliverables Builder** (structured, required)
  - Platform (dropdown): Instagram, TikTok, YouTube, Facebook, Twitter, LinkedIn
  - Content Type (dropdown, dynamicbased on platform)
  - Quantity (number)
  - Must have at least 1 deliverable
- Additional Notes (textarea, optional) - replaces old `content_guidelines`

**File:** [`frontend/src/pages/CampaignForm.jsx:505-641`](frontend/src/pages/CampaignForm.jsx#L505-L641)

**Data Structure:**
```javascript
deliverables: [
  {platform: 'Instagram', content_type: 'Reel', quantity: 2},
  {platform: 'TikTok', content_type: 'Video', quantity: 3}
]
```

---

### Step 3: Campaign Setup
**Purpose:** Define budget, timeline, and milestones

**Fields:**
- **Budget** (`type="text"`, `inputMode="decimal"`, required)
  - Label: "Total Campaign Budget ($)"
  - This is the single budget field shown initially
- **Timeline** (date range, required)
  - Start Date
  - End Date
- **Milestones** (structured builder, required)
  - Deliverable Reference (dropdown - select from deliverables added in Step 2)
  - Due Date (date picker)
  - Must have at least 1 milestone
  - **Validation:** Every deliverable must have at least one milestone

**File:** [`frontend/src/pages/CampaignForm.jsx:644-779`](frontend/src/pages/CampaignForm.jsx#L644-L779)

**Data Structure:**
```javascript
milestones: [
  {deliverable_index: 0, due_date: '2026-07-10', name: 'Milestone 1'},
  {deliverable_index: 1, due_date: '2026-07-15', name: 'Milestone 2'}
]
```

---

### Step 4: Participation
**Purpose:** Choose how creators can participate (BRANCHING STEP)

**Radio Options:**
1. **Add Creator Packages** (`participation_mode = 'packages'`)
2. **Allow Creators to Apply** (`participation_mode = 'proposals'`)
3. **Both** (`participation_mode = 'both'`)

**File:** [`frontend/src/pages/CampaignForm.jsx:782-989`](frontend/src/pages/CampaignForm.jsx#L782-L989)

---

## Participation Mode Logic

### Mode: `packages`
- **What shows:** No additional fields
- **Budget fields:** Only `budget` (from Step 3) is sent
- **After creation:** Redirect to package browser
- **Campaign becomes:** Active immediately
- **Payload:**
```json
{
  "budget": "1500",
  "budget_min": null,
  "budget_max": null,
  "participation_mode": "packages"
}
```

### Mode: `proposals`
- **What shows:** Targeting + Application Setup section
- **Budget fields:** `budget_min`, `budget_max` (budget from Step 3 is NULL)
- **Additional fields:**
  - Budget Range (Min/Max) - `type="text"`, `inputMode="decimal"`
  - Target Locations (multi-select pills)
  - Target Categories (multi-select pills)
  - Follower Range (Min/Max followers) - `type="number"`
  - Application Deadline (date picker, required)
- **Payload:**
```json
{
  "budget": null,
  "budget_min": "500",
  "budget_max": "2000",
  "participation_mode": "proposals",
  "application_deadline": "2026-06-25",
  "target_categories": ["Technology", "Fashion"],
  "target_locations": ["Zimbabwe", "South Africa"],
  "target_min_followers": 1000,
  "target_max_followers": 100000
}
```

### Mode: `both`
- **What shows:** Same as proposals mode
- **Budget fields:** ALL THREE required (`budget`, `budget_min`, `budget_max`)
- **Payload:**
```json
{
  "budget": "1500",
  "budget_min": "500",
  "budget_max": "2000",
  "participation_mode": "both"
}
```

---

## Backend Validation

### Integer Fields - Empty String Handling

**Problem:** Sending empty strings for integer fields causes PostgreSQL error:
```
invalid input syntax for type integer: ""
```

**Solution:** Convert empty strings to `null` before saving

**File:** [`backend/app/routes/campaigns.py:95-112`](backend/app/routes/campaigns.py#L95-L112)

```python
# CRITICAL: Convert empty strings to None for integer fields
target_min_followers = data.get('target_min_followers')
if target_min_followers == '' or target_min_followers is None:
    target_min_followers = None
else:
    target_min_followers = int(target_min_followers)
```

**Applied to:**
- `target_min_followers`
- `target_max_followers`
- `timeline_days`

---

## Data Submission

### Frontend Payload Preparation

**File:** [`frontend/src/pages/CampaignForm.jsx:349-383`](frontend/src/pages/CampaignForm.jsx#L349-L383)

```javascript
const payload = {
  title: formData.title,
  description: formData.description,
  campaign_objective: formData.campaign_objective,
  target_audience: formData.target_audience,
  content_guidelines: formData.content_guidelines,
  participation_mode: formData.participation_mode,
  requires_milestones: true,

  // CRITICAL: Send budget as strings, handle based on participation_mode
  budget: formData.participation_mode === 'packages' || formData.participation_mode === 'both'
    ? String(formData.budget)
    : null,
  budget_min: formData.participation_mode === 'proposals' || formData.participation_mode === 'both'
    ? String(formData.budget_min)
    : null,
  budget_max: formData.participation_mode === 'proposals' || formData.participation_mode === 'both'
    ? String(formData.budget_max)
    : null,

  start_date: formData.start_date,
  end_date: formData.end_date,
  application_deadline: formData.participation_mode !== 'packages' ? formData.application_deadline : null,

  // CRITICAL: Convert empty strings to null for integer fields
  target_min_followers: formData.target_min_followers === '' ? null : formData.target_min_followers,
  target_max_followers: formData.target_max_followers === '' ? null : formData.target_max_followers,
  timeline_days: null,

  target_categories: formData.target_categories,
  target_locations: formData.target_locations,
  milestones: finalMilestones,
  status: formData.status
};
```

---

## Testing Commands

### 1. Login as Brand
```bash
# Get access token
curl -X POST https://bantubuzz.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"brand@example.com","password":"password123"}'

# Response will include:
# {"access_token":"eyJ0eXAiOiJKV1QiLCJhbGc...","user_type":"brand"}

# Save token
export TOKEN="eyJ0eXAiOiJKV1QiLCJhbGc..."
```

### 2. Create Campaign (Proposals Mode)
```bash
curl -X POST https://bantubuzz.com/api/campaigns/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Summer Product Launch",
    "description": "Promote our new mobile payment feature",
    "campaign_objective": "Brand Awareness",
    "target_audience": "Young professionals aged 18-35",
    "content_guidelines": "Tag @Brand, Use #SummerLaunch",
    "participation_mode": "proposals",
    "budget": null,
    "budget_min": "500",
    "budget_max": "2000",
    "start_date": "2026-07-01",
    "end_date": "2026-07-31",
    "application_deadline": "2026-06-25",
    "target_categories": ["Technology", "Lifestyle"],
    "target_locations": ["Zimbabwe", "South Africa"],
    "target_min_followers": 1000,
    "target_max_followers": 100000,
    "milestones": [
      {
        "milestone_number": 1,
        "name": "Content Creation",
        "deliverables": [
          {"platform": "Instagram", "content_type": "Reel", "quantity": 2}
        ],
        "due_date": "2026-07-10"
      }
    ],
    "status": "active"
  }'
```

### 3. Create Campaign (Packages Mode)
```bash
curl -X POST https://bantubuzz.com/api/campaigns/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Package Based Campaign",
    "description": "Select creators via packages",
    "campaign_objective": "Engagement",
    "participation_mode": "packages",
    "budget": "1500",
    "budget_min": null,
    "budget_max": null,
    "start_date": "2026-07-01",
    "end_date": "2026-07-31",
    "milestones": [...],
    "status": "active"
  }'
```

### 4. Get Campaigns (Brand)
```bash
curl -X GET https://bantubuzz.com/api/campaigns/ \
  -H "Authorization: Bearer $TOKEN"
```

### 5. Browse Opportunities (Creator)
```bash
# Login as creator first
curl -X POST https://bantubuzz.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"creator@example.com","password":"password123"}'

export CREATOR_TOKEN="..."

# Browse campaigns
curl -X GET https://bantubuzz.com/api/campaigns/browse \
  -H "Authorization: Bearer $CREATOR_TOKEN"
```

### 6. Apply to Campaign (Creator)
```bash
curl -X POST https://bantubuzz.com/api/campaigns/123/apply \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CREATOR_TOKEN" \
  -d '{
    "proposed_price": "1200.50",
    "proposal_message": "I am perfect for this campaign because...",
    "deliverables": "2 Instagram Reels, 1 TikTok Video",
    "delivery_timeline_days": 14
  }'
```

### 7. Get Campaign Proposals (Brand)
```bash
curl -X GET https://bantubuzz.com/api/campaigns/123/proposals \
  -H "Authorization: Bearer $TOKEN"
```

### 8. Accept Proposal (Brand)
```bash
curl -X POST https://bantubuzz.com/api/campaigns/proposals/456/accept \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN"

# Response: Creates booking, returns booking_id and payment redirect
```

---

## Files Modified

### Backend
- [`backend/app/routes/campaigns.py`](backend/app/routes/campaigns.py)
  - Lines 95-112: Added integer field validation
  - Lines 261-270: Added integer field validation for updates

### Frontend
- [`frontend/src/pages/CampaignForm.jsx`](frontend/src/pages/CampaignForm.jsx) - **Completely rebuilt**
  - New 4-step wizard structure
  - All money fields use `type="text"` with `inputMode="decimal"`
  - Deliverables created directly in milestones
  - Participation mode branching logic

- [`frontend/src/pages/OpportunityDetails.jsx`](frontend/src/pages/OpportunityDetails.jsx)
  - Line 391-400: Fixed proposed_price input to use `type="text"` with `inputMode="decimal"`

- [`frontend/src/pages/Campaigns.jsx`](frontend/src/pages/Campaigns.jsx)
  - Lines 95, 139: Fixed routing from `/brand/campaigns/new` to `/brand/campaigns/create`

- [`frontend/src/App.jsx`](frontend/src/App.jsx)
  - Line 37: Changed import from `CampaignFormNew` to `CampaignForm`
  - Lines 403, 411: Updated component usage

### Already Correct (No Changes Needed)
- [`frontend/src/pages/Opportunities.jsx`](frontend/src/pages/Opportunities.jsx) - Already displays money correctly
- [`frontend/src/pages/CampaignDetails.jsx`](frontend/src/pages/CampaignDetails.jsx) - Already has proper money handling
- [`frontend/src/pages/MyApplications.jsx`](frontend/src/pages/MyApplications.jsx) - Already correct

---

## Design Guidelines

### BantuBuzz Style
- **Background:** `bg-gradient-to-br from-orange-50 via-white to-blue-50`
- **Cards:** `rounded-3xl shadow-lg` or `rounded-3xl shadow-xl`
- **Buttons:** `rounded-xl` (not rounded-full for forms)
- **Inputs:** `rounded-xl border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent`
- **Primary color:** `#ccdb53` (olive/yellow-green)
- **Pills/Badges:** `rounded-full`
- **Spacing:** `space-y-6` between sections, `gap-4` in grids

### Progress Indicator
```jsx
<div className="flex items-center justify-between">
  {[1, 2, 3, 4].map((step) => (
    <div key={step} className="flex items-center flex-1">
      <div className="flex flex-col items-center flex-1">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
          currentStep >= step ? 'bg-primary text-white' : 'bg-gray-200 text-gray-600'
        }`}>
          {step}
        </div>
        <span className={`text-xs mt-2 ${currentStep >= step ? 'text-primary font-medium' : 'text-gray-600'}`}>
          {stepTitles[step - 1]}
        </span>
      </div>
      {step < 4 && (
        <div className={`h-1 flex-1 mx-2 ${currentStep > step ? 'bg-primary' : 'bg-gray-200'}`} />
      )}
    </div>
  ))}
</div>
```

---

## Campaign States

### Status Values
- **draft** - Not visible to creators, editable
- **active** - Visible to creators, limited editing
- **paused** - Hidden from creators, can resume
- **completed** - Archived, no editing

### Visibility Rules
Campaign appears in Creator Opportunities only if:
- `status = 'active'`
- AND `application_deadline` not passed (or NULL)

### Editing Rules
- **Draft:** Everything editable
- **Active/Paused:** Only title, description, additional notes editable
- **Completed:** Nothing editable

---

## Common Pitfalls & Solutions

### ❌ Problem: Money values getting rounded
**Solution:** Use `type="text"` with `inputMode="decimal"` for ALL money fields

### ❌ Problem: Empty string causes "invalid input syntax for type integer"
**Solution:** Convert empty strings to `null` before saving

### ❌ Problem: Budget fields not matching participation_mode
**Solution:** Check participation_mode and conditionally set budget fields to `null`

### ❌ Problem: Float arithmetic errors
**Solution:** Always send money as strings, never use `parseFloat()` on money values

### ❌ Problem: Deliverables not linked to milestones
**Solution:** Store deliverables in milestone.deliverables JSONB field

---

## Next Steps for Future Development

1. **Draft Auto-Save:** Implement auto-save every 30 seconds for draft campaigns
2. **Package Browser Integration:** After creating packages-mode campaign, redirect to package selection
3. **Milestone Payment Escrow:** Implement milestone-based payment releases
4. **Campaign Analytics:** Track views, applications, acceptance rate
5. **Notification System:** Email/push notifications for application status changes

---

**Implementation Date:** March 26, 2026
**Status:** ✅ Complete - Ready for testing
**Next:** User acceptance testing and deployment
