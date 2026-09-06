/**
 * Which real endpoints back which compliance screen.
 *
 * This is the single place that knows whether a module is wired to the
 * backend. A screen never hard-codes a URL: it asks for a resource key and the
 * service either has a live source for it or it does not. When it does not,
 * the caller gets `unavailable` (live builds) or a badged demo record — never
 * silently fabricated numbers dressed up as production state.
 *
 * LIVE REWIRE: every list source now points at the compliance data plane
 * (`/api/compliance/data/*`), which reads the Supabase database through the
 * same resource registry the admin portal uses, gated by real officer
 * sessions. The previous sources were the engine's in-memory HTTP endpoints,
 * which answered with whatever the process happened to hold in RAM.
 */

import type { ComplianceResourceKey } from './types';

export interface LiveSource {
  /** Fetch path, without query string. */
  path: string;
  /** Key inside the response payload that holds the array (`undefined` = the payload itself). */
  listKey?: string;
  /** Key inside the response payload that holds the total count. */
  totalKey?: string;
  /** Extra static query parameters. */
  query?: Record<string, string>;
  /** Sensitivity: sensitive reads are audit-logged where a route supports it. */
  sensitive?: boolean;
}

/**
 * `live` = there is a real route serving real database state.
 * `derived` = computed on the client from other live resources (no new endpoint invented).
 * `demo` = no backend contract exists yet; only the demo store can fill this.
 */
export type ComplianceWiring = 'live' | 'derived' | 'demo';

const DATA = '/api/compliance/data';

export const LIVE_SOURCES: Partial<Record<ComplianceResourceKey, LiveSource>> = {
  /* ── Financial crime queues ─────────────────────────────────────────── */
  alerts: { path: `${DATA}/aml-alerts`, listKey: 'rows', totalKey: 'count' },
  cases: { path: `${DATA}/aml-cases`, listKey: 'rows', totalKey: 'count' },
  caseNotes: { path: `${DATA}/aml-case-notes`, listKey: 'rows', totalKey: 'count' },
  amlProfiles: { path: `${DATA}/aml-customer-profiles`, listKey: 'rows', totalKey: 'count', sensitive: true },
  agentRegister: { path: `${DATA}/agents`, listKey: 'rows', totalKey: 'count' },
  merchantProfiles: { path: `${DATA}/merchant-profiles`, listKey: 'rows', totalKey: 'count' },
  /* The monitoring feed is the risk engine's persisted decision log. */
  telemetry: { path: `${DATA}/risk-decisions`, listKey: 'rows', totalKey: 'count' },
  transactions: { path: `${DATA}/risk-decisions`, listKey: 'rows', totalKey: 'count' },
  /* Monitoring scenarios are the deployed AML rules; read-only in the UI. */
  scenarios: { path: `${DATA}/aml-scenarios`, listKey: 'rows', totalKey: 'count' },

  /* ── Due diligence (master identity tables) ─────────────────────────── */
  customers: { path: `${DATA}/identity-persons`, listKey: 'rows', totalKey: 'count', sensitive: true },
  kyc: { path: `${DATA}/identity-persons`, listKey: 'rows', totalKey: 'count', sensitive: true },
  kyb: { path: `${DATA}/identity-organizations`, listKey: 'rows', totalKey: 'count', sensitive: true },
  documents: { path: `${DATA}/identity-documents`, listKey: 'rows', totalKey: 'count', sensitive: true },

  /* ── Governance ─────────────────────────────────────────────────────── */
  reports: { path: `${DATA}/regulatory-reports`, listKey: 'rows', totalKey: 'count' },
  restatements: { path: `${DATA}/regulatory-restatements`, listKey: 'rows', totalKey: 'count' },
  calendar: { path: `${DATA}/regulatory-obligations`, listKey: 'rows', totalKey: 'count' },
  approvals: { path: `${DATA}/pam-requests`, listKey: 'rows', totalKey: 'count' },
  escalations: { path: `${DATA}/complaints`, listKey: 'rows', totalKey: 'count' },
  policies: { path: `${DATA}/risk-rules`, listKey: 'rows', totalKey: 'count' },
  audit: { path: `${DATA}/audit-events`, listKey: 'rows', totalKey: 'count' },
  officers: { path: `${DATA}/workforce-identities`, listKey: 'rows', totalKey: 'count' },
  restrictions: { path: `${DATA}/customer-restrictions`, listKey: 'rows', totalKey: 'count' },

  /* ── Platform ────────────────────────────────────────────────────────── */
  integrations: { path: `${DATA}/provider-nodes`, listKey: 'rows', totalKey: 'count' },
  /* Computed server-side from real tables; the old in-memory engines are not
     consulted because they asserted states nobody had configured. */
  posture: { path: '/api/compliance/posture' },
  systemHealth: { path: '/api/compliance/health' },
};

/** Non-list live calls (detail views, single objects). */
export const LIVE_DETAIL_PATHS: Partial<Record<ComplianceResourceKey, string>> = {
  alertDetail: `${DATA}/aml-alerts`,
  caseDetail: `${DATA}/aml-cases`,
  caseNotes: `${DATA}/aml-case-notes`,
};

export const WIRING: Record<ComplianceResourceKey, ComplianceWiring> = {
  dashboard: 'derived',
  customers: 'live',
  kyc: 'live',
  documents: 'live',
  kyb: 'live',
  alerts: 'live',
  alertDetail: 'live',
  cases: 'live',
  caseDetail: 'live',
  caseNotes: 'live',
  amlProfiles: 'live',
  agentRegister: 'live',
  merchantProfiles: 'live',
  transactions: 'live',
  /* The list has no read endpoint; only the screening call itself is real, and
     the UI treats a screening run as a real action with a real result. */
  sanctions: 'demo',
  watchlists: 'demo',
  restrictions: 'live',
  telemetry: 'live',
  reports: 'live',
  restatements: 'live',
  scenarios: 'live',
  posture: 'live',
  network: 'live',
  policies: 'live',
  calendar: 'live',
  audit: 'live',
  officers: 'live',
  tasks: 'derived',
  approvals: 'live',
  escalations: 'live',
  integrations: 'live',
  systemHealth: 'live',
  notifications: 'derived',
};

/** Sanctions screening has no read endpoint — only the screening call itself. */
export const SCREENING_PATH = '/api/compliance/actions/screening';
export const DOCUMENTS_PATH = `${DATA}/identity-documents`;
export const TRACE_PATH = '/api/audit/trace';

/**
 * Mutations that reach a real, audited endpoint. Anything not listed here
 * cannot write in a live build, and the UI must not offer it as if it could.
 *
 * `patch` actions go through the registry-whitelisted PATCH route (columns are
 * whitelisted per resource, actor fields are stamped server-side, every write
 * lands in audit_events). `post` actions are the workflow transitions that are
 * more than a column update (case opening, note append).
 */
export const LIVE_ACTIONS = {
  'alerts.status': { kind: 'patch', path: `${DATA}/aml-alerts` },
  'alerts.convert': { kind: 'post', path: '/api/compliance/actions/alert-convert' },
  'cases.note': { kind: 'post', path: '/api/compliance/actions/case-note' },
  'cases.decision': { kind: 'patch', path: `${DATA}/aml-cases` },
} as const;

export type LiveActionKey = keyof typeof LIVE_ACTIONS;
