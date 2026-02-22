# BantuBuzz Admin System — Complete Implementation Plan
**Date:** February 2026
**Scope:** New admin features + corresponding creator/brand dashboard updates

---

## CURRENT STATE SUMMARY

### Admin pages already built (keep + enhance):
- Dashboard, Users, Categories, Bookings, Payments, Cashouts, Collaborations, Campaigns, Reviews

### Completely missing (need to build):
- Activity feed, Disputes system, Subscriptions, Reports, Settings, Niche management page, User profile deep-view, Creator verification queue

### Creator/Brand side — missing:
- Dispute raise/track flow, Subscription management, Notifications page, Account suspension feedback

---

## PHASE 1 — DASHBOARD & USER MANAGEMENT ENHANCEMENTS
> Completes half-built areas. Highest ROI, lowest risk.

### 1A. Admin Dashboard Enhancements

**New stat cards to add:**
- New Signups Today / This Week (already fetched, just not shown)
- Open Disputes (0 now — placeholder until Phase 3)
- Suspended Accounts count
- Failed Payments count (from bookings with payment_status = 'failed')

**Files to update:**
- `frontend/src/pages/admin/Dashboard.jsx` — add 4 new stat cards
- `backend/app/routes/admin/dashboard.py` — add suspended_count, failed_payments, new_signups_today to stats response

---

### 1B. User Profile Deep-View Page

**New page:** `frontend/src/pages/admin/UserProfile.jsx`
**Route:** `/admin/users/:id`

**What it shows:**
- Full profile (name, email, role, joined, last login, verified status)
- Subscription tier (placeholder for Phase 5)
- Profile completeness score
- Their bookings (last 10)
- Their collaborations (last 10)
- Revenue generated (if brand) or earned (if creator)
- Reports filed / received (placeholder until Phase 3)
- Risk flags

**Actions available:**
- Activate / Deactivate (already exists)
- Suspend (new — sets a `suspended` status with reason + duration)
- Restrict (new — limits certain features, e.g. can't create new bookings)
- Flag for monitoring (new — adds internal admin note)
- Remove badge / Revoke verification
- Add admin note (internal only)

**Files to create/update:**
- `frontend/src/pages/admin/UserProfile.jsx` — new page
- `backend/app/routes/admin/users.py` — add GET `/admin/users/:id` detail endpoint, add suspend/restrict/flag endpoints
- `backend/app/models/user.py` — add `suspended`, `restricted`, `suspension_reason`, `suspension_until` fields (migration needed)
- `frontend/src/pages/AdminUsers.jsx` — make each row clickable → navigate to `/admin/users/:id`

**Creator/Brand side impact:**
- `frontend/src/pages/CreatorDashboard.jsx` — show suspension banner if suspended
- `frontend/src/pages/BrandDashboard.jsx` — show suspension banner if suspended
- `backend/app/routes/auth.py` — check suspended status on login, return specific error

---

### 1C. Creator Verification Queue Page

**New page:** `frontend/src/pages/admin/VerificationQueue.jsx`
**Route:** `/admin/verification`

**What it shows:**
- List of creators with `verified = false` pending review
- Profile photo, bio, follower counts, social links
- Identity document uploads (if we collect them — can add field)
- Applied date

**Actions:**
- Approve verification → sets `verified = true`, badge applied
- Reject with reason → sends notification to creator

**Files to create/update:**
- `frontend/src/pages/admin/VerificationQueue.jsx` — new page
- `backend/app/routes/admin/users.py` — GET `/admin/verification/pending`, PUT `/admin/users/:id/verify`
- `frontend/src/components/AdminLayout.jsx` — add "Verification" to sidebar (or nest under Users)
- `frontend/src/pages/admin/Dashboard.jsx` — link "Pending Verifications" stat card to this page

**Creator side impact:**
- `frontend/src/pages/CreatorDashboard.jsx` — show "Verification pending" status / "Approved" banner
- `frontend/src/pages/CreatorProfileEdit.jsx` — add verification request button + status display

---

## PHASE 2 — ACTIVITY FEED
> Live marketplace visibility for admin. No new DB models needed.

### 2A. Admin Activity Page

**New page:** `frontend/src/pages/admin/Activity.jsx`
**Route:** `/admin/activity`

**Feed items (pulled from existing data):**
- New user registered (creator / brand)
- New booking created (package, amount, brand → creator)
- Collaboration started
- Milestone submitted / approved
- Collaboration completed
- Cancellation requested
- Payment verified
- Cashout requested / processed
- Review posted
- Campaign launched / approved

**Filters:**
- All / Bookings / Collaborations / Payments / Users / Campaigns
- Date range picker
- High-value only toggle (transactions > $X)

**Anomaly highlights (visual flags):**
- Overdue collaborations (past expected_completion, not completed)
- Bookings stuck in pending > 7 days
- Users with > 2 cancellations in 30 days
- Same brand booking same creator multiple times in short period

**Files to create/update:**
- `frontend/src/pages/admin/Activity.jsx` — new page
- `backend/app/routes/admin/activity.py` — new file, GET `/admin/activity/feed` (aggregates from bookings, collaborations, users, campaigns tables)
- `backend/app/routes/__init__.py` or `app.py` — register new blueprint
- `frontend/src/components/AdminLayout.jsx` — add "Activity" to sidebar

---

## PHASE 3 — DISPUTES SYSTEM
> Biggest new system. Affects admin, creator, and brand sides.

### 3A. Database Models (new)

**New table: `disputes`**
```
id, reference (DISP-XXXX), collaboration_id, raised_by_user_id,
against_user_id, issue_type (non_delivery / quality / payment / behaviour / other),
description, status (open / under_review / resolved / closed),
resolution (release_funds / partial_release / refund / warning / suspension),
resolution_notes, payout_percentage (for partial),
evidence_urls (JSON array), admin_id (assigned admin),
created_at, updated_at, resolved_at
```

**Update table: `collaborations`**
```
+ dispute_id (FK, nullable)
+ payout_frozen (bool, default false)
```

**Files to create:**
- `backend/app/models/dispute.py` — new model
- `backend/migrations/add_disputes.py` — migration script

---

### 3B. Backend Dispute Routes

**New file:** `backend/app/routes/disputes.py` (user-facing)

Endpoints:
- `POST /disputes` — raise a dispute (brand or creator)
- `GET /disputes` — list my disputes
- `GET /disputes/:id` — get dispute detail
- `POST /disputes/:id/evidence` — upload evidence file

**New file:** `backend/app/routes/admin/disputes.py` (admin-facing)

Endpoints:
- `GET /admin/disputes` — list all disputes (filter by status, type, date)
- `GET /admin/disputes/:id` — full case detail (auto-attaches: collaboration summary, payment status, milestone timestamps, user history)
- `PUT /admin/disputes/:id/assign` — assign to admin
- `PUT /admin/disputes/:id/resolve` — resolve with decision + notes
- `GET /admin/disputes/stats` — count by status, avg resolution time

---

### 3C. Admin Disputes Page

**New page:** `frontend/src/pages/admin/Disputes.jsx`
**Route:** `/admin/disputes`

**Stats cards:**
- Open Disputes
- Under Review
- Resolved This Month
- Avg Resolution Time (days)

**Case list columns:**
- Reference (DISP-XXXX)
- Collaboration title
- Raised by (brand/creator name)
- Against (name)
- Issue type badge
- Amount at stake
- Status badge
- Created date
- Assigned admin
- Actions

**Case detail panel/modal:**
- Case Overview (reference, type, status, parties)
- Financial Context (collaboration amount, escrow status, payment history)
- Behavioral Context (user history — past disputes, cancellations, on-time rate)
- Evidence (uploaded files, links)
- Collaboration timeline (milestones, messages summary)
- Resolution form (decision dropdown, notes, payout %, confirm)

**Files to create/update:**
- `frontend/src/pages/admin/Disputes.jsx` — new page
- `frontend/src/components/AdminLayout.jsx` — add "Disputes" to sidebar
- `frontend/src/pages/admin/Dashboard.jsx` — wire "Open Disputes" stat card

---

### 3D. Creator/Brand Dispute Flow

**New page (shared):** `frontend/src/pages/RaiseDispute.jsx`
**Routes:**
- `/brand/collaborations/:id/dispute` → brand raises dispute
- `/creator/collaborations/:id/dispute` → creator raises dispute

**Form fields:**
- Issue type (dropdown)
- Description (textarea)
- Evidence upload (images/PDF, max 20MB)
- Auto-displays: collaboration summary, amount, current status

**New page (shared):** `frontend/src/pages/DisputeStatus.jsx`
**Routes:**
- `/brand/disputes` — brand's disputes list
- `/creator/disputes` — creator's disputes list
- `/disputes/:id` — individual dispute status

**What it shows:**
- Dispute reference, status badge
- Timeline (raised → under review → resolved)
- Admin decision + notes (once resolved)
- Frozen payout notice (while open)

**Files to create/update:**
- `frontend/src/pages/RaiseDispute.jsx` — new page
- `frontend/src/pages/DisputeStatus.jsx` — new page
- `frontend/src/pages/CollaborationDetails.jsx` — add "Raise Dispute" button (only if collaboration in_progress and no open dispute)
- `frontend/src/App.jsx` — register new dispute routes
- `backend/app/routes/collaborations.py` — freeze payout when dispute opened
- `backend/app/routes/wallet.py` — block cashout if collaboration has open dispute

---

## PHASE 4 — REPORTS
> Business intelligence. Read-only. Pulls from existing data.

### 4A. Admin Reports Page

**New page:** `frontend/src/pages/admin/Reports.jsx`
**Route:** `/admin/reports`

**Four tabs:**

**Tab 1: Growth**
- Total users chart (line, 30/90/365 days)
- New signups per day/week
- Creator vs Brand split over time
- Activation rate (signed up → first booking)

**Tab 2: Revenue**
- Gross Transaction Volume (bar chart by month)
- Platform fee revenue
- Subscription revenue (placeholder until Phase 5)
- Refund rate %
- Top 10 creators by revenue generated
- Top 10 brands by spend

**Tab 3: Marketplace Health**
- Active vs completed collaborations ratio
- Dispute rate % (disputes / total collaborations)
- Average milestone completion time
- On-time delivery % (completed before expected_completion)
- Cancellation rate by month

**Tab 4: Risk**
- Users with 2+ disputes
- Users with 2+ cancellations in 30 days
- Failed payment accounts
- Suspended accounts log
- High-value transactions (top 20)

**Export button:** Download current tab as CSV

**Files to create/update:**
- `frontend/src/pages/admin/Reports.jsx` — new page
- `backend/app/routes/admin/reports.py` — new file with 4 endpoint groups
- `frontend/src/components/AdminLayout.jsx` — add "Reports" to sidebar

---

## PHASE 5 — SUBSCRIPTIONS
> New recurring revenue model. Significant DB + logic changes.

### 5A. Database Models (new)

**New table: `subscription_plans`**
```
id, name (Free/Starter/Pro/Agency), price_monthly, price_yearly,
max_packages, max_bookings_per_month, can_access_briefs,
can_access_campaigns, featured_priority, badge_label,
is_active, created_at
```

**New table: `subscriptions`**
```
id, user_id, plan_id, status (active/cancelled/expired/past_due),
current_period_start, current_period_end, cancel_at_period_end,
payment_method, last_payment_date, next_payment_date,
payment_reference, created_at, updated_at
```

---

### 5B. Admin Subscriptions Page

**New page:** `frontend/src/pages/admin/Subscriptions.jsx`
**Route:** `/admin/subscriptions`

**Stats cards:**
- Active Subscriptions
- Subscription Revenue (monthly)
- Failed Renewals
- Cancellations This Month
- Tier breakdown (Free / Starter / Pro / Agency counts)

**Features:**
- List all subscribed users with tier, status, next payment date
- Filter by tier, status
- Modify user's subscription tier (manual override)
- Cancel subscription
- View payment history per subscription

**Files to create/update:**
- `frontend/src/pages/admin/Subscriptions.jsx` — new page
- `backend/app/models/subscription.py` — new models
- `backend/app/routes/admin/subscriptions.py` — new admin endpoints
- `backend/app/routes/subscriptions.py` — user-facing subscribe/cancel/status endpoints
- `frontend/src/components/AdminLayout.jsx` — add "Subscriptions" to sidebar

**Creator/Brand side impact:**
- `frontend/src/pages/CreatorDashboard.jsx` — add subscription tier badge + upgrade prompt
- `frontend/src/pages/BrandDashboard.jsx` — add subscription tier badge + upgrade prompt
- New page: `frontend/src/pages/Pricing.jsx` — public pricing page
- New page: `frontend/src/pages/SubscriptionManage.jsx` — user manages their subscription
- `backend/app/routes/packages.py` — enforce max_packages limit per plan
- `backend/app/routes/bookings.py` — enforce max_bookings_per_month per plan

---

## PHASE 6 — PLATFORM SETTINGS (SUPER ADMIN)
> Governance layer. Super admin only.

### 6A. Admin Settings Page

**New page:** `frontend/src/pages/admin/Settings.jsx`
**Route:** `/admin/settings`

**Sections:**

**Platform Fees**
- Platform fee % (default 15%)
- Escrow release duration (days after completion)
- Cashout minimum amount
- Cashout processing fee %

**Subscription Pricing**
- Edit plan names, prices, feature limits
- Activate/deactivate plans

**Badge Criteria**
- Top Creator: minimum collaborations, minimum rating
- Responds Fast: response time threshold (hours)
- Verified: manual only / auto criteria

**Role Permissions**
- Standard Admin: what they can/cannot do
- Super Admin: full access label

**Audit Log**
- Every settings change logged (who, what, when, old value, new value)

**Files to create/update:**
- `frontend/src/pages/admin/Settings.jsx` — new page
- `backend/app/models/platform_settings.py` — new model (key/value store)
- `backend/app/routes/admin/settings.py` — new endpoints (super admin only)
- `frontend/src/components/AdminLayout.jsx` — add "Settings" to sidebar (super admin only, conditional)
- All fee references in backend — replace hardcoded % with DB lookup

---

## PHASE 7 — NICHE MANAGEMENT PAGE
> Low effort, backend already done.

**New page:** `frontend/src/pages/admin/Niches.jsx`
**Route:** `/admin/niches`

**Features:**
- List niches grouped by category
- Add niche (name, category, slug)
- Edit niche
- Delete niche
- Toggle active status

**Files to create/update:**
- `frontend/src/pages/admin/Niches.jsx` — new page
- `frontend/src/components/AdminLayout.jsx` — add "Niches" under Categories or as sub-item
- Backend already complete — no changes needed

---

## CROSS-CUTTING UPDATES

### Admin Layout Sidebar (final state after all phases)
```
Dashboard
Users
  └ Verification Queue
Activity
Transactions          ← rename existing Payments + Bookings combined view
Disputes              ← Phase 3 (new)
Subscriptions         ← Phase 5 (new)
Trust & Moderation
  └ Reviews
  └ Campaigns
Collaborations
Reports               ← Phase 4 (new)
Settings              ← Phase 6 (super admin only)
──────────────
Categories
  └ Niches
Cashouts
Featured Creators
```

---

### Creator Dashboard Updates (across phases)

| Phase | Change | File |
|-------|--------|------|
| 1B | Suspension banner if account suspended | `CreatorDashboard.jsx` |
| 1B | Restriction notice if restricted | `CreatorDashboard.jsx` |
| 1C | Verification status / pending badge | `CreatorDashboard.jsx`, `CreatorProfileEdit.jsx` |
| 3D | "Raise Dispute" button on collaborations | `CollaborationDetails.jsx` |
| 3D | Disputes list page | new `DisputeStatus.jsx` |
| 3D | Frozen payout notice | `Wallet.jsx` |
| 5B | Subscription tier badge on dashboard | `CreatorDashboard.jsx` |
| 5B | Package limit enforcement | `PackageManagement.jsx` |
| 5B | Subscription manage page | new `SubscriptionManage.jsx` |

### Brand Dashboard Updates (across phases)

| Phase | Change | File |
|-------|--------|------|
| 1B | Suspension banner if account suspended | `BrandDashboard.jsx` |
| 3D | "Raise Dispute" button on collaborations | `CollaborationDetails.jsx` |
| 3D | Disputes list page | new `DisputeStatus.jsx` |
| 3D | Frozen payment notice | `BrandWallet.jsx` |
| 5B | Subscription tier badge on dashboard | `BrandDashboard.jsx` |
| 5B | Booking limit enforcement | `PackageDetails.jsx` |
| 5B | Subscription manage page | new `SubscriptionManage.jsx` |

---

## IMPLEMENTATION SEQUENCE SUMMARY

| Phase | What | New Files | Updated Files | Effort |
|-------|------|-----------|---------------|--------|
| **1A** | Dashboard stat enhancements | 0 | 2 | Small |
| **1B** | User profile deep-view + suspend/restrict | 1 frontend, 1 backend | 3 frontend, 2 backend | Medium |
| **1C** | Verification queue page | 1 frontend | 2 frontend, 1 backend | Small |
| **2** | Activity feed | 1 frontend, 1 backend | 1 frontend, 1 backend | Medium |
| **3** | Disputes (full system) | 4 frontend, 3 backend, 1 model | 5 frontend, 3 backend | Large |
| **4** | Reports | 1 frontend, 1 backend | 1 frontend | Medium |
| **5** | Subscriptions | 3 frontend, 2 backend, 2 models | 4 frontend, 2 backend | Large |
| **6** | Platform settings | 1 frontend, 2 backend, 1 model | 2 frontend, many backend | Medium |
| **7** | Niche management | 1 frontend | 1 frontend | Small |

**Total new frontend pages:** ~14
**Total new backend route files:** ~8
**Total new DB models/migrations:** ~5

---

## RECOMMENDED BUILD ORDER

```
Week 1:  Phase 1A + 1B + 1C  (Dashboard + Users — complete the core)
Week 2:  Phase 2              (Activity feed — visibility)
Week 3:  Phase 3              (Disputes — most impactful for trust)
Week 4:  Phase 4              (Reports — business intelligence)
Week 5:  Phase 5              (Subscriptions — revenue model)
Week 6:  Phase 6 + 7          (Settings + Niches — governance)
```
