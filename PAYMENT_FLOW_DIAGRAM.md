# SmilePay Card Payment Flow - Diagram

## Express Checkout Flow (CORRECT - PCI Compliant)

```
┌──────────────────────────────────────────────────────────────────────┐
│                         USER BROWSER                                 │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  BantuBuzz Frontend                                          │   │
│  │  ├─ User selects "Pay with Card"                            │   │
│  │  ├─ Selects card type: Visa or Mastercard                  │   │
│  │  ├─ NO card details collected                              │   │
│  │  └─ Clicks "Continue to Payment"                           │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                              │                                       │
│                              ▼                                       │
│  POST /api/smilepay/card                                             │
│  {                                                                    │
│    "payment_type": "subscription",                                    │
│    "amount": 10.00,                                                   │
│    "card_type": "visa",    ◄─ ONLY card type, NO details           │
│    "item_name": "Premium"                                             │
│  }                                                                    │
└───────────────────────┬──────────────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    BANTUBUZZ BACKEND                                 │
│  /api/smilepay/card Route Handler                                    │
│  ├─ Validate request (card_type, amount, etc.)                       │
│  ├─ Create SmilePayTransaction record                                │
│  ├─ Call smilepay_service.initiate_card_payment()                   │
│  └─ Return redirect_url to frontend                                  │
└───────────────────────┬──────────────────────────────────────────────┘
                        │
                        ▼
                    200 OK Response
                    {
                      "success": true,
                      "redirect_url": "https://checkout.smilepay.co.zw/..."
                    }
                        │
                        ▼
┌──────────────────────────────────────────────────────────────────────┐
│                         USER BROWSER                                 │
│  Frontend receives redirect_url                                       │
│  window.location.href = redirect_url  ◄─ Redirect user               │
└───────────────────────┬──────────────────────────────────────────────┘
                        │
                        ▼
        ┌───────────────────────────────────┐
        │   SmilePay Hosted Checkout Page   │
        │                                   │
        │   ┌─────────────────────────────┐ │
        │   │ Enter Card Details          │ │
        │   │ Card Number:  ____          │ │
        │   │ Expiry:       __/__          │ │
        │   │ CVV:          ___            │ │
        │   │ [Pay Button]                │ │
        │   └─────────────────────────────┘ │
        │                                   │
        │  ✅ SECURE - SmilePay handles    │
        │  ✅ PCI Compliant                │
        │  ✅ No data goes to BantuBuzz    │
        └───────────────────────────────────┘
                        │
                        ▼ (After successful/failed payment)
        ┌───────────────────────────────────┐
        │  SmilePay processes payment       │
        │  Sends webhook callback           │
        └───────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────────────────┐
│              BANTUBUZZ BACKEND - WEBHOOK RECEIVER                   │
│  /api/webhooks/smilepay                                              │
│  ├─ Receive payment status                                           │
│  ├─ Update SmilePayTransaction record                               │
│  ├─ Update order/subscription status                                │
│  └─ Send confirmation email                                         │
└───────────────────────┬──────────────────────────────────────────────┘
                        │
                        ▼
             Optional redirect to result_url
             (user sees "Payment Successful!")
```

## OLD FLOW (INCORRECT - PCI Liability Risk)

```
❌ DEPRECATED - Do Not Use

User fills card form in BantuBuzz
  ├─ Card Number: 4111111111111111
  ├─ Expiry: 12/25
  ├─ CVV: 123
  └─ Name: John Doe

          ▼

POST /api/smilepay/card
{
  "card_number": "4111111111111111",    ◄─ DANGEROUS!
  "expiry_month": "12",                 ◄─ DANGEROUS!
  "cvv": "123",                         ◄─ DANGEROUS!
  "cardholder_name": "John Doe"         ◄─ DANGEROUS!
}

          ▼

BantuBuzz Backend
  ├─ Receives card details
  ├─ Stores in database (RISKY!)
  └─ Sends to SmilePay

          ▼

⚠️ PROBLEMS:
  ✗ Card details in our database
  ✗ Card details in our logs
  ✗ PCI DSS compliance required
  ✗ Major security liability
  ✗ Inconsistent with other payment methods
```

## Comparison: Express Checkout vs Old Approach

| Feature | Express Checkout (NEW ✅) | Old Form Approach (OLD ❌) |
|---------|--------------------------|--------------------------|
| **Card Details** | Collected by SmilePay | Collected by BantuBuzz |
| **PCI Compliance** | Full compliance (SmilePay handles) | Requires Level 1 PCI DSS |
| **Security Risk** | Low (no data in our system) | High (card details stored) |
| **User Experience** | Redirect to secure page | Form on BantuBuzz |
| **Data Flow** | Frontend → Backend → SmilePay redirect | Frontend → Backend → SmilePay API |
| **Webhook Required** | Yes (payment status callback) | Yes (payment status callback) |
| **Consistency** | Same as Ecocash, Innbucks, etc. | Different from other methods |
| **Time to Process** | SmilePay processes securely | Backend must validate |
| **Liability** | Minimal | Significant |
| **Recommended** | ✅ YES | ❌ NO |

## Error Handling Flow

```
┌────────────────────────────────────┐
│  Frontend sends card_type          │
└───────────┬────────────────────────┘
            │
            ▼
    ┌───────────────────┐
    │ Backend validates │
    └───────────┬───────┘
                │
    ┌───────────┴─────────────┐
    │                         │
    ▼                         ▼
┌─────────────┐      ┌──────────────────┐
│ Valid: ✓    │      │ Invalid: ✗       │
│ Continue    │      │ Return 400 error │
│ with payment│      │ Missing field    │
└─────────────┘      └──────────────────┘
    │
    ▼
┌──────────────────────────┐
│ Call SmilePay API        │
└────────────┬─────────────┘
             │
    ┌────────┴─────────┐
    │                  │
    ▼                  ▼
┌─────────┐      ┌──────────────┐
│ Success │      │ API Error    │
│ 200 OK  │      │ Return error │
│ return  │      │ message      │
│ URL     │      │ to frontend  │
└─────────┘      └──────────────┘
    │
    ▼
Frontend receives
redirect_url or
error message
```

## Payment Status Lifecycle

```
User Initiates Payment
        │
        ▼
Transaction Created: PENDING
        │
        ▼
Redirected to SmilePay
        │
        ▼
    ┌───────────────────────────────┐
    │ SmilePay Processing           │
    │                               │
    │ User enters card details      │
    │ SmilePay validates payment    │
    │ SmilePay processes with bank  │
    └───────────────────────────────┘
        │
        ▼
    ┌────────────────────────────────────┐
    │ SmilePay Webhook Callback          │
    │ POST /api/webhooks/smilepay        │
    └───────────────┬────────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
        ▼                       ▼
    COMPLETED              FAILED
    (Payment accepted)     (Payment declined)
        │                       │
        ▼                       ▼
Update transaction:         Update transaction:
- Status: COMPLETED         - Status: FAILED
- Save ref                  - Save error
- Update order              - Notify user
        │                       │
        ▼                       ▼
    Send confirmation    Send failure
    email to user        email to user
```

## Key Benefits of Express Checkout

```
┌──────────────────────────────────────────────────────────┐
│                    EXPRESS CHECKOUT                      │
│                     BENEFITS                             │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  🔒 SECURITY                                             │
│     └─ Card details never touch BantuBuzz servers       │
│     └─ SmilePay handles all card processing             │
│     └─ PCI DSS compliance handled by SmilePay           │
│                                                          │
│  ✅ COMPLIANCE                                           │
│     └─ No Level 1 PCI DSS certification needed          │
│     └─ Significantly reduced security audit scope       │
│     └─ Industry standard approach                       │
│                                                          │
│  🎯 CONSISTENCY                                          │
│     └─ Same flow as Ecocash payments                    │
│     └─ Same flow as Innbucks payments                   │
│     └─ Unified payment experience                       │
│                                                          │
│  ⚡ PERFORMANCE                                          │
│     └─ User redirected to SmilePay (no backend wait)   │
│     └─ SmilePay handles payment processing              │
│     └─ Backend only receives webhook callback           │
│                                                          │
│  🛡️ LIABILITY REDUCTION                                  │
│     └─ No card data storage responsibility              │
│     └─ No data breach risk for card details             │
│     └─ SmilePay assumes processing liability            │
│                                                          │
│  📱 USER EXPERIENCE                                      │
│     └─ Familiar checkout page (SmilePay branded)        │
│     └─ No need to remember card details                 │
│     └─ Ability to save cards at SmilePay (optional)    │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

## Integration Checklist

```
Frontend Integration:
  ☑ Remove card detail input fields
  ☑ Keep card type selector (Visa/Mastercard)
  ☑ Call POST /api/smilepay/card with card_type
  ☑ Receive redirect_url from backend
  ☑ Redirect user to redirect_url
  ☑ Handle return from SmilePay (result_url)

Backend Integration:
  ☑ Validate card_type (visa or mastercard)
  ☑ Create transaction record
  ☑ Call smilepay_service.initiate_card_payment()
  ☑ Return redirect_url to frontend
  ☑ Handle webhook callbacks
  ☑ Update transaction status from webhook

Database:
  ☑ Store card_type (not card details!)
  ☑ Store order_reference from SmilePay
  ☑ Store transaction_reference from SmilePay
  ☑ Store payment status from webhook

Environment:
  ☑ SmilePay API credentials configured
  ☑ Webhook endpoint configured in SmilePay
  ☑ Return/result/cancel/failure URLs configured
```

---

**For Complete Deployment Details**: See DEPLOYMENT_SMILEPAY_CARD_FIX.md
**For Code Changes**: See smilepay_service.py and smilepay_payments.py
**For API Reference**: See SMILEPAY_API_DOCUMENTATION.md
