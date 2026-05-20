# CollaborationDetails.jsx - QA Bug Fixes

## Summary of Fixes

### Bug 1: Remove "Approved Deliverables" language entirely
- Replace with "Live Posts" for NO track
- Replace with proper content review workflow for YES track

### Bug 2 & 3: Differentiate YES and NO tracks completely

**YES Track (requires_content_review = true)**:
- Creator: Submit drafts → Wait for approval → Post live → Submit URLs
- Brand: Review drafts → Approve → Wait for URLs → Mark complete

**NO Track (requires_content_review = false)**:
- Creator: Post directly → Submit URLs
- Brand: Wait for URLs → Review → Mark complete

### Bug 4: Show Collaboration Details on BOTH sides
- Currently only shown to creator
- Must be visible to brand as well for reference

## Implementation Strategy

Replace the entire "Approved Deliverables" section (lines 597-707) with conditional rendering:

```javascript
{/* Content Review YES: Show Draft/Approved workflow */}
{collaboration.requires_content_review && (
  // Draft deliverables section (already exists)
  // Approved deliverables with review process
)}

{/* Content Review NO: Simple live posts workflow */}
{!collaboration.requires_content_review && (
  // Simple status prompt per side
  // Creator: "Post live and submit URLs"
  // Brand: "Waiting for creator to submit URLs"
  // Live posts list with URL input
)}
```

## Files to modify:
1. CollaborationDetails.jsx - Main fix
