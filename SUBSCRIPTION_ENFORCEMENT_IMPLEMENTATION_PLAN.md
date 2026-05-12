# Subscription Enforcement Implementation Plan

## Date: 2026-04-20

## Overview

This document outlines the complete implementation plan for enforcing subscription restrictions and limits across the BantuBuzz platform for both Creators and Brands.

---

## Current Subscription Plans

### Creator Plans (Based on subscription_plan.py model)

| Feature | Free Creator | Rising Creator | Pro Creator |
|---------|--------------|----------------|-------------|
| **Price** | $0/month | ~$10-15/month | ~$25-35/month |
| **Commission** | 15% | 10% | 7% |
| **Max Active Collaborations** | 3 | 10 | Unlimited |
| **Max Proposals/Month** | 5 | 20 | Unlimited |
| **Max Packages** | 3 | 5 | 10 |
| **Max Bookings/Month** | 5 | 20 | Unlimited |
| **Max Portfolio Items** | 10 | 20 | 50 |
| **Analytics Access** | Basic | Advanced | Advanced |
| **Priority Support** | No | No | Yes |
| **Verified Badge** | No | No | Yes |
| **Search Priority** | 0 (Normal) | 1 (Boosted) | 2 (Priority) |
| **Can Message Brands First** | No | No | Yes |
| **Can Access Briefs** | Yes | Yes | Yes |
| **Can Access Campaigns** | Limited | Yes | Yes |

### Brand Plans (Based on subscription_plan.py model)

| Feature | Free Brand | Business Brand | Enterprise Brand |
|---------|------------|----------------|------------------|
| **Price** | $0/month | ~$50-100/month | ~$200-500/month |
| **Service Fee** | 12% | 8% | 5% |
| **Max Active Campaigns** | 2 | 10 | Unlimited |
| **Max Active Collaborations** | 5 | 20 | Unlimited |
| **Max Team Members** | 1 | 5 | Unlimited |
| **Max Creator Lists** | 3 | 10 | Unlimited |
| **Max Client Workspaces** | 0 | 0 | 10 |
| **Analytics Access** | Basic | Advanced | Advanced |
| **Priority Support** | No | Yes | Yes |
| **Dedicated Manager** | No | No | Yes |
| **API Access** | No | No | Yes |
| **Custom Branding** | No | No | Yes |

---

## Phase 1: Backend Middleware & Service Layer

### 1.1 Create Subscription Service (`subscription_enforcement_service.py`)

**Purpose**: Centralized service to check subscription limits and permissions

**Location**: `backend/app/services/subscription_enforcement_service.py`

**Key Methods**:

```python
class SubscriptionEnforcementService:
    # Creator Enforcement
    @staticmethod
    def can_create_collaboration(creator_user_id: int) -> tuple[bool, str, dict]:
        """
        Check if creator can accept new collaboration
        Returns: (can_proceed, error_message, current_usage)
        """

    @staticmethod
    def can_send_proposal(creator_user_id: int) -> tuple[bool, str, dict]:
        """
        Check if creator can send proposal this month
        Returns: (can_proceed, error_message, current_usage)
        """

    @staticmethod
    def can_create_package(creator_user_id: int) -> tuple[bool, str, dict]:
        """
        Check if creator can create new package
        Returns: (can_proceed, error_message, current_usage)
        """

    @staticmethod
    def can_add_portfolio_item(creator_user_id: int) -> tuple[bool, str, dict]:
        """
        Check if creator can add portfolio item
        Returns: (can_proceed, error_message, current_usage)
        """

    @staticmethod
    def can_message_brand_first(creator_user_id: int, brand_user_id: int) -> tuple[bool, str, dict]:
        """
        Check if creator can initiate DM with brand
        Returns: (can_proceed, error_message, subscription_info)
        """

    # Brand Enforcement
    @staticmethod
    def can_create_campaign(brand_user_id: int) -> tuple[bool, str, dict]:
        """
        Check if brand can create new campaign
        Returns: (can_proceed, error_message, current_usage)
        """

    @staticmethod
    def can_create_collaboration(brand_user_id: int) -> tuple[bool, str, dict]:
        """
        Check if brand can initiate new collaboration
        Returns: (can_proceed, error_message, current_usage)
        """

    @staticmethod
    def can_add_team_member(brand_user_id: int) -> tuple[bool, str, dict]:
        """
        Check if brand can add team member
        Returns: (can_proceed, error_message, current_usage)
        """

    @staticmethod
    def can_create_creator_list(brand_user_id: int) -> tuple[bool, str, dict]:
        """
        Check if brand can create saved creator list
        Returns: (can_proceed, error_message, current_usage)
        """

    @staticmethod
    def can_create_client_workspace(brand_user_id: int) -> tuple[bool, str, dict]:
        """
        Check if brand can create client workspace (agencies only)
        Returns: (can_proceed, error_message, current_usage)
        """

    # Helper Methods
    @staticmethod
    def get_current_usage(user_id: int, user_type: str) -> dict:
        """
        Get current usage stats for user
        Returns: dictionary with all relevant counts
        """

    @staticmethod
    def get_upgrade_prompt(user_id: int, user_type: str, feature: str) -> dict:
        """
        Get upgrade prompt data with next tier benefits
        Returns: upgrade modal content
        """
```

### 1.2 Create Usage Tracking Tables

**New Database Tables**:

```sql
-- Track monthly usage for reset counters
CREATE TABLE subscription_usage (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    month DATE NOT NULL,  -- First day of month
    proposals_sent INTEGER DEFAULT 0,
    bookings_received INTEGER DEFAULT 0,
    campaigns_created INTEGER DEFAULT 0,
    collaborations_initiated INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, month)
);

CREATE INDEX idx_subscription_usage_user_month ON subscription_usage(user_id, month);
```

### 1.3 Update Existing Models

**Add to `Subscription` model** (`backend/app/models/subscription.py`):

```python
def get_restriction(self, key: str):
    """Get a specific restriction value from the plan"""
    if not self.plan:
        return None

    if self.plan.user_type == 'creator':
        restrictions = {
            'max_active_collaborations': self.plan.max_active_collaborations,
            'max_proposals_per_month': self.plan.max_bookings_per_month,
            'max_packages': self.plan.max_packages,
            'max_portfolio_items': self.plan.max_portfolio_items,
            'commission_percentage': self.plan.commission_percentage,
            'can_message_brands_first': self.plan.can_message_brands_first,
            'search_placement_priority': self.plan.search_placement_priority,
        }
    else:  # brand
        restrictions = {
            'max_active_campaigns': self.plan.max_active_campaigns,
            'max_active_collaborations': self.plan.max_active_collaborations,
            'max_team_members': self.plan.max_team_members,
            'max_creator_lists': self.plan.max_creator_lists,
            'max_client_workspaces': self.plan.max_client_workspaces,
            'service_fee_percentage': self.plan.service_fee_percentage,
        }

    return restrictions.get(key)

def is_feature_available(self, feature: str) -> bool:
    """Check if a feature is available on this plan"""
    if not self.plan:
        return False

    feature_map = {
        'analytics': self.plan.analytics_access,
        'advanced_analytics': self.plan.has_advanced_analytics,
        'priority_support': self.plan.priority_support,
        'api_access': self.plan.has_api_access,
        'custom_branding': self.plan.has_custom_branding,
        'dedicated_support': self.plan.has_dedicated_support,
        'priority_listing': self.plan.has_priority_listing,
        'verified_badge': self.plan.has_verified_badge if self.plan.user_type == 'creator' else False,
    }

    return feature_map.get(feature, False)
```

---

## Phase 2: Endpoint Enforcement

### 2.1 Creator Endpoints to Protect

**File**: `backend/app/routes/collaborations.py`

#### 2.1.1 Accept Collaboration Request
```python
@bp.route('/<int:collab_id>/accept', methods=['POST'])
@jwt_required()
def accept_collaboration(collab_id):
    current_user_id = get_jwt_identity()

    # ENFORCE: Check if creator can accept more collaborations
    from app.services.subscription_enforcement_service import SubscriptionEnforcementService

    can_proceed, error_msg, usage = SubscriptionEnforcementService.can_create_collaboration(current_user_id)

    if not can_proceed:
        return jsonify({
            'error': error_msg,
            'current_usage': usage,
            'upgrade_required': True,
            'upgrade_prompt': SubscriptionEnforcementService.get_upgrade_prompt(
                current_user_id, 'creator', 'active_collaborations'
            )
        }), 403

    # ... rest of existing code
```

#### 2.1.2 Send Proposal
```python
@bp.route('/<int:collab_id>/proposals', methods=['POST'])
@jwt_required()
def send_proposal(collab_id):
    current_user_id = get_jwt_identity()

    # ENFORCE: Check monthly proposal limit
    can_proceed, error_msg, usage = SubscriptionEnforcementService.can_send_proposal(current_user_id)

    if not can_proceed:
        return jsonify({
            'error': error_msg,
            'current_usage': usage,
            'resets_at': usage.get('resets_at'),
            'upgrade_required': True
        }), 403

    # ... rest of existing code

    # After successful proposal creation:
    # Increment usage counter
    from app.models.subscription_usage import SubscriptionUsage
    SubscriptionUsage.increment_proposals(current_user_id)
```

#### 2.1.3 Create Package
**File**: `backend/app/routes/creators.py` or `backend/app/routes/packages.py`

```python
@bp.route('/packages', methods=['POST'])
@jwt_required()
def create_package():
    current_user_id = get_jwt_identity()

    # ENFORCE: Check package limit
    can_proceed, error_msg, usage = SubscriptionEnforcementService.can_create_package(current_user_id)

    if not can_proceed:
        return jsonify({
            'error': error_msg,
            'current_usage': usage,
            'upgrade_required': True
        }), 403

    # ... rest of existing code
```

#### 2.1.4 Add Portfolio Item
```python
@bp.route('/portfolio', methods=['POST'])
@jwt_required()
def add_portfolio_item():
    current_user_id = get_jwt_identity()

    # ENFORCE: Check portfolio limit
    can_proceed, error_msg, usage = SubscriptionEnforcementService.can_add_portfolio_item(current_user_id)

    if not can_proceed:
        return jsonify({
            'error': error_msg,
            'current_usage': usage,
            'upgrade_required': True
        }), 403

    # ... rest of existing code
```

### 2.2 Brand Endpoints to Protect

**File**: `backend/app/routes/campaigns.py` or `backend/app/routes/brands.py`

#### 2.2.1 Create Campaign
```python
@bp.route('/campaigns', methods=['POST'])
@jwt_required()
def create_campaign():
    current_user_id = get_jwt_identity()

    # ENFORCE: Check campaign limit
    can_proceed, error_msg, usage = SubscriptionEnforcementService.can_create_campaign(current_user_id)

    if not can_proceed:
        return jsonify({
            'error': error_msg,
            'current_usage': usage,
            'upgrade_required': True,
            'upgrade_prompt': SubscriptionEnforcementService.get_upgrade_prompt(
                current_user_id, 'brand', 'active_campaigns'
            )
        }), 403

    # ... rest of existing code
```

#### 2.2.2 Initiate Collaboration
```python
@bp.route('/collaborations', methods=['POST'])
@jwt_required()
def create_collaboration():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)

    if user.user_type == 'brand':
        # ENFORCE: Check collaboration limit for brands
        can_proceed, error_msg, usage = SubscriptionEnforcementService.can_create_collaboration(current_user_id)

        if not can_proceed:
            return jsonify({
                'error': error_msg,
                'current_usage': usage,
                'upgrade_required': True
            }), 403

    # ... rest of existing code
```

#### 2.2.3 Add Team Member
```python
@bp.route('/team/members', methods=['POST'])
@jwt_required()
def add_team_member():
    current_user_id = get_jwt_identity()

    # ENFORCE: Check team member limit
    can_proceed, error_msg, usage = SubscriptionEnforcementService.can_add_team_member(current_user_id)

    if not can_proceed:
        return jsonify({
            'error': error_msg,
            'current_usage': usage,
            'upgrade_required': True
        }), 403

    # ... rest of existing code
```

### 2.3 Messaging Enforcement

**File**: `backend/app/routes/messages.py`

```python
@bp.route('/conversations', methods=['POST'])
@jwt_required()
def create_conversation():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    recipient_id = request.json.get('recipient_id')
    recipient = User.query.get(recipient_id)

    # If creator trying to message brand first
    if user.user_type == 'creator' and recipient.user_type == 'brand':
        can_proceed, error_msg, _ = SubscriptionEnforcementService.can_message_brand_first(
            current_user_id, recipient_id
        )

        if not can_proceed:
            return jsonify({
                'error': error_msg,
                'feature': 'direct_messaging',
                'upgrade_required': True,
                'upgrade_prompt': SubscriptionEnforcementService.get_upgrade_prompt(
                    current_user_id, 'creator', 'message_brands_first'
                )
            }), 403

    # ... rest of existing code
```

---

## Phase 3: Frontend Upgrade Prompts

### 3.1 Create Upgrade Modal Component

**File**: `frontend/src/components/UpgradeModal.jsx`

```jsx
import { useState } from 'react';
import { XMarkIcon, CheckIcon, SparklesIcon } from '@heroicons/react/24/outline';
import api from '../services/api';

const UpgradeModal = ({ isOpen, onClose, feature, currentPlan, nextPlan, usage }) => {
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const response = await api.post('/subscriptions/upgrade', {
        plan_id: nextPlan.id
      });

      if (response.data.payment_required) {
        // Redirect to payment
        window.location.href = response.data.payment_url;
      } else {
        // Free upgrade (e.g., Free to Rising with promo)
        onClose();
        window.location.reload();
      }
    } catch (error) {
      console.error('Upgrade failed:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <SparklesIcon className="w-7 h-7 text-purple-600" />
              Upgrade to {nextPlan.name}
            </h2>
            <p className="text-gray-600 mt-2">
              You've reached your {currentPlan.name} limit for {feature}.
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Current Usage */}
        {usage && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <p className="text-sm font-medium text-yellow-900">
              Current Usage: {usage.current} / {usage.limit}
            </p>
            {usage.resets_at && (
              <p className="text-sm text-yellow-700 mt-1">
                Resets on {new Date(usage.resets_at).toLocaleDateString()}
              </p>
            )}
          </div>
        )}

        {/* Comparison */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          {/* Current Plan */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3">{currentPlan.name}</h3>
            <p className="text-3xl font-bold text-gray-900 mb-4">
              ${currentPlan.price_monthly}
              <span className="text-sm text-gray-600">/month</span>
            </p>
            <ul className="space-y-2">
              {currentPlan.features.map((feature, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                  <CheckIcon className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          {/* Next Plan */}
          <div className="border-2 border-purple-600 rounded-lg p-4 bg-purple-50">
            <h3 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
              {nextPlan.name}
              <span className="bg-purple-600 text-white text-xs px-2 py-0.5 rounded">
                Recommended
              </span>
            </h3>
            <p className="text-3xl font-bold text-purple-900 mb-4">
              ${nextPlan.price_monthly}
              <span className="text-sm text-purple-700">/month</span>
            </p>
            <ul className="space-y-2">
              {nextPlan.features.map((feature, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-purple-900">
                  <CheckIcon className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Maybe Later
          </button>
          <button
            onClick={handleUpgrade}
            disabled={loading}
            className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            {loading ? 'Processing...' : `Upgrade to ${nextPlan.name}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpgradeModal;
```

### 3.2 Add Upgrade Checks to Forms

**Example - Collaboration Accept Button**:

```jsx
const handleAcceptCollaboration = async (collabId) => {
  try {
    const response = await api.post(`/collaborations/${collabId}/accept`);
    // Success
  } catch (error) {
    if (error.response?.status === 403 && error.response?.data?.upgrade_required) {
      setUpgradeModalData({
        feature: 'Active Collaborations',
        currentPlan: error.response.data.current_plan,
        nextPlan: error.response.data.next_plan,
        usage: error.response.data.current_usage
      });
      setShowUpgradeModal(true);
    } else {
      toast.error(error.response?.data?.error || 'Failed to accept collaboration');
    }
  }
};
```

---

## Phase 4: Admin Management

### 4.1 Create Admin Subscriptions Dashboard

**File**: `frontend/src/pages/admin/AdminSubscriptions.jsx`

**Features**:
- View all subscriptions (creators and brands separately)
- Filter by plan type, status, payment status
- Search by user email/name
- Manually upgrade/downgrade users
- View subscription history
- Generate subscription reports
- Handle subscription issues (refunds, cancellations)

**File**: `backend/app/routes/admin_subscriptions.py`

**New Admin Endpoints**:
```python
GET /api/admin/subscriptions - List all subscriptions with filters
GET /api/admin/subscriptions/<id> - Get subscription details
POST /api/admin/subscriptions/<id>/upgrade - Manually upgrade user
POST /api/admin/subscriptions/<id>/downgrade - Manually downgrade user
POST /api/admin/subscriptions/<id>/cancel - Cancel subscription
POST /api/admin/subscriptions/<id>/refund - Process refund
GET /api/admin/subscriptions/stats - Get subscription statistics
GET /api/admin/subscriptions/export - Export subscription data
```

---

## Phase 5: Migration Strategy

### 5.1 Assign Free Plans to Existing Users

**Migration Script**: `backend/migrate_existing_users_to_free_plan.py`

```python
from app import create_app, db
from app.models import User, Subscription, SubscriptionPlan
from datetime import datetime

app = create_app()

with app.app_context():
    # Get Free plans
    free_creator_plan = SubscriptionPlan.query.filter_by(
        slug='free-creator'
    ).first()

    free_brand_plan = SubscriptionPlan.query.filter_by(
        slug='free-brand'
    ).first()

    # Get all users without subscriptions
    creators_without_sub = User.query.filter_by(
        user_type='creator'
    ).outerjoin(Subscription).filter(
        Subscription.id == None
    ).all()

    brands_without_sub = User.query.filter_by(
        user_type='brand'
    ).outerjoin(Subscription).filter(
        Subscription.id == None
    ).all()

    # Assign Free Creator plan
    for user in creators_without_sub:
        subscription = Subscription(
            user_id=user.id,
            plan_id=free_creator_plan.id,
            status='active',
            start_date=datetime.utcnow()
        )
        db.session.add(subscription)

    # Assign Free Brand plan
    for user in brands_without_sub:
        subscription = Subscription(
            user_id=user.id,
            plan_id=free_brand_plan.id,
            status='active',
            start_date=datetime.utcnow()
        )
        db.session.add(subscription)

    db.session.commit()

    print(f'Assigned Free plan to {len(creators_without_sub)} creators')
    print(f'Assigned Free plan to {len(brands_without_sub)} brands')
```

### 5.2 Send Notification Emails

**Email Template**: Welcome to BantuBuzz Subscriptions

```
Subject: Important: BantuBuzz Subscription Plans are Live!

Hi [User Name],

We're excited to announce that BantuBuzz now has subscription plans with amazing features!

🎉 Good News: You've been automatically enrolled in our Free [Creator/Brand] plan at no cost.

Your Free Plan Includes:
- [List of free plan features]

Want to unlock more features? Upgrade to [Next Plan] and get:
- [List of upgrade benefits]

[View Plans Button]

Questions? Reply to this email or visit our Help Center.

Best regards,
The BantuBuzz Team
```

---

## Implementation Phases Summary

### Phase 1: Backend Foundation (Week 1)
- ✅ Create `SubscriptionEnforcementService`
- ✅ Create `SubscriptionUsage` model
- ✅ Add helper methods to `Subscription` model
- ✅ Write unit tests

### Phase 2: Endpoint Protection (Week 2)
- ⏳ Add enforcement to creator endpoints
- ⏳ Add enforcement to brand endpoints
- ⏳ Add enforcement to messaging
- ⏳ Test all protected endpoints

### Phase 3: Frontend Integration (Week 3)
- ⏳ Create `UpgradeModal` component
- ⏳ Add upgrade checks to all forms
- ⏳ Add usage indicators to dashboards
- ⏳ Test user experience flow

### Phase 4: Admin Dashboard (Week 4)
- ⏳ Create admin subscriptions page
- ⏳ Add subscription management endpoints
- ⏳ Add subscription statistics
- ⏳ Test admin workflows

### Phase 5: Migration & Launch (Week 5)
- ⏳ Run migration script
- ⏳ Send notification emails
- ⏳ Monitor for issues
- ⏳ Gather user feedback

---

## Testing Checklist

### Creator Testing
- [ ] Cannot accept collaboration beyond limit
- [ ] Cannot send proposal beyond monthly limit
- [ ] Cannot create package beyond limit
- [ ] Cannot add portfolio item beyond limit
- [ ] Cannot message brand first (Free plan)
- [ ] Upgrade modal appears correctly
- [ ] After upgrade, limits are increased
- [ ] Monthly limits reset correctly

### Brand Testing
- [ ] Cannot create campaign beyond limit
- [ ] Cannot initiate collaboration beyond limit
- [ ] Cannot add team member beyond limit
- [ ] Cannot create creator list beyond limit
- [ ] Upgrade modal appears correctly
- [ ] After upgrade, limits are increased

### Admin Testing
- [ ] Can view all subscriptions
- [ ] Can manually upgrade users
- [ ] Can cancel subscriptions
- [ ] Statistics are accurate
- [ ] Export works correctly

---

## Success Metrics

- 100% of users assigned to a plan
- 0 subscription bypass bugs
- <2% false positive limit blocks
- >20% upgrade conversion rate
- <5% support tickets related to limits

---

## Next Steps

1. Review and approve this plan
2. Create detailed task breakdown
3. Set up development environment
4. Begin Phase 1 implementation
5. Schedule code reviews at each phase

