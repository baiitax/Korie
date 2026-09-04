# Treasury & Liquidity API Specification

## 1. REST Endpoints Overview

| Method | Endpoint | Purpose | RBAC Roles |
|---|---|---|---|
| `GET` | `/api/core/v1/treasury/positions` | Authoritative bank & provider account balances | `TREASURY_OFFICER`, `CFO`, `SUPER_ADMIN` |
| `GET` | `/api/core/v1/treasury/liquidity` | Real-time available liquidity & waterfall analysis | `TREASURY_OFFICER`, `CFO` |
| `GET` | `/api/core/v1/treasury/forecasts` | Multi-horizon cash flow forecasts (NOW, Intraday, 7D, 30D) | `TREASURY_OFFICER`, `CFO` |
| `GET` | `/api/core/v1/treasury/funding-requests` | List liquidity rebalancing recommendations | `TREASURY_OFFICER`, `CFO` |
| `POST` | `/api/core/v1/treasury/funding-requests` | Maker: Initiate bank/vault rebalancing request | `TREASURY_MAKER` |
| `POST` | `/api/core/v1/treasury/funding-requests/[id]/approve` | Checker: Approve and execute bank rebalancing | `TREASURY_CHECKER`, `CFO` |
| `GET` | `/api/core/v1/treasury/fx-position` | Multi-currency book exposure (NGN vs XOF) & P&L | `TREASURY_OFFICER`, `BDC_HEAD` |
| `GET` | `/api/core/v1/treasury/alerts` | Active concentration, reserve, & liquidity alerts | `TREASURY_OFFICER`, `RISK_LEAD` |
| `POST` | `/api/core/v1/treasury/stress-tests` | Run simulated liquidity shock scenario | `TREASURY_OFFICER`, `CFO` |

---

## 2. Liquidity Calculation Request / Response

### `GET /api/core/v1/treasury/liquidity?currency=NGN`
**Response Payload**:
```json
{
  "status": "success",
  "data": {
    "currency": "NGN",
    "totalLiquidAssetsMinor": 21135000000,
    "eligibleBankCashMinor": 15000000000,
    "eligibleProviderCashMinor": 6135000000,
    "deductions": {
      "restrictedFundsMinor": 500000000,
      "committedSettlementsMinor": 1721780000,
      "rollingReservesMinor": 90620000,
      "activeHoldsMinor": 45000000
    },
    "availableLiquidityMinor": 18777600000,
    "targetSafetyBufferMinor": 5000000000,
    "netLiquiditySurplusMinor": 13777600000,
    "liquidityStatus": "HEALTHY_SURPLUS"
  }
}
```
