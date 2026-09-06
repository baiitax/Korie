/**
 * The compliance portal's only data entry point.
 *
 * Every screen calls `loadComplianceResource(key)` and renders whatever envelope
 * comes back, including the parts it cannot show: `unauthorized`, `unavailable`
 * and `error` are first-class states, not afterthoughts. The service — not the
 * page — decides whether a screen is looking at the real engine or at the demo
 * set, which is what stops a page from accidentally presenting synthetic
 * records as production state.
 *
 * Resolution rules
 *   live wiring + 200 + rows     → ready,      source 'live'
 *   live wiring + 200 + no rows  → empty,      source 'live'   (never faked over)
 *   401 / 403                    → unauthorized (never faked over)
 *   404 / 5xx / network          → live build: error | unavailable
 *                                  demo build: fixture rows with demoFallback: true
 *   derived wiring               → computed from live inputs; inherits 'demo'
 *                                  when any input fell back
 */

import { complianceFetch } from '@/lib/compliancePortalClient';
import { LIVE_DETAIL_PATHS, LIVE_SOURCES } from './endpoints';
import type {
  AlertRow,
  ApprovalRow,
  CaseRow,
  ComplianceIssue,
  ComplianceResource,
  ComplianceResourceKey,
  ComplianceResourceMap,
  ComplianceSource,
  CustomerRow,
  EscalationRow,
  HealthRow,
  KybRow,
  KycRow,
  MonitoringRow,
  ObligationRow,
  ProviderRow,
  ReportRow,
} from './types';
import {
  camelRow,
  mapDocument,
  mapAlert,
  mapApproval,
  mapAuditEvent,
  mapCase,
  mapCustomer,
  mapDecision,
  mapEscalation,
  mapHealth,
  mapKyc,
  mapKyb,
  mapObligation,
  mapOfficer,
  mapPolicy,
  mapProvider,
  mapReport,
  mapRestatement,
  mapRestriction,
  mapNetwork,
  mapScenario,
  mapPosture,
} from './normalizers';
import { readDemo } from './demo/store';
import {
  auditToRow,
  calendarToObligation,
  officerToRow,
  policyToRow,
  restrictionToRow,
} from './demo/toRows';
import { DEMO_WATCHLISTS } from './demo/fixtures';
import { getJurisdiction, rowMatchesJurisdiction } from './jurisdiction';
import { deriveDashboard, deriveNotifications, deriveTasks } from './derive';

/** `live` = never substitute demo data. Default (`demo`) = fallback allowed. */
export function complianceMode(): 'live' | 'demo' {
  return process.env.NEXT_PUBLIC_COMPLIANCE_DATA_MODE === 'live' ? 'live' : 'demo';
}

export function demoAllowed(): boolean {
  return complianceMode() === 'demo';
}

export interface LoadOptions {
  signal?: AbortSignal;
  query?: Record<string, string>;
  id?: string;
  /** Bypass the short read cache — used right after a mutation. */
  force?: boolean;
}

/**
 * Short-lived read cache.
 *
 * The shell's badges, the dashboard and a queue page all want the same engine
 * collections. Without deduplication one navigation fires a dozen identical
 * requests; with a 2.5 second window it fires one. It is deliberately tiny and
 * never survives a mutation (`clearComplianceCache` runs after every write), so
 * an officer never sees a stale queue — and never sees a queue that was
 * refreshed *for* somebody else.
 */
const readCache = new Map<string, { at: number; promise: Promise<Fetched> }>();
const READ_TTL_MS = 2500;

export function clearComplianceCache(): void {
  readCache.clear();
}

type AnyJson = Record<string, any>;
type RowKey = keyof ComplianceResourceMap;

/* ── per-resource mapping + demo fallback tables ────────────────────────── */

const MAPPERS: { [K in RowKey]?: (raw: AnyJson) => ComplianceResourceMap[K] } = {
  /* Raw rows come from the database in snake_case; `camelRow` normalizes keys
     (one level deep, so joined relations normalize too) before the engine
     vocabulary mappers read them. */
  customers: (raw) => mapCustomer(camelRow(raw)),
  kyc: (raw) => mapKyc(camelRow(raw)),
  kyb: (raw) => mapKyb(camelRow(raw)),
  alerts: (raw) => mapAlert(camelRow(raw)),
  alertDetail: (raw) => mapAlert(camelRow(raw)),
  documents: (raw) => mapDocument(camelRow(raw)),
  cases: (raw) => mapCase(camelRow(raw)),
  caseDetail: (raw) => mapCase(camelRow(raw)),
  caseNotes: (raw) => {
    const r = camelRow(raw);
    return {
      id: String(r.id ?? ''),
      caseId: String(r.caseId ?? ''),
      author: String(r.authorEmail ?? r.author ?? 'unknown'),
      noteType: String(r.noteType ?? 'INVESTIGATION'),
      content: String(r.content ?? ''),
      createdAt: String(r.createdAt ?? ''),
    };
  },
  telemetry: (raw) => mapDecision(camelRow(raw)),
  transactions: (raw) => mapDecision(camelRow(raw)),
  reports: (raw) => mapReport(camelRow(raw)),
  restatements: (raw) => mapRestatement(camelRow(raw)),
  scenarios: (raw) => mapScenario(camelRow(raw)),
  calendar: (raw) => mapObligation(camelRow(raw)),
  approvals: (raw) => mapApproval(camelRow(raw)),
  escalations: (raw) => mapEscalation(camelRow(raw)),
  integrations: (raw) => mapProvider(camelRow(raw)),
  policies: (raw) => mapPolicy(camelRow(raw)),
  audit: (raw) => mapAuditEvent(camelRow(raw)),
  officers: (raw) => mapOfficer(camelRow(raw)),
  restrictions: (raw) => mapRestriction(camelRow(raw)),
  amlProfiles: (raw) => {
    const r = camelRow(raw);
    return {
      id: String(r.id ?? ''),
      customerId: String(r.customerId ?? ''),
      jurisdiction: String(r.jurisdiction ?? ''),
      riskTier: String(r.amlRiskTier ?? ''),
      riskScore: typeof r.amlRiskScore === 'number' ? r.amlRiskScore : undefined,
      isPep: Boolean(r.isPep),
      pepCategory: r.pepCategory,
      isSanctionFlagged: Boolean(r.isSanctionFlagged),
      hasAdverseMedia: Boolean(r.hasAdverseMedia),
      lastEvaluatedAt: r.lastEvaluatedAt,
    };
  },
  agentRegister: (raw) => {
    const r = camelRow(raw);
    return {
      id: String(r.id ?? ''),
      agentCode: String(r.agentCode ?? r.id ?? ''),
      agentName: String(r.agentName ?? ''),
      businessName: r.businessName,
      email: r.email,
      phone: r.phone,
      country: String(r.country ?? ''),
      tier: r.tier,
      status: String(r.status ?? ''),
      kycStatus: r.kycStatus,
      createdAt: r.createdAt,
    };
  },
  merchantProfiles: (raw) => {
    const r = camelRow(raw);
    return {
      id: String(r.id ?? ''),
      businessName: String(r.businessName ?? ''),
      monthlyGmv: typeof r.monthlyGmvNgn === 'number' ? r.monthlyGmvNgn : undefined,
      processingMarginPct: typeof r.processingMarginPct === 'number' ? r.processingMarginPct : undefined,
      disputeRatioPct: typeof r.disputeRatioPct === 'number' ? r.disputeRatioPct : undefined,
      growthTrendPct: typeof r.growthTrendPct === 'number' ? r.growthTrendPct : undefined,
      status: r.status,
      updatedAt: r.updatedAt,
    };
  },
};

const DEMO_FALLBACKS: { [K in RowKey]?: () => ComplianceResourceMap[K][] } = {
  kyc: () => readDemo((s) => s.kyc).rows.map((r) => mapKyc(r as unknown as AnyJson)),
  kyb: () => readDemo((s) => s.kyb).rows.map((r) => mapKyb(r as unknown as AnyJson)),
  restrictions: () => readDemo((s) => s.restrictions).rows.map(restrictionToRow),
  policies: () => readDemo((s) => s.policies).rows.map(policyToRow),
  audit: () => readDemo((s) => s.audit).rows.map(auditToRow),
  officers: () => readDemo((s) => s.officers).rows.map(officerToRow),
  calendar: () => readDemo((s) => s.calendar).rows.map(calendarToObligation),
  reports: () => readDemo((s) => s.reports).rows.map((r) => mapReport(r as unknown as AnyJson)),
};

/* ── envelope plumbing ──────────────────────────────────────────────────── */

interface Fetched {
  httpStatus: number;
  payload: AnyJson | null;
  ok: boolean;
  requestId?: string;
  error?: ComplianceIssue;
  latencyMs: number;
}

/** The repo has two response envelope styles; unwrap both. */
function unwrap(payload: AnyJson | null): AnyJson | null {
  if (!payload) return null;
  if (payload.status === 'success') return (payload.data ?? payload) as AnyJson;
  if (payload.success === true) return (payload.data ?? payload) as AnyJson;
  return payload;
}

function errorFrom(status: number, payload: AnyJson | null): ComplianceIssue {
  const rawMessage = payload ? (payload.message ?? payload.error) : undefined;
  const message =
    typeof rawMessage === 'string' && rawMessage.length
      ? rawMessage
      : status === 404
        ? 'This module has no compliance service endpoint in this deployment.'
        : 'The compliance service could not complete the request.';
  return {
    code: String(
      (payload && (payload.code ?? payload.error_code)) ||
        (typeof rawMessage === 'string' ? '' : rawMessage) ||
        `HTTP_${status}`,
    ),
    message,
    hint:
      status === 401 || status === 403
        ? 'This session does not carry the scope for that data. Sign in as an authorised officer or ask the MLRO to grant it.'
        : status === 404
          ? 'Nothing was invented to fill the gap: the screen shows why the data is missing.'
          : 'Retry in a moment. If it persists, raise an incident and quote the request id.',
  };
}

export async function getJson(path: string, opts: LoadOptions = {}): Promise<Fetched> {
  const url = new URL(path, 'http://internal');
  Object.entries(opts.query ?? {}).forEach(([k, v]) => url.searchParams.set(k, v));
  const key = `${url.pathname}${url.search}`;
  // The cache key ignores the abort signal on purpose: these are tiny
  // idempotent reads, and sharing one in-flight GET between the rail's badge and
  // the page's table is the point. The caller that navigated away simply
  // discards the result (every hook checks `cancelled` before setState).
  if (opts.force) return getJsonUncached(path, opts);
  const hit = readCache.get(key);
  if (hit && Date.now() - hit.at < READ_TTL_MS) return hit.promise;
  const promise = getJsonUncached(path, opts);
  readCache.set(key, { at: Date.now(), promise });
  promise.catch(() => readCache.delete(key));
  return promise;
}

async function getJsonUncached(path: string, opts: LoadOptions = {}): Promise<Fetched> {
  const url = new URL(path, 'http://internal');
  Object.entries(opts.query ?? {}).forEach(([k, v]) => url.searchParams.set(k, v));
  const started = Date.now();
  try {
    const res = await complianceFetch(url.pathname + url.search, {
      method: 'GET',
      cache: 'no-store',
    });
    const latencyMs = Date.now() - started;
    let payload: AnyJson | null = null;
    try {
      payload = (await res.json()) as AnyJson;
    } catch {
      payload = null;
    }
    const requestId = (payload?.meta as AnyJson | undefined)?.request_id as string | undefined;
    if (!res.ok) {
      return {
        httpStatus: res.status,
        payload,
        ok: false,
        requestId,
        error: errorFrom(res.status, payload),
        latencyMs,
      };
    }
    return { httpStatus: res.status, payload, ok: true, requestId, latencyMs };
  } catch (err: any) {
    if (err?.name === 'AbortError') throw err;
    return {
      httpStatus: 0,
      payload: null,
      ok: false,
      latencyMs: Date.now() - started,
      error: {
        code: 'NETWORK_UNREACHABLE',
        message: 'The compliance service is unreachable from this session.',
        hint: 'Check the API base URL or the connection, then retry.',
      },
    };
  }
}

function listFrom(fetched: Fetched, key?: string): AnyJson[] | null {
  const data = unwrap(fetched.payload);
  if (!data) return null;
  if (Array.isArray(data)) return data as AnyJson[];
  if (key && Array.isArray(data[key])) return data[key] as AnyJson[];
  const candidate = Object.values(data).find(Array.isArray);
  return candidate ? (candidate as AnyJson[]) : null;
}

function readyResource<T>(
  rows: T[],
  fetched: Pick<Fetched, 'latencyMs' | 'requestId'>,
  source: ComplianceSource,
  total?: number,
): ComplianceResource<T> {
  // One jurisdiction scope for the whole portal: a badge and a table can never
  // disagree about how many alerts are open.
  const scope = getJurisdiction();
  const scoped = scope === 'ALL' ? rows : rows.filter((row) => rowMatchesJurisdiction(row, scope));
  return {
    status: scoped.length ? 'ready' : 'empty',
    data: scoped,
    total: scope === 'ALL' && typeof total === 'number' ? total : scoped.length,
    source,
    demoFallback: source === 'demo',
    latencyMs: fetched.latencyMs,
    requestId: fetched.requestId,
  };
}

function failedResource<T>(fetched: Fetched): ComplianceResource<T> {
  const unauthorized = fetched.httpStatus === 401 || fetched.httpStatus === 403;
  return {
    status: unauthorized ? 'unauthorized' : 'error',
    data: [],
    total: 0,
    source: 'live',
    demoFallback: false,
    latencyMs: fetched.latencyMs,
    requestId: fetched.requestId,
    error: fetched.error ?? { code: 'UNKNOWN', message: 'Request failed.' },
  };
}

function unavailableResource<T>(key: string, fetched?: Fetched): ComplianceResource<T> {
  return {
    status: 'unavailable',
    data: [],
    total: 0,
    source: 'live',
    demoFallback: false,
    latencyMs: fetched?.latencyMs ?? 0,
    requestId: fetched?.requestId,
    error: fetched?.error ?? {
      code: 'MODULE_NOT_WIRED',
      message: `No live endpoint backs “${key}” in this deployment.`,
      hint: 'Run the build with NEXT_PUBLIC_COMPLIANCE_DATA_MODE=demo to preview this screen with sample records.',
    },
  };
}

const NO_CALL: Pick<Fetched, 'latencyMs' | 'requestId'> = { latencyMs: 0, requestId: undefined };

/* ── generic list loader ────────────────────────────────────────────────── */

async function loadList<K extends RowKey>(key: K, opts: LoadOptions = {}): Promise<ComplianceResource<ComplianceResourceMap[K]>> {
  const map = MAPPERS[key] as ((raw: AnyJson) => ComplianceResourceMap[K]) | undefined;
  const fallback = DEMO_FALLBACKS[key];
  const source = LIVE_SOURCES[key as ComplianceResourceKey];

  if (!source) {
    if (demoAllowed() && fallback) return readyResource(fallback(), NO_CALL, 'demo');
    return unavailableResource(key);
  }

  const fetched = await getJson(opts.id ? `${source.path}/${encodeURIComponent(opts.id)}` : source.path, {
    signal: opts.signal,
    query: opts.query ? { ...source.query, ...opts.query } : source.query,
  });

  if (!fetched.ok) {
    if (fetched.httpStatus === 401 || fetched.httpStatus === 403) return failedResource(fetched);
    if (demoAllowed() && fallback) return readyResource(fallback(), fetched, 'demo');
    if (fetched.httpStatus === 404) return unavailableResource(key, fetched);
    return failedResource(fetched);
  }

  const raw = listFrom(fetched, source.listKey) ?? [];
  const rows = raw.map((entry) => (map ? map(entry) : (entry as ComplianceResourceMap[K])));
  const totalRaw = unwrap(fetched.payload)?.[source.totalKey ?? ''];
  return readyResource(rows, fetched, 'live', typeof totalRaw === 'number' ? totalRaw : rows.length);
}

/** Single-record endpoints (`/api/compliance/data/aml-alerts/:id`) return an object, not a list. */
async function loadDetail<K extends 'alertDetail' | 'caseDetail'>(
  key: K,
  opts: LoadOptions,
): Promise<ComplianceResource<ComplianceResourceMap[K]>> {
  // Detail reads are keyed separately from list sources: the record lives at
  // `/api/aml/<collection>/:id`, and only the id is appended.
  const path = LIVE_DETAIL_PATHS[key as ComplianceResourceKey];
  const wrapperKey = key === 'alertDetail' ? 'alert' : 'case';
  // Detail views are live-only: showing a fixture record while an officer
  // disposes it would be indistinguishable from a real decision.
  if (!path || !opts.id) return unavailableResource(key);
  const fetched = await getJson(`${path}/${encodeURIComponent(opts.id)}`, { signal: opts.signal });
  if (!fetched.ok) return failedResource(fetched);
  const data = unwrap(fetched.payload) as AnyJson | null;
  const record = (data?.[wrapperKey] ?? data?.record ?? data) as AnyJson | null;
  if (!record || typeof record !== 'object' || !record.id) {
    return {
      status: 'empty',
      data: [],
      total: 0,
      source: 'live',
      demoFallback: false,
      latencyMs: fetched.latencyMs,
      requestId: fetched.requestId,
    };
  }
  const map = MAPPERS[key] as (raw: AnyJson) => ComplianceResourceMap[K];
  return readyResource([map(record)], fetched, 'live', 1);
}

/* ── composite live loaders ─────────────────────────────────────────────── */

const SETTLED_ALERTS = ['CLOSED', 'FALSE_POSITIVE', 'DISMISSED'];

async function loadCustomers(opts: LoadOptions): Promise<ComplianceResource<CustomerRow>> {
  const [persons, alerts, cases] = await Promise.all([
    getJson('/api/compliance/data/identity-persons', { signal: opts.signal }),
    getJson('/api/compliance/data/aml-alerts', { signal: opts.signal }),
    getJson('/api/compliance/data/aml-cases', { signal: opts.signal }),
  ]);
  if (!persons.ok) return failedResource(persons);

  const alertRows = alerts.ok ? (listFrom(alerts, 'rows') ?? []).map((r) => mapAlert(camelRow(r))) : null;
  const caseRows = cases.ok ? (listFrom(cases, 'rows') ?? []).map((r) => mapCase(camelRow(r))) : null;

  const rows = (listFrom(persons, 'rows') ?? []).map((p) => {
    const openAlerts = alertRows
      ? alertRows.filter((a) => a.subjectId === p.id && !SETTLED_ALERTS.includes(String(a.status)))
      : [];
    const openCases = caseRows ? caseRows.filter((c) => c.subjectId === p.id && c.status !== 'CLOSED') : [];
    return mapCustomer(p, {
      openCases: caseRows ? openCases.length : undefined,
      hasOpenAlerts: alertRows ? openAlerts.length > 0 : undefined,
    });
  });

  return {
    ...readyResource(rows, persons, 'live'),
    derived: !alertRows || !caseRows,
  };
}

async function loadKyc(opts: LoadOptions): Promise<ComplianceResource<KycRow>> {
  const persons = await getJson('/api/compliance/data/identity-persons', { signal: opts.signal });
  if (!persons.ok) {
    if (demoAllowed() && DEMO_FALLBACKS.kyc) return readyResource(DEMO_FALLBACKS.kyc(), persons, 'demo');
    return failedResource(persons);
  }
  // No document read here on purpose. The vault route answers only for one
  // `identityId` at a time, so a queue-wide count cannot be fetched honestly;
  // the review workspace asks per identity when an officer opens a file.
  const rows = (listFrom(persons, 'rows') ?? []).map((p) => mapKyc(camelRow(p), null));
  return readyResource(rows, persons, 'live');
}

async function loadSingleMapped<T>(
  key: string,
  path: string,
  map: (payload: AnyJson) => T,
  opts: LoadOptions,
): Promise<ComplianceResource<T>> {
  const fetched = await getJson(path, { signal: opts.signal, query: opts.query as Record<string, string> | undefined });
  if (!fetched.ok) return failedResource(fetched);
  const payload = (unwrap(fetched.payload) ?? {}) as AnyJson;
  return readyResource([map(payload)], fetched, 'live', 1);
}

async function loadNetwork(opts: LoadOptions): Promise<ComplianceResource<import('./types').NetworkRow>> {
  /* The graph is stored as two tables (nodes and edges); the screen wants one
     network. Both reads go through the data plane; an empty graph renders as
     an honest empty, not a synthesized example network. */
  const entityId = opts.query?.entityId;
  const [nodesRes, edgesRes] = await Promise.all([
    getJson('/api/compliance/data/network-nodes', { signal: opts.signal, query: { limit: '200' } }),
    getJson('/api/compliance/data/network-edges', { signal: opts.signal, query: { limit: '500' } }),
  ]);
  if (!nodesRes.ok) return failedResource(nodesRes);
  const nodes = (listFrom(nodesRes, 'rows') ?? []).map(camelRow);
  const edges = edgesRes.ok ? (listFrom(edgesRes, 'rows') ?? []).map(camelRow) : [];
  const payload = { nodes, edges };
  const row = mapNetwork(payload, String(entityId ?? ''));
  if (row.nodes.length === 0) {
    return { status: 'empty', data: [], total: 0, source: 'live', demoFallback: false, latencyMs: nodesRes.latencyMs, requestId: nodesRes.requestId };
  }
  return readyResource([row], nodesRes, 'live', 1);
}

async function loadSystemHealth(opts: LoadOptions): Promise<ComplianceResource<HealthRow>> {
  const fetched = await getJson('/api/compliance/health', { signal: opts.signal });
  if (!fetched.ok) {
    // Deliberate: platform status is never simulated, not even in the demo.
    return failedResource(fetched);
  }
  return readyResource([mapHealth(unwrap(fetched.payload) ?? {})], fetched, 'live', 1);
}

async function loadProviders(opts: LoadOptions): Promise<ComplianceResource<ProviderRow>> {
  const fetched = await getJson('/api/compliance/data/provider-nodes', { signal: opts.signal });
  if (!fetched.ok) return failedResource(fetched);
  const rows = (listFrom(fetched, 'rows') ?? []).map((r) => mapProvider(camelRow(r)));
  return readyResource(rows, fetched, 'live');
}

/* ── derived screens ────────────────────────────────────────────────────── */

async function loadDerived(
  key: 'dashboard' | 'tasks' | 'notifications',
  opts: LoadOptions,
) {
  const [alertsRes, casesRes, decisionsRes, obligationsRes, approvalsRes, kycRes, kybRes, healthRes] =
    await Promise.all([
      loadList('alerts', opts),
      loadList('cases', opts),
      loadList('telemetry', opts),
      loadList('calendar', opts),
      loadList('approvals', opts),
      loadKyc(opts),
      loadList('kyb', opts),
      loadSystemHealth(opts),
    ]);

  const inputs = [alertsRes, casesRes, decisionsRes, obligationsRes, approvalsRes, kycRes, kybRes];
  const source: ComplianceSource = inputs.some((r) => r.source === 'demo') ? 'demo' : 'live';
  const fellBack = inputs.some((r) => r.demoFallback);
  const coreUnavailable = [alertsRes, casesRes, decisionsRes].every(
    (r) => r.status === 'error' || r.status === 'unauthorized' || r.status === 'unavailable',
  );

  if (coreUnavailable) {
    return {
      status: 'unavailable',
      data: [],
      total: 0,
      source: 'live',
      demoFallback: false,
      latencyMs: 0,
      error: {
        code: 'QUEUES_UNREACHABLE',
        message: 'Neither the AML alert engine nor the case engine answered, so no queue state can be reported.',
        hint: 'Check /api/compliance/data/aml-alerts and /api/compliance/data/aml-cases, then retry. The dashboard does not display estimates.',
      },
    };
  }

  const alerts = alertsRes.data as AlertRow[];
  const cases = casesRes.data as CaseRow[];
  const obligations = obligationsRes.data as ObligationRow[];
  const approvals = approvalsRes.data as ApprovalRow[];
  const decisions = decisionsRes.data as MonitoringRow[];
  const derivedInputs = {
    alerts,
    cases,
    obligations,
    approvals,
    decisions,
    kyc: kycRes.data,
    kyb: kybRes.data,
    health: healthRes.data[0] ?? null,
  };

  if (key === 'dashboard') {
    const summary = deriveDashboard(derivedInputs);
    summary.taskCount = deriveTasks(derivedInputs).length;
    return {
      status: 'ready' as const,
      data: [summary],
      total: 1,
      source,
      demoFallback: fellBack,
      derived: true,
      latencyMs: Math.max(alertsRes.latencyMs, casesRes.latencyMs),
    };
  }

  const rows = key === 'tasks' ? deriveTasks(derivedInputs) : deriveNotifications(derivedInputs);

  return {
    status: (rows.length ? 'ready' : 'empty') as 'ready' | 'empty',
    data: rows,
    total: rows.length,
    source,
    demoFallback: fellBack,
    derived: true,
    latencyMs: 0,
  };
}

/* ── public API ───────────────────────────────────────────────────────────── */

export async function loadComplianceResource<K extends ComplianceResourceKey>(
  key: K,
  opts: LoadOptions = {},
): Promise<ComplianceResource<ComplianceResourceMap[K]>> {
  switch (key) {
    case 'customers':
      return loadCustomers(opts) as unknown as Promise<ComplianceResource<ComplianceResourceMap[K]>>;
    case 'kyc':
      return loadKyc(opts) as unknown as Promise<ComplianceResource<ComplianceResourceMap[K]>>;
    case 'systemHealth':
      return loadSystemHealth(opts) as unknown as Promise<ComplianceResource<ComplianceResourceMap[K]>>;
    case 'integrations':
      return loadProviders(opts) as unknown as Promise<ComplianceResource<ComplianceResourceMap[K]>>;
    case 'posture':
      return loadSingleMapped('posture', '/api/compliance/posture', mapPosture, opts) as unknown as Promise<ComplianceResource<ComplianceResourceMap[K]>>;
    case 'network':
      return loadNetwork(opts) as unknown as Promise<ComplianceResource<ComplianceResourceMap[K]>>;
    case 'alertDetail':
    case 'caseDetail':
      return loadDetail(key, opts) as unknown as Promise<ComplianceResource<ComplianceResourceMap[K]>>;
    case 'sanctions':
      if (!demoAllowed()) return unavailableResource('sanctions');
      return {
        status: 'empty',
        data: [],
        total: 0,
        source: 'demo',
        demoFallback: true,
        latencyMs: 0,
        error: {
          code: 'SCREENING_RUN_REQUIRED',
          message:
            'KoriePay stores no standing list of sanctions matches. Run a screening to produce one — results are real and are written to the screening engine.',
          hint: 'Use “Screen a name” with the subject’s legal name and jurisdiction.',
        },
      } as ComplianceResource<ComplianceResourceMap[K]>;
    case 'watchlists':
      return readyResource(DEMO_WATCHLISTS, NO_CALL, 'demo') as unknown as ComplianceResource<
        ComplianceResourceMap[K]
      >;
    case 'dashboard':
    case 'tasks':
    case 'notifications':
      return loadDerived(key, opts) as unknown as Promise<ComplianceResource<ComplianceResourceMap[K]>>;
    default:
      return loadList(key as RowKey, opts) as unknown as Promise<ComplianceResource<ComplianceResourceMap[K]>>;
  }
}

export type {
  AlertRow,
  ApprovalRow,
  CaseRow,
  CustomerRow,
  EscalationRow,
  KybRow,
  KycRow,
  MonitoringRow,
  ObligationRow,
  ProviderRow,
  ReportRow,
};
