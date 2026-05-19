# Frontend Collaboration Details - Implementation TODO

**Status**: Backend Phase 1 & 2 Complete ✅
**Next**: Frontend Phase 3

---

## What's Done

✅ **Backend**:
- Database fields added to Collaboration model
- Migration script created
- `/cart/checkout` endpoint accepts collaboration_details
- Validation for required fields (brief, guidelines)
- Collaboration creation includes new fields

---

## Frontend Changes Needed

### File: `frontend/src/pages/CartCheckout.jsx`

#### 1. Add State Variables (after line 35)

```javascript
// Collaboration details state
const [requiresContentReview, setRequiresContentReview] = useState(true);
const [collaborationBrief, setCollaborationBrief] = useState('');
const [collaborationGuidelines, setCollaborationGuidelines] = useState('');
const [collaborationRules, setCollaborationRules] = useState('');
const [collaborationNotes, setCollaborationNotes] = useState('');
```

#### 2. Add Validation Function

```javascript
const validateCollaborationDetails = () => {
  if (!collaborationBrief.trim()) {
    toast.error('Please describe what you want the creator to do');
    return false;
  }
  if (!collaborationGuidelines.trim()) {
    toast.error('Please provide brief and guidelines');
    return false;
  }
  return true;
};
```

#### 3. Update handleWalletPayment (line 154)

Add validation and include collaboration details:

```javascript
const handleWalletPayment = async () => {
  // Validate collaboration details first
  if (!validateCollaborationDetails()) {
    return;
  }

  if (walletBalance < totalAmount) {
    toast.error('Insufficient wallet balance');
    return;
  }

  setCheckoutLoading(true);
  try {
    const packageIds = cartItems.map((item) => item.package_id);

    // Include collaboration details in request
    const response = await bookingsAPI.cartPayWithWallet({
      package_ids: packageIds,
      requires_content_review: requiresContentReview,
      collaboration_details: {
        brief: collaborationBrief,
        guidelines: collaborationGuidelines,
        rules: collaborationRules,
        additional_notes: collaborationNotes
      }
    });

    // ... rest of code
  }
};
```

#### 4. Update SmilePay Modal (line 520)

Pass collaboration details to modal:

```javascript
<SmilePayPaymentModal
  isOpen={showSmilePayModal}
  onClose={() => setShowSmilePayModal(false)}
  amount={totalAmount}
  currency="USD"
  paymentType="cart_checkout"
  paymentId={checkoutData?.booking_ids?.join(',') || 'cart'}
  itemName="Cart Checkout"
  itemDescription={`${packageCount} package${packageCount !== 1 ? 's' : ''}`}
  onSuccess={handleSmilePaySuccess}
  returnUrl={`${window.location.origin}/brand/bookings`}
  resultUrl={`${window.location.origin}/api/payments/smilepay/webhook/callback`}
  // NEW: Pass collaboration details
  collaborationDetails={{
    requires_content_review: requiresContentReview,
    brief: collaborationBrief,
    guidelines: collaborationGuidelines,
    rules: collaborationRules,
    additional_notes: collaborationNotes
  }}
/>
```

#### 5. Add UI Section (INSERT after line 293, before "Payment Section")

```jsx
{/* Collaboration Details Section */}
<div className="lg:col-span-5 mb-6">
  <div className="bg-white rounded-3xl shadow-sm p-6">
    <h2 className="text-xl font-bold text-dark mb-2">Collaboration Details</h2>
    <p className="text-sm text-gray-600 mb-5">
      Provide instructions for the creators. They will see this immediately when the collaboration starts.
    </p>

    {/* Content Review Selection */}
    <div className="mb-6 pb-6 border-b border-gray-200">
      <h3 className="font-semibold text-dark mb-3">Content Review</h3>
      <p className="text-sm text-gray-600 mb-4">
        Would you like to review content before it's posted?
      </p>

      <div className="space-y-3">
        {/* Yes - Review Before Posting */}
        <label className="flex items-start gap-3 p-4 border-2 rounded-2xl cursor-pointer hover:border-primary/50 transition-colors"
          style={{ borderColor: requiresContentReview ? '#c8ff09' : '#e5e7eb' }}
        >
          <input
            type="radio"
            name="contentReview"
            checked={requiresContentReview === true}
            onChange={() => setRequiresContentReview(true)}
            className="mt-1"
          />
          <div>
            <p className="font-semibold text-dark">Yes</p>
            <p className="text-sm text-gray-600 mt-1">
              I want to review content before it goes live.
            </p>
            <ul className="text-xs text-gray-500 mt-2 space-y-1 ml-4 list-disc">
              <li>Creator submits content for review</li>
              <li>You review — Looks Good or Request Revision</li>
              <li>Creator posts live, submits URL, syncs metrics</li>
              <li>You mark collaboration complete</li>
            </ul>
          </div>
        </label>

        {/* No - Trust Creator */}
        <label className="flex items-start gap-3 p-4 border-2 rounded-2xl cursor-pointer hover:border-primary/50 transition-colors"
          style={{ borderColor: !requiresContentReview ? '#c8ff09' : '#e5e7eb' }}
        >
          <input
            type="radio"
            name="contentReview"
            checked={requiresContentReview === false}
            onChange={() => setRequiresContentReview(false)}
            className="mt-1"
          />
          <div>
            <p className="font-semibold text-dark">No</p>
            <p className="text-sm text-gray-600 mt-1">
              I trust this creator to follow the brief and guidelines.
            </p>
            <ul className="text-xs text-gray-500 mt-2 space-y-1 ml-4 list-disc">
              <li>Creator posts live directly</li>
              <li>Submits URL and syncs metrics</li>
              <li>You mark collaboration complete</li>
            </ul>
          </div>
        </label>
      </div>

      <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-2xl">
        <p className="text-xs text-yellow-900">
          <strong>Note:</strong> Selection is locked when the collaboration activates.
        </p>
      </div>
    </div>

    {/* Brief & Guidelines Form */}
    <div className="space-y-4">
      {/* What do you want the creator to do? - Required */}
      <div>
        <label className="block text-sm font-medium text-dark mb-2">
          What do you want the creator to do? <span className="text-red-500">*</span>
        </label>
        <textarea
          value={collaborationBrief}
          onChange={(e) => setCollaborationBrief(e.target.value)}
          placeholder="Describe what you want the creator to do in this collaboration..."
          className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent min-h-[100px] resize-y"
          required
        />
        <p className="text-xs text-gray-500 mt-1">
          Be specific about the deliverables, format, and expectations
        </p>
      </div>

      {/* Brief & Guidelines - Required */}
      <div>
        <label className="block text-sm font-medium text-dark mb-2">
          Brief &amp; Guidelines <span className="text-red-500">*</span>
        </label>
        <textarea
          value={collaborationGuidelines}
          onChange={(e) => setCollaborationGuidelines(e.target.value)}
          placeholder="Key messages, tone, dos and don'ts, hashtags, tags, links..."
          className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent min-h-[120px] resize-y"
          required
        />
        <p className="text-xs text-gray-500 mt-1">
          Include brand guidelines, tone of voice, required hashtags/mentions
        </p>
      </div>

      {/* Rules & Expectations - Optional */}
      <div>
        <label className="block text-sm font-medium text-dark mb-2">
          Rules &amp; Expectations <span className="text-gray-400">(Optional)</span>
        </label>
        <textarea
          value={collaborationRules}
          onChange={(e) => setCollaborationRules(e.target.value)}
          placeholder="Deadlines, format, dimensions, compliance requirements..."
          className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent min-h-[80px] resize-y"
        />
      </div>

      {/* Additional Notes - Optional */}
      <div>
        <label className="block text-sm font-medium text-dark mb-2">
          Additional Notes <span className="text-gray-400">(Optional)</span>
        </label>
        <textarea
          value={collaborationNotes}
          onChange={(e) => setCollaborationNotes(e.target.value)}
          placeholder="Anything else the creator should know..."
          className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent min-h-[80px] resize-y"
        />
      </div>
    </div>
  </div>
</div>
```

---

## File: `frontend/src/services/api.js`

### Update bookingsAPI

```javascript
export const bookingsAPI = {
  // ... existing methods ...

  // Update cartPayWithWallet to accept collaboration details
  cartPayWithWallet: (data) => api.post('/bookings/cart/pay-with-wallet', data),

  // If you have cartCheckout for Paynow/SmilePay
  cartCheckout: (data) => api.post('/bookings/cart/checkout', data),
};
```

---

## File: `frontend/src/components/SmilePayPaymentModal.jsx`

### Update to accept and pass collaboration details

1. Add to props:
```javascript
const SmilePayPaymentModal = ({
  // ... existing props ...
  collaborationDetails, // NEW
}) => {
```

2. When calling backend API (wherever cart checkout is initiated), include:
```javascript
const paymentData = {
  package_ids: packageIds,
  requires_content_review: collaborationDetails.requires_content_review,
  collaboration_details: {
    brief: collaborationDetails.brief,
    guidelines: collaborationDetails.guidelines,
    rules: collaborationDetails.rules,
    additional_notes: collaborationDetails.additional_notes
  },
  // ... other payment data
};
```

---

## Testing Checklist

After implementing above:

- [ ] Form displays on cart checkout page
- [ ] Content review radio buttons work (Yes/No)
- [ ] All 4 text fields work (2 required, 2 optional)
- [ ] Validation prevents checkout without brief/guidelines
- [ ] Wallet payment includes collaboration details
- [ ] SmilePay payment includes collaboration details
- [ ] Bank transfer flow includes collaboration details
- [ ] Data persists to backend correctly
- [ ] Collaboration created with correct fields after payment
- [ ] Creator sees brief in CollaborationDetails page

---

## Estimated Time

- State & validation: 30 mins
- UI section: 1 hour
- Integration with payment methods: 1 hour
- Testing: 30 mins

**Total**: ~3 hours

---

**Next Step**: Implement frontend changes in CartCheckout.jsx
