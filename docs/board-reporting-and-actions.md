# Board Risk & Performance Reporting Pack & Action Tracking

## 1. 20-Section Board Reporting Structure

The KoriePay Board Reporting Engine compiles a comprehensive, audit-grade Board Pack for quarterly and extraordinary Board meetings:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       BOARD OF DIRECTORS REPORTING PACK                     │
├─────────────────────────────────────────────────────────────────────────────┤
│ 1. Executive Summary & CEO Overview         11. Fraud Telemetry & Prevention│
│ 2. Financial Performance & P&L Analysis     12. Cybersecurity & SOC Health  │
│ 3. Balance Sheet & Asset Quality            13. Regulatory Compliance Status│
│ 4. Treasury & Liquidity Safeguarding        14. Operational SLA Performance │
│ 5. Regulatory Capital Adequacy              15. Consumer Protection & TCF   │
│ 6. Strategic Growth & Unit Economics        16. Strategic Product Roadmap   │
│ 7. Customer Acquisition & Active Wallets    17. Major Enterprise Incidents  │
│ 8. Agent Network & Rural Inclusion          18. Critical Open Issues & CAP  │
│ 9. Risk Appetite Tolerances & Breaches      19. Management Corrective Action│
│ 10. AML / CFT & Sanctions Compliance        20. Board Approvals & Decisions │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Governed Board Action Item Tracking

Every decision or directive issued by the Board of Directors is recorded in the `board_report_actions` registry:

- **Attributes**: `action_id`, `board_pack_id`, `directive_title`, `assigned_executive_owner`, `due_date`, `priority` (`HIGH`, `CRITICAL`), `status` (`OPEN`, `IN_PROGRESS`, `UNDER_REVIEW`, `COMPLETED`), `evidence_artifact_url`, `completion_date`.
- **Governance**: Actions cannot be closed without verified audit evidence reviewed by the Company Secretary and Chief Risk Officer.
