# Centralized Data Quality Framework & Readiness Gates

## 1. Multi-Dimensional Data Quality Dimensions

The Data Quality Engine executes automated test suites across 8 core dimensions before datasets are certified for reporting:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    DATA QUALITY SCORING DIMENSIONS                      │
├───────────────────┬───────────────────┬─────────────────────────────────┤
│ 1. Completeness   │ 2. Accuracy       │ 3. Timeliness                   │
│ (0% Nulls in PK)  │ (Format & Value)  │ (Arrived within Expected SLA)   │
├───────────────────┼───────────────────┼─────────────────────────────────┤
│ 4. Consistency    │ 5. Uniqueness     │ 6. Validity                     │
│ (Cross-System GL) │ (0 Duplicates)    │ (ISO Currencies & Schema Valid) │
├───────────────────┼───────────────────┼─────────────────────────────────┤
│ 7. Referential    │ 8. Reconciliation │ Overall Composite DQ Score      │
│ (Foreign Keys OK) │ (Source = Mart)   │ (e.g. 98.7% Certified)          │
└───────────────────┴───────────────────┴─────────────────────────────────┘
```

---

## 2. Mathematical Scoring Model

The overall **Data Quality Score ($DQ_{overall}$)** is calculated as a weighted average of individual dimension scores:

$$DQ_{overall} = \sum_{i=1}^{8} (w_i \times S_i)$$

Where:
- $w_{Reconciliation} = 0.25$ (Weight: 25%)
- $w_{Accuracy} = 0.20$ (Weight: 20%)
- $w_{Completeness} = 0.15$ (Weight: 15%)
- $w_{Consistency} = 0.15$ (Weight: 15%)
- $w_{Referential} = 0.10$ (Weight: 10%)
- $w_{Timeliness} = 0.05$ (Weight: 5%)
- $w_{Uniqueness} = 0.05$ (Weight: 5%)
- $w_{Validity} = 0.05$ (Weight: 5%)

---

## 3. Data Readiness Gates

Datasets entering the regulatory and financial pipeline are assigned one of four readiness states:

1. **`DATA_READY`** ($DQ \ge 98.0\%$, zero critical assertion failures):
   - Certified for automated report preparation and submission workflows.
2. **`DATA_READY_WITH_WARNINGS`** ($95.0\% \le DQ < 98.0\%$, non-material warnings):
   - Permitted to proceed with explicit reviewer acknowledgment.
3. **`DATA_NOT_READY`** ($90.0\% \le DQ < 95.0\%$ or missing expected batch feeds):
   - Report generation paused pending feed arrival.
4. **`DATA_BLOCKED`** ($DQ < 90.0\%$ or any hard reconciliation break):
   - Hard stop. Prevents approval or submission until engineering and data stewards resolve the underlying discrepancy.
