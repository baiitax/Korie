'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
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
  MOCK_SUPPORT_TICKETS,
  MOCK_CUSTOMER_360_MAP,
  MOCK_TRANSACTION_INVESTIGATION_MAP,
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

interface SupportContextType {
  locale: SupportLocale;
  setLocale: (loc: SupportLocale) => void;
  t: ReturnType<typeof getSupportTranslation>;
  selectedJurisdiction: 'ALL' | SupportJurisdiction;
  setSelectedJurisdiction: (j: 'ALL' | SupportJurisdiction) => void;
  currentOfficer: SupportOfficer;
  setCurrentOfficer: (officer: SupportOfficer) => void;
  officers: SupportOfficer[];

  tickets: SupportTicket[];
  activeTicket: SupportTicket | null;
  setActiveTicketId: (ticketId: string | null) => void;

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

  // Actions
  createTicket: (ticketInput: Partial<SupportTicket>) => string;
  assignTicket: (ticketId: string, officerId: string) => void;
  escalateTicket: (ticketId: string, targetRole: SupportRole, rationale: string) => void;
  sendTicketMessage: (ticketId: string, content: string, isInternalNote: boolean, macroKey?: string) => void;
  resolveTicket: (ticketId: string, resolutionSummary?: string) => void;
  closeTicket: (ticketId: string) => void;
  reopenTicket: (ticketId: string, reason: string) => void;
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

  const [tickets, setTickets] = useState<SupportTicket[]>(MOCK_SUPPORT_TICKETS);
  const [activeTicketId, setActiveTicketId] = useState<string | null>(MOCK_SUPPORT_TICKETS[0]?.id || null);

  const [customer360Map] = useState<Record<string, Customer360Context>>(MOCK_CUSTOMER_360_MAP);
  const [transactionInvestigationMap] = useState<Record<string, TransactionInvestigationContext>>(
    MOCK_TRANSACTION_INVESTIGATION_MAP
  );
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

  const createTicket = (ticketInput: Partial<SupportTicket>): string => {
    const newId = `TCK-${new Date().getFullYear()}-${String(tickets.length + 10491).padStart(5, '0')}`;
    const newTicketNumber = `KP-SUP-${String(tickets.length + 10491).padStart(5, '0')}`;

    const newTicket: SupportTicket = {
      id: newId,
      ticketNumber: newTicketNumber,
      subject: ticketInput.subject || 'Customer Support Inbound Ticket',
      description: ticketInput.description || '',
      category: ticketInput.category || 'PENDING_TRANSACTION',
      priority: ticketInput.priority || 'NORMAL',
      status: 'NEW',
      customerType: ticketInput.customerType || 'CUSTOMER',
      customerId: ticketInput.customerId || 'CUST-NG-88912',
      customerName: ticketInput.customerName || 'Inbound User',
      customerEmail: ticketInput.customerEmail,
      customerPhone: ticketInput.customerPhone,
      jurisdiction: ticketInput.jurisdiction || currentOfficer.jurisdiction,
      channel: ticketInput.channel || 'IN_APP',
      language: ticketInput.language || 'en',
      assignedOfficerId: ticketInput.assignedOfficerId,
      assignedOfficerName: ticketInput.assignedOfficerName,
      tierAssigned: ticketInput.tierAssigned || 'TIER_1_JUNIOR',
      relatedTransactionId: ticketInput.relatedTransactionId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      firstResponseDueAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      resolutionDueAt: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
      slaStatus: 'HEALTHY',
      tags: ticketInput.tags || ['Inbound'],
      sentiment: ticketInput.sentiment || 'NEUTRAL',
      messages: ticketInput.description
        ? [
            {
              id: `MSG-${Date.now()}`,
              ticketId: newId,
              senderType: 'CUSTOMER',
              senderId: ticketInput.customerId || 'CUST-00',
              senderName: ticketInput.customerName || 'Customer',
              content: ticketInput.description,
              isInternalNote: false,
              timestamp: new Date().toISOString(),
            },
          ]
        : [],
    };

    setTickets((prev) => [newTicket, ...prev]);
    setActiveTicketId(newId);
    logAudit('TICKET_CREATED', 'SUPPORT_TICKET', newId, `Ticket created: ${newTicket.subject}`);
    return newId;
  };

  const assignTicket = (ticketId: string, officerId: string) => {
    const targetOfficer = officers.find((o) => o.id === officerId) || currentOfficer;
    setTickets((prev) =>
      prev.map((t) => {
        if (t.id === ticketId) {
          logAudit('TICKET_ASSIGNED', 'SUPPORT_TICKET', ticketId, `Assigned to ${targetOfficer.fullName} (${targetOfficer.role})`);
          return {
            ...t,
            assignedOfficerId: targetOfficer.id,
            assignedOfficerName: targetOfficer.fullName,
            status: t.status === 'NEW' ? 'ASSIGNED' : t.status,
            updatedAt: new Date().toISOString(),
          };
        }
        return t;
      })
    );
  };

  const escalateTicket = (ticketId: string, targetRole: SupportRole, rationale: string) => {
    setTickets((prev) =>
      prev.map((t) => {
        if (t.id === ticketId) {
          const newInternalNote = {
            id: `MSG-ESC-${Date.now()}`,
            ticketId,
            senderType: 'AGENT' as const,
            senderId: currentOfficer.id,
            senderName: currentOfficer.fullName,
            content: `[ESCALATION TO ${targetRole}]: ${rationale}`,
            isInternalNote: true,
            timestamp: new Date().toISOString(),
          };

          logAudit('TICKET_ESCALATED', 'SUPPORT_TICKET', ticketId, `Escalated to ${targetRole}. Reason: ${rationale}`);
          return {
            ...t,
            status: 'ESCALATED',
            tierAssigned: targetRole.includes('TIER_3') ? 'TIER_3_SPECIALIST' : 'TIER_2_SENIOR',
            messages: [...t.messages, newInternalNote],
            updatedAt: new Date().toISOString(),
          };
        }
        return t;
      })
    );
  };

  const sendTicketMessage = (
    ticketId: string,
    content: string,
    isInternalNote: boolean,
    macroKey?: string
  ) => {
    if (!content.trim()) return;

    setTickets((prev) =>
      prev.map((t) => {
        if (t.id === ticketId) {
          const newMsg = {
            id: `MSG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            ticketId,
            senderType: 'AGENT' as const,
            senderId: currentOfficer.id,
            senderName: currentOfficer.fullName,
            content,
            isInternalNote,
            macroUsed: macroKey,
            timestamp: new Date().toISOString(),
          };

          const firstRespondedAt = t.firstRespondedAt || (!isInternalNote ? new Date().toISOString() : undefined);
          const newStatus = isInternalNote
            ? t.status
            : t.status === 'NEW' || t.status === 'ASSIGNED'
            ? 'IN_PROGRESS'
            : t.status;

          logAudit(
            isInternalNote ? 'INTERNAL_NOTE_ADDED' : 'TICKET_REPLY_SENT',
            'SUPPORT_TICKET',
            ticketId,
            isInternalNote ? `Note: ${content.slice(0, 60)}...` : `Reply dispatched. Macro: ${macroKey || 'N/A'}`
          );

          return {
            ...t,
            status: newStatus,
            firstRespondedAt,
            messages: [...t.messages, newMsg],
            updatedAt: new Date().toISOString(),
          };
        }
        return t;
      })
    );
  };

  const resolveTicket = (ticketId: string, resolutionSummary?: string) => {
    setTickets((prev) =>
      prev.map((t) => {
        if (t.id === ticketId) {
          const resolutionMsg = resolutionSummary
            ? {
                id: `MSG-RES-${Date.now()}`,
                ticketId,
                senderType: 'AGENT' as const,
                senderId: currentOfficer.id,
                senderName: currentOfficer.fullName,
                content: `[CASE RESOLVED]: ${resolutionSummary}`,
                isInternalNote: true,
                timestamp: new Date().toISOString(),
              }
            : null;

          logAudit('TICKET_RESOLVED', 'SUPPORT_TICKET', ticketId, `Case marked resolved. Summary: ${resolutionSummary || 'Completed'}`);
          return {
            ...t,
            status: 'RESOLVED',
            resolvedAt: new Date().toISOString(),
            messages: resolutionMsg ? [...t.messages, resolutionMsg] : t.messages,
            updatedAt: new Date().toISOString(),
          };
        }
        return t;
      })
    );
  };

  const closeTicket = (ticketId: string) => {
    setTickets((prev) =>
      prev.map((t) => {
        if (t.id === ticketId) {
          logAudit('TICKET_CLOSED', 'SUPPORT_TICKET', ticketId, 'Ticket closed');
          return {
            ...t,
            status: 'CLOSED',
            closedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
        }
        return t;
      })
    );
  };

  const reopenTicket = (ticketId: string, reason: string) => {
    setTickets((prev) =>
      prev.map((t) => {
        if (t.id === ticketId) {
          const reopenMsg = {
            id: `MSG-ROP-${Date.now()}`,
            ticketId,
            senderType: 'CUSTOMER' as const,
            senderId: t.customerId,
            senderName: t.customerName,
            content: `[REOPEN REASON]: ${reason}`,
            isInternalNote: false,
            timestamp: new Date().toISOString(),
          };

          logAudit('TICKET_REOPENED', 'SUPPORT_TICKET', ticketId, `Reopened: ${reason}`);
          return {
            ...t,
            status: 'REOPENED',
            resolvedAt: undefined,
            closedAt: undefined,
            messages: [...t.messages, reopenMsg],
            updatedAt: new Date().toISOString(),
          };
        }
        return t;
      })
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

    const totalOpen = filtered.filter((t) => t.status !== 'RESOLVED' && t.status !== 'CLOSED').length;
    const unassigned = filtered.filter((t) => !t.assignedOfficerId && t.status !== 'RESOLVED' && t.status !== 'CLOSED').length;
    const assignedToMe = filtered.filter(
      (t) => t.assignedOfficerId === currentOfficer.id && t.status !== 'RESOLVED' && t.status !== 'CLOSED'
    ).length;

    const slaAtRisk = filtered.filter((t) => {
      if (t.status === 'RESOLVED' || t.status === 'CLOSED') return false;
      const res = calculateSlaRemaining(t.resolutionDueAt);
      return res.isWarning && !res.isBreached;
    }).length;

    const slaBreached = filtered.filter((t) => {
      if (t.status === 'RESOLVED' || t.status === 'CLOSED') return false;
      const res = calculateSlaRemaining(t.resolutionDueAt);
      return res.isBreached;
    }).length;

    const resolvedToday = filtered.filter((t) => t.status === 'RESOLVED' || t.status === 'CLOSED').length;
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
