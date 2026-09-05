/**
 * Derived compliance screens: dashboard, task list, notification centre.
 *
 * These are the only "new" data in the portal, and they are arithmetic over
 * live rows rather than a second source of truth: no count here is typed by
 * hand. Because they are computed, the envelope marks them `derived: true` and
 * the UI labels the numbers as computed from the queues they came from.
 */

import type {
  AlertRow,
  ApprovalRow,
  CaseRow,
  DashboardSummary,
  NotificationRow,
  ObligationRow,
  TaskRow,
} from './types';

const SETTLED_ALERTS = ['CLOSED', 'FALSE_POSITIVE', 'DISMISSED', 'CONVERTED_TO_CASE'];

function isOpenAlert(a: AlertRow): boolean {
  return !SETTLED_ALERTS.includes(String(a.status));
}

function ageHours(iso?: string): number | undefined {
  if (!iso) return undefined;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return undefined;
  return Math.max(0, Math.round((Date.now() - t) / 3_600_000));
}

function daysUntil(iso?: string): number | undefined {
  if (!iso) return undefined;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return undefined;
  return Math.round((t - Date.now()) / 86_400_000);
}

export interface DerivedInputs {
  alerts: AlertRow[];
  cases: CaseRow[];
  obligations: ObligationRow[];
  approvals: ApprovalRow[];
  decisions: { riskScore?: number; decision: string }[];
  kyc?: { status: string; riskLevel: string }[];
  kyb?: { kybStatus: string; riskLevel: string }[];
  health?: { platformStatus?: string; providers?: { status: string }[] } | null;
}

export function deriveDashboard(i: DerivedInputs): DashboardSummary {
  const open = i.alerts.filter(isOpenAlert);
  const critical = open.filter((a) => a.severity === 'CRITICAL');
  const breached = [
    ...open.filter((a) => a.slaBreached),
    ...i.cases.filter((c) => c.slaBreached),
  ];

  const mixOrder = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const;
  const alertMix = mixOrder
    .map((label) => ({ label, value: open.filter((a) => a.severity === label).length }))
    .filter((row) => row.value > 0);

  const byDay = new Map<string, { count: number; ngn: number; xof: number }>();
  let totalNgnAmount = 0;
  let totalXofAmount = 0;
  open.forEach((a) => {
    const day = (a.triggeredAt || '').slice(0, 10);
    if (!day) return;
    const prev = byDay.get(day) ?? { count: 0, ngn: 0, xof: 0 };
    const amount = Number.isFinite(a.amount) ? a.amount : 0;
    const isNgn = (a.currency || 'NGN').toUpperCase() === 'NGN';
    byDay.set(day, {
      count: prev.count + 1,
      ngn: prev.ngn + (isNgn ? amount : 0),
      xof: prev.xof + (isNgn ? 0 : amount),
    });
    if (isNgn) totalNgnAmount += amount;
    else totalXofAmount += amount;
  });
  const volumeByDay = Array.from(byDay.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .slice(-14)
    .map(([date, v]) => ({ date, count: v.count, ngnAmount: v.ngn, xofAmount: v.xof }));

  const ages = open.map((a) => ageHours(a.triggeredAt)).filter((n): n is number => typeof n === 'number');
  const kycBacklog = (i.kyc ?? []).filter((r) => r.status !== 'VERIFIED' && r.status !== 'REJECTED').length;
  const kybBacklog = (i.kyb ?? []).filter((r) => r.kybStatus !== 'VERIFIED' && r.kybStatus !== 'REJECTED').length;

  return {
    id: 'dashboard',
    criticalAlerts: critical.length,
    openAlerts: open.length,
    slaBreached: breached.length,
    openCases: i.cases.filter((c) => c.status !== 'CLOSED').length,
    // The service overwrites this with the derived work-list length; 0 only
    // shows if a caller asks for the summary without the queue pass.
    taskCount: 0,
    awaitingDecision: i.cases.filter((c) => c.status === 'PENDING_DECISION' || c.status === 'ESCALATED').length,
    pendingApprovals: i.approvals.filter((a) => a.status === 'PENDING').length,
    kycBacklog,
    kybBacklog,
    highRiskCustomers: (i.kyc ?? []).filter((r) => r.riskLevel === 'HIGH' || r.riskLevel === 'CRITICAL').length,
    highRiskBusinesses: (i.kyb ?? []).filter((r) => r.riskLevel === 'HIGH' || r.riskLevel === 'CRITICAL').length,
    overdueObligations: i.obligations.filter(
      (o) => o.status === 'OVERDUE' || (isNotDone(o) && (daysUntil(o.dueDate) ?? 1) < 0),
    ).length,
    highRiskEntities:
      (i.kyc ?? []).filter((r) => r.riskLevel === 'HIGH' || r.riskLevel === 'CRITICAL').length +
      (i.kyb ?? []).filter((r) => r.riskLevel === 'HIGH' || r.riskLevel === 'CRITICAL').length,
    platformStatus: i.health?.platformStatus as DashboardSummary['platformStatus'],
    providersOffline: (i.health?.providers ?? []).filter((p) => p.status !== 'CONNECTED').length,
    queueOldestHours: ages.length ? Math.max(...ages) : undefined,
    alertMix,
    volumeByDay,
    totalNgnAmount,
    totalXofAmount,
  };
}

function isNotDone(o: ObligationRow): boolean {
  return !['COMPLETED', 'SUBMITTED', 'ACKNOWLEDGED', 'CLOSED'].includes(String(o.status));
}

/**
 * One queue of work, assembled from the queues that actually exist. A task is
 * not a stored entity here — pretending otherwise would mean a second task
 * database that nobody reconciles with the real alert and case state.
 */
export function deriveTasks(i: DerivedInputs): TaskRow[] {
  const tasks: TaskRow[] = [];

  i.alerts.filter(isOpenAlert).forEach((a) => {
    const due = daysUntil(a.slaDueAt);
    tasks.push({
      id: `task-alert-${a.id}`,
      title:
        a.severity === 'CRITICAL'
          ? `Triage critical alert ${a.reference}`
          : `Review alert ${a.reference} — ${a.subjectName}`,
      kind: 'ALERT_TRIAGE',
      subjectRef: a.reference,
      href: `/compliance/alerts/${encodeURIComponent(a.id)}`,
      priority: a.severity === 'CRITICAL' ? 'URGENT' : a.severity === 'HIGH' ? 'HIGH' : a.severity === 'MEDIUM' ? 'MEDIUM' : 'LOW',
      dueAt: a.slaDueAt,
      overdue: Boolean(a.slaBreached) || (due !== undefined && due < 0),
      assignedTo: a.assignedTo,
      source: 'live',
    });
  });

  i.cases
    .filter((c) => c.status === 'PENDING_DECISION' || c.status === 'ESCALATED')
    .forEach((c) => {
      tasks.push({
        id: `task-case-decision-${c.id}`,
        title: `Record decision for ${c.reference}`,
        kind: 'DECISION_CHECK',
        subjectRef: c.reference,
        href: `/compliance/cases/${encodeURIComponent(c.id)}#decision`,
        priority: c.priority === 'CRITICAL' ? 'URGENT' : 'HIGH',
        dueAt: c.slaDueAt,
        overdue: c.slaBreached,
        assignedTo: c.leadInvestigator,
        source: 'live',
      });
    });

  i.cases
    .filter((c) => c.status === 'WAITING_FOR_INFO')
    .forEach((c) => {
      tasks.push({
        id: `task-case-info-${c.id}`,
        title: `Chase outstanding information on ${c.reference}`,
        kind: 'INFORMATION_REQUEST',
        subjectRef: c.reference,
        href: `/compliance/cases/${encodeURIComponent(c.id)}#activity`,
        priority: 'MEDIUM',
        dueAt: c.slaDueAt,
        overdue: c.slaBreached,
        assignedTo: c.leadInvestigator,
        source: 'live',
      });
    });

  i.cases
    .filter((c) => c.status === 'UNDER_REVIEW' || c.status === 'OPEN' || c.status === 'ASSIGNED')
    .forEach((c) => {
      tasks.push({
        id: `task-case-review-${c.id}`,
        title: `Continue investigation ${c.reference} — ${c.subjectName}`,
        kind: 'CASE_REVIEW',
        subjectRef: c.reference,
        href: `/compliance/cases/${encodeURIComponent(c.id)}`,
        priority: c.priority === 'CRITICAL' ? 'URGENT' : c.priority === 'HIGH' ? 'HIGH' : 'MEDIUM',
        dueAt: c.slaDueAt,
        overdue: c.slaBreached,
        assignedTo: c.leadInvestigator,
        source: 'live',
      });
    });

  i.obligations.filter(isNotDone).forEach((o) => {
    const due = daysUntil(o.dueDate);
    tasks.push({
      id: `task-obligation-${o.id}`,
      title: `${o.title} — ${o.regulator}`,
      kind: 'OBLIGATION',
      subjectRef: o.id,
      href: '/compliance/reports',
      priority: (due ?? 1) < 0 ? 'URGENT' : (due ?? 30) <= 7 ? 'HIGH' : 'LOW',
      dueAt: o.dueDate,
      overdue: (due ?? 1) < 0,
      assignedTo: o.owner,
      source: 'live',
    });
  });

  i.approvals
    .filter((a) => a.status === 'PENDING')
    .forEach((a) => {
      tasks.push({
        id: `task-approval-${a.id}`,
        title: `Second-line approval: ${a.requester}`,
        kind: 'APPROVAL',
        subjectRef: a.reference,
        href: '/compliance/approvals',
        priority: 'HIGH',
        dueAt: a.expiresAt,
        overdue: Boolean(a.expiresAt) && (daysUntil(a.expiresAt) ?? 1) < 0,
        source: 'live',
      });
    });

  const order: Record<TaskRow['priority'], number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  return tasks.sort((a, b) => {
    if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
    if (order[a.priority] !== order[b.priority]) return order[a.priority] - order[b.priority];
    return (a.dueAt ?? '').localeCompare(b.dueAt ?? '');
  });
}

/**
 * The bell icon shows queue events, not marketing pings: a notification exists
 * only because a real queue entered a state an officer must see.
 */
export function deriveNotifications(i: DerivedInputs): NotificationRow[] {
  const out: NotificationRow[] = [];

  i.alerts
    .filter((a) => isOpenAlert(a) && a.severity === 'CRITICAL')
    .slice(0, 6)
    .forEach((a) => {
      out.push({
        id: `n-alert-${a.id}`,
        kind: 'CRITICAL',
        title: `Critical AML alert ${a.reference}`,
        body: `${a.subjectName} — ${a.whatHappened ?? 'velocity threshold breached'}. SLA ${
          a.slaBreached ? 'breached' : a.slaDueAt ? `due ${new Date(a.slaDueAt).toISOString().slice(0, 16).replace('T', ' ')}` : 'not reported'
        }.`,
        href: `/compliance/alerts/${encodeURIComponent(a.id)}`,
        at: a.triggeredAt,
        sourceLabel: 'AML alert engine',
      });
    });

  i.cases
    .filter((c) => c.status === 'PENDING_DECISION')
    .slice(0, 4)
    .forEach((c) => {
      out.push({
        id: `n-case-${c.id}`,
        kind: 'ATTENTION',
        title: `Case ${c.reference} needs a decision`,
        body: `${c.subjectName} · exposure ${c.currency} ${(c.exposureAmount ?? 0).toLocaleString('en-US')} · checker: ${
          c.decisionChecker ?? 'unassigned'
        }`,
        href: `/compliance/cases/${encodeURIComponent(c.id)}#decision`,
        at: c.slaDueAt ?? c.createdAt,
        sourceLabel: 'Case engine',
      });
    });

  i.obligations
    .filter(isNotDone)
    .filter((o) => {
      const d = daysUntil(o.dueDate);
      return d !== undefined && d <= 7;
    })
    .slice(0, 4)
    .forEach((o) => {
      const d = daysUntil(o.dueDate) ?? 0;
      out.push({
        id: `n-obligation-${o.id}`,
        kind: d < 0 ? 'CRITICAL' : 'ATTENTION',
        title: d < 0 ? `Regulatory deadline missed: ${o.title}` : `Deadline in ${d} day${d === 1 ? '' : 's'}: ${o.title}`,
        body: `${o.regulator}${o.owner ? ` · owner ${o.owner}` : ''}`,
        href: '/compliance/reports',
        at: o.dueDate,
        sourceLabel: 'Obligation register',
      });
    });

  i.alerts
    .filter((a) => isOpenAlert(a) && a.slaBreached)
    .slice(0, 3)
    .forEach((a) => {
      out.push({
        id: `n-sla-${a.id}`,
        kind: 'ATTENTION',
        title: `SLA breached on ${a.reference}`,
        body: `Assigned to ${a.assignedTo ?? 'nobody'}. Escalate or reassign.`,
        href: `/compliance/alerts/${encodeURIComponent(a.id)}`,
        at: a.slaDueAt ?? a.triggeredAt,
        sourceLabel: 'AML alert engine',
      });
    });

  if (!i.approvals.length) {
    out.push({
      id: 'n-approvals-clear',
      kind: 'INFORMATIONAL',
      title: 'Approval queue is clear',
      body: 'No privileged-access requests are waiting on a second line right now.',
      href: '/compliance/approvals',
      at: new Date().toISOString(),
      sourceLabel: 'Privileged access engine',
    });
  }

  return out.sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 12);
}
