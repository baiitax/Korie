# KORIEPAY DEVELOPER API GATEWAY & WEBHOOK SPECIFICATION
## REST API Reference for Online & In-Store Payment Integrations
**API Version:** `v1.4.0`  
**Base URL:** `https://api.koriepay.com/v1/merchant`  
**Authentication:** Bearer Token via Secret Key (`kp_live_...` or `kp_test_...`)  

---

## 1. Authentication Headers

All merchant API requests must include the following headers:

```http
Authorization: Bearer kp_live_992817a02b1c3d4e5f6a7b8c9d0e1f2a
Content-Type: application/json
Accept: application/json
```

---

## 2. Core API Endpoints

### 2.1 Initialize In-Store / Online Checkout
**`POST /checkout`**

Creates a dynamic payment session with Providus Bank virtual NUBAN, QR payload, and web checkout URL.

#### Request Body
```json
{
  "amount": 2500000,
  "currency": "NGN",
  "customer_email": "danladi@agrodistributors.ng",
  "customer_name": "Alhaji Danladi",
  "customer_phone": "+2348039281734",
  "branch_id": "BR-VI-01",
  "callback_url": "https://saharasupermarket.ng/checkout/success",
  "reference": "ORD-2026-99201"
}
```

#### Response (HTTP 201 Created)
```json
{
  "status": "success",
  "message": "Checkout initialized successfully",
  "data": {
    "reference": "ORD-2026-99201",
    "koriepay_reference": "TX-MCH-99201",
    "amount": 2500000,
    "fee": 37500,
    "net_amount": 2462500,
    "virtual_account": {
      "bank_name": "Providus Bank",
      "account_number": "9928193820",
      "account_name": "KORIE / SAHARA SUPERMARKET / CASHIER-1",
      "expires_at": "2026-09-03T23:59:59Z"
    },
    "qr_code_data": "koriepay://pay?ref=ORD-2026-99201&acc=9928193820&amt=2500000",
    "checkout_url": "https://pay.koriepay.com/checkout/ORD-2026-99201"
  }
}
```

---

### 2.2 Verify Payment Status
**`GET /transactions/:reference/verify`**

Checks the real-time settlement status of a transaction.

#### Response (HTTP 200 OK)
```json
{
  "status": "success",
  "data": {
    "reference": "ORD-2026-99201",
    "status": "SUCCESSFUL",
    "amount": 2500000,
    "fee": 37500,
    "net_amount": 2462500,
    "channel": "BANK_TRANSFER",
    "provider_reference": "PROV-NIP-9928192301",
    "paid_at": "2026-09-03T10:14:22Z"
  }
}
```

---

## 3. Real-Time Webhook Notifications

When a payment event occurs, KoriePay dispatches an `HTTP POST` request to your registered webhook URL.

### Webhook Signature Verification
Every webhook includes an `X-KoriePay-Signature` header computed as:
```
HMAC_SHA256(request_body, secret_key)
```

### Event: `payment.successful`
```json
{
  "event": "payment.successful",
  "event_id": "EVT-99281023",
  "timestamp": 1788430462,
  "data": {
    "reference": "ORD-2026-99201",
    "amount": 2500000,
    "currency": "NGN",
    "net_amount": 2462500,
    "customer": {
      "name": "Alhaji Danladi",
      "phone": "+2348039281734",
      "email": "danladi@agrodistributors.ng"
    },
    "channel": "BANK_TRANSFER",
    "settlement_bank": "Providus Bank",
    "branch_id": "BR-VI-01"
  }
}
```

---

## 4. Error Handling & HTTP Status Codes

| Code | Status | Description |
|---|---|---|
| `200` | OK | Request succeeded. |
| `201` | Created | Resource successfully created. |
| `400` | Bad Request | Missing required parameters or invalid JSON. |
| `401` | Unauthorized | Invalid or expired API key. |
| `422` | Unprocessable Entity | Validation error (e.g., negative amount, invalid phone). |
| `500` | Server Error | KoriePay internal error; retry with exponential backoff. |
