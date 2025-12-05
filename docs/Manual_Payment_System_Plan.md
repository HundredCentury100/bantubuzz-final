# BantuBuzz Manual Payment Processing System - Implementation Plan

**Document Version:** 1.0
**Date:** November 24, 2025
**Status:** Planning Phase

---

## Table of Contents

1. [Overview](#overview)
2. [Payment Flow Models](#payment-flow-models)
3. [Money States & Lifecycle](#money-states--lifecycle)
4. [Database Schema](#database-schema)
5. [Admin Payment Management](#admin-payment-management)
6. [Creator Cashout Request System](#creator-cashout-request-system)
7. [Admin Dashboard - Payment Processing](#admin-dashboard---payment-processing)
8. [Notification System](#notification-system)
9. [Implementation Plan](#implementation-plan)
10. [Security & Audit Trail](#security--audit-trail)

---

## 1. Overview

### Purpose
Implement a flexible payment system where:
- **Brands can pay via Paynow (automated)** OR **direct payment (manual)**
- **Admins can mark payments as received** and add manual payments
- **Creators request cashouts** through the platform
- **Admins receive notifications** and process cashouts manually
- **Full audit trail** of all payment activities

### Real-World Scenario

```
SCENARIO 1: Online Paynow Payment
Brand → Paynow → Automatic Escrow → Creator Wallet

SCENARIO 2: Direct Payment (Bank Transfer, Cash, EcoCash)
Brand → Direct Payment to BantuBuzz Bank → Admin Marks as Paid → Creator Wallet

SCENARIO 3: Creator Cashout
Creator → Request Cashout → Admin Notified → Admin Processes → Money Sent
```

### Key Principles
1. **Flexibility** - Support both automated and manual payments
2. **Admin Control** - Admins verify and process all payments
3. **Transparency** - Clear status for all parties
4. **Audit Trail** - Complete record of who did what and when
5. **30-Day Clearance** - Still maintain safety period before cashout eligibility

---

## 2. Payment Flow Models

### 2.1 FLOW A: Automated Paynow Payment (Original)

```
┌─────────────────────────────────────────────────────────────────┐
│                    AUTOMATED PAYNOW FLOW                        │
└─────────────────────────────────────────────────────────────────┘

1. BRAND BOOKS PACKAGE ($100)
   ↓
2. BRAND CHOOSES PAYNOW PAYMENT
   ↓
3. PAYNOW GATEWAY PROCESSES PAYMENT
   ↓
4. PAYMENT CONFIRMED AUTOMATICALLY
   Status: "Paid" (Automated)
   ↓
5. MONEY IN PLATFORM ESCROW ($100)
   ↓
6. CREATOR DELIVERS WORK
   ↓
7. BRAND MARKS COMPLETE
   ↓
8. PLATFORM FEE DEDUCTED (15% = $15)
   Creator Earning: $85
   ↓
9. CREDITED TO CREATOR WALLET
   Status: "Pending Clearance"
   Available Date: [Date + 30 days]
   ↓
10. 30-DAY CLEARANCE PERIOD
    ↓
11. AVAILABLE FOR CASHOUT
    ↓
12. CREATOR REQUESTS CASHOUT
    ↓
13. ADMIN PROCESSES CASHOUT
    ↓
14. MONEY SENT TO CREATOR
```

---

### 2.2 FLOW B: Direct/Manual Payment (NEW)

```
┌─────────────────────────────────────────────────────────────────┐
│                     MANUAL PAYMENT FLOW                         │
└─────────────────────────────────────────────────────────────────┘

1. BRAND BOOKS PACKAGE ($100)
   ↓
2. BRAND CHOOSES "DIRECT PAYMENT" OPTION
   System generates payment reference: BP-123456
   ↓
3. SYSTEM SHOWS PAYMENT INSTRUCTIONS
   "Please pay $100 to:
    Bank: CBZ Bank
    Account: BantuBuzz Holdings
    Reference: BP-123456

    OR

    EcoCash: +263771234567
    Reference: BP-123456"
   ↓
4. BOOKING STATUS: "Awaiting Payment Confirmation"
   ↓
5. BRAND MAKES PAYMENT (Outside Platform)
   - Bank transfer
   - EcoCash transfer
   - Cash deposit
   - Any other method
   ↓
6. BRAND UPLOADS PAYMENT PROOF (Optional but recommended)
   - Screenshot
   - Receipt
   - Transaction reference
   ↓
7. ADMIN RECEIVES NOTIFICATION
   "New payment pending verification: BP-123456"
   ↓
8. ADMIN CHECKS BANK/MOBILE MONEY ACCOUNT
   Verifies payment received
   ↓
9. ADMIN MARKS PAYMENT AS "RECEIVED"
   - Confirms amount: $100
   - Adds payment method: "Bank Transfer - CBZ"
   - Adds transaction reference: "CBZ-789-XYZ"
   - Adds notes: "Verified in bank account on Nov 24"
   ↓
10. BOOKING STATUS: "Paid" (Manual)
    MONEY IN PLATFORM ESCROW ($100)
    ↓
11. CREATOR NOTIFIED: "Payment confirmed! Start work"
    ↓
12. [Same as automated flow from step 6 onwards]
```

---

### 2.3 FLOW C: Admin Adding Manual Payment (NEW)

```
┌─────────────────────────────────────────────────────────────────┐
│              ADMIN MANUAL PAYMENT ENTRY                         │
└─────────────────────────────────────────────────────────────────┘

SCENARIO: Brand paid via WhatsApp arrangement, or paid for multiple
          bookings in one transaction, or paid advance for campaign

1. ADMIN LOGS INTO ADMIN DASHBOARD
   ↓
2. GOES TO "PAYMENTS" → "ADD MANUAL PAYMENT"
   ↓
3. FILLS IN PAYMENT FORM:
   - Booking ID (or Campaign ID)
   - Brand: Select from dropdown
   - Creator: Select from dropdown
   - Amount: $100
   - Payment Method: Bank Transfer / EcoCash / Cash / Other
   - Payment Date: Nov 24, 2025
   - Transaction Reference: CBZ-789-XYZ
   - Proof of Payment: Upload image
   - Notes: "Brand paid via bank transfer as agreed offline"
   ↓
4. ADMIN CLICKS "ADD PAYMENT"
   ↓
5. SYSTEM CREATES PAYMENT RECORD
   - Status: "Paid (Manual)"
   - Verified by: Admin Name
   - Verified at: Nov 24, 2025 3:45 PM
   ↓
6. BOOKING STATUS UPDATED: "Paid"
   MONEY IN ESCROW
   ↓
7. CREATOR NOTIFIED: "Payment confirmed! Start work"
   ↓
8. BRAND NOTIFIED (Email): "Payment recorded for your booking"
```

---

### 2.4 FLOW D: Creator Cashout Request (NEW)

```
┌─────────────────────────────────────────────────────────────────┐
│                  CREATOR CASHOUT FLOW                           │
└─────────────────────────────────────────────────────────────────┘

1. CREATOR HAS AVAILABLE BALANCE: $285.00
   (Money that has cleared 30-day period)
   ↓
2. CREATOR GOES TO "EARNINGS" → "REQUEST CASHOUT"
   ↓
3. CREATOR FILLS CASHOUT FORM:
   - Amount: $200.00
   - Payment Method:
     ○ EcoCash: +263771234567
     ○ Bank Transfer: CBZ - Account 1234567890
     ○ Cash Pickup
   - Notes: (Optional) "Please process by Friday"
   ↓
4. CREATOR CLICKS "REQUEST CASHOUT"
   ↓
5. SYSTEM CREATES CASHOUT REQUEST
   - Status: "Pending Admin Approval"
   - Request ID: CR-123456
   - Requested at: Nov 24, 2025 2:30 PM
   ↓
6. CREATOR'S AVAILABLE BALANCE LOCKED
   - Available: $85.00 (remaining)
   - Pending Cashout: $200.00 (locked)
   ↓
7. ADMIN RECEIVES NOTIFICATIONS:
   ✉️ Email: "New cashout request from Creative Chris"
   🔔 Dashboard: Red badge on "Cashout Requests"
   📱 SMS (Optional): "1 new cashout request"
   ↓
8. ADMIN OPENS CASHOUT REQUEST
   Views:
   - Creator details
   - Amount requested
   - Payment method
   - Wallet balance verification
   - Transaction history
   ↓
9. ADMIN PROCESSES PAYMENT (Outside Platform)
   - Sends EcoCash
   - Makes bank transfer
   - Prepares cash
   ↓
10. ADMIN MARKS CASHOUT AS "COMPLETED"
    - Uploads payment proof
    - Adds transaction reference
    - Adds completion notes
    ↓
11. SYSTEM UPDATES RECORDS
    - Cashout Status: "Completed"
    - Completed at: Nov 24, 2025 4:15 PM
    - Completed by: Admin Name
    ↓
12. CREATOR RECEIVES NOTIFICATION
    ✉️ Email: "Your cashout of $200 has been processed!"
    🔔 Dashboard: "Cashout completed - Check your EcoCash"
    ↓
13. CREATOR VIEWS CASHOUT RECEIPT
    - Download PDF receipt
    - View transaction details
```

---

## 3. Money States & Lifecycle

### Payment States

| State | Who Controls | Description | Next Action |
|-------|-------------|-------------|-------------|
| **Pending Payment** | Brand | Booking created, waiting for payment | Brand pays or admin confirms |
| **Payment Submitted** | Brand | Brand uploaded proof, waiting verification | Admin verifies |
| **Paid (Automated)** | System | Paynow confirmed automatically | Creator delivers |
| **Paid (Manual)** | Admin | Admin verified payment received | Creator delivers |
| **In Escrow** | Platform | Holding payment until work complete | Brand marks complete |
| **Released to Wallet** | System | Work complete, credited to creator | 30-day clearance |
| **Pending Clearance** | System | In 30-day safety period | Wait for clearance |
| **Available** | Creator | Ready for cashout | Creator requests |
| **Cashout Requested** | Creator | Cashout submitted, waiting admin | Admin processes |
| **Cashout Processing** | Admin | Admin is processing payment | Admin completes |
| **Cashout Completed** | Admin | Money sent to creator | Done |
| **Cashout Failed** | Admin | Payment failed, refunded to wallet | Creator re-requests |

---

## 4. Database Schema

### 4.1 Update Payments Table

```sql
-- Update existing payments table
ALTER TABLE payments ADD COLUMN payment_method VARCHAR(50) DEFAULT 'paynow';
-- Values: 'paynow', 'bank_transfer', 'ecocash', 'cash', 'bank_deposit', 'other'

ALTER TABLE payments ADD COLUMN payment_type VARCHAR(20) DEFAULT 'automated';
-- Values: 'automated', 'manual', 'admin_added'

ALTER TABLE payments ADD COLUMN payment_proof_url VARCHAR(255);
-- URL to uploaded payment proof image

ALTER TABLE payments ADD COLUMN payment_reference VARCHAR(100);
-- Bank reference, EcoCash transaction ID, etc.

ALTER TABLE payments ADD COLUMN verified_by INTEGER REFERENCES users(id);
-- Admin who verified the payment

ALTER TABLE payments ADD COLUMN verified_at TIMESTAMP;
-- When admin verified the payment

ALTER TABLE payments ADD COLUMN verification_notes TEXT;
-- Admin notes about payment verification

ALTER TABLE payments ADD COLUMN payment_instructions TEXT;
-- Instructions shown to brand for manual payment

ALTER TABLE payments ADD COLUMN external_reference VARCHAR(100);
-- Brand's transaction reference
```

---

### 4.2 Cashout Requests Table (NEW)

```sql
CREATE TABLE cashout_requests (
    id SERIAL PRIMARY KEY,
    request_reference VARCHAR(50) UNIQUE NOT NULL, -- CR-123456

    -- User info
    user_id INTEGER REFERENCES users(id) NOT NULL,
    creator_id INTEGER REFERENCES creator_profiles(id) NOT NULL,
    wallet_id INTEGER REFERENCES wallets(id) NOT NULL,

    -- Request details
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',

    -- Payment method chosen by creator
    payment_method VARCHAR(50) NOT NULL, -- 'ecocash', 'bank_transfer', 'cash_pickup', 'other'
    payment_details JSONB NOT NULL,
    /*
    EcoCash: { "phone": "+263771234567", "name": "John Doe" }
    Bank: { "bank_name": "CBZ", "account_number": "1234567890", "account_name": "John Doe", "branch": "Harare" }
    Cash: { "pickup_location": "Harare Office", "id_number": "12-345678-A-12" }
    */

    -- Status tracking
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    -- Values: 'pending', 'processing', 'completed', 'failed', 'cancelled'

    -- Creator notes
    creator_notes TEXT,

    -- Admin processing
    assigned_to INTEGER REFERENCES users(id), -- Admin assigned to process
    assigned_at TIMESTAMP,

    processed_by INTEGER REFERENCES users(id), -- Admin who completed it
    processed_at TIMESTAMP,

    -- Payment proof from admin
    payment_proof_url VARCHAR(255),
    transaction_reference VARCHAR(100),
    admin_notes TEXT,

    -- Failure handling
    failed_at TIMESTAMP,
    failure_reason TEXT,

    -- Cancellation
    cancelled_at TIMESTAMP,
    cancelled_by INTEGER REFERENCES users(id),
    cancellation_reason TEXT,

    -- Fees (if any)
    cashout_fee DECIMAL(10,2) DEFAULT 0.00,
    net_amount DECIMAL(10,2), -- Amount - fee

    -- Timestamps
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cashout_requests_user_id ON cashout_requests(user_id);
CREATE INDEX idx_cashout_requests_creator_id ON cashout_requests(creator_id);
CREATE INDEX idx_cashout_requests_status ON cashout_requests(status);
CREATE INDEX idx_cashout_requests_requested_at ON cashout_requests(requested_at);
CREATE INDEX idx_cashout_requests_assigned_to ON cashout_requests(assigned_to);
```

---

### 4.3 Payment Verifications Table (NEW)

```sql
CREATE TABLE payment_verifications (
    id SERIAL PRIMARY KEY,
    payment_id INTEGER REFERENCES payments(id) NOT NULL,
    booking_id INTEGER REFERENCES bookings(id),

    -- Verification details
    verified_by INTEGER REFERENCES users(id) NOT NULL,
    verified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Payment details confirmed
    amount_verified DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    transaction_reference VARCHAR(100),
    payment_date DATE,

    -- Proof
    proof_url VARCHAR(255),

    -- Notes
    verification_notes TEXT,

    -- If verification was edited/updated
    previous_verification_id INTEGER REFERENCES payment_verifications(id),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payment_verifications_payment_id ON payment_verifications(payment_id);
CREATE INDEX idx_payment_verifications_verified_by ON payment_verifications(verified_by);
```

---

### 4.4 Admin Activity Log (NEW)

```sql
CREATE TABLE admin_activity_log (
    id SERIAL PRIMARY KEY,

    -- Admin info
    admin_user_id INTEGER REFERENCES users(id) NOT NULL,
    admin_name VARCHAR(100),

    -- Activity
    activity_type VARCHAR(50) NOT NULL,
    -- Values: 'payment_verified', 'payment_added', 'cashout_processed',
    --         'cashout_rejected', 'booking_modified', etc.

    -- Related entities
    payment_id INTEGER REFERENCES payments(id),
    booking_id INTEGER REFERENCES bookings(id),
    cashout_request_id INTEGER REFERENCES cashout_requests(id),
    affected_user_id INTEGER REFERENCES users(id),

    -- Details
    description TEXT NOT NULL,
    metadata JSONB,

    -- Audit
    ip_address VARCHAR(45),
    user_agent TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_admin_activity_log_admin_user_id ON admin_activity_log(admin_user_id);
CREATE INDEX idx_admin_activity_log_activity_type ON admin_activity_log(activity_type);
CREATE INDEX idx_admin_activity_log_created_at ON admin_activity_log(created_at);
```

---

### 4.5 Notification Queue Table (NEW)

```sql
CREATE TABLE notification_queue (
    id SERIAL PRIMARY KEY,

    -- Notification details
    notification_type VARCHAR(50) NOT NULL,
    -- Values: 'email', 'sms', 'in_app', 'push'

    -- Recipient
    recipient_user_id INTEGER REFERENCES users(id),
    recipient_email VARCHAR(255),
    recipient_phone VARCHAR(20),

    -- Content
    subject VARCHAR(255),
    message TEXT NOT NULL,
    metadata JSONB,

    -- Related entities
    payment_id INTEGER REFERENCES payments(id),
    cashout_request_id INTEGER REFERENCES cashout_requests(id),
    booking_id INTEGER REFERENCES bookings(id),

    -- Status
    status VARCHAR(20) DEFAULT 'pending',
    -- Values: 'pending', 'sent', 'failed', 'cancelled'

    -- Delivery
    sent_at TIMESTAMP,
    failed_at TIMESTAMP,
    failure_reason TEXT,
    retry_count INTEGER DEFAULT 0,

    -- Priority
    priority VARCHAR(20) DEFAULT 'normal',
    -- Values: 'low', 'normal', 'high', 'urgent'

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notification_queue_status ON notification_queue(status);
CREATE INDEX idx_notification_queue_recipient_user_id ON notification_queue(recipient_user_id);
CREATE INDEX idx_notification_queue_created_at ON notification_queue(created_at);
```

---

## 5. Admin Payment Management

### 5.1 Verify Pending Payment

**Endpoint:** `PUT /api/admin/payments/:id/verify`

**Flow:**
```python
def verify_payment(payment_id, admin_user_id, verification_data):
    """
    Admin verifies that payment has been received
    """
    payment = Payment.query.get(payment_id)
    booking = payment.booking

    if payment.status == 'completed':
        raise ValueError("Payment already verified")

    # Update payment
    payment.status = 'completed'
    payment.payment_type = 'manual'
    payment.payment_method = verification_data['payment_method']
    payment.payment_reference = verification_data['transaction_reference']
    payment.verified_by = admin_user_id
    payment.verified_at = datetime.now()
    payment.verification_notes = verification_data['notes']

    # If proof uploaded
    if verification_data.get('proof_file'):
        payment.payment_proof_url = upload_file(verification_data['proof_file'])

    # Update booking
    booking.payment_status = 'paid'
    booking.escrow_status = 'escrowed'
    booking.escrowed_at = datetime.now()

    # Create verification record
    verification = PaymentVerification(
        payment_id=payment.id,
        booking_id=booking.id,
        verified_by=admin_user_id,
        verified_at=datetime.now(),
        amount_verified=verification_data['amount'],
        payment_method=verification_data['payment_method'],
        transaction_reference=verification_data['transaction_reference'],
        payment_date=verification_data.get('payment_date'),
        proof_url=payment.payment_proof_url,
        verification_notes=verification_data['notes']
    )
    db.session.add(verification)

    # Log admin activity
    log_admin_activity(
        admin_user_id=admin_user_id,
        activity_type='payment_verified',
        payment_id=payment.id,
        booking_id=booking.id,
        affected_user_id=booking.creator.user_id,
        description=f"Verified payment of ${payment.amount} for booking #{booking.id}",
        metadata={
            'payment_method': verification_data['payment_method'],
            'amount': float(payment.amount)
        }
    )

    db.session.commit()

    # Notify creator
    notify_user(
        user_id=booking.creator.user_id,
        notification_type='email',
        subject='Payment Confirmed - Start Your Work!',
        message=f"Great news! Payment of ${payment.amount} has been confirmed for your booking. You can now start working on the project.",
        metadata={'booking_id': booking.id, 'payment_id': payment.id}
    )

    # Notify brand
    notify_user(
        user_id=booking.brand.user_id,
        notification_type='email',
        subject='Payment Recorded',
        message=f"Your payment of ${payment.amount} has been recorded successfully. {booking.creator.display_name} will now begin work on your project.",
        metadata={'booking_id': booking.id, 'payment_id': payment.id}
    )

    return payment
```

---

### 5.2 Add Manual Payment

**Endpoint:** `POST /api/admin/payments/manual`

**Flow:**
```python
def add_manual_payment(admin_user_id, payment_data):
    """
    Admin adds a payment that was received outside the platform
    """
    booking = Booking.query.get(payment_data['booking_id'])

    if not booking:
        raise ValueError("Booking not found")

    if booking.payment_status == 'paid':
        raise ValueError("Booking already paid")

    # Create payment record
    payment = Payment(
        booking_id=booking.id,
        user_id=booking.brand.user_id,
        amount=payment_data['amount'],
        currency=payment_data.get('currency', 'USD'),
        payment_method=payment_data['payment_method'],
        payment_type='admin_added',
        payment_reference=payment_data.get('transaction_reference'),
        status='completed',
        verified_by=admin_user_id,
        verified_at=datetime.now(),
        verification_notes=payment_data.get('notes'),
        payment_instructions=None,
        external_reference=payment_data.get('external_reference')
    )

    # Upload proof if provided
    if payment_data.get('proof_file'):
        payment.payment_proof_url = upload_file(payment_data['proof_file'])

    db.session.add(payment)
    db.session.flush()

    # Update booking
    booking.payment_status = 'paid'
    booking.escrow_status = 'escrowed'
    booking.escrowed_at = datetime.now()

    # Create verification record
    verification = PaymentVerification(
        payment_id=payment.id,
        booking_id=booking.id,
        verified_by=admin_user_id,
        verified_at=datetime.now(),
        amount_verified=payment_data['amount'],
        payment_method=payment_data['payment_method'],
        transaction_reference=payment_data.get('transaction_reference'),
        payment_date=payment_data.get('payment_date', datetime.now().date()),
        proof_url=payment.payment_proof_url,
        verification_notes=payment_data.get('notes')
    )
    db.session.add(verification)

    # Log admin activity
    log_admin_activity(
        admin_user_id=admin_user_id,
        activity_type='payment_added',
        payment_id=payment.id,
        booking_id=booking.id,
        affected_user_id=booking.creator.user_id,
        description=f"Added manual payment of ${payment.amount} for booking #{booking.id}",
        metadata={
            'payment_method': payment_data['payment_method'],
            'amount': float(payment.amount)
        }
    )

    db.session.commit()

    # Notify creator
    notify_user(
        user_id=booking.creator.user_id,
        notification_type='email',
        subject='Payment Confirmed - Start Your Work!',
        message=f"Payment of ${payment.amount} has been recorded for your booking. You can now start working on the project.",
        metadata={'booking_id': booking.id}
    )

    # Notify brand (confirmation)
    notify_user(
        user_id=booking.brand.user_id,
        notification_type='email',
        subject='Payment Recorded',
        message=f"Your payment of ${payment.amount} has been recorded successfully.",
        metadata={'booking_id': booking.id}
    )

    return payment
```

---

## 6. Creator Cashout Request System

### 6.1 Submit Cashout Request

**Endpoint:** `POST /api/wallet/cashout`

**Flow:**
```python
def submit_cashout_request(user_id, cashout_data):
    """
    Creator requests to cash out available funds
    """
    wallet = Wallet.query.filter_by(user_id=user_id).first()
    creator = CreatorProfile.query.filter_by(user_id=user_id).first()

    # Validate amount
    amount = cashout_data['amount']

    if amount < 10:
        raise ValueError("Minimum cashout amount is $10")

    if amount > wallet.available_balance:
        raise ValueError(f"Insufficient balance. Available: ${wallet.available_balance}")

    # Check for pending cashouts
    pending_cashout = CashoutRequest.query.filter_by(
        user_id=user_id,
        status='pending'
    ).first()

    if pending_cashout:
        raise ValueError("You already have a pending cashout request")

    # Generate reference
    reference = f"CR-{datetime.now().strftime('%Y%m%d')}-{user_id}-{random.randint(1000, 9999)}"

    # Calculate fees (if any)
    cashout_fee = 0.00  # Free for now
    net_amount = amount - cashout_fee

    # Create cashout request
    cashout = CashoutRequest(
        request_reference=reference,
        user_id=user_id,
        creator_id=creator.id,
        wallet_id=wallet.id,
        amount=amount,
        currency='USD',
        payment_method=cashout_data['payment_method'],
        payment_details=cashout_data['payment_details'],
        status='pending',
        creator_notes=cashout_data.get('notes'),
        cashout_fee=cashout_fee,
        net_amount=net_amount,
        requested_at=datetime.now()
    )
    db.session.add(cashout)
    db.session.flush()

    # Lock the amount in wallet (reduce available, increase locked)
    wallet.available_balance -= amount
    # Could add a "locked_for_cashout" field
    wallet.updated_at = datetime.now()

    # Create wallet transaction
    transaction = WalletTransaction(
        wallet_id=wallet.id,
        user_id=user_id,
        transaction_type='cashout_requested',
        amount=-amount,  # Negative
        status='pending',
        clearance_required=False,
        description=f"Cashout request {reference}",
        metadata={
            'cashout_request_id': cashout.id,
            'payment_method': cashout_data['payment_method']
        }
    )
    db.session.add(transaction)

    db.session.commit()

    # Notify admins (MULTIPLE CHANNELS)
    notify_admins_cashout_request(cashout)

    # Notify creator (confirmation)
    notify_user(
        user_id=user_id,
        notification_type='email',
        subject='Cashout Request Received',
        message=f"Your cashout request of ${amount} has been submitted successfully. Reference: {reference}. We'll process it within 1-3 business days.",
        metadata={'cashout_request_id': cashout.id}
    )

    return cashout
```

---

### 6.2 Notify Admins Function

```python
def notify_admins_cashout_request(cashout):
    """
    Send notifications to all admins about new cashout request
    """
    # Get all admin users
    admins = User.query.filter_by(is_admin=True, is_active=True).all()

    creator = cashout.creator

    for admin in admins:
        # 1. EMAIL NOTIFICATION
        send_email(
            to=admin.email,
            subject=f'🔔 New Cashout Request - ${cashout.amount}',
            template='admin_cashout_notification',
            context={
                'admin_name': admin.email.split('@')[0].title(),
                'creator_name': creator.display_name or creator.user.email,
                'amount': cashout.amount,
                'reference': cashout.request_reference,
                'payment_method': cashout.payment_method,
                'requested_at': cashout.requested_at.strftime('%b %d, %Y %I:%M %p'),
                'dashboard_link': f"{BASE_URL}/admin/cashouts/{cashout.id}"
            }
        )

        # 2. IN-APP NOTIFICATION
        create_notification(
            user_id=admin.id,
            notification_type='admin_alert',
            title='New Cashout Request',
            message=f'{creator.display_name} requested cashout of ${cashout.amount}',
            link=f'/admin/cashouts/{cashout.id}',
            metadata={'cashout_request_id': cashout.id}
        )

        # 3. SMS NOTIFICATION (Optional - for urgent alerts)
        if admin.phone and admin.receive_sms_alerts:
            send_sms(
                to=admin.phone,
                message=f"BantuBuzz: New cashout request ${cashout.amount} from {creator.display_name}. Ref: {cashout.request_reference}"
            )
```

---

### 6.3 Admin Process Cashout

**Endpoint:** `PUT /api/admin/cashouts/:id/complete`

**Flow:**
```python
def process_cashout_complete(cashout_id, admin_user_id, completion_data):
    """
    Admin marks cashout as completed after sending money
    """
    cashout = CashoutRequest.query.get(cashout_id)
    wallet = cashout.wallet

    if cashout.status != 'pending' and cashout.status != 'processing':
        raise ValueError("Cashout already processed or cancelled")

    # Update cashout
    cashout.status = 'completed'
    cashout.processed_by = admin_user_id
    cashout.processed_at = datetime.now()
    cashout.completed_at = datetime.now()
    cashout.transaction_reference = completion_data.get('transaction_reference')
    cashout.admin_notes = completion_data.get('notes')

    # Upload payment proof
    if completion_data.get('proof_file'):
        cashout.payment_proof_url = upload_file(completion_data['proof_file'])

    # Update wallet transaction
    transaction = WalletTransaction.query.filter_by(
        metadata={'cashout_request_id': cashout.id}
    ).first()

    if transaction:
        transaction.status = 'completed'
        transaction.updated_at = datetime.now()

    # Update wallet stats
    wallet.withdrawn_total += cashout.amount
    wallet.updated_at = datetime.now()

    # Log admin activity
    log_admin_activity(
        admin_user_id=admin_user_id,
        activity_type='cashout_processed',
        cashout_request_id=cashout.id,
        affected_user_id=cashout.user_id,
        description=f"Processed cashout of ${cashout.amount} for {cashout.creator.display_name}",
        metadata={
            'amount': float(cashout.amount),
            'payment_method': cashout.payment_method,
            'reference': cashout.request_reference
        }
    )

    db.session.commit()

    # Notify creator
    notify_user(
        user_id=cashout.user_id,
        notification_type='email',
        subject='💰 Cashout Completed!',
        message=f"Great news! Your cashout of ${cashout.amount} has been processed successfully. The money should reflect in your {cashout.payment_method} account shortly.",
        metadata={
            'cashout_request_id': cashout.id,
            'amount': cashout.amount,
            'reference': cashout.transaction_reference
        }
    )

    return cashout
```

---

## 7. Admin Dashboard - Payment Processing

### 7.1 Pending Payments View

```
┌───────────────────────────────────────────────────────────────────┐
│  💳 Pending Payment Verifications                    🔔 3 New     │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  🔴 NEW  BP-20251124-001                                          │
│  Brand: TechStartup Ltd                                           │
│  Creator: Creative Chris                                          │
│  Amount: $100.00                                                  │
│  Booking: Instagram Campaign                                      │
│  Submitted: Nov 24, 2025 2:30 PM (15 mins ago)                   │
│  Proof: [View Screenshot] ✅                                      │
│  Reference: "CBZ-789-XYZ"                                         │
│                                                                   │
│  [Verify Payment] [View Details] [Contact Brand]                 │
│  ─────────────────────────────────────────────────────────────   │
│                                                                   │
│  🟡 BP-20251124-002                                               │
│  Brand: FashionCo                                                 │
│  Creator: Style Sarah                                             │
│  Amount: $250.00                                                  │
│  Booking: YouTube Review Video                                    │
│  Submitted: Nov 24, 2025 10:15 AM (4 hours ago)                  │
│  Proof: No proof uploaded                                         │
│  Reference: None                                                  │
│                                                                   │
│  [Verify Payment] [View Details] [Request Proof]                 │
│  ─────────────────────────────────────────────────────────────   │
│                                                                   │
│  [Load More] [Filter] [Export]                    Page 1 of 2    │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

---

### 7.2 Verify Payment Modal

```
┌─────────────────────────────────────────────────────────┐
│  ✓ Verify Payment - BP-20251124-001                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Booking Details:                                       │
│  • Brand: TechStartup Ltd                              │
│  • Creator: Creative Chris                             │
│  • Package: Instagram Campaign                         │
│  • Amount: $100.00                                     │
│                                                         │
│  Brand's Payment Information:                          │
│  • Proof: [View Image] 📷                              │
│  • Reference: CBZ-789-XYZ                              │
│  • Submitted: Nov 24, 2025 2:30 PM                    │
│                                                         │
│  ─────────────────────────────────────────────────────│
│                                                         │
│  Verification Form:                                     │
│                                                         │
│  Payment Method:                                        │
│  [▼ Bank Transfer - CBZ      ]                         │
│                                                         │
│  Amount Received:                                       │
│  [$100.00                    ]                         │
│                                                         │
│  Transaction Reference:                                 │
│  [CBZ-789-XYZ                ]                         │
│                                                         │
│  Payment Date:                                          │
│  [Nov 24, 2025               ] 📅                      │
│                                                         │
│  Upload Additional Proof (Optional):                    │
│  [Drop file or click to upload] 📎                     │
│                                                         │
│  Verification Notes:                                    │
│  ┌────────────────────────────────────────────┐       │
│  │ Verified in CBZ bank account.              │       │
│  │ Payment received at 2:15 PM today.         │       │
│  └────────────────────────────────────────────┘       │
│                                                         │
│  [ Cancel ]                   [ Verify & Confirm ]     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

### 7.3 Add Manual Payment Modal

```
┌─────────────────────────────────────────────────────────┐
│  ➕ Add Manual Payment                                   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Search Booking:                                        │
│  [🔍 Search by booking ID, brand, or creator...      ] │
│                                                         │
│  Selected Booking:                                      │
│  ┌────────────────────────────────────────────────┐   │
│  │ 📦 Booking #1234                              │   │
│  │ Brand: TechStartup Ltd                        │   │
│  │ Creator: Creative Chris                       │   │
│  │ Package: Instagram Campaign                   │   │
│  │ Package Price: $100.00                        │   │
│  └────────────────────────────────────────────────┘   │
│                                                         │
│  Payment Details:                                       │
│                                                         │
│  Amount:                                                │
│  [$100.00                    ]                         │
│                                                         │
│  Payment Method:                                        │
│  [▼ Bank Transfer - CBZ      ]                         │
│  Options: Bank Transfer, EcoCash, Cash, Other          │
│                                                         │
│  Transaction Reference:                                 │
│  [CBZ-789-XYZ                ]                         │
│                                                         │
│  Payment Date:                                          │
│  [Nov 24, 2025               ] 📅                      │
│                                                         │
│  Brand Reference (Optional):                            │
│  [TECH-INV-1234              ]                         │
│                                                         │
│  Upload Payment Proof:                                  │
│  [Drop file or click to upload] 📎                     │
│  Supported: JPG, PNG, PDF (Max 5MB)                    │
│                                                         │
│  Notes:                                                 │
│  ┌────────────────────────────────────────────┐       │
│  │ Brand paid via bank transfer as per        │       │
│  │ WhatsApp arrangement. Verified in bank.    │       │
│  └────────────────────────────────────────────┘       │
│                                                         │
│  [ Cancel ]                   [ Add Payment ]          │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

### 7.4 Cashout Requests Dashboard

```
┌───────────────────────────────────────────────────────────────────┐
│  💸 Cashout Requests                           🔔 5 Pending       │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Filters: [All] [Pending] [Processing] [Completed]               │
│                                                                   │
│  ─────────────────────────────────────────────────────────────   │
│                                                                   │
│  🔴 URGENT  CR-20251124-15-7891                                   │
│  Creator: Creative Chris                                          │
│  Amount: $200.00                                                  │
│  Method: EcoCash - +263771234567                                 │
│  Requested: Nov 24, 2025 2:30 PM (15 mins ago)                   │
│  Notes: "Please process by Friday for urgent payment"            │
│                                                                   │
│  Available Balance Verified: ✅ $285.00                           │
│  Creator Tier: Rising Star ⭐                                     │
│  Previous Cashouts: 3 (All successful)                           │
│                                                                   │
│  [Process Cashout] [View Wallet] [Contact Creator]               │
│  ─────────────────────────────────────────────────────────────   │
│                                                                   │
│  🟡 CR-20251124-23-4562                                           │
│  Creator: Style Sarah                                             │
│  Amount: $150.00                                                  │
│  Method: Bank Transfer - CBZ (Acc: 1234567890)                   │
│  Requested: Nov 24, 2025 10:00 AM (4 hours ago)                  │
│  Notes: None                                                      │
│                                                                   │
│  Available Balance Verified: ✅ $450.00                           │
│  Creator Tier: Established Creator 💎                             │
│  Previous Cashouts: 12 (All successful)                          │
│                                                                   │
│  [Process Cashout] [View Wallet] [Assign to Me]                  │
│  ─────────────────────────────────────────────────────────────   │
│                                                                   │
│  [Load More] [Export Report]                  Page 1 of 3        │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

---

### 7.5 Process Cashout Modal

```
┌─────────────────────────────────────────────────────────┐
│  💸 Process Cashout - CR-20251124-15-7891                │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Creator Information:                                   │
│  • Name: Creative Chris                                │
│  • Email: chris@example.com                            │
│  • Phone: +263771234567                                │
│  • Tier: Rising Star ⭐                                │
│                                                         │
│  Cashout Details:                                       │
│  • Amount: $200.00                                     │
│  • Method: EcoCash                                     │
│  • Account: +263771234567                              │
│  • Requested: Nov 24, 2025 2:30 PM                    │
│  • Creator Notes: "Please process by Friday"           │
│                                                         │
│  Wallet Verification:                                   │
│  ✅ Available Balance: $285.00                         │
│  ✅ Sufficient funds                                   │
│  ✅ No pending disputes                                │
│  ✅ Account in good standing                           │
│                                                         │
│  ─────────────────────────────────────────────────────│
│                                                         │
│  Processing Form:                                       │
│                                                         │
│  Payment Status:                                        │
│  ⦿ Mark as Completed (I've sent the money)            │
│  ○ Mark as Processing (Working on it)                 │
│  ○ Reject/Cancel (Issue with request)                 │
│                                                         │
│  Transaction Reference:                                 │
│  [ECO-123456789              ]                         │
│                                                         │
│  Upload Payment Proof:                                  │
│  [Drop file or click to upload] 📎                     │
│                                                         │
│  Admin Notes:                                           │
│  ┌────────────────────────────────────────────┐       │
│  │ Sent via EcoCash at 3:00 PM.               │       │
│  │ Transaction successful.                     │       │
│  └────────────────────────────────────────────┘       │
│                                                         │
│  [ Cancel ]                   [ Complete Cashout ]     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 8. Notification System

### 8.1 Email Templates

#### Template 1: Payment Confirmation (Brand)
```
Subject: ✅ Payment Recorded - Booking Confirmed

Hi [Brand Name],

Your payment has been successfully recorded!

Payment Details:
• Amount: $100.00
• Method: Bank Transfer
• Reference: BP-123456
• Date: November 24, 2025

Booking Details:
• Creator: Creative Chris
• Package: Instagram Campaign
• Delivery: 5 business days

What's Next?
Creative Chris will now begin working on your project. You'll receive
updates as work progresses.

View Booking: [Link to Booking]

Thank you for using BantuBuzz!

---
BantuBuzz Team
Need help? Reply to this email
```

#### Template 2: Payment Confirmed (Creator)
```
Subject: 🎉 Payment Confirmed - Start Your Work!

Hi [Creator Name],

Great news! Payment has been confirmed for your booking.

Booking Details:
• Brand: TechStartup Ltd
• Package: Instagram Campaign
• Amount: $100.00 (You'll earn $85.00 after fees)
• Deadline: December 1, 2025

What's Next?
1. Review the project requirements in your dashboard
2. Start working on the deliverables
3. Upload your work when complete
4. Wait for brand approval

Once the brand marks the project complete, your earnings will be
credited to your wallet and available for cashout after 30 days.

View Booking: [Link to Booking]

Let's create something amazing!

---
BantuBuzz Team
Questions? Reply to this email
```

#### Template 3: Admin Cashout Notification
```
Subject: 🔔 New Cashout Request - $200.00

Hi Admin,

A new cashout request requires your attention.

Creator: Creative Chris
Amount: $200.00
Method: EcoCash (+263771234567)
Reference: CR-20251124-15-7891
Requested: Nov 24, 2025 2:30 PM

Creator Notes: "Please process by Friday for urgent payment"

Wallet Verification:
✅ Available Balance: $285.00
✅ Account Status: Good Standing
✅ Previous Cashouts: 3 (All successful)

Process this cashout: [Link to Admin Dashboard]

Quick Actions:
• Process Now: [Direct Link]
• Assign to Me: [Link]
• View Creator Profile: [Link]

---
BantuBuzz Admin System
This is an automated notification
```

#### Template 4: Cashout Completed (Creator)
```
Subject: 💰 Cashout Completed - Money Sent!

Hi [Creator Name],

Great news! Your cashout has been processed successfully.

Cashout Details:
• Amount: $200.00
• Method: EcoCash
• Account: +263771234567
• Reference: CR-20251124-15-7891
• Processed: Nov 24, 2025 3:15 PM

The money should reflect in your account shortly (usually within a
few minutes for EcoCash, 1-3 days for bank transfers).

Transaction Reference: ECO-123456789

Download Receipt: [Link to PDF]

Current Wallet Balance:
• Available for Cashout: $85.00
• Pending Clearance: $450.00

Keep up the great work!

---
BantuBuzz Team
Questions? Reply to this email
```

---

## 9. Implementation Plan

### Phase 1: Database & Backend (Week 1-2)

#### Week 1: Database Setup
- [ ] Update `payments` table with new columns
- [ ] Create `cashout_requests` table
- [ ] Create `payment_verifications` table
- [ ] Create `admin_activity_log` table
- [ ] Create `notification_queue` table
- [ ] Run migrations locally
- [ ] Seed test data
- [ ] Run migrations on production

#### Week 2: Payment Management Backend
- [ ] Update Payment model
- [ ] Create CashoutRequest model
- [ ] Create PaymentVerification model
- [ ] Create AdminActivityLog model
- [ ] Implement `verify_payment()` function
- [ ] Implement `add_manual_payment()` function
- [ ] Create payment proof upload handler
- [ ] Test payment verification flow

### Phase 2: Cashout System Backend (Week 3)

- [ ] Implement `submit_cashout_request()` function
- [ ] Implement `notify_admins_cashout_request()` function
- [ ] Implement `process_cashout_complete()` function
- [ ] Implement `cancel_cashout()` function
- [ ] Implement `reject_cashout()` function
- [ ] Create cashout status checker
- [ ] Test full cashout flow

### Phase 3: API Endpoints (Week 3-4)

#### Brand/Creator Endpoints:
- [ ] POST `/api/bookings/:id/payment-proof` - Upload proof
- [ ] GET `/api/bookings/:id/payment-status` - Check status
- [ ] POST `/api/wallet/cashout` - Request cashout
- [ ] GET `/api/wallet/cashout-requests` - List creator's cashouts
- [ ] GET `/api/wallet/cashout-requests/:id` - Cashout details
- [ ] DELETE `/api/wallet/cashout-requests/:id` - Cancel cashout

#### Admin Endpoints:
- [ ] GET `/api/admin/payments/pending` - Pending verifications
- [ ] PUT `/api/admin/payments/:id/verify` - Verify payment
- [ ] POST `/api/admin/payments/manual` - Add manual payment
- [ ] GET `/api/admin/cashouts` - List all cashouts
- [ ] GET `/api/admin/cashouts/pending` - Pending cashouts
- [ ] GET `/api/admin/cashouts/:id` - Cashout details
- [ ] PUT `/api/admin/cashouts/:id/process` - Mark as processing
- [ ] PUT `/api/admin/cashouts/:id/complete` - Complete cashout
- [ ] PUT `/api/admin/cashouts/:id/reject` - Reject cashout
- [ ] PUT `/api/admin/cashouts/:id/assign` - Assign to admin
- [ ] GET `/api/admin/activity-log` - Admin activity log
- [ ] GET `/api/admin/financial-dashboard` - Overview stats

### Phase 4: Notification System (Week 4)

- [ ] Email service integration
- [ ] SMS service integration (optional)
- [ ] Email templates creation
- [ ] Notification queue processor
- [ ] Real-time in-app notifications
- [ ] Admin alert system
- [ ] Test all notification channels

### Phase 5: Brand Payment Flow (Week 5)

#### Components:
- [ ] `PaymentMethodSelector.jsx` - Choose Paynow or Direct
- [ ] `DirectPaymentInstructions.jsx` - Show bank details
- [ ] `PaymentProofUpload.jsx` - Upload proof
- [ ] `PaymentStatusBadge.jsx` - Show payment status

#### Pages:
- [ ] Update `Payment.jsx` - Add direct payment option
- [ ] Create `PaymentInstructions.jsx` - Direct payment page
- [ ] Update `BookingDetails.jsx` - Show payment status
- [ ] Update `BrandDashboard.jsx` - Pending payments section

### Phase 6: Creator Cashout Flow (Week 5-6)

#### Components:
- [ ] `CashoutButton.jsx` - Quick cashout button
- [ ] `CashoutForm.jsx` - Cashout request form
- [ ] `CashoutRequestCard.jsx` - Display cashout status
- [ ] `CashoutHistory.jsx` - Past cashouts
- [ ] `CashoutReceipt.jsx` - Receipt view/download

#### Pages:
- [ ] Create `RequestCashout.jsx` - Cashout request page
- [ ] Create `CashoutRequests.jsx` - List of requests
- [ ] Update `Earnings.jsx` - Add cashout section
- [ ] Update `CreatorDashboard.jsx` - Show pending cashouts

### Phase 7: Admin Dashboard (Week 6-7)

#### Payment Management:
- [ ] Pending payments list page
- [ ] Payment verification modal
- [ ] Add manual payment modal
- [ ] Payment details view
- [ ] Payment history/search

#### Cashout Management:
- [ ] Cashout requests dashboard
- [ ] Process cashout modal
- [ ] Cashout details view
- [ ] Assign cashout to admin
- [ ] Bulk operations (approve multiple)
- [ ] Cashout analytics

#### Admin Tools:
- [ ] Financial overview dashboard
- [ ] Admin activity log viewer
- [ ] Payment reconciliation tools
- [ ] Monthly reports generator

### Phase 8: Testing & QA (Week 8)

- [ ] Unit tests for all functions
- [ ] Integration tests for flows
- [ ] E2E tests (payment → cashout)
- [ ] Admin permission tests
- [ ] Notification delivery tests
- [ ] Edge case handling
- [ ] Security audit
- [ ] UAT with real scenarios

### Phase 9: Documentation & Launch (Week 9)

- [ ] Brand guide: "How to Pay"
- [ ] Creator guide: "How to Cash Out"
- [ ] Admin manual: "Processing Payments & Cashouts"
- [ ] FAQ section
- [ ] Video tutorials
- [ ] API documentation
- [ ] Launch announcement
- [ ] Monitor first week closely

---

## 10. Security & Audit Trail

### 10.1 Security Measures

**Access Control:**
- Only admins can verify payments
- Only admins can add manual payments
- Only admins can process cashouts
- Creators can only see their own cashouts
- Brands can only see their own payments

**Data Protection:**
- Encrypt sensitive payment details
- Mask account numbers in UI (show last 4 digits)
- Secure file uploads (scan for malware)
- Rate limiting on cashout requests
- Two-factor authentication for admin actions (optional)

**Fraud Prevention:**
- Flag suspicious patterns (large amounts, new accounts)
- Velocity checks (max cashouts per day/week)
- Manual review for amounts >$500
- Verify creator identity before first cashout
- Check for duplicate payment proofs

### 10.2 Audit Trail

**All Actions Logged:**
- Payment verifications (who, when, amount)
- Manual payments added (who, when, details)
- Cashout processing (who, when, status)
- Admin modifications (edits, cancellations)
- File uploads (who, when, what)

**Audit Log Features:**
- Immutable records
- Timestamp every action
- IP address tracking
- User agent logging
- Before/after values for edits

**Reporting:**
- Daily payment verification report
- Weekly cashout processing report
- Monthly financial reconciliation
- Suspicious activity alerts
- Performance metrics (avg processing time)

---

## 11. Key Metrics to Track

### Financial Metrics:
- Total payments pending verification
- Average verification time
- Total cashouts pending
- Average cashout processing time
- Total fees collected
- Payment method breakdown

### Operational Metrics:
- Pending payment queue size
- Pending cashout queue size
- Admin response time
- Processing completion rate
- Failed transaction rate

### User Metrics:
- Brands preferring direct payment vs Paynow
- Creator cashout frequency
- Average cashout amount
- Repeat cashout rate
- Support tickets related to payments/cashouts

---

## 12. Future Enhancements

### Phase 2 Features (6-12 months):

1. **Automated Reconciliation**
   - Integrate bank API to auto-match payments
   - Reduce manual verification work
   - Faster payment confirmation

2. **Scheduled Cashouts**
   - Auto-cashout on schedule (monthly, etc.)
   - Set minimum balance threshold
   - Auto-select preferred payment method

3. **Multiple Payment Methods**
   - PayPal integration
   - Stripe integration
   - Cryptocurrency (Bitcoin, USDT)

4. **Instant Cashout (Premium)**
   - Skip queue for Elite/Pro creators
   - Small fee for instant processing
   - Automated transfers

5. **Bulk Operations**
   - Admin can process multiple cashouts at once
   - Batch payment uploads
   - CSV import for offline payments

6. **Mobile App Integration**
   - Push notifications for cashout status
   - Quick payment proof upload
   - Admin mobile approvals

---

## Questions for Discussion

1. **Payment Methods:** Which methods should we support initially?
   - Paynow (EcoCash, OneMoney)
   - Bank Transfer (CBZ, Stanbic, FBC, etc.)
   - Cash pickup
   - Mobile Money (other)

2. **Cashout Limits:** Should we have:
   - Minimum: $10?
   - Maximum per cashout: $1000?
   - Maximum per week: $5000?

3. **Processing Time:** What's realistic SLA?
   - Standard: 1-3 business days?
   - Urgent: Same day (for Elite/Pro)?

4. **Cashout Fees:** Should we charge?
   - Free for all?
   - Free for higher tiers, small fee for new creators?

5. **Admin Notifications:** How to alert admins?
   - Email + In-app?
   - Add SMS for urgent alerts?
   - WhatsApp notifications?

6. **Payment Verification:** Should we require:
   - Always require proof?
   - Only for amounts >$100?
   - Admin discretion?

7. **Cashout Approval:** Should we have:
   - Single admin approval?
   - Two-admin approval for >$500?
   - Auto-approve for trusted creators?

8. **Failed Cashouts:** What happens if transfer fails?
   - Auto refund to wallet?
   - How many retries?
   - Manual intervention threshold?

---

## Next Steps

1. **Review & approve** this manual payment plan
2. **Decide on payment methods** to support initially
3. **Set cashout limits** and processing SLAs
4. **Design UI mockups** for admin dashboards
5. **Begin Phase 1** (Database setup)

---

**Document Owner:** Development Team
**Stakeholders:** Product, Finance, Support, Admins
**Last Updated:** November 24, 2025
**Next Review:** After Phase 1 completion

---

## Appendix: Example Scenarios

### Scenario 1: Direct Payment Flow

```
Day 1, 10:00 AM: Brand books package ($100)
Day 1, 10:01 AM: System shows payment instructions
Day 1, 2:30 PM: Brand makes bank transfer
Day 1, 2:35 PM: Brand uploads proof & reference
Day 1, 2:36 PM: Admin receives email notification
Day 1, 3:00 PM: Admin checks bank account
Day 1, 3:05 PM: Admin verifies payment
Day 1, 3:06 PM: Creator notified - starts work
Day 5: Creator delivers work
Day 5: Brand marks complete
Day 5: $85 credited to creator wallet (pending 30 days)
Day 35: $85 available for cashout
```

### Scenario 2: Creator Cashout Flow

```
Creator has $285 available

Nov 24, 2:30 PM: Creator requests cashout of $200
Nov 24, 2:31 PM: Admin receives email + in-app notification
Nov 24, 3:00 PM: Admin sends EcoCash transfer
Nov 24, 3:05 PM: Admin marks cashout complete
Nov 24, 3:06 PM: Creator receives notification
Nov 24, 3:10 PM: Money arrives in creator's EcoCash

Total processing time: 40 minutes
```

### Scenario 3: Multiple Bookings, One Payment

```
Brand has 3 bookings totaling $300

Admin adds manual payment:
- Payment: $300 (bank transfer)
- Reference: BNK-123-456
- Allocates to:
  - Booking #1: $100
  - Booking #2: $100
  - Booking #3: $100

All 3 bookings marked as paid
All 3 creators notified to start work
```

---

**End of Document**
