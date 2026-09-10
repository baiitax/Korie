'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import {
  SupportOfficer,
  SupportTicket,
  Customer360Context,
  TransactionInvestigationContext,
  SupportPlaybook,
  KnowledgeArticle,
  SupportIncident,
  AutomationRule,
  AutomationExecutionLog,
  QaReview,
  TrainingModule,
  StaffCapacityMetric,
  SupportHealthScore,
  SupportAuditEntry,
  SupportJurisdiction,
  TicketStatus,
  TicketPriority,
  TicketCategory,
  SupportTier,
  SupportRole,
} from '@/types/support';
import {
  MOCK_SUPPORT_OFFICERS,
  MOCK_SUPPORT_PLAYBOOKS,
  MOCK_KNOWLEDGE_ARTICLES,
  MOCK_SUPPORT_INCIDENTS,
  MOCK_AUTOMATION_RULES,
  MOCK_AUTOMATION_EXECUTION_LOGS,
  MOCK_QA_REVIEWS,
  MOCK_TRAINING_MODULES,
  MOCK_STAFF_CAPACITY,
  MOCK_SUPPORT_HEALTH_SCORE,
  MOCK_SUPPORT_AUDIT_LOGS,
} from '@/services/supportDataService';
import { SupportLocale, getSupportTranslation } from '@/locales/support';
import {
  MappedTicket,
  toSupportTickets,
  TICKET_ACTION_TO_STATUS,
  TICKET_CATEGORY_TO_COMPLAINT,
  TICKET_PRIORITY_TO_COMPLAINT,
} from '@/lib/support/complaintTicketAdapter';

interface SupportContextType {
  locale: SupportLocale;
  setLocale: (loc: SupportLocale) => void;
  t: ReturnType<typeof getSupportTranslation>;
  selectedJurisdiction: 'ALL' | SupportJurisdiction;
  setSelectedJurisdiction: (j: 'ALL' | SupportJurisdiction) => void;
  currentOfficer: SupportOfficer;
  setCurrentOfficer: (officer: SupportOfficer) => void;
  officers: SupportOfficer[];

  /** The real complaint book, projected into the desk's ticket model. */
  tickets: MappedTicket[];
  activeTicket: MappedTicket | null;
  setActiveTicketId: (ticketId: string | null) => void;
  ticketsPhase: 'loading' | 'ready' | 'error';
  ticketsError: string | null;
  ticketsSyncedAt: string | null;
  refreshTickets: () => Promise<void>;
  /** Set when an operator action was refused by the engine, with the reason. */
  ticketActionError: string | null;
  dismissTicketActionError: () => void;
  /**
   * Datasets on this console that are still fixtures. Rendered as an explicit
   * simulation-layer flag — the ticket book itself is not on this list.
   */
  simulationLayer: { key: string; why: string }[];

  customer360Map: Record<string, Customer360Context>;
  transactionInvestigationMap: Record<string, TransactionInvestigationContext>;
  playbooks: SupportPlaybook[];
  knowledgeArticles: KnowledgeArticle[];
  incidents: SupportIncident[];
  automationRules: AutomationRule[];
  automationLogs: AutomationExecutionLog[];
  qaReviews: QaReview[];
  trainingModules: TrainingModule[];
  staffCapacity: StaffCapacityMetric;
  healthScore: SupportHealthScore;
  auditLogs: SupportAuditEntry[];

  // Actions — every one of these writes to ComplaintDisputeEngine
  createTicket: (ticketInput: Partial<SupportTicket>) => Promise<string>;
  assignTicket: (ticketId: string, officerId: string) => Promise<void>;
  escalateTicket: (ticketId: string, targetRole: SupportRole, rationale: string) => Promise<void>;
  sendTicketMessage: (ticketId: string, content: string, isInternalNote: boolean, macroKey?: string) => Promise<void>;
  resolveTicket: (ticketId: string, resolutionSummary?: string) => Promise<void>;
  closeTicket: (ticketId: string) => Promise<void>;
  reopenTicket: (ticketId: string, reason: string) => Promise<void>;
  linkTicketToIncident: (ticketId: string, incidentId: string) => void;
  createIncident: (incidentInput: Partial<SupportIncident>) => string;
  resolveIncident: (incidentId: string) => void;
  toggleAutomationRule: (ruleId: string, enabled: boolean) => void;
  submitQaReview: (reviewInput: Omit<QaReview, 'id' | 'reviewedAt'>) => void;
  completeTrainingModule: (moduleId: string) => void;

  // Helpers
  formatCurrency: (amount: number, currency?: string) => string;
  formatDate: (dateString: string) => string;
  calculateSlaRemaining: (dueIsoDate: string) => { text: string; isBreached: boolean; isWarning: boolean };

  // Computed Live Stats
  stats: {
    totalOpen: number;
    unassigned: number;
    assignedToMe: number;
    slaAtRisk: number;
    slaBreached: number;
    resolvedToday: number;
    activeIncidentsCount: number;
    automationResolvedCount: number;
    overallHealth: number;
  };
}

const SupportContext = createContext<SupportContextType | undefined>(undefined);

export const SupportProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [locale, setLocale] = useState<SupportLocale>('en');
  const [selectedJurisdiction, setSelectedJurisdiction] = useState<'ALL' | SupportJurisdiction>('ALL');

  const [officers] = useState<SupportOfficer[]>(MOCK_SUPPORT_OFFICERS);
  const [currentOfficer, setCurrentOfficer] = useState<SupportOfficer>(MOCK_SUPPORT_OFFICERS[0]);

  // The ticket book is now the engine's complaint book. It starts EMPTY and is
  // never seeded: an empty book is the honest state of a system that has
  // received nothing yet, where five fabricated tickets told the opposite story.
  const [tickets, setTickets] = useState<MappedTicket[]>([]);
  const [ticketsPhase, setTicketsPhase] = useState<'loading' | 'ready' | 'error'>('loading');
  const [ticketsError, setTicketsError] = useState<string | null>(null);
  const [ticketsSyncedAt, setTicketsSyncedAt] = useState<string | null>(null);
  const [ticketActionError, setTicketActionError] = useState<string | null>(null);
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);

  // Empty by design. There is no customer-360 or transaction-investigation
  // engine behind these maps, so the desk shows "not recorded" instead of a
  // believable profile assembled from nothing.
  const [customer360Map] = useState<Record<string, Customer360Context>>({});
  const [transactionInvestigationMap] = useState<Record<string, TransactionInvestigationContext>>({});
  const [playbooks] = useState<SupportPlaybook[]>(MOCK_SUPPORT_PLAYBOOKS);
  const [knowledgeArticles] = useState<KnowledgeArticle[]>(MOCK_KNOWLEDGE_ARTICLES);
  const [incidents, setIncidents] = useState<SupportIncident[]>(MOCK_SUPPORT_INCIDENTS);
  const [automationRules, setAutomationRules] = useState<AutomationRule[]>(MOCK_AUTOMATION_RULES);
  const [automationLogs, setAutomationLogs] = useState<AutomationExecutionLog[]>(
    MOCK_AUTOMATION_EXECUTION_LOGS
  );
  const [qaReviews, setQaReviews] = useState<QaReview[]>(MOCK_QA_REVIEWS);
  const [trainingModules, setTrainingModules] = useState<TrainingModule[]>(MOCK_TRAINING_MODULES);
  const [staffCapacity] = useState<StaffCapacityMetric>(MOCK_STAFF_CAPACITY);
  const [healthScore] = useState<SupportHealthScore>(MOCK_SUPPORT_HEALTH_SCORE);
  const [auditLogs, setAuditLogs] = useState<SupportAuditEntry[]>(MOCK_SUPPORT_AUDIT_LOGS);

  const t = useMemo(() => getSupportTranslation(locale), [locale]);

  /**
   * Datasets on this console that are still fixtures, with the reason. The
   * ticket book is NOT on this list — it reads ComplaintDisputeEngine. Keeping
   * the list here (rather than in each page) means a page cannot quietly render
   * a fixture without the shell being able to say so.
   */
  const simulationLayer = useMemo(
    () => [
      { key: 'officers', why: 'No staff/HR engine exists — the roster is a fixture. Assignments write the officer email onto the real case.' },
      { key: 'incidents', why: 'The desk incident log is a fixture. Systemic harm incidents live in CustomerHarmIncidentEngine (admin → Customer Experience).' },
      { key: 'automation', why: 'No automation engine exists; rules and execution logs are fixtures.' },
      { key: 'qa / training / capacity', why: 'No QA, training or workforce engine exists — these are fixtures.' },
      { key: 'customer 360 / transaction investigation', why: 'No such engine exists. The panels say "not recorded" rather than assembling a profile from nothing.' },
    ],
    []
  );

  const activeTicket = useMemo(() => {
    return tickets.find((t) => t.id === activeTicketId) || null;
  }, [tickets, activeTicketId]);

  // Log audit entry
  const logAudit = (action: string, entityType: string, entityId: string, details: string) => {
    const newLog: SupportAuditEntry = {
      id: `AUD-SUP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      officerId: currentOfficer.id,
      officerName: currentOfficer.fullName,
      officerRole: currentOfficer.role,
      action,
      entityType,
      entityId,
      details,
      jurisdiction: currentOfficer.jurisdiction,
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  // ----- engine-backed ticket book -------------------------------------------
  // Every action below calls ComplaintDisputeEngine through the admin API. The
  // console keeps no shadow state: if the engine refuses, the refusal is shown
  // and the local view reports what the engine actually holds.

  const engineTicket = async (
    ticketId: string,
    payload: Record<string, unknown>,
    action: string
  ): Promise<boolean> => {
    setTicketActionError(null);
    try {
      const res = await fetch(`/api/complaints/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, actor: currentOfficer.email }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false) {
        setTicketActionError(`${action} refused: ${json?.error || `HTTP ${res.status}`}`);
        return false;
      }
      logAudit(action.toUpperCase().replace(/\s+/g, '_'), 'COMPLAINT', ticketId, `${action} → ${json?.complaint?.status || 'ok'}`);
      await refreshTickets();
      return true;
    } catch (err: any) {
      setTicketActionError(`${action} failed: ${err?.message || 'request error'}`);
      return false;
    }
  };

  const refreshTickets = useCallback(async () => {
    try {
      const qs =
        selectedJurisdiction === 'NG' || selectedJurisdiction === 'NE'
          ? `?country=${selectedJurisdiction}`
          : '';
      const res = await fetch(`/api/complaints${qs}`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok || json?.success === false) {
        throw new Error(json?.error || `HTTP ${res.status}`);
      }
      const complaints = json?.data?.complaints || [];
      setTickets(toSupportTickets(complaints));
      setTicketsError(null);
      setTicketsPhase('ready');
      setTicketsSyncedAt(new Date().toISOString());
    } catch (err: any) {
      setTicketsError(err?.message || 'The complaint engine could not be reached');
      setTicketsPhase('error');
    }
  }, [selectedJurisdiction]);

  useEffect(() => {
    void refreshTickets();
    const poll = setInterval(() => void refreshTickets(), 30000);
    return () => clearInterval(poll);
  }, [refreshTickets]);

  /**
   * Intake. The reference the operator sees is the engine\'s own
   * `complaintReference`; if the engine refuses the case there is no ticket and
   * the operator is told why. Nothing is minted in the browser.
   */
  const createTicket = async (ticketInput: Partial<SupportTicket>): Promise<string> => {
    setTicketActionError(null);
    const country = ticketInput.jurisdiction === 'NE' ? 'NE' : 'NG';
    const category =
      TICKET_CATEGORY_TO_COMPLAINT[String(ticketInput.category || '')] || 'FAILED_TRANSFER';
    const priority = TICKET_PRIORITY_TO_COMPLAINT[ticketInput.priority || 'NORMAL'] || 'P2';
    const description = [ticketInput.subject, ticketInput.description]
      .filter(Boolean)
      .join(' — ')
      .trim();

    try {
      const res = await fetch('/api/complaints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: ticketInput.customerId,
          customerName: ticketInput.customerName,
          customerPhone: ticketInput.customerPhone,
          country,
          category,
          priority,
          currency: country === 'NE' ? 'XOF' : 'NGN',
          disputedAmount: Number((ticketInput as Record<string, unknown>).disputedAmount ?? 0) || 0,
          description,
          transactionReference: ticketInput.relatedTransactionId,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false) {
        setTicketActionError(`Case not opened: ${json?.error || `HTTP ${res.status}`}`);
        return '';
      }
      const reference = json?.complaint?.complaintReference || '';
      logAudit('TICKET_CREATED', 'COMPLAINT', json?.complaint?.id || '', `Case opened: ${reference}`);
      await refreshTickets();
      setActiveTicketId(json?.complaint?.id || null);
      return reference;
    } catch (err: any) {
      setTicketActionError(`Case not opened: ${err?.message || 'request error'}`);
      return '';
    }
  };

  const assignTicket = async (ticketId: string, officerId: string) => {
    const targetOfficer = officers.find((o) => o.id === officerId) || currentOfficer;
    await engineTicket(
      ticketId,
      { assignedToEmail: targetOfficer.email, status: 'ASSIGNED' },
      `Assigned to ${targetOfficer.fullName}`
    );
  };

  /**
   * Escalation keeps the rationale the operator typed: the engine stores it in
   * the case history, where the admin and CX consoles read it back.
   */
  const escalateTicket = async (ticketId: string, targetRole: SupportRole, rationale: string) => {
    await engineTicket(
      ticketId,
      {
        status: 'PENDING_PROVIDER',
        notes: `[ESCALATED TO ${targetRole}] ${rationale}`,
        assignedToEmail: currentOfficer.email,
      },
      `Escalated to ${targetRole}`
    );
  };

  const sendTicketMessage = async (
    ticketId: string,
    content: string,
    isInternalNote: boolean
  ) => {
    setTicketActionError(null);
    if (!content.trim()) return;
    try {
      const res = await fetch(`/api/complaints/${ticketId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: content, by: currentOfficer.email, internal: isInternalNote }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false) {
        setTicketActionError(`Note not saved: ${json?.error || `HTTP ${res.status}`}`);
        return;
      }
      logAudit(isInternalNote ? 'INTERNAL_NOTE_ADDED' : 'TICKET_REPLY_SENT', 'COMPLAINT', ticketId, 'Note recorded on the case');
      await refreshTickets();
    } catch (err: any) {
      setTicketActionError(`Note not saved: ${err?.message || 'request error'}`);
    }
  };

  const resolveTicket = async (ticketId: string, resolutionSummary?: string) => {
    await engineTicket(
      ticketId,
      {
        status: 'RESOLVED',
        notes: resolutionSummary || 'Resolved from the support desk',
        assignedToEmail: currentOfficer.email,
      },
      'Resolved'
    );
  };

  const closeTicket = async (ticketId: string) => {
    await engineTicket(
      ticketId,
      { status: 'CLOSED', notes: 'Closed after resolution', assignedToEmail: currentOfficer.email },
      'Closed'
    );
  };

  const reopenTicket = async (ticketId: string, reason: string) => {
    await engineTicket(
      ticketId,
      { status: 'INVESTIGATING', notes: `[REOPENED] ${reason}`, assignedToEmail: currentOfficer.email },
      'Reopened'
    );
  };

  const linkTicketToIncident = (ticketId: string, incidentId: string) => {
    setTickets((prev) =>
      prev.map((t) => (t.id === ticketId ? { ...t, incidentId, updatedAt: new Date().toISOString() } : t))
    );
    setIncidents((prev) =>
      prev.map((inc) =>
        inc.id === incidentId ? { ...inc, linkedTicketsCount: inc.linkedTicketsCount + 1 } : inc
      )
    );
    logAudit('TICKET_LINKED_INCIDENT', 'SUPPORT_TICKET', ticketId, `Linked to incident ${incidentId}`);
  };

  const createIncident = (incidentInput: Partial<SupportIncident>): string => {
    const newId = `INC-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(incidents.length + 1).padStart(2, '0')}`;
    const newIncident: SupportIncident = {
      id: newId,
      incidentNumber: newId,
      title: incidentInput.title || 'Operational Outage Advisory',
      description: incidentInput.description || '',
      affectedServices: incidentInput.affectedServices || ['Core Payments'],
      affectedProviders: incidentInput.affectedProviders || ['Providus Bank NG'],
      jurisdiction: incidentInput.jurisdiction || 'NG',
      severity: incidentInput.severity || 'MAJOR',
      status: 'INVESTIGATING',
      startTime: new Date().toISOString(),
      linkedTicketsCount: 0,
      customerNotice: incidentInput.customerNotice || 'Service is temporarily degraded.',
    };

    setIncidents((prev) => [newIncident, ...prev]);
    logAudit('INCIDENT_CREATED', 'SUPPORT_INCIDENT', newId, `Incident declared: ${newIncident.title}`);
    return newId;
  };

  const resolveIncident = (incidentId: string) => {
    setIncidents((prev) =>
      prev.map((inc) =>
        inc.id === incidentId
          ? { ...inc, status: 'RESOLVED', resolvedTime: new Date().toISOString() }
          : inc
      )
    );
    logAudit('INCIDENT_RESOLVED', 'SUPPORT_INCIDENT', incidentId, 'Incident marked resolved');
  };

  const toggleAutomationRule = (ruleId: string, enabled: boolean) => {
    setAutomationRules((prev) =>
      prev.map((r) => (r.id === ruleId ? { ...r, enabled } : r))
    );
    logAudit('AUTOMATION_RULE_TOGGLED', 'AUTOMATION_RULE', ruleId, `Status set to ${enabled ? 'ENABLED' : 'DISABLED'}`);
  };

  const submitQaReview = (reviewInput: Omit<QaReview, 'id' | 'reviewedAt'>) => {
    const newId = `QA-${Date.now().toString().slice(-6)}`;
    const newQa: QaReview = {
      id: newId,
      ...reviewInput,
      reviewedAt: new Date().toISOString(),
    };
    setQaReviews((prev) => [newQa, ...prev]);
    logAudit('QA_REVIEW_SUBMITTED', 'QA_REVIEW', newId, `QA evaluated for ${reviewInput.officerName}: Score ${reviewInput.score}/100`);
  };

  const completeTrainingModule = (moduleId: string) => {
    setTrainingModules((prev) =>
      prev.map((m) => (m.id === moduleId ? { ...m, completed: true, score: 100 } : m))
    );
    logAudit('TRAINING_MODULE_COMPLETED', 'TRAINING_MODULE', moduleId, 'Officer completed module certification');
  };

  const formatCurrency = (amount: number, currency = 'NGN'): string => {
    const symbolMap: Record<string, string> = {
      NGN: '₦',
      XOF: 'CFA ',
      USD: '$',
      EUR: '€',
      GBP: '£',
    };
    const symbol = symbolMap[currency] || `${currency} `;
    return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string): string => {
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  const calculateSlaRemaining = (dueIsoDate: string) => {
    try {
      const now = Date.now();
      const target = new Date(dueIsoDate).getTime();
      const diffMs = target - now;

      if (diffMs <= 0) {
        return { text: 'BREACHED', isBreached: true, isWarning: true };
      }

      const diffHours = Math.floor(diffMs / (1000 * 3600));
      const diffMinutes = Math.floor((diffMs % (1000 * 3600)) / (1000 * 60));

      if (diffHours === 0) {
        return { text: `< ${diffMinutes}m remaining`, isBreached: false, isWarning: true };
      }
      return { text: `${diffHours}h ${diffMinutes}m remaining`, isBreached: false, isWarning: diffHours < 1 };
    } catch {
      return { text: 'On Track', isBreached: false, isWarning: false };
    }
  };

  const stats = useMemo(() => {
    const filtered = selectedJurisdiction === 'ALL' ? tickets : tickets.filter((t) => t.jurisdiction === selectedJurisdiction);
    const isOpen = (t: MappedTicket) => t.status !== 'RESOLVED' && t.status !== 'CLOSED';
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const totalOpen = filtered.filter(isOpen).length;
    // The engine assigns by email; the roster is a fixture, so "mine" means the
    // signed-in officer's email on the case.
    const unassigned = filtered.filter((t) => isOpen(t) && !t.assignedOfficerName).length;
    const assignedToMe = filtered.filter((t) => isOpen(t) && t.assignedOfficerName === currentOfficer.email).length;

    // SLA state is derived from each case's own deadline by the adapter.
    const slaAtRisk = filtered.filter((t) => isOpen(t) && t.slaStatus === 'APPROACHING_BREACH').length;
    const slaBreached = filtered.filter((t) => isOpen(t) && t.slaStatus === 'BREACHED').length;

    const resolvedToday = filtered.filter(
      (t) =>
        (t.status === 'RESOLVED' || t.status === 'CLOSED') &&
        t.resolvedAt !== undefined &&
        new Date(t.resolvedAt).getTime() >= startOfToday.getTime()
    ).length;
    const activeIncidentsCount = incidents.filter((i) => i.status !== 'RESOLVED').length;
    const automationResolvedCount = automationLogs.filter((l) => l.status === 'SUCCESS').length;

    return {
      totalOpen,
      unassigned,
      assignedToMe,
      slaAtRisk,
      slaBreached,
      resolvedToday,
      activeIncidentsCount,
      automationResolvedCount,
      overallHealth: healthScore.overallScore,
    };
  }, [tickets, incidents, automationLogs, currentOfficer, selectedJurisdiction, healthScore]);

  return (
    <SupportContext.Provider
      value={{
        locale,
        setLocale,
        t,
        selectedJurisdiction,
        setSelectedJurisdiction,
        currentOfficer,
        setCurrentOfficer,
        officers,
        tickets,
        activeTicket,
        setActiveTicketId,
        ticketsPhase,
        ticketsError,
        ticketsSyncedAt,
        refreshTickets,
        ticketActionError,
        dismissTicketActionError: () => setTicketActionError(null),
        simulationLayer,
        customer360Map,
        transactionInvestigationMap,
        playbooks,
        knowledgeArticles,
        incidents,
        automationRules,
        automationLogs,
        qaReviews,
        trainingModules,
        staffCapacity,
        healthScore,
        auditLogs,
        createTicket,
        assignTicket,
        escalateTicket,
        sendTicketMessage,
        resolveTicket,
        closeTicket,
        reopenTicket,
        linkTicketToIncident,
        createIncident,
        resolveIncident,
        toggleAutomationRule,
        submitQaReview,
        completeTrainingModule,
        formatCurrency,
        formatDate,
        calculateSlaRemaining,
        stats,
      }}
    >
      {children}
    </SupportContext.Provider>
  );
};

export const useSupport = (): SupportContextType => {
  const context = useContext(SupportContext);
  if (!context) {
    throw new Error('useSupport must be used within a SupportProvider');
  }
  return context;
};
