/**
 * Which real endpoints back which compliance screen.
 *
 * This is the single place that knows whether a module is wired to the
 * backend. A screen never hard-codes a URL: it asks for a resource key and the
 * service either has a live source for it or it does not. When it does not,
 * the caller gets `unavailable` (live builds) or a badged demo record — never
 * silently fabricated numbers dressed up as production state.
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
 * `live` = there is a real route serving real engine state.
 * `derived` = computed on the client from other live resources (no new endpoint invented).
 * `demo` = no backend contract exists yet; only the demo store can fill this.
 */
export type ComplianceWiring = 'live' | 'derived' | 'demo';

export const LIVE_SOURCES: Partial<Record<ComplianceResourceKey, LiveSource>> = {
  /* ── Financial crime queues ─────────────────────────────────────────── */
  alerts: { path: '/api/aml/alerts', listKey: 'alerts', totalKey: 'total' },
  cases: { path: '/api/aml/cases', listKey: 'cases', totalKey: 'total' },
  /* AML rules are exposed as monitoring scenarios; read-only in the UI. */
  telemetry: { path: '/api/core/v1/risk/decisions', listKey: 'decisions', totalKey: 'count' },
  /* Monitoring scenarios are the deployed AML rules. The engine exposes no
     write route for them, so the console renders them read-only. */
  scenarios: { path: '/api/aml/scenarios', listKey: 'scenarios', totalKey: 'total' },
  network: { path: '/api/aml/network' },
  /* Security posture is the platform's own scorecard; the settings screen shows
     it read-only because no endpoint lets the console change it. */
  posture: { path: '/api/security/posture' },

  /* ── Due diligence (master identity is the source of truth) ─────────── */
  customers: { path: '/api/core/v1/identity/persons', listKey: 'persons', totalKey: 'count', sensitive: true },
  kyc: { path: '/api/core/v1/identity/persons', listKey: 'persons', totalKey: 'count', sensitive: true },
  kyb: { path: '/api/core/v1/identity/organizations', listKey: 'organizations', totalKey: 'count', sensitive: true },
  /* Requires the kyc:verify scope; the route ignores any identity it is not
     allowed to read, so an unauthorized response here is shown as such. */
  documents: { path: '/api/core/v1/identity/documents', listKey: 'documents', totalKey: 'count', sensitive: true },

  /* ── Governance ─────────────────────────────────────────────────────── */
  reports: { path: '/api/v1/regulatory/reports' },
  restatements: { path: '/api/v1/regulatory/restatements' },
  calendar: { path: '/api/v1/regulatory/obligations' },
  approvals: { path: '/api/security/pam/requests', listKey: 'requests' },
  escalations: { path: '/api/complaints', listKey: 'complaints' },

  /* ── Platform ────────────────────────────────────────────────────────── */
  integrations: { path: '/api/health/providers', listKey: 'providers', totalKey: 'count' },
  systemHealth: { path: '/api/health' },
};

/** Non-list live calls (detail views, single objects). */
export const LIVE_DETAIL_PATHS: Partial<Record<ComplianceResourceKey, string>> = {
  alertDetail: '/api/aml/alerts',
  caseDetail: '/api/aml/cases',
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
  transactions: 'derived',
  /* The list has no read endpoint; only POST /api/aml/screening is live, and the
     UI treats a screening run as a real action with a real result. */
  sanctions: 'demo',
  watchlists: 'demo',
  restrictions: 'demo',
  telemetry: 'live',
  reports: 'live',
  restatements: 'live',
  scenarios: 'live',
  posture: 'live',
  network: 'live',
  policies: 'demo',
  calendar: 'live',
  audit: 'demo',
  officers: 'demo',
  tasks: 'derived',
  approvals: 'live',
  escalations: 'live',
  integrations: 'live',
  systemHealth: 'live',
  notifications: 'derived',
};

/** Sanctions screening has no read endpoint — only the screening call itself. */
export const SCREENING_PATH = '/api/aml/screening';
export const DOCUMENTS_PATH = '/api/core/v1/identity/documents';
export const TRACE_PATH = '/api/audit/trace';

/**
 * Mutations that reach a real engine. Anything not listed here cannot write in
 * a live build, and the UI must not offer it as if it could (§88).
 */
export const LIVE_ACTIONS = {
  'alerts.status': { path: '/api/aml/alerts', method: 'POST', action: 'UPDATE_STATUS' },
  'alerts.convert': { path: '/api/aml/alerts', method: 'POST', action: 'CONVERT_TO_CASE' },
  'cases.note': { path: '/api/aml/cases', method: 'POST', action: 'ADD_NOTE' },
  'cases.decision': { path: '/api/aml/cases', method: 'POST', action: 'SUBMIT_DECISION' },
} as const;

export type LiveActionKey = keyof typeof LIVE_ACTIONS;
