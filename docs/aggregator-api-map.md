# KORIEPAY AGGREGATOR API SPECIFICATION
## REST API Reference for Agency Float & Network Telemetry
**Base URL:** `https://api.koriepay.com/v1/aggregator`  
**Authentication:** `Bearer kp_live_agg_...`  

---

## 1. Endpoints

### 1.1 Dispatch Float to Agent
**`POST /liquidity/dispatch`**

```json
{
  "agent_id": "agt-001",
  "amount": 500000,
  "currency": "NGN",
  "auth_pin": "••••"
}
```

Response:
```json
{
  "status": "success",
  "reference": "KP-FLOAT-881204",
  "agent_code": "AGT-KN-0104",
  "dispatched_amount": 500000,
  "new_agent_balance": 2950000,
  "timestamp": "2026-09-03T11:58:20Z"
}
```

### 1.2 Query Agent Node Telemetry
**`GET /agents/:id/telemetry`**

```json
{
  "status": "success",
  "data": {
    "agent_id": "agt-001",
    "wallet_balance": 2450000,
    "cash_in_drawer": 1800000,
    "today_volume": 8450000,
    "success_rate": 99.4,
    "risk_state": "LOW"
  }
}
```

### 1.3 Trigger On-Demand Providus Settlement Payout
**`POST /settlements/payout`**

```json
{
  "amount": 2000000,
  "destination_bank": "Providus Bank Nigeria",
  "destination_account": "0182****29"
}
```
