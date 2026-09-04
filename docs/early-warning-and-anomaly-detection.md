# Real-Time Anomaly Detection & Early-Warning Intelligence

## 1. Multi-Domain Anomaly Detection

The Early-Warning Engine runs continuous statistical surveillance across 5 operational domains:

1. **Financial & Revenue**: Abrupt gross margin collapse, sudden unbilled fee spikes, fee-to-volume ratio divergences.
2. **Payment Switch & Providers**: Consecutive provider timeouts (> 2.0% failure rate over 5 minutes), latency degradation (> 1,200ms).
3. **Treasury & Liquidity**: Buffer erosion (< 120% coverage), rapid uncharacteristic Nostro outflows.
4. **Agent Network & Cash**: Sharp drops in active POS terminals, abnormal cash-out velocity without offsetting deposits.
5. **Fraud & AML**: Velocity spikes in P2P transfers, unusual cross-border corridor volume anomalies.

---

## 2. Detection Methodologies & Severity Triage

- **Z-Score & Modified Z-Score (MAD)**: High-speed deviation detection for real-time payment volumes.
- **Isolation Forests**: Multi-dimensional anomaly scoring across customer transaction behaviors.
- **Dynamic Threshold Bands**: Upper and lower bound confidence envelopes based on historical time-of-day baselines.

### Severity Classification:
- **`INFO`**: Minor statistical variation (< 1.5 $\sigma$), logged for telemetry.
- **`LOW`**: Emerging trend deviation, highlighted in executive dashboards.
- **`MEDIUM`**: Moderate anomaly, generates proactive analyst alert.
- **`HIGH`**: Significant operational variance, creates a Governed Decision Card for management review.
- **`CRITICAL`**: Severe threshold breach, triggers immediate executive notification (C-Suite).
