# SIEM & Security Operations Center (SOC) Architecture

## 1. Universal Security Event Ingestion Pipeline
The KoriePay Security Operations Center (SOC) centralizes telemetry across authentication, authorization, APIs, database RLS, payment switches, fraud engines, and AML transaction monitoring into a normalized security event model.

```
+-----------------------------------------------------------------------------------------+
|                                SECURITY TELEMETRY SOURCES                               |
|  Auth / MFA  |  API Gateway  |  DB / RLS  |  Payment Switch  |  Device Signals  |  AML  |
+-----------------------------------------------------------------------------------------+
                                           |
                                           v
+-----------------------------------------------------------------------------------------+
|                              INGESTION & OUTBOX BUFFER                                  |
|         Idempotency Keying  |  Durable Storage  |  Zero-Loss Telemetry Queue            |
+-----------------------------------------------------------------------------------------+
                                           |
                                           v
+-----------------------------------------------------------------------------------------+
|                              NORMALIZATION & CORRELATION                                |
|  Schema Standardization (actor, session, device, ip, action, result, severity, context) |
+-----------------------------------------------------------------------------------------+
                                           |
                                           v
+-----------------------------------------------------------------------------------------+
|                                REAL-TIME DETECTION ENGINE                               |
|     Brute Force  |  Credential Stuffing  |  Impossible Travel  |  Privilege Escalation  |
+-----------------------------------------------------------------------------------------+
                                           |
                                           v
+-----------------------------------------------------------------------------------------+
|                             SOC COMMAND CENTER & WORKBENCH                              |
|   Security Incident Management  |  Automated Containment  |  Forensic Timelines         |
+-----------------------------------------------------------------------------------------+
```

---

## 2. Common Security Event Schema
Every security event conforms to the strict immutable structure:
- `event_id`: UUIDv4
- `event_type`: Categorized event code (e.g., `LOGIN_FAILURE`, `PRIVILEGE_ELEVATION_ATTEMPT`, `RLS_DENIAL`, `BREAK_GLASS_ACTIVATED`).
- `severity`: `INFO` | `LOW` | `MEDIUM` | `HIGH` | `CRITICAL`
- `timestamp`: ISO-8601 UTC timestamp
- `actor_id` & `actor_type`: Workforce user, service account, or customer
- `session_id` & `device_id`: Associated session and hardware fingerprint tokens
- `ip_context`: Client IP, subnet, and country code
- `resource_type` & `resource_id`: Targeted domain entity
- `action`: Specific operation attempted
- `result`: `SUCCESS` | `DENIED` | `CHALLENGED` | `ABORTED`
- `reason`: Machine-parseable error or policy reason code
- `correlation_id` & `request_id`: Tracing identifiers for distributed end-to-end correlation.
