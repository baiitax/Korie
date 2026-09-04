# SOC Security Detection Rules & Correlation Logic

## 1. Detection Rule Catalog

| Rule Code | Rule Name | Trigger Condition | Severity | Automated Containment |
| :--- | :--- | :--- | :--- | :--- |
| `SEC-DET-01` | **Workforce Brute Force Attack** | $\ge 5$ failed authentications within 5 minutes on same identity. | `HIGH` | Temporary Account Lockout (15 mins) |
| `SEC-DET-02` | **Distributed Credential Stuffing** | $>20$ failed logins from single IP subnet across multiple accounts within 10 minutes. | `CRITICAL` | Subnet Rate Limiting & Captcha Challenge |
| `SEC-DET-03` | **Impossible Travel / Anomaly** | Successful logins from disparate geographies within speed-of-light physically impossible interval ($>800\text{ km/h}$). | `HIGH` | Session Revocation & Mandatory Step-Up AAL3 |
| `SEC-DET-04` | **Unauthorized Privilege Escalation** | Execution of administrative API without active JIT grant or role binding. | `CRITICAL` | Immediate Session Termination & Security Case |
| `SEC-DET-05` | **Abnormal Mass Customer Data Exfiltration** | Single workforce user queries $>500$ customer PII records within 1 hour. | `CRITICAL` | Revoke PII Access Scope & Alert SOC Lead |
| `SEC-DET-06` | **Emergency Break-Glass Invocation** | Activation of break-glass emergency administrative token. | `CRITICAL` | Notify Security Incident Commander & Log Stream |
| `SEC-DET-07` | **Dormant Admin Account Reactivation** | Activity on administrator identity dormant for $>60$ days. | `HIGH` | Step-Up AAL3 Verification & Alert Security Manager |
| `SEC-DET-08` | **Service Account Key Misuse** | Machine API key utilized from non-whitelisted VPC CIDR block. | `CRITICAL` | Block Request & Flag Key for Immediate Rotation |

---

## 2. Multi-Signal Security Alert Correlation
Rather than flooding analysts with isolated raw alerts, the correlation engine aggregates related signals within a temporal window (60 minutes):
$$\text{Incident} = \text{Cluster}(\text{Brute Force Failures} + \text{Device Change} + \text{New IP} + \text{Privilege Escalation Attempt})$$
This yields a single actionable incident dossier with end-to-end telemetry preserved.
