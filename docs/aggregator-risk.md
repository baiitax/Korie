# KORIEPAY AGGREGATOR RISK & FRAUD MANAGEMENT
## Continuous Velocity Anomaly Detection & Terminal Lockout Controls

---

## 1. Risk Telemetry Signals

The Aggregator Risk Engine monitors network nodes for:
1. **Velocity Spikes:** Consecutive rapid card cash-out attempts (>3 within 5 minutes on a single terminal).
2. **Terminal Failure Clustering:** Consecutive pin rejections or invalid card responses.
3. **Abnormal Cash Drain:** Rapid depletion of agent drawer cash or float without matching counter transactions.
4. **Geographical Telemetry Jumps:** POS terminal signaling location outside assigned territory boundaries.

---

## 2. Containment Actions

- **Automated Terminal Soft Lock:** Suspends card cash-out while permitting basic transfer operations.
- **Alert Dispatch:** Raises high-severity alert on `/aggregator/risk` and `/aggregator/operations`.
- **Field Lead Inspection:** Dispatches territory supervisor for on-site agent verification.
