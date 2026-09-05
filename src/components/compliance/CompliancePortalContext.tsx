'use client';

/**
 * Compliance Command Center — portal store.
 * All demo datasets, actions and derived stats for the rebuilt portal live here.
 * Mutations update state, append an immutable audit entry + activity feed and
 * surface a toast, so every button in the demo has real, visible behaviour.
 */
import React, { createContext, useContext, useState, useMemo, ReactNode, useEffect } from 'react';
import { ComplianceOfficer, KycStatus, KybStatus, CaseStatus } from '@/types/compliance';
import { ComplianceLocale, getComplianceTranslation } from '@/locales/compliance';
import {
  PLATFORM_TOTALS,
  MOCK_PORTAL_OFFICERS,
  MOCK_PORTAL_CUSTOMERS,
  MOCK_PORTAL_KYC,
  MOCK_PORTAL_KYB,
  MOCK_PORTAL_TXNS,
  MOCK_PORTAL_ALERTS,
  MOCK_SCREENING_MATCHES,
  MOCK_WATCHLISTS,
  MOCK_PORTAL_CASES,
  MOCK_PORTAL_TASKS,
  MOCK_PORTAL_APPROVALS,
  MOCK_PORTAL_ESCALATIONS,
  MOCK_PORTAL_REPORTS,
  MOCK_PORTAL_AUDIT,
  MOCK_PORTAL_ACTIVITY,
  MOCK_INTEGRATIONS,
  MOCK_HEALTH,
  MOCK_AML_RULES,
} from '@/services/compliancePortalData';
import {
  PortalActivityItem,
  PortalAlert,
  PortalApproval,
  PortalAuditEntry,
  PortalCase,
  PortalCustomer,
  PortalEscalation,
  PortalKybApplication,
  PortalKycApplication,
  PortalReportDef,
  PortalTask,
  PortalTxn,
  ScreeningMatch,
} from '@/types/compliancePortal';

export interface ToastMsg {
  id: number;
  tone: 'ok' | 'info' | 'warn' | 'danger';
  title: string;
  msg?: string;
  demo?: boolean;
}

interface PortalContextShape {
  demoMode: true;
  locale: ComplianceLocale;
  setLocale: (l: ComplianceLocale) => void;
  t: Record<string, any>; // locale dictionary (typed loosely; keys are parity-checked at build)
  currentOfficer: ComplianceOfficer;
  setCurrentOfficer: (o: ComplianceOfficer) => void;
  officers: ComplianceOfficer[];

  customers: PortalCustomer[];
  kyc: PortalKycApplication[];
  kyb: PortalKybApplication[];
  txns: PortalTxn[];
  alerts: PortalAlert[];
  matches: ScreeningMatch[];
  watchlists: typeof MOCK_WATCHLISTS;
  cases: PortalCase[];
  tasks: PortalTask[];
  approvals: PortalApproval[];
  escalations: PortalEscalation[];
  reports: PortalReportDef[];
  audit: PortalAuditEntry[];
  activity: PortalActivityItem[];
  integrations: typeof MOCK_INTEGRATIONS;
  health: typeof MOCK_HEALTH;
  rules: typeof MOCK_AML_RULES;
  totals: typeof PLATFORM_TOTALS;

  stats: {
    kycOpen: number; kycPending: number; kycManual: number; kycVerified: number; kycRejected: number; kycExpired: number;
    alertsOpen: number; alertsCritical: number; alertsInvestigating: number; alertsEscalated: number;
    matchesReview: number; matchesConfirmed: number;
    casesOpen: number; casesEscalated: number; casesSlaSoon: number;
    tasksOpen: number; tasksOverdue: number; approvalsPending: number; escalationsOpen: number;
    highRiskCustomers: number; criticalCustomers: number;
  };

  // lookups
  customerById: (id?: string) => PortalCustomer | undefined;
  kycById: (id: string) => PortalKycApplication | undefined;
  kybById: (id: string) => PortalKybApplication | undefined;
  txnById: (id: string) => PortalTxn | undefined;
  alertById: (id: string) => PortalAlert | undefined;
  caseById: (id: string) => PortalCase | undefined;
  matchById: (id: string) => ScreeningMatch | undefined;
  auditById: (id: string) => PortalAuditEntry | undefined;
  customerTxns: (customerId: string) => PortalTxn[];
  customerAlerts: (customerId: string) => PortalAlert[];

  // actions
  decideKyc: (id: string, decision: 'APPROVE' | 'REJECT' | 'REQUEST_INFO' | 'ESCALATE', reason: string) => void;
  decideKyb: (id: string, decision: 'APPROVE' | 'REJECT' | 'REQUEST_INFO', reason: string) => void;
  alertAction: (id: string, action: 'ACK' | 'INVESTIGATE' | 'ESCALATE' | 'RESOLVE' | 'DISMISS' | 'CREATE_CASE', note?: string) => void;
  addAlertNote: (id: string, note: string) => void;
  screeningDecision: (id: string, decision: 'CONFIRM' | 'FALSE_POSITIVE' | 'REOPEN', note?: string) => void;
  caseAction: (id: string, action: 'ESCALATE' | 'RESOLVE' | 'REOPEN' | 'ACK', note?: string) => void;
  addCaseNote: (id: string, note: string) => void;
  taskAction: (id: string, action: 'START' | 'DONE') => void;
  approvalDecision: (id: string, decision: 'APPROVE' | 'DENY', note?: string) => void;
  escalationAction: (id: string, action: 'ACK' | 'RESOLVE', note?: string) => void;
  requestRestriction: (customerId: string, reason: string) => void;
  generateReport: (id: string) => void;

  // ui
  toasts: ToastMsg[];
  pushToast: (tone: ToastMsg['tone'], title: string, msg?: string, demo?: boolean) => void;
  dismissToast: (id: number) => void;

  // formatting
  fmtMoney: (amount: number, currency: 'XOF' | 'NGN') => string;
  fmtMoneyShort: (amount: number, currency: 'XOF' | 'NGN') => string;
  fmtDT: (iso: string) => string;
  fmtDay: (iso: string) => string;
  relTime: (iso: string) => string;
}

const PortalCtx = createContext<PortalContextShape | undefined>(undefined);

const LOCALE_KEY = 'koriepay_compliance_lang';
let toastSeq = 1;
let idSeq = 1;

const nowIso = () => new Date().toISOString();
const agoIso = (mins: number) => new Date(Date.now() - mins * 60_000).toISOString();

export const CompliancePortalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<ComplianceLocale>('en');
  const [currentOfficer, setCurrentOfficer] = useState<ComplianceOfficer>(MOCK_PORTAL_OFFICERS[1]); // MLRO default — compliance-first
  const [customers, setCustomers] = useState<PortalCustomer[]>(MOCK_PORTAL_CUSTOMERS);
  const [kyc, setKyc] = useState<PortalKycApplication[]>(MOCK_PORTAL_KYC);
  const [kyb, setKyb] = useState<PortalKybApplication[]>(MOCK_PORTAL_KYB);
  const [alerts, setAlerts] = useState<PortalAlert[]>(MOCK_PORTAL_ALERTS);
  const [matches, setMatches] = useState<ScreeningMatch[]>(MOCK_SCREENING_MATCHES);
  const [cases, setCases] = useState<PortalCase[]>(MOCK_PORTAL_CASES);
  const [tasks, setTasks] = useState<PortalTask[]>(MOCK_PORTAL_TASKS);
  const [approvals, setApprovals] = useState<PortalApproval[]>(MOCK_PORTAL_APPROVALS);
  const [escalations, setEscalations] = useState<PortalEscalation[]>(MOCK_PORTAL_ESCALATIONS);
  const [reports, setReports] = useState<PortalReportDef[]>(MOCK_PORTAL_REPORTS);
  const [audit, setAudit] = useState<PortalAuditEntry[]>(MOCK_PORTAL_AUDIT);
  const [activity, setActivity] = useState<PortalActivityItem[]>(MOCK_PORTAL_ACTIVITY);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);

  const txns = MOCK_PORTAL_TXNS; // read-only demo set (writes happen through alerts/cases)
  const watchlists = MOCK_WATCHLISTS;
  const integrations = MOCK_INTEGRATIONS;
  const health = MOCK_HEALTH;
  const rules = MOCK_AML_RULES;
  const totals = PLATFORM_TOTALS;

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCALE_KEY) as ComplianceLocale | null;
      if (saved && ['en', 'fr', 'ha'].includes(saved)) setLocaleState(saved);
    } catch { /* noop */ }
  }, []);

  const setLocale = (l: ComplianceLocale) => {
    setLocaleState(l);
    try { localStorage.setItem(LOCALE_KEY, l); } catch { /* noop */ }
  };

  const t = useMemo(() => {
    // FR/HA ship curated chrome translations; every missing leaf falls back to EN
    // so switching language never produces blank UI.
    const base = getComplianceTranslation(locale) as Record<string, any>;
    const full = getComplianceTranslation('en') as Record<string, any>;
    const out: Record<string, any> = {};
    const walk = (dst: Record<string, any>, src: Record<string, any>, fallback: Record<string, any>) => {
      for (const k of Object.keys(src)) {
        const v = src[k];
        const fb = fallback[k];
        if (v && typeof v === 'object' && !Array.isArray(v)) {
          const d: Record<string, any> = {};
          walk(d, v, fb && typeof fb === 'object' ? fb : {});
          dst[k] = d;
        } else dst[k] = v !== undefined ? v : fb;
      }
      for (const k of Object.keys(fallback)) if (!(k in src)) dst[k] = fallback[k];
    };
    walk(out, base, full);
    return out;
  }, [locale]);

  const pushToast = (tone: ToastMsg['tone'], title: string, msg?: string, demo = true) => {
    const id = toastSeq++;
    setToasts((prev) => [...prev.slice(-3), { id, tone, title, msg, demo }]);
    window.setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 4600);
  };
  const dismissToast = (id: number) => setToasts((prev) => prev.filter((x) => x.id !== id));

  const logAudit = (action: string, resource: string, resourceId: string, detail?: string, after?: PortalAuditEntry['after']) => {
    const entry: PortalAuditEntry = {
      id: `AUD-${(4000 + (idSeq++ % 900)) * 1 + Math.floor(Math.random() * 90)}`,
      at: nowIso(),
      officerId: currentOfficer.id,
      officerName: currentOfficer.fullName,
      officerRole: currentOfficer.role,
      action,
      resource,
      resourceId,
      result: 'SUCCESS',
      sessionMasked: `197.210.xx.xx · demo-session`,
      detail,
      after,
    };
    setAudit((prev) => [entry, ...prev]);
  };

  const pushActivity = (type: PortalActivityItem['type'], headline: string, sub: string | undefined, href: string | undefined, tone: PortalActivityItem['tone']) => {
    const item: PortalActivityItem = {
      id: `ACT-${Date.now()}-${Math.floor(Math.random() * 999)}`,
      at: nowIso(),
      actorName: currentOfficer.fullName,
      actorRole: currentOfficer.role,
      type,
      headline,
      sub,
      href,
      tone,
    };
    setActivity((prev) => [item, ...prev].slice(0, 40));
  };

  /* ---------------- lookups ---------------- */
  const customerById = (id?: string) => customers.find((c) => c.id === id);
  const kycById = (id: string) => kyc.find((k) => k.id === id);
  const kybById = (id: string) => kyb.find((k) => k.id === id);
  const txnById = (id: string) => txns.find((x) => x.id === id);
  const alertById = (id: string) => alerts.find((a) => a.id === id);
  const caseById = (id: string) => cases.find((c) => c.id === id || c.caseNumber === id);
  const matchById = (id: string) => matches.find((m) => m.id === id);
  const auditById = (id: string) => audit.find((a) => a.id === id);
  const customerTxns = (customerId: string) => txns.filter((x) => x.customerId === customerId);
  const customerAlerts = (customerId: string) => alerts.filter((a) => a.customerId === customerId);

  /* ---------------- KYC / KYB decisions ---------------- */
  const decideKyc = (id: string, decision: 'APPROVE' | 'REJECT' | 'REQUEST_INFO' | 'ESCALATE', reason: string) => {
    setKyc((prev) =>
      prev.map((k) => {
        if (k.id !== id) return k;
        const status: KycStatus =
          decision === 'APPROVE' ? 'VERIFIED' : decision === 'REJECT' ? 'REJECTED' : decision === 'REQUEST_INFO' ? 'INFORMATION_REQUESTED' : 'IN_REVIEW';
        return {
          ...k,
          status,
          reviewerName: currentOfficer.fullName,
          updatedAt: nowIso(),
          decisionAt: decision === 'APPROVE' || decision === 'REJECT' ? nowIso() : undefined,
          decisionReason: reason,
          documents: k.documents.map((d) =>
            decision === 'APPROVE' && d.status === 'PENDING' ? { ...d, status: 'VERIFIED' as const } : d,
          ),
        };
      }),
    );
    if (decision === 'APPROVE' || decision === 'REJECT') {
      const rec = kycById(id);
      if (rec) {
        setCustomers((prev) =>
          prev.map((c) =>
            c.id === rec.customerId
              ? { ...c, verificationStatus: (decision === 'APPROVE' ? 'VERIFIED' : 'REJECTED') as KycStatus }
              : c,
          ),
        );
      }
    }
    logAudit(`KYC_DECISION_${decision}`, 'KYC_APPLICATION', id, reason);
    pushActivity('KYC', `KYC ${decision.toLowerCase().replace('_', ' ')}`, `${id} · ${kycById(id)?.customerName ?? ''}`, `/compliance/kyc/${id}`, decision === 'APPROVE' ? 'OK' : decision === 'REJECT' ? 'HIGH' : 'MEDIUM');
    pushToast(decision === 'APPROVE' ? 'ok' : decision === 'REJECT' ? 'warn' : 'info', t.common.decisionRecorded || 'Decision recorded', `KYC-${id} · ${decision}`);
  };

  const decideKyb = (id: string, decision: 'APPROVE' | 'REJECT' | 'REQUEST_INFO', reason: string) => {
    setKyb((prev) =>
      prev.map((k) => {
        if (k.id !== id) return k;
        const status: KybStatus = decision === 'APPROVE' ? 'VERIFIED' : decision === 'REJECT' ? 'REJECTED' : 'INFORMATION_REQUESTED';
        return { ...k, status, reviewerName: currentOfficer.fullName, updatedAt: nowIso(), notes: reason };
      }),
    );
    logAudit(`KYB_DECISION_${decision}`, 'KYB_APPLICATION', id, reason);
    pushActivity('KYB', `KYB ${decision.toLowerCase().replace('_', ' ')}`, `${id} · ${kybById(id)?.businessName ?? ''}`, `/compliance/kyb/${id}`, decision === 'APPROVE' ? 'OK' : 'MEDIUM');
    pushToast(decision === 'APPROVE' ? 'ok' : 'info', `KYB decision ${decision}`, `${id}`);
  };

  /* ---------------- alert actions ---------------- */
  const alertAction = (id: string, action: 'ACK' | 'INVESTIGATE' | 'ESCALATE' | 'RESOLVE' | 'DISMISS' | 'CREATE_CASE', note?: string) => {
    const upd: Record<string, PortalAlert['status']> = {
      ACK: 'ACKNOWLEDGED', INVESTIGATE: 'INVESTIGATING', ESCALATE: 'ESCALATED', RESOLVE: 'RESOLVED', DISMISS: 'DISMISSED',
    };
    setAlerts((prev) =>
      prev.map((a) => {
        if (a.id !== id) return a;
        const status = upd[action] || a.status;
        return {
          ...a,
          status,
          assignedTo: action === 'INVESTIGATE' || action === 'ACK' || action === 'ESCALATE' ? currentOfficer.fullName : a.assignedTo,
          notes: note ? [a.notes, note].filter(Boolean).join(' — ') : a.notes,
          timeline: [...a.timeline, { at: nowIso(), text: `Status → ${status}${note ? ` — ${note}` : ''}`, by: currentOfficer.fullName }],
        };
      }),
    );
    if (action === 'CREATE_CASE') {
      const a = alertById(id);
      if (a) {
        const num = `CS-${2300 + cases.length + 1}`;
        const nc: PortalCase = {
          id: `PC-${900 + cases.length + 1}`,
          caseNumber: num,
          caseType: a.kind === 'SCREENING' ? 'SANCTIONS_MATCH' : a.kind === 'FRAUD' ? 'FRAUD_INVESTIGATION' : 'AML_INVESTIGATION',
          title: a.title,
          customerId: a.customerId,
          customerName: a.customerName,
          jurisdiction: a.country ? (a.country === 'NG' ? 'NG' : a.country === 'NE' ? 'NE' : 'CROSS_BORDER') : 'CROSS_BORDER',
          riskLevel: a.severity === 'CRITICAL' ? 'CRITICAL' : a.severity === 'HIGH' ? 'HIGH' : 'MEDIUM',
          priority: a.severity === 'CRITICAL' ? 'URGENT' : a.severity === 'HIGH' ? 'HIGH' : 'MEDIUM',
          status: 'OPEN',
          assignedOfficerId: currentOfficer.id,
          assignedOfficerName: currentOfficer.fullName,
          createdAt: nowIso(),
          updatedAt: nowIso(),
          deadlineSla: new Date(Date.now() + 72 * 60 * 60_000).toISOString(),
          summary: a.description,
          amount: a.amount,
          currency: a.currency,
          relatedAlertIds: [a.id],
          timeline: [{ at: nowIso(), text: `Case opened from alert ${a.id}`, by: currentOfficer.fullName }],
          notes: [],
        };
        setCases((prev) => [nc, ...prev]);
        setAlerts((prev) => prev.map((x) => (x.id === id ? { ...x, relatedCaseNumber: num } : x)));
        logAudit('CASE_CREATE', 'CASE', num, `Created from alert ${a.id}`);
        pushActivity('CASE', 'Case opened from alert', `${num} · ${a.customerName ?? ''}`, `/compliance/cases/${num}`, 'CRITICAL');
        pushToast('info', 'Case created', `${num} opened from alert ${a.id}`);
        return;
      }
    }
    logAudit(`ALERT_${action}`, 'ALERT', id, note);
    pushActivity('AML', `Alert ${action.toLowerCase().replace('_', ' ')}`, `${id} · ${alertById(id)?.customerName ?? ''}`, `/compliance/alerts/${id}`, action === 'RESOLVE' || action === 'DISMISS' ? 'OK' : 'MEDIUM');
    pushToast(action === 'RESOLVE' || action === 'DISMISS' ? 'ok' : 'info', `Alert ${action.toLowerCase().replace('_', ' ')}`, `${id}`);
  };

  const addAlertNote = (id: string, note: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, notes: [a.notes, note].filter(Boolean).join(' — '), timeline: [...a.timeline, { at: nowIso(), text: note, by: currentOfficer.fullName }] } : a)),
    );
    logAudit('ALERT_NOTE', 'ALERT', id, note);
    pushToast('info', 'Note added', `${id}`);
  };

  /* ---------------- screening decisions ---------------- */
  const screeningDecision = (id: string, decision: 'CONFIRM' | 'FALSE_POSITIVE' | 'REOPEN', note?: string) => {
    setMatches((prev) =>
      prev.map((m) => {
        if (m.id !== id) return m;
        const status = decision === 'CONFIRM' ? ('CONFIRMED_MATCH' as const) : decision === 'FALSE_POSITIVE' ? ('FALSE_POSITIVE' as const) : ('UNDER_REVIEW' as const);
        return { ...m, status, reviewedAt: decision === 'REOPEN' ? undefined : nowIso(), reviewedBy: decision === 'REOPEN' ? undefined : currentOfficer.fullName, notes: note || m.notes };
      }),
    );
    const m = matchById(id);
    if (m && decision === 'CONFIRM') {
      setAlerts((prev) => prev.map((a) => (a.id === m.relatedAlertId ? { ...a, status: 'ESCALATED' as const, notes: 'Linked to confirmed screening match' } : a)));
      setCustomers((prev) => prev.map((c) => (c.id === m.customerId ? { ...c, sanctionsMatches: m.kind === 'SANCTIONS' ? 1 : c.sanctionsMatches, pepMatches: m.kind === 'PEP' ? 1 : c.pepMatches, accountStatus: m.kind === 'SANCTIONS' ? 'FROZEN' as const : c.accountStatus } : c)));
    }
    logAudit(`SCREENING_${decision}`, 'SCREENING_MATCH', id, note || '');
    pushToast(decision === 'CONFIRM' ? 'warn' : 'ok', `Screening ${decision.toLowerCase().replace('_', ' ')}`, `${id} · ${m?.customerName ?? ''}`);
  };

  /* ---------------- case / task / approval / escalation ---------------- */
  const caseAction = (id: string, action: 'ESCALATE' | 'RESOLVE' | 'REOPEN' | 'ACK', note?: string) => {
    const upd: Record<string, CaseStatus> = { ESCALATE: 'ESCALATED', RESOLVE: 'RESOLVED', REOPEN: 'REOPENED', ACK: 'ASSIGNED' };
    setCases((prev) =>
      prev.map((c) => {
        if (c.id !== id && c.caseNumber !== id) return c;
        const status = upd[action] || c.status;
        return {
          ...c,
          status,
          updatedAt: nowIso(),
          decisionSummary: action === 'RESOLVE' ? note || 'Resolved' : c.decisionSummary,
          timeline: [...c.timeline, { at: nowIso(), text: `Status → ${status}${note ? ` — ${note}` : ''}`, by: currentOfficer.fullName }],
        };
      }),
    );
    logAudit(`CASE_${action}`, 'CASE', id, note);
    pushToast(action === 'RESOLVE' ? 'ok' : 'info', `Case ${action.toLowerCase()}`, `${id}${action === 'ESCALATE' ? ' — routed to ' + currentOfficer.fullName : ''}`);
  };

  const addCaseNote = (id: string, note: string) => {
    setCases((prev) => prev.map((c) => (c.id === id || c.caseNumber === id ? { ...c, notes: [note, ...c.notes], updatedAt: nowIso() } : c)));
    logAudit('CASE_NOTE_ADD', 'CASE', id, note);
    pushToast('info', 'Note added', `${id}`);
  };

  const taskAction = (id: string, action: 'START' | 'DONE') => {
    setTasks((prev) => prev.map((x) => (x.id === id ? { ...x, status: action === 'DONE' ? ('DONE' as const) : ('IN_PROGRESS' as const) } : x)));
    logAudit(`TASK_${action}`, 'TASK', id);
    pushToast(action === 'DONE' ? 'ok' : 'info', `Task ${action === 'DONE' ? 'completed' : 'started'}`, `${id}`);
  };

  const approvalDecision = (id: string, decision: 'APPROVE' | 'DENY', note?: string) => {
    setApprovals((prev) =>
      prev.map((a) => {
        if (a.id !== id) return a;
        const ap = a.customerId && customerById(a.customerId);
        if (ap && a.type === 'ACCOUNT_RESTRICTION' && decision === 'APPROVE') {
          setCustomers((cs) => cs.map((c) => (c.id === ap.id ? { ...c, accountStatus: 'RESTRICTED' as const } : c)));
        }
        return {
          ...a,
          status: decision === 'APPROVE' ? ('APPROVED' as const) : ('DENIED' as const),
          decidedById: currentOfficer.id,
          decidedByName: currentOfficer.fullName,
          decidedAt: nowIso(),
          decisionNote: note,
        };
      }),
    );
    logAudit(`APPROVAL_${decision === 'APPROVE' ? 'APPROVED' : 'DENIED'}`, 'APPROVAL', id, note);
    pushToast(decision === 'APPROVE' ? 'ok' : 'warn', `Approval ${decision === 'APPROVE' ? 'approved' : 'denied'}`, `${id}`);
  };

  const escalationAction = (id: string, action: 'ACK' | 'RESOLVE', note?: string) => {
    setEscalations((prev) => prev.map((e) => (e.id === id ? { ...e, status: action === 'ACK' ? ('ACKNOWLEDGED' as const) : ('RESOLVED' as const), resolutionNote: action === 'RESOLVE' ? note : e.resolutionNote } : e)));
    logAudit(`ESCALATION_${action}`, 'ESCALATION', id, note);
    pushToast('info', `Escalation ${action === 'ACK' ? 'acknowledged' : 'resolved'}`, `${id}`);
  };

  const requestRestriction = (customerId: string, reason: string) => {
    const c = customerById(customerId);
    if (!c) return;
    const appr: PortalApproval = {
      id: `APR-${Math.floor(6000 + Math.random() * 900)}`,
      type: 'ACCOUNT_RESTRICTION',
      title: `${c.accountStatus === 'FROZEN' ? 'Freeze' : 'Restrict'} — ${c.firstName} ${c.lastName}`,
      summary: reason,
      customerId: c.id,
      customerName: `${c.firstName} ${c.lastName}`,
      requestedById: currentOfficer.id,
      requestedByName: currentOfficer.fullName,
      requestedAt: nowIso(),
      priority: c.riskLevel === 'CRITICAL' || c.riskLevel === 'HIGH' ? 'URGENT' : 'MEDIUM',
      status: 'PENDING',
    };
    setApprovals((prev) => [appr, ...prev]);
    setCustomers((prev) => prev.map((x) => (x.id === c.id ? { ...x, accountStatus: 'RESTRICTED' as const } : x)));
    logAudit('RESTRICTION_REQUEST', 'CUSTOMER', c.id, reason);
    pushToast('warn', 'Restriction requested', `${c.id} routed for maker/checker approval ${appr.id}`, true);
  };

  const generateReport = (id: string) => {
    const r = reports.find((x) => x.id === id);
    setReports((prev) => prev.map((x) => (x.id === id ? { ...x, status: 'READY' as const, lastGeneratedAt: nowIso() } : x)));
    logAudit('REPORT_GENERATE', 'REPORT', id, r?.title);
    pushToast('ok', 'Report generated', `${r?.title ?? id} · demo build (sample data)`, true);
  };

  /* ---------------- derived stats ---------------- */
  const stats = useMemo(() => {
    const count = <T,>(arr: T[], fn: (x: T) => boolean) => arr.filter(fn).length;
    const kycOpen = count(kyc, (k) => k.status === 'PENDING' || k.status === 'IN_REVIEW' || k.status === 'INFORMATION_REQUESTED');
    return {
      kycPending: count(kyc, (k) => k.status === 'PENDING'),
      kycManual: count(kyc, (k) => k.status === 'IN_REVIEW'),
      kycVerified: count(kyc, (k) => k.status === 'VERIFIED'),
      kycRejected: count(kyc, (k) => k.status === 'REJECTED'),
      kycExpired: count(kyc, (k) => k.status === 'EXPIRED'),
      kycOpen,
      alertsOpen: count(alerts, (a) => a.status === 'OPEN' || a.status === 'ACKNOWLEDGED' || a.status === 'INVESTIGATING'),
      alertsCritical: count(alerts, (a) => a.severity === 'CRITICAL' && a.status !== 'RESOLVED' && a.status !== 'DISMISSED'),
      alertsInvestigating: count(alerts, (a) => a.status === 'INVESTIGATING'),
      alertsEscalated: count(alerts, (a) => a.status === 'ESCALATED'),
      matchesReview: count(matches, (m) => m.status === 'POTENTIAL_MATCH' || m.status === 'UNDER_REVIEW'),
      matchesConfirmed: count(matches, (m) => m.status === 'CONFIRMED_MATCH'),
      casesOpen: count(cases, (c) => c.status !== 'RESOLVED' && c.status !== 'CLOSED'),
      casesEscalated: count(cases, (c) => c.status === 'ESCALATED'),
      casesSlaSoon: count(cases, (c) => c.status !== 'RESOLVED' && c.status !== 'CLOSED' && new Date(c.deadlineSla).getTime() - Date.now() < 24 * 3600_000),
      tasksOpen: count(tasks, (x) => x.status !== 'DONE'),
      tasksOverdue: count(tasks, (x) => x.status === 'OVERDUE'),
      approvalsPending: count(approvals, (a) => a.status === 'PENDING'),
      escalationsOpen: count(escalations, (e) => e.status !== 'RESOLVED'),
      highRiskCustomers: count(customers, (c) => c.riskLevel === 'HIGH'),
      criticalCustomers: count(customers, (c) => c.riskLevel === 'CRITICAL'),
    };
  }, [kyc, alerts, matches, cases, tasks, approvals, escalations, customers]);

  /* ---------------- formatting ---------------- */
  const fmtMoney = (amount: number, currency: 'XOF' | 'NGN') =>
    currency === 'XOF'
      ? `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(amount)} XOF`
      : `₦${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(amount)}`;
  const fmtMoneyShort = (amount: number, currency: 'XOF' | 'NGN') => {
    const k = amount / 1000;
    if (amount >= 1_000_000) return currency === 'XOF' ? `${(amount / 1_000_000).toFixed(1)}M FCFA` : `₦${(amount / 1_000_000).toFixed(1)}M`;
    if (amount >= 1000) return currency === 'XOF' ? `${Math.round(k)}k FCFA` : `₦${Math.round(k)}k`;
    return currency === 'XOF' ? `${amount} FCFA` : `₦${amount}`;
  };
  const fmtDT = (iso: string) =>
    new Intl.DateTimeFormat(locale === 'fr' ? 'fr-FR' : locale === 'ha' ? 'en-NG' : 'en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
  const fmtDay = (iso: string) => new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso));
  const relTime = (iso: string) => {
    const m = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
    if (m < 60) return `${m}m`;
    if (m < 60 * 24) return `${Math.round(m / 60)}h`;
    return `${Math.round(m / (60 * 24))}d`;
  };

  const value: PortalContextShape = {
    demoMode: true,
    locale, setLocale, t, currentOfficer, setCurrentOfficer, officers: MOCK_PORTAL_OFFICERS,
    customers, kyc, kyb, txns, alerts, matches, watchlists, cases, tasks, approvals, escalations, reports, audit, activity, integrations, health, rules, totals, stats,
    customerById, kycById, kybById, txnById, alertById, caseById, matchById, auditById, customerTxns, customerAlerts,
    decideKyc, decideKyb, alertAction, addAlertNote, screeningDecision, caseAction, addCaseNote, taskAction, approvalDecision, escalationAction, requestRestriction, generateReport,
    toasts, pushToast, dismissToast,
    fmtMoney, fmtMoneyShort, fmtDT, fmtDay, relTime,
  };

  return <PortalCtx.Provider value={value}>{children}</PortalCtx.Provider>;
};

export function useCompliancePortal() {
  const ctx = useContext(PortalCtx);
  if (!ctx) throw new Error('useCompliancePortal must be used inside CompliancePortalProvider');
  return ctx;
}

export { agoIso };
