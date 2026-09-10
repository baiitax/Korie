// =============================================================================
// CxTruthService — the measurement layer of the customer-experience loop.
//
// GAP-2: the engines held the instruments (complaint priorities + SLA clocks,
// dispute/chargeback/refund lifecycles, real double-entry redress, systemic
// incident records) but nothing admin-facing read them coherently, and nothing
// anywhere measured customer satisfaction.
//
// Rules this file obeys:
//   · Every figure is read from an engine at request time. Nothing is stored
//     here, nothing is estimated, nothing is back-filled.
//   · Seed fixtures are counted separately from live records and surfaced with
//     `isSeed` so an operator can never mistake a demo row for a customer's.
//   · SLA breach is computed from the clock. The stored `isSlaBreached` field
//     was never refreshed by any code path; the disagreement is reported rather
//     than hidden.
//   · CSAT/NPS are derived only from ratings real customers submitted through
//     the capture path. Zero responses reports "not yet measurable" — it never
//     reports 0.0 or an industry average.
//   · Figures from different engines are never summed together: a dispute, a
//     refund and a complaint compensation can describe the same harm.
// =============================================================================

import { ComplaintDisputeEngine } from '@/lib/complaints/ComplaintDisputeEngine';
import { DisputeChargebackEngine } from '@/lib/recovery/DisputeChargebackEngine';
import { RefundReversalEngine } from '@/lib/recovery/RefundReversalEngine';
import { CustomerHarmIncidentEngine } from '@/lib/consumer/CustomerHarmIncidentEngine';
import { GeneralLedgerEngine } from '@/lib/financial/GeneralLedgerEngine';
import { AgentManagementEngine } from '@/lib/agents/AgentManagementEngine';
import type {
  ComplaintRecord,
  ComplaintPriority,
  ComplaintStatus,
  SystemicIncidentRecord,
} from '@/types/regulatoryConsumerEngine';

export type CxCountryFilter = 'GLOBAL' | 'NG' | 'NE';

const OPEN_STATUSES: ComplaintStatus[] = [
  'OPENED',
  'ACKNOWLEDGED',
  'CLASSIFIED',
  'ASSIGNED',
  'INVESTIGATING',
  'PENDING_CUSTOMER',
  'PENDING_PROVIDER',
  'RESOLUTION_PROPOSED',
];

/** A case inside its SLA window but closing in on the deadline. */
const AT_RISK_HOURS = 4;

export interface CurrencyTotal {
  currency: string;
  amount: number;
}

export interface CxCaseRow {
  id: string;
  reference: string;
  customer: string;
  phoneMasked: string;
  country: 'NG' | 'NE';
  category: string;
  priority: ComplaintPriority;
  status: ComplaintStatus;
  currency: string;
  disputedAmount: number;
  createdAt: string;
  slaDueAt: string;
  slaState: 'BREACHED' | 'AT_RISK' | 'ON_TRACK' | 'MET' | 'MISSED';
  hoursToDue: number | null;
  ageHours: number;
  assignedTo?: string;
  isSeed: boolean;
  resolutionType?: string;
  compensationAmount?: number;
  csatScore?: number;
  transitions: number;
}

export interface CxCluster {
  key: string;
  category: string;
  country: string;
  agentId?: string;
  terminalId?: string;
  cases: number;
  openCases: number;
  affectedCustomers: number;
  exposure: CurrencyTotal[];
  latestAt: string;
  references: string[];
}

export interface CxIncidentRow {
  id: string;
  reference: string;
  title: string;
  severity: string;
  status: string;
  affectedProvider?: string;
  affectedCorridor?: string;
  affectedCustomersCount: number;
  affectedAgentsCount: number;
  exposure: number;
  currency: string;
  regulatoryNotified: boolean;
  startedAt: string;
  isSeed: boolean;
}

export interface CxSource {
  key: string;
  engine: string;
  available: boolean;
  records: number | null;
  seedRecords: number | null;
  liveRecords: number | null;
  note?: string;
}

export interface CxSnapshot {
  country: CxCountryFilter;
  generatedAt: string;
  headline: {
    statement: string;
    casesConsidered: number;
    liveCases: number;
    seedCases: number;
  };
  loop: {
    captured: number;
    open: number;
    resolved: number;
    closed: number;
    resolvedWithRedress: number;
    exitRatePct: number | null;
    measured: number;
    eligibleForMeasurement: number;
    preventionIncidents: number;
    /** Every open case's disputed value, by currency — the book's live exposure. */
    openExposure: CurrencyTotal[];
    /** Open cases at the top of the engine's priority ladder. */
    p0Open: number;
  };
  sla: {
    policy: { priority: ComplaintPriority; slaHours: number }[];
    breached: number;
    atRisk: number;
    onTrack: number;
    breachRatePct: number | null;
    metClocks: number;
    missedClocks: number;
    storedFlagStale: number;
    nextDeadline: string | null;
    rows: { priority: ComplaintPriority; slaHours: number; open: number; breached: number; atRisk: number; onTrack: number }[];
    note: string;
  };
  cycleTime: {
    medianResolveHours: number | null;
    p90ResolveHours: number | null;
    fastestResolveHours: number | null;
    slowestResolveHours: number | null;
    sampleSize: number;
    openedLast7d: number;
    resolvedLast7d: number;
    /** Cases that left a terminal state — a quality signal the history now exposes. */
    reopens: number;
    resolvedWithoutResolutionType: number;
  };
  queue: CxCaseRow[];
  recentResolved: CxCaseRow[];
  redress: {
    complaintCompensation: {
      cases: number;
      total: CurrencyTotal[];
      average: CurrencyTotal[];
      maxCase: { reference: string; amount: number; currency: string; journalId?: string } | null;
      resolutionTypes: { type: string; cases: number }[];
    };
    glRedressExpense: {
      accountCode: string;
      accountName: string;
      postings: number;
      total: CurrencyTotal[];
      journals: {
        journalNumber: string;
        currency: string;
        amount: number;
        narration: string;
        postedBy?: string;
        createdAt: string;
        sourceReference?: string;
      }[];
      note: string;
    };
    refunds: {
      total: number;
      successful: number;
      seedRecords: number;
      totalByCurrency: CurrencyTotal[];
      latestAt: string | null;
    } | null;
    reversals: { available: false; note: string };
    disputes: {
      total: number;
      open: number;
      resolved: number;
      claimValue: CurrencyTotal[];
      heldReserve: CurrencyTotal[];
      breachedSla: number;
      evidenceFiles: number;
      outcomes: { outcome: string; cases: number }[];
      seedRecords: number;
    } | null;
    chargebacks: {
      total: number;
      byStatus: { status: string; cases: number }[];
      value: CurrencyTotal[];
      nextDeadline: string | null;
      seedRecords: number;
    } | null;
    note: string;
  };
  csat: {
    status: 'AWAITING_FIRST_RESPONSE' | 'MEASURED';
    responses: number;
    responsesLast7d: number;
    eligibleCases: number;
    coveragePct: number | null;
    average: number | null;
    distribution: { score: 1 | 2 | 3 | 4 | 5; responses: number }[];
    satisfiedPct: number | null;
    nps: number | null;
    promoters: number;
    passives: number;
    detractors: number;
    lastCapturedAt: string | null;
    channels: { channel: string; responses: number }[];
    capturePath: string;
    note: string;
  };
  prevention: {
    clusters: CxCluster[];
    repeatAgents: { agentId: string; cases: number; categories: string[] }[];
    incidents: CxIncidentRow[];
    unresolvedIncidents: number;
    activeIncidents: number;
    mitigatedIncidents: number;
    closedIncidents: number;
    statusCounts: { status: string; incidents: number }[];
    affectedCustomers: number;
    affectedCustomersMitigated: number;
    exposure: CurrencyTotal[];
    regulatoryNotified: number;
    note: string;
  };
  /** GAP-6 feedback culture: what drives the book, who keeps coming back, which agents attract complaints. */
  drivers: {
    categoryPareto: {
      category: string;
      cases: number;
      openCases: number;
      sharePct: number;
      cumulativePct: number;
      exposure: CurrencyTotal[];
    }[];
    paretoNote: string;
    repeatComplainants: {
      customerId: string;
      phoneMasked: string;
      cases: number;
      openCases: number;
      categories: string[];
      references: string[];
      latestAt: string;
    }[];
    agentQuality: {
      agentId: string;
      agentName: string | null;
      cases: number;
      openCases: number;
      categories: string[];
      exposure: CurrencyTotal[];
    }[];
    note: string;
  };
  sources: CxSource[];
  warnings: string[];
}

function maskPhone(phone?: string): string {
  if (!phone) return '—';
  const digits = phone.replace(/[^\d]/g, '');
  if (digits.length < 6) return '—';
  return `${phone.startsWith('+') ? '+' : ''}${digits.slice(0, 3)}••••${digits.slice(-3)}`;
}

function sumByCurrency<T>(rows: T[], currency: (r: T) => string, amount: (r: T) => number): CurrencyTotal[] {
  const map = new Map<string, number>();
  rows.forEach((r) => {
    const c = currency(r);
    map.set(c, (map.get(c) || 0) + amount(r));
  });
  return Array.from(map.entries())
    .map(([c, amount]) => ({ currency: c, amount }))
    .sort((a, b) => a.currency.localeCompare(b.currency));
}

function hoursBetween(fromIso: string, toIso: string): number | null {
  const from = new Date(fromIso).getTime();
  const to = new Date(toIso).getTime();
  if (!Number.isFinite(from) || !Number.isFinite(to)) return null;
  return Number(((to - from) / 3_600_000).toFixed(2));
}

function percentile(sortedValues: number[], p: number): number | null {
  if (sortedValues.length === 0) return null;
  const idx = Math.min(sortedValues.length - 1, Math.floor((p / 100) * sortedValues.length));
  return Number(sortedValues[idx].toFixed(2));
}

export class CxTruthService {
  private static slaRowFor(c: ComplaintRecord, nowMs: number) {
    const due = new Date(c.slaDueAt).getTime();
    const hoursToDue = Number.isFinite(due) ? Number(((due - nowMs) / 3_600_000).toFixed(2)) : null;
    const resolved = c.status === 'RESOLVED' || c.status === 'CLOSED';
    let slaState: CxCaseRow['slaState'];
    if (resolved) {
      slaState = ComplaintDisputeEngine.computeBreach(c, nowMs) ? 'MISSED' : 'MET';
    } else if (hoursToDue !== null && hoursToDue < 0) {
      slaState = 'BREACHED';
    } else if (hoursToDue !== null && hoursToDue <= AT_RISK_HOURS) {
      slaState = 'AT_RISK';
    } else {
      slaState = 'ON_TRACK';
    }
    return { hoursToDue, slaState };
  }

  private static toRow(c: ComplaintRecord, nowMs: number): CxCaseRow {
    const { hoursToDue, slaState } = CxTruthService.slaRowFor(c, nowMs);
    return {
      id: c.id,
      reference: c.complaintReference,
      customer: c.customerName,
      phoneMasked: maskPhone(c.customerPhone),
      country: c.country,
      category: c.category,
      priority: c.priority,
      status: c.status,
      currency: c.currency,
      disputedAmount: c.disputedAmount,
      createdAt: c.createdAt,
      slaDueAt: c.slaDueAt,
      slaState,
      hoursToDue,
      ageHours: hoursBetween(c.createdAt, new Date(nowMs).toISOString()) ?? 0,
      assignedTo: c.assignedToEmail,
      isSeed: c.isSeed === true,
      resolutionType: c.resolutionType,
      compensationAmount: c.financialCompensationAmount,
      csatScore: c.csatScore,
      transitions: (c.statusHistory || []).length,
    };
  }

  public static getSnapshot(country: CxCountryFilter = 'GLOBAL'): CxSnapshot {
    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();
    const warnings: string[] = [];

    // ---------------------------------------------------------------- opinions
    const complaintEngine = ComplaintDisputeEngine.getInstance();
    // Derive breach state from the clocks before reading anything. The stored
    // flag had no writer after creation, so this is also how we measure how
    // stale it had become.
    const preRefresh = complaintEngine
      .getComplaints()
      .filter((c) => c.isSlaBreached !== ComplaintDisputeEngine.computeBreach(c, nowMs)).length;
    const refresh = complaintEngine.refreshSlaClocks(nowMs);

    const allComplaints = complaintEngine.getComplaints();
    const scoped = country === 'GLOBAL' ? allComplaints : allComplaints.filter((c) => c.country === country);
    const liveCases = scoped.filter((c) => !c.isSeed);
    const seedCases = scoped.filter((c) => c.isSeed);

    const openCases = scoped.filter((c) => OPEN_STATUSES.includes(c.status));
    const resolvedCases = scoped.filter((c) => c.status === 'RESOLVED');
    const closedCases = scoped.filter((c) => c.status === 'CLOSED');
    const terminalCases = scoped.filter((c) => c.status === 'RESOLVED' || c.status === 'CLOSED');
    const resolvedWithRedress = scoped.filter((c) => (c.financialCompensationAmount || 0) > 0);

    const rows = scoped.map((c) => CxTruthService.toRow(c, nowMs));
    const openRows = rows
      .filter((r) => OPEN_STATUSES.includes(r.status))
      .sort((a, b) => {
        const rank = { BREACHED: 0, AT_RISK: 1, ON_TRACK: 2, MET: 3, MISSED: 4 } as const;
        return rank[a.slaState] - rank[b.slaState] || a.priority.localeCompare(b.priority) || (a.hoursToDue ?? 0) - (b.hoursToDue ?? 0);
      });

    // ------------------------------------------------------------------- SLA
    const policy = (Object.keys(ComplaintDisputeEngine.SLA_HOURS) as ComplaintPriority[]).map((priority) => ({
      priority,
      slaHours: ComplaintDisputeEngine.SLA_HOURS[priority],
    }));
    const breached = rows.filter((r) => r.slaState === 'BREACHED').length;
    const atRisk = rows.filter((r) => r.slaState === 'AT_RISK').length;
    const onTrack = rows.filter((r) => r.slaState === 'ON_TRACK').length;
    const metClocks = rows.filter((r) => r.slaState === 'MET').length;
    const missedClocks = rows.filter((r) => r.slaState === 'MISSED').length;

    const slaRows = policy.map((p) => {
      const inPriority = rows.filter((r) => r.priority === p.priority);
      return {
        priority: p.priority,
        slaHours: p.slaHours,
        open: inPriority.filter((r) => OPEN_STATUSES.includes(r.status)).length,
        breached: inPriority.filter((r) => r.slaState === 'BREACHED').length,
        atRisk: inPriority.filter((r) => r.slaState === 'AT_RISK').length,
        onTrack: inPriority.filter((r) => r.slaState === 'ON_TRACK').length,
      };
    });

    const nextDeadlineCandidate = openRows
      .filter((r) => r.slaState !== 'BREACHED' && r.slaDueAt)
      .sort((a, b) => new Date(a.slaDueAt).getTime() - new Date(b.slaDueAt).getTime())[0];

    // ------------------------------------------------------------ cycle time
    const resolveHours = terminalCases
      .map((c) => hoursBetween(c.createdAt, c.closedAt || c.resolvedAt || ''))
      .filter((h): h is number => h !== null && h >= 0)
      .sort((a, b) => a - b);
    const sevenDaysAgo = nowMs - 7 * 24 * 3_600_000;

    // A case that went RESOLVED/CLOSED and then left that state was reopened.
    // That was not observable before the engine started recording transitions.
    const reopens = scoped.filter((c) => {
      const history = c.statusHistory || [];
      return history.some(
        (e, i) => i > 0 && ['RESOLVED', 'CLOSED'].includes(history[i - 1].status) && !['RESOLVED', 'CLOSED'].includes(e.status),
      );
    }).length;
    const resolvedWithoutResolutionType = terminalCases.filter((c) => !c.resolutionType).length;

    // --------------------------------------------------------------- redress
    const gl = GeneralLedgerEngine.getInstance();
    const redoxAccount = gl.getAccount('5010');
    const glJournals = gl
      .getJournals(200)
      .filter((j) => j.lines.some((l) => l.accountCode === '5010'))
      .map((j) => ({
        journalNumber: j.journalNumber,
        currency: j.currency,
        amount: j.lines.filter((l) => l.accountCode === '5010').reduce((a, l) => a + l.amount, 0),
        narration: j.narration,
        postedBy: j.postedBy,
        createdAt: j.createdAt,
        sourceReference: j.sourceReference,
      }));
    const compensationCases = resolvedWithRedress.map((c) => ({
      currency: c.currency,
      amount: c.financialCompensationAmount || 0,
    }));
    const resolutionTypeCounts = new Map<string, number>();
    terminalCases.forEach((c) => {
      const key = c.resolutionType || 'NOT_RECORDED';
      resolutionTypeCounts.set(key, (resolutionTypeCounts.get(key) || 0) + 1);
    });
    const biggestCase = resolvedWithRedress
      .slice()
      .sort((a, b) => (b.financialCompensationAmount || 0) - (a.financialCompensationAmount || 0))[0];

    let refunds: CxSnapshot['redress']['refunds'] = null;
    let disputes: CxSnapshot['redress']['disputes'] = null;
    let chargebacks: CxSnapshot['redress']['chargebacks'] = null;
    let disputeSource = { total: 0, seed: 0, live: 0 };

    try {
      const refundEngine = RefundReversalEngine.getInstance();
      const allRefunds = refundEngine.getRefunds();
      refunds = {
        total: allRefunds.length,
        successful: allRefunds.filter((r) => r.status === 'SUCCESS').length,
        seedRecords: allRefunds.filter((r) => r.isSeed).length,
        totalByCurrency: sumByCurrency(
          allRefunds.filter((r) => r.status === 'SUCCESS'),
          (r) => r.currency,
          (r) => r.refundAmount,
        ),
        latestAt: allRefunds[0]?.createdAt || null,
      };
    } catch {
      warnings.push('RefundReversalEngine could not be read; the refund series is omitted rather than zero-filled.');
    }

    try {
      const disputeEngine = DisputeChargebackEngine.getInstance();
      const allDisputes = disputeEngine.getDisputes();
      const allChargebacks = disputeEngine.getChargebacks();
      disputeSource = {
        total: allDisputes.length + allChargebacks.length,
        seed: allDisputes.filter((d) => d.isSeed).length + allChargebacks.filter((c) => c.isSeed).length,
        live: allDisputes.filter((d) => !d.isSeed).length + allChargebacks.filter((c) => !c.isSeed).length,
      };
      const outcomes = new Map<string, number>();
      allDisputes
        .filter((d) => d.resolutionOutcome)
        .forEach((d) => outcomes.set(d.resolutionOutcome as string, (outcomes.get(d.resolutionOutcome as string) || 0) + 1));

      disputes = {
        total: allDisputes.length,
        open: allDisputes.filter((d) => d.status !== 'RESOLVED').length,
        resolved: allDisputes.filter((d) => d.status === 'RESOLVED').length,
        claimValue: sumByCurrency(allDisputes, (d) => d.currency, (d) => d.claimAmount),
        heldReserve: sumByCurrency(
          allDisputes.filter((d) => d.status !== 'RESOLVED'),
          (d) => d.currency,
          (d) => d.heldReserveAmount,
        ),
        breachedSla: allDisputes.filter((d) => Date.parse(d.slaDueAt) < nowMs && d.status !== 'RESOLVED').length,
        evidenceFiles: allDisputes.reduce((a, d) => a + (d.evidence?.length || 0), 0),
        outcomes: Array.from(outcomes.entries()).map(([outcome, cases]) => ({ outcome, cases })),
        seedRecords: allDisputes.filter((d) => d.isSeed).length,
      };
      chargebacks = {
        total: allChargebacks.length,
        byStatus: Array.from(
          allChargebacks.reduce((m, c) => m.set(c.status, (m.get(c.status) || 0) + 1), new Map<string, number>()).entries(),
        ).map(([status, cases]) => ({ status, cases })),
        value: sumByCurrency(allChargebacks, (c) => c.currency, (c) => c.chargebackAmount),
        nextDeadline:
          allChargebacks
            .map((c) => c.responseDeadline)
            .filter(Boolean)
            .sort((a, b) => Date.parse(a) - Date.parse(b))[0] || null,
        seedRecords: allChargebacks.filter((c) => c.isSeed).length,
      };
      if (country !== 'GLOBAL' && allDisputes.length > 0) {
        warnings.push(
          'Dispute, chargeback and refund records carry no country field in their engines, so the market filter does not apply to them — they are reported in full.',
        );
      }
    } catch {
      warnings.push('Dispute/chargeback engines could not be read; those panels report unavailable rather than zero.');
    }

    // ------------------------------------------------------------------ CSAT
    const responses = complaintEngine.getCsatResponses().filter((c) => country === 'GLOBAL' || c.country === country);
    const eligible = terminalCases.length;
    const scoreCounts = [1, 2, 3, 4, 5].map((score) => ({
      score: score as 1 | 2 | 3 | 4 | 5,
      responses: responses.filter((c) => c.csatScore === score).length,
    }));
    const promoters = responses.filter((c) => (c.csatScore || 0) >= 4).length;
    const passives = responses.filter((c) => c.csatScore === 3).length;
    const detractors = responses.filter((c) => (c.csatScore || 0) <= 2).length;
    const average =
      responses.length > 0
        ? Number((responses.reduce((a, c) => a + (c.csatScore || 0), 0) / responses.length).toFixed(2))
        : null;
    const channelCounts = new Map<string, number>();
    responses.forEach((c) => channelCounts.set(c.csatChannel || 'PORTAL', (channelCounts.get(c.csatChannel || 'PORTAL') || 0) + 1));
    const lastCapturedAt =
      responses
        .map((c) => c.csatCapturedAt)
        .filter((v): v is string => Boolean(v))
        .sort()
        .reverse()[0] || null;

    const csat: CxSnapshot['csat'] = {
      status: responses.length > 0 ? 'MEASURED' : 'AWAITING_FIRST_RESPONSE',
      responses: responses.length,
      responsesLast7d: responses.filter((c) => Date.parse(c.csatCapturedAt || '') >= sevenDaysAgo).length,
      eligibleCases: eligible,
      coveragePct: eligible > 0 ? Number(((responses.length / eligible) * 100).toFixed(1)) : null,
      average,
      distribution: scoreCounts,
      satisfiedPct: responses.length > 0 ? Number(((promoters / responses.length) * 100).toFixed(1)) : null,
      nps: responses.length > 0 ? Math.round(((promoters - detractors) / responses.length) * 100) : null,
      promoters,
      passives,
      detractors,
      lastCapturedAt,
      channels: Array.from(channelCounts.entries()).map(([channel, r]) => ({ channel, responses: r })),
      capturePath: 'POST /api/customer/portal/csat — a resolved case can be rated once, by the customer it belongs to.',
      note:
        responses.length > 0
          ? 'Scores are customers\u2019 own ratings of resolved cases; nothing is imputed for the cases that were not rated.'
          : 'No customer has rated a resolved case yet. CSAT is not measureable from zero responses — this figure stays blank until real ratings arrive (there is no default, estimate or industry benchmark in this panel).',
    };
    if (responses.length > 0 && csat.coveragePct !== null && csat.coveragePct < 20) {
      warnings.push(
        `CSAT coverage is ${csat.coveragePct}% of resolved cases (${responses.length}/${eligible}); treat the score as directional until coverage improves.`,
      );
    }

    // ------------------------------------------------------------ prevention
    const clusters = new Map<string, CxCluster>();
    scoped.forEach((c) => {
      const scopeKey = c.agentId || c.terminalId || c.country;
      const key = `${c.category}::${scopeKey}`;
      const existing = clusters.get(key);
      const exposureAmount = c.disputedAmount || 0;
      if (existing) {
        existing.cases += 1;
        existing.openCases += OPEN_STATUSES.includes(c.status) ? 1 : 0;
        existing.references.push(c.complaintReference);
        const bucket = existing.exposure.find((e) => e.currency === c.currency);
        if (bucket) bucket.amount += exposureAmount;
        else existing.exposure.push({ currency: c.currency, amount: exposureAmount });
        if (Date.parse(c.createdAt) > Date.parse(existing.latestAt)) existing.latestAt = c.createdAt;
      } else {
        clusters.set(key, {
          key,
          category: c.category,
          country: c.country,
          agentId: c.agentId,
          terminalId: c.terminalId,
          cases: 1,
          openCases: OPEN_STATUSES.includes(c.status) ? 1 : 0,
          affectedCustomers: 0,
          exposure: [{ currency: c.currency, amount: exposureAmount }],
          latestAt: c.createdAt,
          references: [c.complaintReference],
        });
      }
    });
    const recurring = Array.from(clusters.values()).filter((c) => c.cases >= 2);
    // affected customers = distinct customers behind the cluster
    recurring.forEach((cl) => {
      const ids = new Set(
        scoped
          .filter((c) => `${c.category}::${c.agentId || c.terminalId || c.country}` === cl.key)
          .map((c) => c.customerId),
      );
      cl.affectedCustomers = ids.size;
    });
    recurring.sort((a, b) => b.cases - a.cases || Date.parse(b.latestAt) - Date.parse(a.latestAt));

    const agentLoad = new Map<string, { cases: number; categories: Set<string> }>();
    scoped.forEach((c) => {
      if (!c.agentId) return;
      const entry = agentLoad.get(c.agentId) || { cases: 0, categories: new Set<string>() };
      entry.cases += 1;
      entry.categories.add(c.category);
      agentLoad.set(c.agentId, entry);
    });

    // ------------------------------------------------- drivers (GAP-6: feedback culture)
    const categoryGroups = new Map<string, typeof scoped>();
    scoped.forEach((c) => {
      const list = categoryGroups.get(c.category) || [];
      list.push(c);
      categoryGroups.set(c.category, list);
    });
    const categoryPareto = Array.from(categoryGroups.entries())
      .map(([category, list]) => ({
        category,
        cases: list.length,
        openCases: list.filter((c) => OPEN_STATUSES.includes(c.status)).length,
        sharePct: scoped.length > 0 ? Number(((list.length / scoped.length) * 100).toFixed(1)) : 0,
        cumulativePct: 0,
        exposure: sumByCurrency(list, (c) => c.currency, (c) => c.disputedAmount || 0),
      }))
      .sort((a, b) => b.cases - a.cases);
    let paretoRunning = 0;
    categoryPareto.forEach((row) => {
      paretoRunning = Number((paretoRunning + row.sharePct).toFixed(1));
      row.cumulativePct = paretoRunning;
    });
    const paretoCoverIdx = categoryPareto.findIndex((row) => row.cumulativePct >= 80);

    const complainantGroups = new Map<string, typeof scoped>();
    scoped.forEach((c) => {
      const list = complainantGroups.get(c.customerId) || [];
      list.push(c);
      complainantGroups.set(c.customerId, list);
    });
    const repeatComplainants = Array.from(complainantGroups.entries())
      .filter(([, list]) => list.length >= 2)
      .map(([customerId, list]) => ({
        customerId,
        phoneMasked: maskPhone(list[0].customerPhone),
        cases: list.length,
        openCases: list.filter((c) => OPEN_STATUSES.includes(c.status)).length,
        categories: Array.from(new Set(list.map((c) => c.category))).sort(),
        references: list.map((c) => c.complaintReference),
        latestAt: list.map((c) => c.createdAt).sort().reverse()[0],
      }))
      .sort((a, b) => b.cases - a.cases || Date.parse(b.latestAt) - Date.parse(a.latestAt));

    const agentCaseGroups = new Map<string, typeof scoped>();
    scoped.forEach((c) => {
      if (!c.agentId) return;
      const list = agentCaseGroups.get(c.agentId) || [];
      list.push(c);
      agentCaseGroups.set(c.agentId, list);
    });
    const agentRegistry = (() => {
      try {
        return AgentManagementEngine.getInstance();
      } catch {
        return null;
      }
    })();
    const agentQuality = Array.from(agentCaseGroups.entries())
      .map(([agentId, list]) => {
        let agentName: string | null = null;
        try {
          const found = agentRegistry?.getAgent(agentId) || agentRegistry?.getAgents().find((a) => a.agentCode === agentId);
          agentName = found?.tradingName || found?.legalName || null;
        } catch {
          agentName = null;
        }
        return {
          agentId,
          agentName,
          cases: list.length,
          openCases: list.filter((c) => OPEN_STATUSES.includes(c.status)).length,
          categories: Array.from(new Set(list.map((c) => c.category))).sort(),
          exposure: sumByCurrency(list, (c) => c.currency, (c) => c.disputedAmount || 0),
        };
      })
      .sort((a, b) => b.cases - a.cases)
      .slice(0, 10);
    const unattributedCases = scoped.filter((c) => !c.agentId).length;

    let incidents: CxIncidentRow[] = [];
    try {
      const harmEngine = CustomerHarmIncidentEngine.getInstance();
      incidents = harmEngine.getIncidents().map((i: SystemicIncidentRecord) => ({
        id: i.id,
        reference: i.incidentReference,
        title: i.title,
        severity: i.severity,
        status: i.status,
        affectedProvider: i.affectedProvider,
        affectedCorridor: i.affectedCorridor,
        affectedCustomersCount: i.affectedCustomersCount,
        affectedAgentsCount: i.affectedAgentsCount,
        exposure: i.totalFinancialExposure,
        currency: i.currency,
        regulatoryNotified: i.regulatoryNotified,
        startedAt: i.startedAt,
        isSeed: i.isSeed === true,
      }));
    } catch {
      warnings.push('CustomerHarmIncidentEngine could not be read; the systemic-incident panel reports unavailable.');
    }
    // Three states, not two: an incident whose remediation ran but which has not
    // been formally closed is not "active harm", and its customers are not
    // currently exposed. Conflating them inflates both counters.
    const activeIncidents = incidents.filter((i) => ['OPEN', 'INVESTIGATING', 'REMEDIATING'].includes(i.status));
    const mitigatedIncidents = incidents.filter((i) => i.status === 'MITIGATED');
    const closedIncidents = incidents.filter((i) => ['RESOLVED', 'POSTMORTEM_PUBLISHED'].includes(i.status));

    // ---------------------------------------------------------------- sources
    const sources: CxSource[] = [
      {
        key: 'complaints',
        engine: 'ComplaintDisputeEngine',
        available: true,
        records: scoped.length,
        seedRecords: seedCases.length,
        liveRecords: liveCases.length,
      },
      {
        key: 'csat',
        engine: 'ComplaintDisputeEngine (captureCsat)',
        available: true,
        records: responses.length,
        seedRecords: 0,
        liveRecords: responses.length,
        note: responses.length === 0 ? 'no ratings captured yet' : undefined,
      },
      {
        key: 'redressExpense',
        engine: 'GeneralLedgerEngine · account 5010',
        available: Boolean(redoxAccount),
        records: glJournals.length,
        seedRecords: null,
        liveRecords: null,
        note: redoxAccount ? redoxAccount.accountName : 'account not present in chart of accounts',
      },
      {
        key: 'refunds',
        engine: 'RefundReversalEngine',
        available: refunds !== null,
        records: refunds?.total ?? null,
        seedRecords: refunds?.seedRecords ?? null,
        liveRecords: refunds ? refunds.total - refunds.seedRecords : null,
      },
      {
        key: 'disputes',
        engine: 'DisputeChargebackEngine',
        available: disputes !== null,
        records: disputeSource.total,
        seedRecords: disputeSource.seed,
        liveRecords: disputeSource.live,
      },
      {
        key: 'incidents',
        engine: 'CustomerHarmIncidentEngine',
        available: incidents.length > 0,
        records: incidents.length,
        seedRecords: incidents.filter((i) => i.isSeed).length,
        liveRecords: incidents.filter((i) => !i.isSeed).length,
      },
      {
        key: 'reversals',
        engine: 'RefundReversalEngine (reversals)',
        available: false,
        records: null,
        seedRecords: null,
        liveRecords: null,
        note: 'the engine holds reversals but exposes no read path — withheld rather than estimated',
      },
    ];

    // --------------------------------------------------------------- warnings
    if (seedCases.length > 0) {
      warnings.push(
        `${seedCases.length} of ${scoped.length} case(s) in this book are engine seed fixtures (isSeed), not customer submissions: ${seedCases
          .map((c) => c.complaintReference)
          .join(', ')}.`,
      );
    }
    if (preRefresh > 0) {
      warnings.push(
        `Stored isSlaBreached disagreed with the SLA clock on ${preRefresh} of ${refresh.checked} record(s) at read time — the flag had no writer after creation. Breach state on this page is computed from slaDueAt, not read from the field.`,
      );
    }
    if (refunds && refunds.seedRecords > 0) {
      warnings.push(`Refund book includes ${refunds.seedRecords} seed fixture(s) — counted separately from live refunds.`);
    }
    if (disputes && disputes.seedRecords > 0) {
      warnings.push(`Dispute book includes ${disputes.seedRecords} seed fixture(s) — counted separately from live disputes.`);
    }
    if (openCases.length > 0 && rows.some((r) => r.assignedTo === undefined)) {
      warnings.push(
        `${openCases.filter((c) => !c.assignedToEmail).length} open case(s) have no assignee — nothing in the engine auto-routes a complaint, so unassigned means nobody has picked it up.`,
      );
    }
    if (resolvedWithoutResolutionType > 0) {
      warnings.push(
        `${resolvedWithoutResolutionType} resolved case(s) carry no resolution type — the engine does not require one when a case is moved to RESOLVED by a plain status change, so the reason it closed is not recorded anywhere.`,
      );
    }
    if (reopens > 0) {
      warnings.push(`${reopens} case(s) were reopened after reaching a terminal state — resolution quality, not just speed, is what these cases measure.`);
    }
    if (repeatComplainants.length > 0) {
      warnings.push(
        `${repeatComplainants.length} customer(s) filed 2+ cases (${repeatComplainants.reduce((a, r) => a + r.cases, 0)} cases between them) — repeat contact is the cheapest churn signal in this book.`,
      );
    }
    if (categoryPareto.length > 0 && categoryPareto[0].sharePct >= 50 && scoped.length >= 3) {
      warnings.push(
        `One category dominates the book: ${categoryPareto[0].category} is ${categoryPareto[0].sharePct}% of ${scoped.length} cases. Prevention effort belongs there first.`,
      );
    }
    if (agentQuality.length > 0 && unattributedCases > 0) {
      warnings.push(
        `${unattributedCases} case(s) name no agent, so the per-agent quality table is a floor, not a census — unattributed cases cannot exonerate or implicate anyone.`,
      );
    }
    warnings.push(
      'Redress figures are reported per engine and never summed across engines: a complaint compensation, its refund and its dispute can all describe the same customer harm.',
    );

    // --------------------------------------------------------------- headline
    const headlineParts: string[] = [];
    headlineParts.push(
      `${openCases.length} open case(s) across ${scoped.length} in the complaint book; ${breached} past SLA, ${atRisk} inside ${AT_RISK_HOURS}h of deadline.`,
    );
    headlineParts.push(
      terminalCases.length > 0
        ? `Cycle time median ${CxTruthService.formatHours(percentile(resolveHours, 50))} over ${resolveHours.length} resolved case(s).`
        : 'No case has been resolved yet, so no cycle time exists to report.',
    );
    headlineParts.push(
      responses.length > 0
        ? `CSAT ${average}/5 from ${responses.length} customer rating(s) (${csat.coveragePct}% coverage).`
        : 'CSAT: no customer rating captured yet — unmeasurable, not zero.',
    );
    headlineParts.push(
      recurring.length > 0
        ? `${recurring.length} recurring harm pattern(s) with \u22652 cases share a category and agent/terminal.`
        : 'No repeating category+agent pattern in the book.',
    );

    return {
      country,
      generatedAt: nowIso,
      headline: {
        statement: headlineParts.join(' '),
        casesConsidered: scoped.length,
        liveCases: liveCases.length,
        seedCases: seedCases.length,
      },
      loop: {
        captured: scoped.length,
        open: openCases.length,
        resolved: resolvedCases.length,
        closed: closedCases.length,
        resolvedWithRedress: resolvedWithRedress.length,
        exitRatePct: scoped.length > 0 ? Number((((resolvedCases.length + closedCases.length) / scoped.length) * 100).toFixed(1)) : null,
        measured: responses.length,
        eligibleForMeasurement: eligible,
        preventionIncidents: incidents.length,
        openExposure: sumByCurrency(openCases, (c) => c.currency, (c) => c.disputedAmount || 0),
        p0Open: openCases.filter((c) => c.priority === 'P0').length,
      },
      sla: {
        policy,
        breached,
        atRisk,
        onTrack,
        breachRatePct: rows.length > 0 ? Number(((breached / rows.length) * 100).toFixed(1)) : null,
        metClocks,
        missedClocks,
        storedFlagStale: preRefresh,
        nextDeadline: nextDeadlineCandidate?.slaDueAt || null,
        rows: slaRows,
        note: `Clocks are created by the engine at intake — ${policy
          .map((p) => `${p.priority} ${p.slaHours}h`)
          .join(', ')}. Breach is recomputed from the deadline on every read; closed cases are judged at the moment they were resolved.`,
      },
      cycleTime: {
        medianResolveHours: percentile(resolveHours, 50),
        p90ResolveHours: percentile(resolveHours, 90),
        fastestResolveHours: resolveHours.length > 0 ? resolveHours[0] : null,
        slowestResolveHours: resolveHours.length > 0 ? resolveHours[resolveHours.length - 1] : null,
        sampleSize: resolveHours.length,
        openedLast7d: scoped.filter((c) => Date.parse(c.createdAt) >= sevenDaysAgo).length,
        resolvedLast7d: terminalCases.filter((c) => Date.parse(c.closedAt || c.resolvedAt || '') >= sevenDaysAgo).length,
        reopens,
        resolvedWithoutResolutionType,
      },
      queue: openRows.slice(0, 25),
      recentResolved: rows
        .filter((r) => r.status === 'RESOLVED' || r.status === 'CLOSED')
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
        .slice(0, 8),
      redress: {
        complaintCompensation: {
          cases: resolvedWithRedress.length,
          total: sumByCurrency(compensationCases, (c) => c.currency, (c) => c.amount),
          average: sumByCurrency(compensationCases, (c) => c.currency, (c) => c.amount).map((t) => ({
            currency: t.currency,
            amount: Number((t.amount / (compensationCases.filter((c) => c.currency === t.currency).length || 1)).toFixed(2)),
          })),
          maxCase: biggestCase
            ? {
                reference: biggestCase.complaintReference,
                amount: biggestCase.financialCompensationAmount || 0,
                currency: biggestCase.currency,
                journalId: biggestCase.glJournalId,
              }
            : null,
          resolutionTypes: Array.from(resolutionTypeCounts.entries()).map(([type, cases]) => ({ type, cases })),
        },
        glRedressExpense: {
          accountCode: '5010',
          accountName: redoxAccount?.accountName || 'not present in chart of accounts',
          postings: glJournals.length,
          total: sumByCurrency(glJournals, (j) => j.currency, (j) => j.amount),
          journals: glJournals.slice(0, 8),
          note:
            'Read from the general ledger, so this is what was actually posted — not what the complaint book intended. Console compensation posts 5010 DR → customer wallet CR as one balanced journal.',
        },
        refunds,
        reversals: {
          available: false,
          note: 'RefundReversalEngine stores reversals but has no read path; withheld rather than estimated.',
        },
        disputes,
        chargebacks,
        note: 'A refund is posted 1030 clearing DR → wallet CR; complaint redress is 5010 expense DR → wallet CR. They are different movements for possibly the same harm, which is why they are never added together here.',
      },
      csat,
      prevention: {
        clusters: recurring.slice(0, 10),
        repeatAgents: Array.from(agentLoad.entries())
          .map(([agentId, v]) => ({ agentId, cases: v.cases, categories: Array.from(v.categories) }))
          .sort((a, b) => b.cases - a.cases)
          .slice(0, 6),
        incidents,
        unresolvedIncidents: activeIncidents.length + mitigatedIncidents.length,
        activeIncidents: activeIncidents.length,
        mitigatedIncidents: mitigatedIncidents.length,
        closedIncidents: closedIncidents.length,
        statusCounts: Array.from(
          incidents.reduce((m, i) => m.set(i.status, (m.get(i.status) || 0) + 1), new Map<string, number>()).entries(),
        ).map(([status, count]) => ({ status, incidents: count })),
        affectedCustomers: activeIncidents.reduce((a, i) => a + i.affectedCustomersCount, 0),
        affectedCustomersMitigated: mitigatedIncidents.reduce((a, i) => a + i.affectedCustomersCount, 0),
        exposure: sumByCurrency(activeIncidents, (i) => i.currency, (i) => i.exposure),
        regulatoryNotified: incidents.filter((i) => i.regulatoryNotified).length,
        note: 'Prevention works off repeats: a category that keeps hitting the same agent, terminal or market is the unit of systemic harm. Raising an incident from a cluster writes a real CustomerHarmIncidentEngine record.',
      },
      drivers: {
        categoryPareto,
        paretoNote:
          categoryPareto.length === 0
            ? 'The book is empty — there are no drivers to rank.'
            : paretoCoverIdx >= 0
              ? `${paretoCoverIdx + 1} of ${categoryPareto.length} ${categoryPareto.length === 1 ? 'category accounts' : 'categories account'} for 80%+ of the book — ranked by case count, exposure shown per currency.`
              : 'No 80% threshold is reached — the book is spread thin across categories.',
        repeatComplainants: repeatComplainants.slice(0, 10),
        agentQuality,
        note: 'Drivers are counted, not modelled: category share, customers with 2+ cases, and cases per named agent. Agent names resolve against the agent registry where the complaint names a registered agent; unresolved ids are shown raw rather than guessed.',
      },
      sources,
      warnings,
    };
  }

  public static formatHours(value: number | null): string {
    if (value === null) return '—';
    if (value < 1) return `${Math.round(value * 60)}m`;
    if (value < 48) return `${value.toFixed(1)}h`;
    return `${(value / 24).toFixed(1)}d`;
  }
}

export default CxTruthService;
