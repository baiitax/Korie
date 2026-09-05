/**
 * THE ONLY PLACE SYNTHETIC COMPLIANCE DATA IS DEFINED.
 *
 * Nothing outside `src/services/compliance/demo/` may construct a fake record.
 * Pages reach these rows through `service.ts`, which stamps `source: 'demo'` on
 * the envelope so every screen can badge what it is showing. In a live build
 * (`NEXT_PUBLIC_COMPLIANCE_DATA_MODE=live`) this module is never read and the
 * affected screens render an honest "not connected" state instead.
 *
 * The pre-existing MOCK_* sets are re-exported rather than copied, so the demo
 * keeps one version of each officer, restriction and policy instead of two.
 */

import {
  MOCK_ACCOUNT_RESTRICTIONS,
  MOCK_COMPLIANCE_AUDIT_LOGS,
  MOCK_COMPLIANCE_CALENDAR,
  MOCK_COMPLIANCE_OFFICERS,
  MOCK_COMPLIANCE_POLICIES,
  MOCK_KYC_RECORDS,
  MOCK_KYB_RECORDS,
  MOCK_REGULATORY_REPORTS,
  MOCK_SANCTIONS_ALERTS,
} from '@/services/complianceDataService';
import type {
  AccountRestriction,
  ComplianceAuditEntry,
  ComplianceCalendarEvent,
  ComplianceOfficer,
  CompliancePolicy,
  KycVerificationRecord,
  KybVerificationRecord,
  RegulatoryReport,
  SanctionsAlert,
} from '@/types/compliance';
import type { WatchlistRow } from '../types';

/**
 * Used only where a screen needs content in the demo and the backend has no
 * read endpoint for it (sanctions/PEP match queue, enforcement ledger, policy
 * library, audit history, team roster, obligation calendar, report register).
 * Anything the engines can answer is loaded live instead — see
 * `endpoints.ts`, which is the authority on that split.
 */
export const DEMO_KYC_RECORDS: KycVerificationRecord[] = MOCK_KYC_RECORDS;
export const DEMO_KYB_RECORDS: KybVerificationRecord[] = MOCK_KYB_RECORDS;
export const DEMO_SANCTIONS_ALERTS: SanctionsAlert[] = MOCK_SANCTIONS_ALERTS;
export const DEMO_RESTRICTIONS: AccountRestriction[] = MOCK_ACCOUNT_RESTRICTIONS;
export const DEMO_POLICIES: CompliancePolicy[] = MOCK_COMPLIANCE_POLICIES;
export const DEMO_AUDIT_LOGS: ComplianceAuditEntry[] = MOCK_COMPLIANCE_AUDIT_LOGS;
export const DEMO_CALENDAR: ComplianceCalendarEvent[] = MOCK_COMPLIANCE_CALENDAR;
export const DEMO_OFFICERS: ComplianceOfficer[] = MOCK_COMPLIANCE_OFFICERS;
export const DEMO_REPORTS: RegulatoryReport[] = MOCK_REGULATORY_REPORTS;

/* ── Watchlist sources ──────────────────────────────────────────────────────
 * Names are screened for real through AmlScreeningProvider (POST
 * /api/aml/screening), but no list-management endpoint exists: counts and
 * refresh times would be invented, so each source reports "not connected" and
 * the screen stays read-only — which is what the platform can actually do.
 */
export const DEMO_WATCHLISTS: WatchlistRow[] = [
  {
    id: 'wl-un',
    name: 'UN Security Council Consolidated List',
    authority: 'United Nations',
    kind: 'SANCTIONS',
    recordCount: 0,
    refreshFrequency: 'Daily',
    status: 'NOT_CONNECTED',
    readOnly: true,
  },
  {
    id: 'wl-ofac',
    name: 'OFAC Specially Designated Nationals',
    authority: 'US Treasury (OFAC)',
    kind: 'SANCTIONS',
    recordCount: 0,
    refreshFrequency: 'Daily',
    status: 'NOT_CONNECTED',
    readOnly: true,
  },
  {
    id: 'wl-nfiu',
    name: 'NFIU Nigeria Domestic Sanctions List',
    authority: 'NFIU',
    kind: 'DOMESTIC',
    recordCount: 0,
    refreshFrequency: 'On publication',
    status: 'NOT_CONNECTED',
    readOnly: true,
  },
  {
    id: 'wl-centif',
    name: 'CENTIF Niger Freezing-Order List',
    authority: 'CENTIF (Niger)',
    kind: 'DOMESTIC',
    recordCount: 0,
    refreshFrequency: 'On publication',
    status: 'NOT_CONNECTED',
    readOnly: true,
  },
  {
    id: 'wl-pep',
    name: 'PEP Register — Nigeria and Niger',
    authority: 'KoriePay Compliance',
    kind: 'PEP',
    recordCount: 0,
    refreshFrequency: 'Weekly',
    status: 'NOT_CONNECTED',
    readOnly: true,
  },
  {
    id: 'wl-adverse',
    name: 'Adverse Media Watch — Sahel corridor',
    authority: 'KoriePay Compliance',
    kind: 'ADVERSE_MEDIA',
    recordCount: 0,
    refreshFrequency: 'Hourly',
    status: 'NOT_CONNECTED',
    readOnly: true,
  },
];

export const DEMO_FIXTURE_NOTICE =
  'Demonstration records — not produced by the ledger, the AML engine or the identity service.';
