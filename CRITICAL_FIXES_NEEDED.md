# Critical Fixes Required

## 1. NUMBER ROUNDING ISSUE (HIGHEST PRIORITY)
**Problem**: Numbers like 400 become 399, 500.5 gets rounded
**Root Cause**: PostgreSQL Numeric(10,2) has floating point precision issues
**Solution**: Change all price/money columns to Numeric(15,4) or DECIMAL type

### Files to update:
- `backend/app/models/proposal.py` - total_price column
- `backend/app/models/proposal_milestone.py` - price column
- `backend/app/models/booking.py` - total_price, amount_paid columns
- `backend/app/models/package.py` - price column
- `backend/app/models/wallet_transaction.py` - amount column
- `backend/app/models/collaboration_milestone.py` - price column

### Migration needed:
```sql
ALTER TABLE proposals ALTER COLUMN total_price TYPE NUMERIC(15,4);
ALTER TABLE proposal_milestones ALTER COLUMN price TYPE NUMERIC(15,4);
ALTER TABLE bookings ALTER COLUMN total_price TYPE NUMERIC(15,4);
ALTER TABLE bookings ALTER COLUMN amount_paid TYPE NUMERIC(15,4);
ALTER TABLE packages ALTER COLUMN price TYPE NUMERIC(15,4);
ALTER TABLE wallet_transactions ALTER COLUMN amount TYPE NUMERIC(15,4);
ALTER TABLE collaboration_milestones ALTER COLUMN price TYPE NUMERIC(15,4);
```

## 2. PROPOSAL FORM UX ISSUES
**Problems**:
- No scroll to form when "Submit Proposal" clicked
- No loading indicator on submit
- Errors not visible

**Fixes needed in** `frontend/src/pages/BriefDetails.jsx`:
- Add `useRef` and `scrollIntoView` when showProposalForm becomes true
- Add loading spinner on submit button when `submitting===true`
- Show error toast notification using `react-hot-toast`

## 3. VIEW PROPOSALS PAGE
**Problem**: Says "Per Milestone" but shows total
**Fix**: Change label from "Per Milestone" to "Total Price"
**File**: `frontend/src/pages/brand/ViewProposals.jsx` or similar

## 4. PROPOSAL ACCEPTANCE FLOW
**Problem**: Accepting proposal deletes the brief automatically
**Fix**: Add modal asking "Close brief or keep as campaign?"
**File**: Proposal acceptance handler in brand proposals page

## 5. PAYMENT 404 ERROR
**Problem**: Payment redirect leads to 404
**Need to check**:
- What URL is being redirected to?
- Does the payment route exist?
- Check browser console for the redirect URL

## 6. FILTERING NOT WORKING
**Problems**:
- Languages filter not working
- Platform filter not working
- Search by keywords/niches/categories not working

**Root causes to check**:
- Backend `creators.py` - languages and platforms filter logic
- Frontend SearchFilterBar - how it sends filter params
- API call format (arrays vs comma-separated strings)

## 7. FILTER DESIGN
**Problem**: New design matches home page, should be different
**Fix**: Revert BrowseCreators and BrowsePackages to use old filter card design, keep SearchFilterBar only for Home page

---

## PRIORITY ORDER:
1. Number rounding (database migration + model updates)
2. Delete orphaned proposals (DONE)
3. Filter functionality (languages, platforms, search)
4. Proposal form UX
5. View proposals label
6. Proposal acceptance flow
7. Payment 404
8. Filter design reversion
