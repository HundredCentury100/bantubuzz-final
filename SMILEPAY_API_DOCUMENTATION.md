# Smile&Pay Payment Gateway API Documentation

## Introduction to Smile&Pay Payment Gateway API Documentation

Welcome to the official documentation for the Smile&Pay Payment Gateway API – a powerful and secure solution designed to simplify payment integrations for businesses and developers. The Smile&Pay API enables seamless transactions across multiple payment methods, including:

- **Ecocash** (Mobile Money)
- **Innbucks** (Digital Wallet)
- **Omari** (Payment Platform)
- **Visa/Mastercard** (Credit/Debit Cards)
- **Smile Cash** (Digital Wallet)

Whether you're building an e-commerce platform, a subscription service, or a mobile application, the Smile&Pay API provides a reliable and efficient way to process payments, verify transactions, and manage payouts.

### Key Features
- ✅ **Multi-Payment Support** – Accept payments via mobile money, cards, and digital wallets
- ✅ **Secure Transactions** – PCI-DSS compliant with encryption and fraud prevention
- ✅ **Real-Time Notifications** – Instant webhooks for payment confirmations
- ✅ **Developer-Friendly** – RESTful API with clear documentation and SDKs
- ✅ **Scalable & Reliable** – Built for high-volume transactions with minimal downtime

---

## First Steps: Getting Started with Smile&Pay API

To begin integrating the Smile&Pay Payment Gateway API, follow these initial steps to set up your sandbox environment, generate API credentials, and start testing before moving to production.

### 1. Create a Sandbox Merchant Account
The Smile&Pay Sandbox Environment is a testing platform that mimics the production API but uses simulated transactions. This allows you to test payment flows without processing real money.

**How to Register for a Sandbox Account:**
1. Visit the Smile&Pay Sandbox Portal: https://zbnet.zb.co.zw/wallet_sandbox_merchant/
2. Click "Sign Me Up" and fill in the required merchant details (e.g., business name, email, phone number)
3. Log in to your Sandbox Merchant Dashboard

### 2. Generate Your API Key & Secret
After registration, you need to generate API credentials to authenticate your requests.

**Steps to Generate API Key & Secret:**
1. Go to the "Settings" menu in your Sandbox Dashboard
2. Select the "API Keys" section
3. Click "Generate New API Key"
4. Copy the generated API Key and API Secret (store them securely)

⚠️ **Important:**
- Treat your API Secret like a password—never expose it in client-side code
- Sandbox keys only work in the test environment; you'll need new keys for production

### 3. Configure Your Sandbox Environment
The sandbox API base URL is:

**Sandbox:** `https://zbnet.zb.co.zw/wallet_sandbox_api/payments-gateway`

Use your API Key and Secret in the `x-api-key` and `x-api-secret` headers respectively for all requests:

```bash
curl -H "x-api-key: YOUR_API_KEY" -H "x-api-secret: YOUR_API_SECRET" https://zbnet.zb.co.zw/wallet_sandbox_api/payments-gateway/some/endpoint
```

### 4. Start Testing API Endpoints
Now you can simulate transactions using the sandbox:
- Initiate payments (`/payments/initiate-transaction`)
- Check transaction status (`/payments/transaction/{orderReference}/status/check`)
- Set up webhooks for callbacks

### 5. Move to Production
Once testing is complete:
1. Request for a Production Merchant Account Access (may require verification)
2. Generate new Production API Keys (sandbox keys won't work in live mode)
3. Switch the API base URL to: `https://zbnet.zb.co.zw/wallet_gateway/payments-gateway`

🚀 You're now ready to go live with Smile&Pay!

---

## Base URLs

**Sandbox Environment:**
```
https://zbnet.zb.co.zw/wallet_sandbox_api/payments-gateway
```

**Production Environment:**
```
https://zbnet.zb.co.zw/wallet_gateway/payments-gateway
```

---

## Standard Checkout

The Smile&Pay Standard Checkout provides a seamless way to accept payments by redirecting customers to a secure hosted payment page. Here's how it works:

### 1. Initiate Payment Transaction
Your server makes a POST request to the Smile&Pay API (e.g., `/payments/initiate-transaction`) with:
- Amount (e.g., 100.00)
- CurrencyCode (e.g., 840 or 924)
- returnUrl (where the customer is redirected after payment)
- resultUrl (where Smile&Pay sends the final payment status via webhook)
- etc…

### 2. Receive Checkout URL
The API responds with a `paymentUrl` (e.g., `https://zbnet.zb.co.zw/wallet_sandbox_checkout?reference=xyz123`).
Your system redirects the customer to this URL.

### 3. Customer Completes Payment
The customer sees a hosted payment page where they can:
- Select a payment method (if not pre-selected)
- Enter required details (e.g., Ecocash phone number, card info)
- Confirm and submit the payment

### 4. Post-Payment Redirect & Webhook

**Success/Failure Redirect:**
After payment, Smile&Pay redirects the customer back to your `returnUrl`.
You can display an order confirmation or error message here.

**Final Payment Status via Webhook:**
Smile&Pay sends a server-to-server POST request to your `resultUrl` with the transaction's final status (PAID, FAILED, or CANCELED). The body is as below:

```json
{
  "merchantId": "",
  "reference": "",
  "orderReference": "",
  "itemName": "",
  "amount": null,
  "currency": "",
  "paymentOption": "",
  "status": "",
  "createdDate": "",
  "returnUrl": "",
  "resultUrl": "",
  "clientFee": null,
  "merchantFee": null
}
```

Your backend must process this to update orders accordingly.

⚠️ **We recommend that you also make use of the Check Status API to poll for the status rather than rely on the callback reply alone.**

---

## Express Checkout

The Smile&Pay Express Checkout allows merchants to process payments directly (e.g., Ecocash, Innbucks, or card payments) without redirecting customers to a hosted checkout page. This enables you to:

- Build your own custom checkout UI
- Keep customers on your site/app throughout payment
- Speed up transactions with direct API calls

### How Express Checkout Works

#### 1. Initiate Direct Payment (API Call)
Your server makes a POST request to Smile&Pay's payment endpoint (e.g., `/payments/express-checkout/innbucks`) with:
- Amount & CurrencyCode (e.g., 100.00)
- Customer Details (e.g., phone for Ecocash, cardNumber for Visa)
- resultUrl (webhook for final payment status)
- Optional: customerEmail, orderId, etc.

#### 2. Smile&Pay Processes Payment Directly
- **For Ecocash:** Smile&Pay sends a USSD/Push prompt to the customer's phone
- **For Innbucks:** Smile&Pay responds with an innbucks payment code which the user uses to make payment on their innbucks app
- **For Cards:** Smile&Pay response with the 3Ds redirect html to redirect to issuer's authorization page
- **For SmileCash/Omari:** Customer receives an OTP which they use to confirm payment

#### 3. Payment Status Updates
Webhook callback: Smile&Pay sends the final payment status to your `resultUrl`.

#### 4. Handle the Result in Your System
- **PAID:** Fulfill the order
- **FAILED:** Notify the customer & retry if needed
- **PENDING:** Wait for the webhook confirmation
- **CANCELED:** Transaction was canceled

### Key Benefits of Express Checkout
- ✔ Faster payments – No redirects mean quicker completion
- ✔ Better UX – Customers stay on your platform
- ✔ Custom UI control – Design your own checkout flow
- ✔ Supports multiple methods – Ecocash, cards, wallets, etc.

---

## Payment Methods

### Ecocash Express Checkout

**Flow:**
1. Customer enters EcoCash phone number in merchant's checkout
2. Merchant server sends payment request to Smile&Pay
3. Smile&Pay triggers USSD push to customer's phone
4. Customer sees EcoCash confirmation prompt
5. Customer approves payment via USSD
6. EcoCash processes payment
7. Smile&Pay sends payment status callback to merchant
8. Merchant updates order status

**Endpoint:** `POST /payments/express-checkout/ecocash`

**Request Body:**
```json
{
  "orderReference": "",
  "amount": null,
  "returnUrl": "",
  "resultUrl": "",
  "itemName": "",
  "itemDescription": "",
  "currencyCode": "",
  "firstName": "",
  "lastName": "",
  "mobilePhoneNumber": "",
  "email": "",
  "cancelUrl": "",
  "failureUrl": "",
  "ecocashMobile": ""
}
```

**Body Parameters:**
- `orderReference` (string, required): Unique reference number or code assigned to the payment transaction order
- `amount` (number, required): The total amount to be paid or transferred through the Ecocash payment method
- `returnUrl` (string): The URL to which the user will be redirected after completing the Ecocash payment process
- `resultUrl` (string, required): The URL where the Ecocash payment result will be sent or displayed
- `itemName` (string, required): The name of the item being purchased or paid for through Ecocash
- `itemDescription` (string, required): A brief description of the item being purchased or paid for through Ecocash
- `currencyCode` (string, required): The currency code used for processing the payment amount
- `firstName` (string): The first name of the user initiating the transaction
- `lastName` (string): The last name of the user initiating the transaction
- `mobilePhoneNumber` (string): The user's mobile phone number associated with the Ecocash account for transaction verification
- `email` (string): The email address of the user associated with the Ecocash account
- `cancelUrl` (string): The URL to redirect the user to if they choose to cancel the payment transaction
- `failureUrl` (string): The URL to redirect the user to in case of a failed Ecocash payment transaction
- `ecocashMobile` (string, required): The mobile number linked to the user's Ecocash account for processing the payment

**Response (200 OK):**
```json
{
  "responseMessage": "",
  "responseCode": "",
  "status": "",
  "transactionReference": ""
}
```

**Response Attributes:**
- `responseMessage` (string): Additional information or message related to the payment transaction response
- `responseCode` (string): The code indicating the status of the payment transaction response
- `status` (string): The current status of the payment transaction
- `transactionReference` (string): A unique reference code assigned to the completed transaction for tracking purposes

⚠️ **Poll the Check Status API to track the status of the payment**

---

### Innbucks Express Checkout

**Flow:**
1. Customer initiates payment on merchant's platform
2. Merchant sends payment request to Smile&Pay (specifying InnBucks method)
3. Smile&Pay generates unique payment code (valid for limited time)
4. Merchant displays this code to customer
5. Customer opens InnBucks app and enters the payment code
6. InnBucks system validates and processes payment
7. Smile&Pay receives confirmation and sends status callback to merchant
8. Merchant updates order status

---

### Omari Express Checkout

**Flow:**
1. Customer initiates payment on merchant platform
2. Merchant sends payment request to Smile&Pay (with phone number)
3. Smile&Pay triggers Omari to generate and send SMS OTP
4. Customer receives OTP via SMS
5. Customer enters OTP in merchant's UI (no redirect)
6. Merchant submits OTP to Smile&Pay for verification
7. Smile&Pay validates OTP with Omari
8. Omari confirms approval
9. Smile&Pay sends payment status callback to merchant
10. Merchant updates customer UI

---

### SmileCash Express Checkout

**Flow:**
1. Customer initiates payment on merchant platform
2. Merchant sends payment request to Smile&Pay (with phone number)
3. Smile&Pay triggers SmileCash to generate and send SMS OTP
4. Customer receives OTP via SMS
5. Customer enters OTP in merchant's UI (no redirect)
6. Merchant submits OTP to Smile&Pay for verification
7. Smile&Pay validates OTP with SmileCash
8. SmileCash confirms approval
9. Smile&Pay sends payment status callback to merchant
10. Merchant updates customer UI

---

### Visa/Mastercard Express Checkout

**Flow:**
1. Customer enters card details in your UI
2. Your server sends to Smile&Pay API
3. Smile&Pay returns 3D Secure HTML for redirection
4. Customer is redirected to card issuer's authentication page
5. After authentication, callback to your return URL
6. Smile&Pay sends final payment status via webhook

---

## Utility APIs

### Check Payment Status

This section allows users to check the status of a specific transaction by providing the order reference. Users can retrieve essential information such as the payment status, transaction details, and other related data associated with the order reference.

**Endpoint:** `GET /payments/transaction/{orderReference}/status/check`

**Path Parameters:**
- `orderReference` (string, required): The unique order reference

**Response (200 OK):**
```json
{
  "merchantId": "",
  "reference": "",
  "orderReference": "",
  "itemName": "",
  "amount": null,
  "currency": "",
  "paymentOption": "",
  "status": "",
  "createdDate": "",
  "returnUrl": "",
  "resultUrl": "",
  "clientFee": null,
  "merchantFee": null
}
```

**Response Attributes:**
- `merchantId` (string): The unique identifier for the merchant associated with the payment transaction
- `reference` (string): The reference number associated with the payment transaction
- `orderReference` (string): The order reference
- `itemName` (string): The name of the item being purchased in the payment transaction
- `amount` (number): The amount of the payment transaction
- `currency` (string): The currency in which the payment transaction is processed
- `paymentOption` (string): The payment option selected for the transaction
- `status` (string): The current status of the payment transaction
- `createdDate` (string, date-time): The date and time when the payment transaction was created
- `returnUrl` (string): The URL to which the user will be redirected after the payment transaction is completed
- `resultUrl` (string): The URL where the payment transaction result will be displayed
- `clientFee` (number): The fee charged to the client for the payment transaction
- `merchantFee` (number): The fee charged to the merchant for processing the payment transaction

**cURL Example:**
```bash
curl --location --globoff 'https://zbnet.zb.co.zw/wallet_sandbox_api/payments-gateway/payments/transaction/{orderReference}/status/check' \
  -H "x-api-key: YOUR_API_KEY" \
  -H "x-api-secret: YOUR_API_SECRET"
```

---

### Cancel Payment

The "cancel Payment By Order Reference" section allows users to cancel a payment by providing the order reference.

**Endpoint:** `POST /payments/cancel/{orderReference}`

**Path Parameters:**
- `orderReference` (string, required): The unique identifier for the order associated with the payment cancellation

**Response (200 OK):**
```json
{
  "success": false,
  "description": "",
  "returnUrl": ""
}
```

**Response Attributes:**
- `success` (boolean): Indicates whether the payment cancellation was successful. Possible values: true or false
- `description` (string): An additional description or message related to the payment cancellation process
- `returnUrl` (string): The URL to redirect the user to after the payment cancellation process is completed

**cURL Example:**
```bash
curl --location --globoff --request POST 'https://zbnet.zb.co.zw/wallet_sandbox_api/payments-gateway/payments/cancel/{orderReference}' \
  -H "x-api-key: YOUR_API_KEY" \
  -H "x-api-secret: YOUR_API_SECRET"
```

---

## Test Accounts

### SmileCash
Use the following account & OTP when testing smilecash payments:
- **SmileCash Mobile:** 0711111111
- **OTP:** 000000

### VISA/Mastercard
Use the following card when testing visa/mastercard payments:
- **Cardholder Name:** John Doe
- **Card Number:** 2223000000000007
- **Expiry:** 01/39
- **CVV:** 100

### ECOCASH
Use the below test account for ecocash payments:
- **Phone:** 263788687707

Currently approval of ecocash test payments is done from that test mobile. Get in touch with the smilepay team for approval of payments when testing.

---

## Summary

This documentation covers:
- ✅ Sandbox setup and API key generation
- ✅ Standard Checkout (hosted payment page)
- ✅ Express Checkout (direct API integration)
- ✅ Multiple payment methods (Ecocash, Innbucks, Omari, SmileCash, Cards)
- ✅ Webhook handling for payment status
- ✅ Status checking and payment cancellation
- ✅ Test accounts for sandbox testing

For production use, ensure you:
1. Register for production merchant account
2. Generate production API keys
3. Switch to production base URL
4. Implement proper error handling and status polling
5. Secure your API keys and never expose them client-side
