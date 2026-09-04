# Key Risk Indicators (KRI) Catalog & Telemetry Formulas

## 1. Multi-Domain KRI Telemetry
KRIs continuously compute institutional health across 6 core functional domains:

### Financial & Liquidity KRIs
- `KRI-FIN-01`: **Liquidity Buffer Coverage Ratio**: $\frac{\text{Available Liquid Assets}}{\text{Target Safety Buffer}} \times 100\%$ (Breach $< 100\%$).
- `KRI-FIN-02`: **Single Bank Nostro Concentration**: $\frac{\text{Primary Bank Cash}}{\text{Total Liquid Assets}} \times 100\%$ (Warning $> 70\%$).

### Payment & Switch KRIs
- `KRI-PAY-01`: **Payment Switch Failure Rate**: $\frac{\text{Failed Transactions}}{\text{Total Attempted Transactions}} \times 100\%$ (Breach $> 1.5\%$).
- `KRI-PAY-02`: **Unknown Transaction Recovery Lag**: Count of transactions in `STATE_UNKNOWN` $> 15\text{ minutes}$ (Breach $> 5$ cases).

### Fraud & AML KRIs
- `KRI-FRD-01`: **Net Fraud Loss Ratio**: $\frac{\text{Unrecovered Fraud Loss}}{\text{Monthly Gross Volume}} \times 10000\text{ bps}$ (Breach $> 1.5\text{ bps}$).
- `KRI-AML-01`: **Overdue AML Alert Investigation Backlog**: Count of unreviewed AML alerts past 72h SLA (Breach $> 0$).

### Cyber & Operational KRIs
- `KRI-OPS-01`: **Cash Till Variance Rate**: $\frac{\text{Till Sessions with Discrepancies}}{\text{Total Closed Tills}} \times 100\%$ (Breach $> 2.0\%$).
- `KRI-CYB-01`: **Critical Vulnerability Remediation Window**: Days to patch P0 CVSS $> 9.0$ findings (Breach $> 3\text{ days}$).
