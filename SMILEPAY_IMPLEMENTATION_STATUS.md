# SmilePay Express Checkout - Implementation Status & Next Steps

**Date**: May 13, 2026
**Status**: Analysis Complete - Ready for Implementation
**Current Branch**: edits

---

## 📊 SITUATION SUMMARY

You have requested a complete re-implementation of SmilePay using Express Checkout for all 6 payment methods. The codebase audit reveals that **most of the infrastructure is already in place**, but there are critical issues that need fixing.

### What's Already Implemented ✅
- All 6 payment methods in backend service
- Database models with comprehensive fields
- SmilePayPaymentModal UI component
- Webhook handler
- Polling mechanism
- Payment status tracking

### What Needs Fixing 🔧
- **CRITICAL**: Card payment has PCI compliance risk
- **HIGH**: Cart payment completion not implemented
- **HIGH**: Campaign payment missing SmilePay
- **MEDIUM**: 3DS redirect handling

---

## 🎯 THREE-PHASE IMPLEMENTATION PLAN

### PHASE 1: Fix Critical Issues (Priority 1-3)
**Estimated Time**: 4-6 hours
**Files to Modify**: 2 backend, 2 frontend

1. **Fix Card Payment (PCI Compliance)**
   - Backend: Update `smilepay_service.py` card method to use MPGS Express Checkout
   - Backend: Update `smilepay_payments.py` card route
   - Frontend: Update `SmilePayPaymentModal.jsx` to NOT collect card details
   - Result: Card details never touch our system, sent directly to SmilePay

2. **Implement Cart Payment Completion**
   - File: `backend/app/services/smilepay_service.py` (line 591 TODO)
   - Add logic to update campaign cart status when payment succeeds
   - Result: Cart items marked as purchased, order completed

3. **Add SmilePay to Campaign Payment**
   - File: `frontend/src/pages/CampaignPayment.jsx`
   - Add SmilePay option to payment methods
   - Result: Users can pay campaign fees with any method

### PHASE 2: Verify & Test (Priority 4-5)
**Estimated Time**: 2-3 hours

- Test all 6 payment methods
- Verify webhook processing
- Check transaction status updates
- Validate payment completion logic

### PHASE 3: Deploy & Monitor (Priority 6+)
**Estimated Time**: 1-2 hours

- Push to production
- Monitor webhooks and logs
- Verify all payment methods work in production

---

## 📋 IMPLEMENTATION CHECKLIST

### Backend Files to Modify

**File 1: `backend/app/services/smilepay_service.py`**
- [ ] Update `initiate_card_payment()` to use MPGS Express Checkout
- [ ] Return `redirect_html` for 3DS instead of processing locally
- [ ] Implement `_complete_cart_payment()` (line 591)
- [ ] Add method to process webhook for all payment types

**File 2: `backend/app/routes/smilepay_payments.py`**
- [ ] Update `/card` route to NOT expect card details in request body
- [ ] Update `/card` route to accept only card_type (visa/mastercard) and amount
- [ ] Update `/card` route response to include `redirect_html` for frontend
- [ ] Verify all other routes handle payment completion correctly

### Frontend Files to Modify

**File 3: `frontend/src/components/SmilePayPaymentModal.jsx`**
- [ ] Remove card form fields (card number, expiry, CVV inputs)
- [ ] Keep card type selector (Visa/Mastercard buttons only)
- [ ] Remove card detail validation
- [ ] Add 3DS redirect handler for card payments
- [ ] Handle `redirect_html` response from backend

**File 4: `frontend/src/pages/CampaignPayment.jsx`**
- [ ] Add SmilePay payment option to payment method selector
- [ ] Import and use `SmilePayPaymentModal` component
- [ ] Handle payment completion callback

### Database

**File 5: `backend/app/models/smilepay_transaction.py`**
- [ ] Verify all columns exist (audit shows they do)
- [ ] No changes needed

**Migrations**
- [ ] Run existing SmilePay migration if not already applied
- [ ] Command: `python run_smilepay_migration.py`

---

## 🔑 KEY TECHNICAL DETAILS

### Express Checkout Flow (All Payment Methods)

**Single-Step (Ecocash, Innbucks, OneMoney):**
```
User → Select method → Enter phone → Submit → Backend initiates at SmilePay → 
SmilePay sends USSD/code to user → User approves → Webhook received → 
Transaction marked PAID → User sees success
```

**Two-Step OTP (SmileCash, Omari):**
```
User → Select method → Enter phone → Submit → Backend initiates → 
SMS OTP sent to user → User enters OTP in form → Backend confirms OTP → 
Webhook received → Transaction marked PAID → User sees success
```

**Card 3DS (Visa/Mastercard):**
```
User → Select card → Backend initiates MPGS Express Checkout → 
Returns 3DS HTML → Frontend injects HTML and executes script → 
3DS authentication page opens → User authenticates with bank → 
Redirect back to return_url → Webhook received → Transaction marked PAID
```

### API Endpoints Used

**SmilePay Express Checkout Endpoints:**
- `POST /payments/express-checkout/ecocash`
- `POST /payments/express-checkout/innbucks`
- `POST /payments/express-checkout/onemoney`
- `POST /payments/express-checkout/zb-payment` (SmileCash leg 1)
- `POST /payments/express-checkout/zb-payment/confirmation` (SmileCash leg 2)
- `POST /payments/express-checkout/omari` (Omari leg 1)
- `POST /payments/express-checkout/omari/confirmation` (Omari leg 2)
- `POST /payments/express-checkout/mpgs` (Card 3DS)

**Base URL:** `https://zbnet.zb.co.zw/wallet_sandbox_api/payments-gateway`

---

## 📚 DOCUMENTATION CREATED

All planning documentation has been created:

1. **SMILEPAY_FULL_IMPLEMENTATION_PLAN.md** (11,594 bytes)
   - Complete guide for all payment methods
   - Service methods to create
   - Route endpoints needed
   - Database schema
   - Frontend components
   - Success criteria

2. **SMILEPAY_CRITICAL_FIXES.md** (12,966 bytes)
   - Current state assessment
   - Critical issues identified
   - Detailed code examples for fixes
   - Implementation priority order
   - Verification checklist

3. **PAYMENT_FLOW_DIAGRAM.md** (12,113 bytes - from previous session)
   - Visual flow diagrams
   - Comparison of old vs new approach
   - Error handling flows
   - Benefits of Express Checkout

4. **Other Reference Docs**
   - DEPLOYMENT_SMILEPAY_CARD_FIX.md
   - DEPLOYMENT_READY.md
   - DEPLOYMENT_SUMMARY.txt

---

## 🚀 READY TO START IMPLEMENTATION?

### Option 1: I Continue (Recommended)
I can implement all the fixes directly:
1. Modify backend service and routes
2. Update frontend components
3. Test each payment method
4. Commit all changes
5. Deploy to production

### Option 2: You Review First
Review the detailed plans and give approval before I start coding.

### Option 3: Specific Focus
Tell me which issue to fix first (likely the card payment PCI fix).

---

## ⚠️ CRITICAL POINTS

1. **Card Payment PCI Risk**
   - Current: Card details collected in frontend form ❌
   - Fix: Use SmilePay Express Checkout MPGS ✅
   - Never collect card details in our form

2. **3DS Authentication**
   - SmilePay returns HTML/script for 3DS
   - Frontend must inject and execute this
   - User completes authentication with bank
   - Returns with payment result

3. **Two-Step OTP Methods**
   - Leg 1: Initiate (SMS sent to user)
   - Leg 2: Confirm (User enters OTP, backend submits)
   - Must use `transactionReference` from leg 1 in leg 2

4. **Webhook Idempotency**
   - Always check if `orderReference` already processed
   - Prevent double-crediting from duplicate webhooks
   - Always return HTTP 200 to acknowledge

---

## 📞 NEXT STEPS

1. **Approve implementation approach** - Confirm you want me to proceed
2. **Start Phase 1** - Fix critical card payment issue
3. **Complete cart payment** - Implement missing logic
4. **Add SmilePay to Campaign** - Expand payment options
5. **Test all methods** - End-to-end verification
6. **Deploy** - Push to production

---

## 📊 SQL TRACKING

I've created a SQL table tracking all implementation tasks:

```sql
SELECT * FROM implementation_todos ORDER BY priority;
```

This shows all 16 tasks broken down by:
- Category (backend, database, frontend, testing)
- Priority (1-6)
- Current status (pending)

---

**Ready to proceed with Phase 1 implementation?**
Reply with approval and I'll start fixing the critical PCI compliance issue immediately.

