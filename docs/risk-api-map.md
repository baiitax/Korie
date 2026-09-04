# Fraud & Risk API Specification

## 1. REST Endpoints Overview

| Method | Endpoint | Purpose | RBAC Roles |
|---|---|---|---|
| `POST` | `/api/core/v1/risk/evaluate` | Synchronous risk assessment pipeline for incoming transaction | `INTERNAL_CORE`, `PAYMENTS_SERVICE` |
| `GET` | `/api/core/v1/risk/decisions` | Query immutable risk decision audit logs | `RISK_OFFICER`, `SUPER_ADMIN` |
| `GET` | `/api/core/v1/risk/decisions/[id]` | Fetch 360° decision trace with signal factors | `RISK_OFFICER`, `SUPER_ADMIN` |
| `GET` | `/api/core/v1/risk/cases` | Work queue for active fraud investigation cases | `RISK_OFFICER`, `COMPLIANCE_LEAD` |
| `POST` | `/api/core/v1/risk/cases/[id]/resolve` | Maker-Checker fraud case resolution & status update | `RISK_OFFICER`, `SUPER_ADMIN` |
| `GET` | `/api/core/v1/risk/holds` | Active financial risk holds listing | `RISK_OFFICER`, `TREASURY_OFFICER` |
| `POST` | `/api/core/v1/risk/holds` | Create new risk hold on entity or transaction | `RISK_OFFICER`, `AUTOMATED_ENGINE` |
| `POST` | `/api/core/v1/risk/holds/[id]/release` | Dual-key Maker-Checker release of risk hold | `RISK_CHECKER`, `SUPER_ADMIN` |
| `GET` | `/api/core/v1/risk/rules` | Fetch catalog of versioned risk rules | `RISK_OFFICER`, `SUPER_ADMIN` |

---

## 2. Risk Evaluation Request / Response Schema

### `POST /api/core/v1/risk/evaluate`
**Request Payload**:
```json
{
  "transactionReference": "TXN-NGN-984210",
  "entityId": "usr_cust_lagos_001",
  "entityType": "CUSTOMER",
  "amountMinor": 75000000,
  "currency": "NGN",
  "countryCode": "NG",
  "device": {
    "deviceId": "dev_fp_98a72b",
    "ipAddress": "102.89.23.44",
    "isVpn": false,
    "isNewDevice": true
  },
  "beneficiary": {
    "accountNumber": "0123984756",
    "bankCode": "058",
    "isNewBeneficiary": true
  }
}
```

**Response Payload**:
```json
{
  "status": "success",
  "data": {
    "decisionId": "dec_1788469000_1a2b",
    "compositeScore": 65,
    "riskBand": "HIGH",
    "decision": "REVIEW",
    "ruleHits": [
      {
        "ruleId": "RR-DEV-001",
        "ruleName": "Unknown / New Device Signature",
        "scoreDelta": 25
      },
      {
        "ruleId": "RR-TXN-001",
        "ruleName": "High-Value First-Time Beneficiary",
        "scoreDelta": 40
      }
    ],
    "explanation": "Elevated risk due to transaction initiated on new device to unverified first-time beneficiary.",
    "executionLatencyMs": 8,
    "policyVersion": "v1.2.0"
  }
}
```
