# Remaining Critical Fixes

## COMPLETED ✅
1. **Database precision migration** - All price columns now Numeric(15,4) to prevent rounding
2. **Proposal form UX improvements**:
   - Auto-scroll to form when opened
   - Loading spinner on submit button
   - Toast notifications for errors/success
   - Border highlight on proposal form
   - Disabled cancel button during submit

## COMPLETED IN THIS SESSION ✅

### 3. VIEW PROPOSALS PAGE LABEL - DONE
**File**: `frontend/src/pages/ManageBriefs.jsx` line 457
**Change**: Changed from "Per Milestone" to "Total (Custom Per Milestone)" or "Total (Evenly Divided)"
**Status**: ✅ FIXED and deployed

### 6. FILTERING IMPROVEMENTS - DONE
**Languages & Platform filters**:
- Backend logic was already correct (uses `contains([value])`)
- Filters work for: Instagram, TikTok, YouTube, Facebook, English, Shona
- Note: "Twitter/X" in frontend not in DB (creators have those 4 platforms)

**Search by keywords/categories**:
- Added category search to backend creators.py
- Now searches: categories, bio, username, email
- Case-insensitive partial matching
**Status**: ✅ FIXED backend deployed, filters now work properly

## STILL NEEDED ⚠️

### 4. PROPOSAL ACCEPTANCE FLOW
**Current**: Auto-deletes brief when accepted
**Needed**: Modal asking "Close brief or keep as campaign?"
**Files to update**:
- `frontend/src/pages/ManageBriefs.jsx` (accept button handler line 65-77)
- Add confirmation modal component
- Update backend `backend/app/routes/proposals.py` accept endpoint

### 5. PAYMENT 404 REDIRECT
**Current**: Line 71 in ManageBriefs.jsx does `navigate(\`/payment/${response.data.booking_id}\`)`
**Need to**:
- Check if `/payment/:id` route exists in App.jsx
- Verify Payment.jsx component exists and works
- May need to create payment page or fix route

### 7. REVERT FILTER DESIGN (USER REQUEST)
**Keep SearchFilterBar ONLY on Home page**
**Revert BrowseCreators and BrowsePackages to old design**:
- Remove SearchFilterBar import from BrowseCreators.jsx
- Remove SearchFilterBar import from BrowsePackages.jsx
- Add back the card-style filters (like before)
- Keep all new filter functionality but with old UI

## NEXT STEPS PRIORITY:
1. Find and fix View Proposals label (quick)
2. Revert filter design (medium - affects UX)
3. Fix filtering logic (critical - broken functionality)
4. Add proposal acceptance modal (important - prevents data loss)
5. Fix payment 404 (critical if payment broken)
