# 03 — Configuration & Automation hub: database, bank node, Twilio/SMTP, Flutterwave, NIBSS, future adapters

Status: **SHIPPED + LIVE** (prod build on :3000) · Date: 2026-09-09 · Branch: `feature/compliance-portal-demo-rebuild`

## What was asked

> “Add and enhance the admin Dashboard with configuration page where I will add the database configuration based on
> Supabase requirements, Bank Node & API, Twilio and SMTP settings, Flutterwave and Nibss configuration and any
> other needed external requirement to adapt in the future.”

The existing hub at `/admin/settings` (Configuration & Automation) was **extended in place** — no parallel page.

## What was added

### 1. First-run templates (hub opens pre-configured, operator fills in)

A brand-new store now seeds **7 canonical connector templates** (SYSTEM_TEMPLATE, status CONFIGURED, roles set):

| Code | Category | Role |
|---|---|---|
| `SUPABASE_CORE` | **DATABASE** (new category) | PRIMARY |
| `PROV-NG-01` Providus Bank Plc | BANK_NODE | PRIMARY |
| `KORIS-NE-01` Coris Bank Sahel | BANK_NODE | FAILOVER |
| `NIBSS-NIP-01` NIP rail | SETTLEMENT_RAIL | PRIMARY |
| `FLW-NG-01` Flutterwave | PAYMENT_GATEWAY | PRIMARY |
| `TWILIO-NOTIFY-01` Twilio | NOTIFICATION_PROVIDER | PRIMARY |
| `SMTP-KORIEPAY` SMTP relay | NOTIFICATION_PROVIDER | FAILOVER |

Seeding runs once (`seedTemplatesIfFirstRun`): an operator-cleared list stays cleared; the DATABASE category tab
was added to the Connections panel filter.

### 2. Category field catalogs (per-provider settings the operator enters)

- **DATABASE (Supabase)** — engine (SUPABASE_POSTGRES…), project URL, project ref, DB host (direct/pooler), port,
  DB name, DB user, endpoint mode (DIRECT / TRANSACTION_POOLER / SESSION_POOLER), SSL mode
  (REQUIRE / VERIFY_FULL / DISABLE), anon key (public → metadata), schema.
- **BANK_NODE** — institution/bank code, NUBAN prefix, transfer rails (NIP / CFA-SIT / both). New hint: a
  CONNECTED + PRODUCTION node flips the Bank Core liquidity rail to LIVE (see docs/02).
- **SETTLEMENT_RAIL (NIBSS)** — clearing code, subscriber/client code, settlement cycle, **name-enquiry** endpoint,
  **BVN verification** endpoint, statement endpoint.
- **PAYMENT_GATEWAY (Flutterwave)** — merchant id, public key, charge/payout endpoints, webhook URL/event.
- **NOTIFICATION_PROVIDER (Twilio + SMTP)** — channel (SMS/EMAIL/WHATSAPP/PUSH), sender/from, Twilio Account SID,
  SMTP host/port, WhatsApp sender.

Field renderer is now kind-aware (selects and numeric fields render properly; previously everything was a text box).

### 3. Edit mode + credential policy, honest and reusable

- Connector cards gained an **Edit** action opening the same form prefilled (PATCH to `/api/admin/config/connectors/[id]`);
  secrets can be rotated there; category cannot be changed after creation.
- Per-category **Credentials policy** box (`secretHint` on each spec) states the convention:
  - Secret (password / secret key / auth token) → Secret field; at rest only a masked preview (`…` never raw);
    runtime resolves live value from env `KORIE_CONNECTOR_<CODE>_SECRET`.
  - Second credential (Supabase **service-role key**, Flutterwave webhook **signature hash**, NIBSS secondary) →
    env `KORIE_CONNECTOR_<CODE>_SECRET_2` only, never stored.
  - Public material (anon key, public key, SID, host/port) → metadata.

### 4. Future external requirements

Existing generic pattern preserved and now the documented recipe for “anything else”:
register via **Add connector/API** under a known category, or **CUSTOM_REST** (declare endpoints manually),
or add a new `ConnectorCategory` + `CATEGORY_FIELDS` + spec row + (optional) seeded template — the hub,
probe, discovery and role/route machinery are all schema-driven, so no further hard-coding is needed.

## Live verification (prod :3000)

```
/api/admin/config/categories → DATABASE present: engine, projectUrl, projectRef, dbHost, dbPort,
  dbName, dbUser, poolMode, sslMode, anonKey, schema (+ secretHint for credentials policy)
first store access → 7 templates seeded (SUPABASE_CORE PRIMARY, PROV-NG-01 PRIMARY,
  KORIS-NE-01 FAILOVER, NIBSS-NIP-01 PRIMARY, FLW-NG-01 PRIMARY, TWILIO-NOTIFY-01 PRIMARY,
  SMTP-KORIEPAY FAILOVER)
PATCH SUPABASE_CORE (PRODUCTION, project URL, pooler mode, anon key, schema…) →
  stored secretMasked "SUPA-SER…1234", hasSecretConfigured true
grep raw secret in /tmp/korie-admin-config.json → 0 occurrences (never persisted)
/api/bank/v1/liquidity still resolves rail SIMULATED (Providus template SANDBOX/CONFIGURED) —
  honest: no LIVE claims without a real CONNECTED+PRODUCTION node
```

## Honest boundaries

- Secrets are masked at rest; live values come from the environment per the engine’s `envSecretFor` convention.
- Probe = real HTTP health fetch (6s timeout) with configured auth — no fabricated CONNECTED; a probe of an
  unreachable sandbox URL genuinely fails and shows `FAILED`.
- No outbound Supabase/Flutterwave/NIBSS calls are fabricated in the demo; connectors become LIVE only when the
  operator supplies production endpoints + credentials that actually respond.
- Config store: `/tmp/korie-admin-config.json` (env `ADMIN_CONFIG_STORE_PATH`) — runtime only, never committed.
