# Campaign System Terminology Guide

## Overview
This guide clarifies the different terminology used for brands vs creators in the campaign system.

---

## Brand Side (Business Perspective)

### Terminology:
- **Campaign** - A brand initiative to work with creators
- **Create Campaign** - Action to start a new campaign
- **Campaign Dashboard** - View and manage campaigns
- **Campaign Details** - Full information about a campaign
- **Applications** - Creator proposals to work on campaigns
- **Review Applications** - View and evaluate creator proposals
- **Accept Application** - Approve a creator's proposal

### Pages:
- `Campaigns.jsx` - Dashboard to manage campaigns
- `CampaignForm.jsx` - Form to create/edit campaigns
- `CampaignDetails.jsx` - View campaign with applications tab

### Navigation:
```
Brand Dashboard
└── Campaigns
    ├── Create Campaign
    ├── My Campaigns
    └── Campaign Details
        ├── Overview
        ├── Applications (review and accept)
        └── Packages
```

---

## Creator Side (Opportunity Perspective)

### Terminology:
- **Opportunity** - A brand collaboration available to apply to
- **Browse Opportunities** - Discover available brand campaigns
- **Opportunity Details** - Full information about an opportunity
- **Apply to Opportunity** - Submit a proposal
- **My Applications** - Track submitted proposals
- **Application Status** - Current state (pending, accepted, etc.)

### Pages:
- `Opportunities.jsx` - Browse available opportunities
- `OpportunityDetails.jsx` - View details and apply
- `MyApplications.jsx` - Track application status

### Navigation:
```
Creator Dashboard
└── Opportunities
    ├── Browse Opportunities
    ├── Opportunity Details
    │   └── Apply to This Opportunity
    └── My Applications
```

---

## Why Different Terminology?

### User Experience:
- **Brands** think in terms of "campaigns" they're running
- **Creators** think in terms of "opportunities" to earn money

### Examples:

❌ **Bad (Creator View):**
> "Browse Campaigns"
> "Apply to Campaign"

✅ **Good (Creator View):**
> "Browse Opportunities"
> "Apply to Opportunity"

---

## Technical Implementation

### Backend (API Endpoints):
- Endpoints remain `/api/campaigns/*` for consistency
- Database tables use `campaigns`, `campaign_proposals`
- Models are named `Campaign`, `CampaignProposal`

### Frontend (User-Facing):
- Brand pages use "Campaign" terminology
- Creator pages use "Opportunity" terminology
- API services have separate objects: `campaignsAPI` and `opportunitiesAPI`

### Example API Usage:

```javascript
// Brand side - campaigns.jsx
import { campaignsAPI } from '../services/api';

const campaigns = await campaignsAPI.getCampaigns();
const applications = await campaignsAPI.getCampaignProposals(campaignId);
```

```javascript
// Creator side - Opportunities.jsx
import { opportunitiesAPI } from '../services/api';

const opportunities = await opportunitiesAPI.browseOpportunities();
const opportunity = await opportunitiesAPI.getOpportunity(id);
await opportunitiesAPI.applyToOpportunity(id, proposalData);
```

---

## UI Text Examples

### Brand Campaign Dashboard
```
Title: "My Campaigns"
Button: "Create Campaign"
Card: "Campaign: Summer Launch"
Tab: "View Applications"
Action: "Accept Application"
```

### Creator Opportunities Page
```
Title: "Browse Opportunities"
Button: "View Opportunities"
Card: "Opportunity: Summer Launch"
Button: "View Details"
Modal: "Apply to This Opportunity"
```

---

## Status Labels

### Same for Both:
- Pending
- Awaiting Payment
- Accepted
- Rejected
- In Progress
- Completed

### Context Matters:
- Brand sees: "Application Status: Pending"
- Creator sees: "Application Status: Pending"

Both use "application" once they're in the application context.

---

## Key Principles

1. **Marketing Context**: Use "Opportunity" for discovery (creator browsing)
2. **Application Context**: Use "Application" once they've applied (both sides)
3. **Management Context**: Use "Campaign" for brand management
4. **Consistency**: Be consistent within each user type's experience
5. **Natural Language**: Match how users naturally think about these concepts

---

**Remember:** The goal is to make each user type feel like the platform speaks their language!
