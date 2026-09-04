# KORIEPAY AGGREGATOR DATA MAP
## Database Schema, Entities, Relationships & Scoping

---

## 1. Core Entity Relationship Model

```text
+------------------------+             +------------------------+
|   Aggregator Org       |1           *|   Aggregated Agent     |
| (Sahel Syndicate)      |─────────────| (Dan-Batta Agro, etc.) |
+------------------------+             +------------------------+
            │1                                      │1
            │                                       │
            │*                                      │*
+------------------------+             +------------------------+
|   Aggregated Merchant  |             |  Aggregator Transaction|
| (Dawanau Grain, etc.)  |             |  (POS, Transfer, Cash) |
+------------------------+             +------------------------+
            │                                       │
            └───────────────────┬───────────────────┘
                                │*
                    +------------------------+
                    |  Territory & Branch    |
                    | (Kano, Kaduna, Niamey) |
                    +------------------------+
```

---

## 2. Table Schemas & Scoping

### `aggregators`
- `id`: UUID (Primary Key)
- `name`: VARCHAR(255)
- `code`: VARCHAR(50) UNIQUE (`AGG-SAHEL-001`)
- `rc_number`: VARCHAR(50)
- `country`: VARCHAR(2) (`NG` | `NE`)
- `currency`: VARCHAR(3) (`NGN` | `XOF`)
- `wallet_balance`: NUMERIC(18, 2)
- `available_liquidity`: NUMERIC(18, 2)
- `settlement_bank`: VARCHAR(100) (Providus Bank Nigeria)
- `settlement_account`: VARCHAR(50)

### `agents`
- `id`: UUID (Primary Key)
- `aggregator_id`: UUID (Foreign Key)
- `agent_code`: VARCHAR(50) UNIQUE (`AGT-KN-0104`)
- `full_name`: VARCHAR(255)
- `business_name`: VARCHAR(255)
- `territory_id`: UUID (Foreign Key)
- `wallet_balance`: NUMERIC(18, 2)
- `cash_in_drawer`: NUMERIC(18, 2)
- `status`: VARCHAR(50) (`ACTIVE` | `RESTRICTED` | `SUSPENDED`)

### `transactions`
- `id`: UUID (Primary Key)
- `reference`: VARCHAR(100) UNIQUE
- `correlation_id`: VARCHAR(100)
- `provider_reference`: VARCHAR(100)
- `aggregator_id`: UUID
- `agent_id`: UUID (Nullable)
- `merchant_id`: UUID (Nullable)
- `amount`: NUMERIC(18, 2)
- `fee`: NUMERIC(18, 2)
- `agent_commission`: NUMERIC(18, 2)
- `aggregator_commission`: NUMERIC(18, 2)
- `status`: VARCHAR(50) (`SUCCESSFUL` | `PENDING` | `FAILED` | `REVERSED`)
- `created_at`: TIMESTAMPTZ
