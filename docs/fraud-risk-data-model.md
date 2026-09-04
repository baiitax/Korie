# Fraud & Risk Data Model

## 1. Relational Topology & Entity Relationships

The Fraud/Risk data architecture is rooted in PostgreSQL/Supabase with strict relational integrity, immutable historical decision logs, versioned rules, and isolated entity risk profiles.

```
                          ┌──────────────────────┐
                          │    risk_entities     │
                          └──────────┬───────────┘
                                     │ 1
                                     │
                                     │ 1
                          ┌──────────▼───────────┐
                          │    risk_profiles     │
                          └──────────┬───────────┘
                                     │
         ┌───────────────────────────┼───────────────────────────┐
         │ 1                         │ 1                         │ 1
         │                           │                           │
         ▼ *                         ▼ *                         ▼ *
┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│  risk_decisions  │       │  risk_signals    │       │    risk_holds    │
└────────┬─────────┘       └──────────────────┘       └──────────────────┘
         │ 1
         ├───────────────────────────┐
         │ *                         │ *
         ▼                           ▼
┌──────────────────┐       ┌──────────────────┐
│risk_decision_fac │       │    risk_cases    │
└──────────────────┘       └─────────┬────────┘
                                     │ 1
                                     │ *
                           ┌─────────▼────────┐
                           │risk_case_events  │
                           └──────────────────┘
```

---

## 2. Table Specifications

### `risk_entities`
- `id` (UUID PK): Unique canonical identifier.
- `entity_type` (VARCHAR): `CUSTOMER`, `AGENT`, `MERCHANT`, `AGGREGATOR`, `DEVICE`, `BENEFICIARY`, `BANK_ACCOUNT`, `IP_ADDRESS`.
- `entity_reference` (VARCHAR): External business reference (e.g. `USR-1092`, `DEV-8841`).
- `country_code` (VARCHAR(2)): `NG` or `NE`.
- `created_at` (TIMESTAMPTZ).

### `risk_profiles`
- `id` (UUID PK)
- `entity_id` (UUID FK -> `risk_entities.id`)
- `current_risk_score` (INT CHECK (0..100))
- `current_risk_band` (VARCHAR): `VERY_LOW`, `LOW`, `MEDIUM`, `HIGH`, `VERY_HIGH`, `CRITICAL`.
- `lifetime_fraud_loss_minor` (BIGINT DEFAULT 0)
- `lifetime_prevented_loss_minor` (BIGINT DEFAULT 0)
- `chargeback_count` (INT DEFAULT 0)
- `reversal_count` (INT DEFAULT 0)
- `alert_count` (INT DEFAULT 0)
- `restriction_status` (VARCHAR): `UNRESTRICTED`, `STEP_UP_REQUIRED`, `UNDER_INVESTIGATION`, `TEMPORARY_FREEZE`, `PERMANENT_BLOCK`.
- `updated_at` (TIMESTAMPTZ)

### `risk_signals`
- `id` (UUID PK)
- `signal_key` (VARCHAR): e.g. `DEVICE_RECOGNITION_CONFIDENCE`, `GEOVELOCITY_KMH`, `VELOCITY_10M_COUNT`.
- `signal_category` (VARCHAR): `IDENTITY`, `DEVICE`, `NETWORK`, `TRANSACTION`, `BEHAVIORAL`, `AML`.
- `signal_value_type` (VARCHAR): `NUMERIC`, `BOOLEAN`, `STRING`, `JSON`.
- `is_active` (BOOLEAN DEFAULT TRUE)

### `risk_rules` & `risk_rule_versions`
- Immutable versioned rules defining conditions, operator, threshold, score impact, and forced actions.
- `rule_code` (VARCHAR): e.g. `RULE_DEV_NEW_HIGH_VAL`, `RULE_AGENT_CYCLING_10M`.
- `version` (INT)
- `scope` (VARCHAR): `CUSTOMER`, `AGENT`, `MERCHANT`, `GLOBAL`.
- `conditions_json` (JSONB): e.g. `[{"signal": "is_new_device", "op": "EQ", "val": true}, {"signal": "amount_minor", "op": "GT", "val": 10000000}]`.
- `action` (VARCHAR): `ALLOW`, `STEP_UP`, `REVIEW`, `HOLD`, `DECLINE`, `BLOCK`.
- `score_delta` (INT)

### `risk_decisions`
- Historical immutable log of every evaluated decision.
- `id` (UUID PK)
- `transaction_reference` (VARCHAR)
- `entity_id` (UUID FK)
- `composite_score` (INT)
- `risk_band` (VARCHAR)
- `decision` (VARCHAR)
- `decision_reason` (TEXT)
- `policy_version` (VARCHAR)
- `model_version` (VARCHAR)
- `execution_latency_ms` (INT)
- `created_at` (TIMESTAMPTZ)

### `risk_holds`
- Links risk decisions to the Core Financial Engine hold mechanics.
- `id` (UUID PK)
- `hold_reference` (VARCHAR UNIQUE)
- `entity_id` (UUID FK)
- `transaction_id` (VARCHAR)
- `amount_minor` (BIGINT)
- `currency` (VARCHAR(3))
- `hold_type` (VARCHAR): `RISK_HOLD`, `COMPLIANCE_HOLD`, `CHARGEBACK_HOLD`, `MANUAL_REVIEW_HOLD`.
- `status` (VARCHAR): `ACTIVE`, `RELEASED`, `ESCALATED_TO_SEIZURE`, `EXPIRED`.
- `created_by` (VARCHAR)
- `released_by` (VARCHAR)
- `reason` (TEXT)
