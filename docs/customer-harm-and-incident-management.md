# Customer Harm & Systemic Incident Management

## 1. Automated Systemic Harm Detection
The engine continuously monitors operational streams to cluster localized errors into systemic incident events:
- **Provider Outage Cluster**: $\ge 15$ failed transactions within 5 minutes on a single banking node.
- **Agent Misconduct Cluster**: $\ge 3$ customer complaints for overcharging against a single Agent ID in 24 hours.
- **Terminal Glitch Cluster**: Widespread POS thermal printer or EMV timeout errors in a geographical LGA / district.

---

## 2. Incident Resolution & Customer Compensation Pipeline
1. `HARM_EVENT_DETECTED`: Automated cluster trigger created.
2. `INCIDENT_OPENED`: Operations & Consumer Protection teams notified.
3. `ROOT_CAUSE_ISOLATION`: Node routed to circuit breaker or provider adapter switched.
4. `AFFECTED_CUSTOMERS_REMEDIATED`: Batch financial compensation calculated and posted to Core Ledger.
5. `POSTMORTEM_PUBLISHED`: Regulatory incident filing dispatched to CBN / BCEAO.
