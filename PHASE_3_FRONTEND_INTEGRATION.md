# Phase 3: Frontend Integration - Implementation Guide

## Date: 2026-04-20

## Status: 🚧 IN PROGRESS - Core Components Complete

---

## Overview

Phase 3 adds the user-facing subscription enforcement experience. Users will see their limits, receive upgrade prompts when they hit restrictions, and have a smooth path to upgrading their plans.

---

## Components Created ✅

### 1. UpgradeModal Component ✅
**File**: [frontend/src/components/UpgradeModal.jsx](frontend/src/components/UpgradeModal.jsx)

Beautiful modal that appears when users hit subscription limits.

**Features**:
- Plan comparison table (Current vs. Recommended)
- Feature-by-feature breakdown with icons
- Pricing display with savings highlights
- Direct upgrade navigation
- User-friendly messaging

**Props**:
```javascript
<UpgradeModal
  isOpen={boolean}
  onClose={function}
  upgradePrompt={object}  // From 403 error response
  userType="creator"|"brand"
/>
```

**Usage Example**:
```javascript
import UpgradeModal from '../components/UpgradeModal';

const [showModal, setShowModal] = useState(false);
const [upgradeData, setUpgradeData] = useState(null);

// When 403 error occurs
if (error.response?.data?.upgrade_prompt) {
  setUpgradeData(error.response.data.upgrade_prompt);
  setShowModal(true);
}

<UpgradeModal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  upgradePrompt={upgradeData}
  userType={user.user_type}
/>
```

---

### 2. UsageBadge Component ✅
**File**: [frontend/src/components/UsageBadge.jsx](frontend/src/components/UsageBadge.jsx)

Reusable badge component to show usage limits throughout the app.

**Features**:
- Color-coded status (green → orange → yellow → red)
- Progress bar visualization
- Monthly reset date display
- Unlimited plan support
- Warning icon when approaching limit

**Props**:
```javascript
<UsageBadge
  current={3}
  limit={10}
  label="Active Collaborations"
  resetDate="2026-05-01"  // Optional, for monthly limits
  className="mb-4"  // Optional styling
/>
```

**Visual States**:
- Green (0-60%): Healthy usage
- Orange (60-80%): Moderate usage
- Yellow (80-100%): Approaching limit
- Red (100%+): Limit reached
- Purple: Unlimited plan

**Usage Example**:
```javascript
import UsageBadge from '../components/UsageBadge';

// In dashboard
<div className="grid grid-cols-2 gap-4">
  <UsageBadge
    current={3}
    limit={10}
    label="Collaborations"
  />
  <UsageBadge
    current={12}
    limit={20}
    label="Proposals This Month"
    resetDate="2026-05-01"
  />
</div>
```

---

### 3. SubscriptionContext ✅
**File**: [frontend/src/contexts/SubscriptionContext.jsx](frontend/src/contexts/SubscriptionContext.jsx)

Global state management for subscription data and upgrade prompts.

**Features**:
- Fetches subscription data on mount
- Provides `handle403Error()` for global error handling
- Manages upgrade modal state
- Exposes subscription and usage data

**API**:
```javascript
const {
  subscriptionData,       // Current subscription info
  usageData,             // Usage stats (needs fetch)
  upgradePrompt,         // Current upgrade prompt
  showUpgradeModal,      // Modal visibility state
  showUpgradePrompt,     // Function to show modal
  hideUpgradeModal,      // Function to hide modal
  handle403Error,        // Global error handler
  fetchSubscriptionData, // Refresh subscription
  fetchUsageData,        // Fetch usage stats
  refreshSubscription    // Alias for fetchSubscriptionData
} = useSubscription();
```

**Usage in Components**:
```javascript
import { useSubscription } from '../contexts/SubscriptionContext';

function MyComponent() {
  const { handle403Error, subscriptionData } = useSubscription();

  const handleAction = async () => {
    try {
      await api.post('/collaborations/123/accept');
    } catch (error) {
      if (handle403Error(error)) {
        // Upgrade modal shown automatically
        return;
      }
      // Handle other errors
      toast.error(error.message);
    }
  };

  return (
    <div>
      <p>Current Plan: {subscriptionData?.subscription?.plan?.name}</p>
      <button onClick={handleAction}>Accept Collaboration</button>
    </div>
  );
}
```

---

### 4. SubscriptionWrapper Component ✅
**File**: [frontend/src/components/SubscriptionWrapper.jsx](frontend/src/components/SubscriptionWrapper.jsx)

Wrapper component that renders the UpgradeModal globally.

**Purpose**: Ensures upgrade modal is available app-wide without repeating code.

**Integration**: Should wrap the main App component or routes.

---

## Integration Steps (TODO)

### Step 1: Wrap App with Subscription Provider

**File to Modify**: `frontend/src/App.jsx` or `frontend/src/main.jsx`

```javascript
import { SubscriptionProvider } from './contexts/SubscriptionContext';
import SubscriptionWrapper from './components/SubscriptionWrapper';

function App() {
  return (
    <AuthProvider>
      <SubscriptionProvider>
        <SubscriptionWrapper>
          <Routes>
            {/* Your routes */}
          </Routes>
        </SubscriptionWrapper>
      </SubscriptionProvider>
    </AuthProvider>
  );
}
```

---

### Step 2: Add Usage Indicators to Dashboards

#### Creator Dashboard
**File**: `frontend/src/pages/CreatorDashboard.jsx` or similar

```javascript
import UsageBadge from '../components/UsageBadge';
import { useSubscription } from '../contexts/SubscriptionContext';

function CreatorDashboard() {
  const { subscriptionData, fetchUsageData } = useSubscription();
  const [usage, setUsage] = useState(null);

  useEffect(() => {
    fetchUsageData().then(setUsage);
  }, []);

  const plan = subscriptionData?.subscription?.plan;

  return (
    <div>
      {/* Subscription Status Card */}
      <div className="bg-white rounded-lg p-6 shadow-sm mb-6">
        <h3 className="text-lg font-bold mb-4">Your Subscription</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <UsageBadge
            current={usage?.active_collaborations || 0}
            limit={plan?.max_active_collaborations || 3}
            label="Collaborations"
          />
          <UsageBadge
            current={usage?.proposals_sent || 0}
            limit={plan?.max_bookings_per_month || 5}
            label="Proposals"
            resetDate={usage?.month_ends_at}
          />
          <UsageBadge
            current={usage?.packages_count || 0}
            limit={plan?.max_packages || 3}
            label="Packages"
          />
          <div className="text-center">
            <p className="text-sm text-gray-600">Commission</p>
            <p className="text-2xl font-bold text-primary">
              {plan?.platform_fee_percentage || 15}%
            </p>
          </div>
        </div>
      </div>

      {/* Rest of dashboard */}
    </div>
  );
}
```

#### Brand Dashboard
**File**: `frontend/src/pages/BrandDashboard.jsx` or similar

```javascript
<UsageBadge
  current={usage?.campaigns_created || 0}
  limit={plan?.max_active_campaigns || 2}
  label="Campaigns"
  resetDate={usage?.month_ends_at}
/>
<UsageBadge
  current={usage?.active_collaborations || 0}
  limit={plan?.max_active_collaborations || 5}
  label="Collaborations"
/>
```

---

### Step 3: Integrate 403 Error Handling in Forms

#### Example: Accept Collaboration
**File**: `frontend/src/components/CollaborationResponseModal.jsx` or similar

```javascript
import { useSubscription } from '../contexts/SubscriptionContext';

function AcceptCollaborationButton({ collaborationId }) {
  const { handle403Error } = useSubscription();
  const [loading, setLoading] = useState(false);

  const handleAccept = async () => {
    setLoading(true);
    try {
      await api.post(`/collaborations/${collaborationId}/accept`);
      toast.success('Collaboration accepted!');
      // Refresh data...
    } catch (error) {
      if (handle403Error(error)) {
        // Upgrade modal shown automatically
        return;
      }
      toast.error(error.response?.data?.error || 'Failed to accept collaboration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={handleAccept} disabled={loading}>
      {loading ? 'Processing...' : 'Accept Collaboration'}
    </button>
  );
}
```

#### Example: Create Proposal
**File**: Wherever proposals are created (form submission)

```javascript
const handleSubmitProposal = async (formData) => {
  try {
    await proposalsAPI.createProposal(formData);
    toast.success('Proposal submitted successfully!');
    navigate('/proposals');
  } catch (error) {
    if (handle403Error(error)) {
      return; // Upgrade modal shown
    }
    toast.error(error.response?.data?.error || 'Failed to submit proposal');
  }
};
```

#### Example: Create Package
**File**: Package creation form

```javascript
const handleCreatePackage = async (packageData) => {
  try {
    await packagesAPI.createPackage(packageData);
    toast.success('Package created successfully!');
  } catch (error) {
    if (handle403Error(error)) {
      return; // Upgrade modal shown
    }
    toast.error(error.response?.data?.error || 'Failed to create package');
  }
};
```

#### Example: Create Campaign
**File**: Campaign creation form

```javascript
const handleCreateCampaign = async (campaignData) => {
  try {
    await campaignsAPI.createCampaign(campaignData);
    toast.success('Campaign created successfully!');
  } catch (error) {
    if (handle403Error(error)) {
      return; // Upgrade modal shown
    }
    toast.error(error.response?.data?.error || 'Failed to create campaign');
  }
};
```

---

## Key Files to Modify (Summary)

### 1. App Entry Point
- `frontend/src/App.jsx` or `frontend/src/main.jsx`
- Add `SubscriptionProvider` and `SubscriptionWrapper`

### 2. Dashboards
- `frontend/src/pages/CreatorDashboard.jsx` - Add usage badges
- `frontend/src/pages/BrandDashboard.jsx` - Add usage badges

### 3. Forms/Actions
- Collaboration accept buttons - Add `handle403Error`
- Proposal creation forms - Add `handle403Error`
- Package creation forms - Add `handle403Error`
- Campaign creation forms - Add `handle403Error`

---

## Testing Checklist

### Component Testing

- [ ] **UpgradeModal** renders correctly
  - [ ] Shows current plan details
  - [ ] Shows next plan details
  - [ ] Comparison table displays properly
  - [ ] "Upgrade" button navigates to subscriptions page
  - [ ] "Maybe Later" button closes modal

- [ ] **UsageBadge** displays correctly
  - [ ] Shows correct color for different usage levels
  - [ ] Progress bar animates smoothly
  - [ ] Reset date formats correctly
  - [ ] Unlimited plans show properly

- [ ] **SubscriptionContext** works globally
  - [ ] Fetches subscription data on mount
  - [ ] `handle403Error()` detects subscription errors
  - [ ] Upgrade modal appears when 403 occurs
  - [ ] Multiple components can access context

### Integration Testing

- [ ] **Accept Collaboration**
  - [ ] With Free plan, accept 3 collaborations successfully
  - [ ] Attempt 4th collaboration, upgrade modal appears
  - [ ] Modal shows correct plan comparison
  - [ ] Clicking upgrade navigates to subscriptions page

- [ ] **Send Proposal**
  - [ ] With Free plan, send 5 proposals successfully
  - [ ] Attempt 6th proposal, upgrade modal appears
  - [ ] Reset date shown correctly

- [ ] **Create Package**
  - [ ] With Free plan, create 3 packages successfully
  - [ ] Attempt 4th package, upgrade modal appears

- [ ] **Create Campaign (Brand)**
  - [ ] With Free plan, create 2 campaigns successfully
  - [ ] Attempt 3rd campaign, upgrade modal appears

### Dashboard Testing

- [ ] **Creator Dashboard**
  - [ ] Usage badges display current stats
  - [ ] Colors update based on usage
  - [ ] Commission percentage shown correctly
  - [ ] Reset dates for monthly limits visible

- [ ] **Brand Dashboard**
  - [ ] Campaign usage shown correctly
  - [ ] Collaboration usage shown correctly
  - [ ] Service fee percentage displayed

---

## User Experience Flow

1. **User performs action** (e.g., Accept Collaboration)
2. **Backend checks subscription** via enforcement service
3. **If limit reached**: 403 error with upgrade_prompt
4. **Frontend intercepts**: `handle403Error()` catches it
5. **Modal appears**: Beautiful upgrade prompt shown
6. **User upgrades**: Clicks "Upgrade to [Plan]"
7. **Navigation**: Redirected to subscriptions page
8. **Payment flow**: Existing subscription payment process
9. **Success**: User can now perform action

---

## Deployment Checklist

- [ ] Create deployment tarball with new components
- [ ] Upload to production server
- [ ] Extract in frontend directory
- [ ] Run `npm run build`
- [ ] Verify build completes without errors
- [ ] Deploy built assets
- [ ] Test on production environment
- [ ] Monitor for errors in browser console

---

## Next Steps

### Remaining Work:

1. **App.jsx Integration** (5 minutes)
   - Wrap with SubscriptionProvider
   - Add SubscriptionWrapper

2. **Dashboard Updates** (30-45 minutes)
   - Creator dashboard usage badges
   - Brand dashboard usage badges
   - Fetch and display usage data

3. **Form Integration** (60-90 minutes)
   - Add handle403Error to 4 critical actions
   - Test each action thoroughly
   - Ensure error messages are user-friendly

4. **Optional Enhancements** (if time permits)
   - Proactive warnings ("You have 1 proposal left")
   - Tooltips explaining features
   - Celebration animation on upgrade
   - Usage trends/charts

### Estimated Total Time:
- **Core Integration**: 1.5-2 hours
- **Testing**: 1 hour
- **Deployment**: 30 minutes

**Total**: 3-3.5 hours to complete Phase 3

---

## Success Criteria

Phase 3 is complete when:

1. ✅ Users see usage badges on dashboards
2. ✅ Users get upgrade prompts when hitting limits
3. ✅ Upgrade modal shows clear plan comparisons
4. ✅ Users can seamlessly upgrade from modal
5. ✅ All 4 critical actions have enforcement
6. ✅ No console errors in production
7. ✅ Smooth user experience from limit → upgrade

---

## Related Documentation

- [Phase 1 Implementation](SUBSCRIPTION_PHASE2_SUMMARY.md) - Backend foundation
- [Phase 2 Deployment](SUBSCRIPTION_PHASE2_DEPLOYMENT.md) - Endpoint protection
- [UpgradeModal Component](frontend/src/components/UpgradeModal.jsx)
- [UsageBadge Component](frontend/src/components/UsageBadge.jsx)
- [SubscriptionContext](frontend/src/contexts/SubscriptionContext.jsx)

---

## Notes for Deployment

When you're ready to deploy, I'll:
1. Find and modify `App.jsx` to add providers
2. Create a simple dashboard integration example
3. Add `handle403Error` to one critical form as a template
4. Create deployment tarball
5. Deploy to production
6. Verify everything works

Just say "deploy phase 3" when you're ready!
