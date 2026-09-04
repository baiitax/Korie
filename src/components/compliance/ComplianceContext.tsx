'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import {
  ComplianceOfficer,
  KycVerificationRecord,
  KybVerificationRecord,
  AmlAlert,
  SanctionsAlert,
  ComplianceCase,
  AccountRestriction,
  RealtimeRiskTelemetry,
  RegulatoryReport,
  CompliancePolicy,
  ComplianceCalendarEvent,
  ComplianceAuditEntry,
  CaseTimelineEntry,
  CaseEvidence,
  CaseNote,
  Jurisdiction,
  KycStatus,
  CaseStatus,
  AmlAlertStatus,
  SanctionsAlertStatus,
  RestrictionType,
} from '@/types/compliance';
import {
  MOCK_COMPLIANCE_OFFICERS,
  MOCK_KYC_RECORDS,
  MOCK_KYB_RECORDS,
  MOCK_AML_ALERTS,
  MOCK_SANCTIONS_ALERTS,
  MOCK_COMPLIANCE_CASES,
  MOCK_ACCOUNT_RESTRICTIONS,
  MOCK_REALTIME_RISK_TELEMETRY,
  MOCK_REGULATORY_REPORTS,
  MOCK_COMPLIANCE_POLICIES,
  MOCK_COMPLIANCE_CALENDAR,
  MOCK_COMPLIANCE_AUDIT_LOGS,
} from '@/services/complianceDataService';
import { ComplianceLocale, getComplianceTranslation } from '@/locales/compliance';

interface ComplianceContextType {
  locale: ComplianceLocale;
  setLocale: (loc: ComplianceLocale) => void;
  t: ReturnType<typeof getComplianceTranslation>;
  selectedJurisdiction: 'ALL' | Jurisdiction;
  setSelectedJurisdiction: (j: 'ALL' | Jurisdiction) => void;
  currentOfficer: ComplianceOfficer;
  setCurrentOfficer: (officer: ComplianceOfficer) => void;
  officers: ComplianceOfficer[];
  
  kycRecords: KycVerificationRecord[];
  kybRecords: KybVerificationRecord[];
  amlAlerts: AmlAlert[];
  sanctionsAlerts: SanctionsAlert[];
  cases: ComplianceCase[];
  restrictions: AccountRestriction[];
  telemetry: RealtimeRiskTelemetry[];
  regulatoryReports: RegulatoryReport[];
  policies: CompliancePolicy[];
  calendarEvents: ComplianceCalendarEvent[];
  auditLogs: ComplianceAuditEntry[];

  // Actions
  updateKycStatus: (id: string, status: KycStatus, notes?: string) => void;
  updateKybStatus: (id: string, status: KycStatus, notes?: string) => void;
  updateAmlAlertStatus: (id: string, status: AmlAlertStatus, disposition?: string) => void;
  convertAmlAlertToCase: (alertId: string, assignedOfficerId?: string) => string;
  updateSanctionsAlertStatus: (id: string, status: SanctionsAlertStatus, disposition?: string) => void;
  createCase: (caseInput: Partial<ComplianceCase>) => string;
  updateCaseStatus: (caseId: string, status: CaseStatus, summary: string) => void;
  addCaseTimelineEntry: (caseId: string, entry: Omit<CaseTimelineEntry, 'id' | 'timestamp'>) => void;
  addCaseEvidence: (caseId: string, evidence: Omit<CaseEvidence, 'id' | 'uploadedAt'>) => void;
  addCaseNote: (caseId: string, content: string, isConfidential?: boolean) => void;
  applyAccountRestriction: (restriction: Omit<AccountRestriction, 'id' | 'appliedAt' | 'makerOfficerId' | 'makerOfficerName' | 'status' | 'approvalStatus'>) => void;
  approveAccountRestriction: (restrictionId: string) => void;
  liftAccountRestriction: (restrictionId: string, reason: string) => void;
  submitRegulatoryReport: (reportId: string) => void;
  acknowledgeCalendarEvent: (eventId: string) => void;

  // Utility helpers
  formatCurrency: (amount: number, currency?: string) => string;
  formatDate: (dateString: string) => string;
  stats: {
    totalOpenCases: number;
    totalAmlAlerts: number;
    totalSanctionsAlerts: number;
    pendingKycKyb: number;
    activeRestrictions: number;
    overdueDeadlines: number;
    highRiskEntitiesCount: number;
  };
}

const ComplianceContext = createContext<ComplianceContextType | undefined>(undefined);

export const ComplianceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [locale, setLocale] = useState<ComplianceLocale>('en');
  const [selectedJurisdiction, setSelectedJurisdiction] = useState<'ALL' | Jurisdiction>('ALL');
  
  const [officers] = useState<ComplianceOfficer[]>(MOCK_COMPLIANCE_OFFICERS);
  const [currentOfficer, setCurrentOfficer] = useState<ComplianceOfficer>(MOCK_COMPLIANCE_OFFICERS[0]);
  
  const [kycRecords, setKycRecords] = useState<KycVerificationRecord[]>(MOCK_KYC_RECORDS);
  const [kybRecords, setKybRecords] = useState<KybVerificationRecord[]>(MOCK_KYB_RECORDS);
  const [amlAlerts, setAmlAlerts] = useState<AmlAlert[]>(MOCK_AML_ALERTS);
  const [sanctionsAlerts, setSanctionsAlerts] = useState<SanctionsAlert[]>(MOCK_SANCTIONS_ALERTS);
  const [cases, setCases] = useState<ComplianceCase[]>(MOCK_COMPLIANCE_CASES);
  const [restrictions, setRestrictions] = useState<AccountRestriction[]>(MOCK_ACCOUNT_RESTRICTIONS);
  const [telemetry] = useState<RealtimeRiskTelemetry[]>(MOCK_REALTIME_RISK_TELEMETRY);
  const [regulatoryReports, setRegulatoryReports] = useState<RegulatoryReport[]>(MOCK_REGULATORY_REPORTS);
  const [policies] = useState<CompliancePolicy[]>(MOCK_COMPLIANCE_POLICIES);
  const [calendarEvents, setCalendarEvents] = useState<ComplianceCalendarEvent[]>(MOCK_COMPLIANCE_CALENDAR);
  const [auditLogs, setAuditLogs] = useState<ComplianceAuditEntry[]>(MOCK_COMPLIANCE_AUDIT_LOGS);

  const t = useMemo(() => getComplianceTranslation(locale), [locale]);

  // Record an immutable audit log entry
  const logAudit = (action: string, entityType: string, entityId: string, details: string) => {
    const newLog: ComplianceAuditEntry = {
      id: `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
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

  const updateKycStatus = (id: string, status: KycStatus, notes?: string) => {
    setKycRecords((prev) =>
      prev.map((rec) => {
        if (rec.id === id) {
          const updated = {
            ...rec,
            status,
            assignedOfficer: currentOfficer.fullName,
            verificationNotes: notes ? `${rec.verificationNotes || ''} | ${notes}` : rec.verificationNotes,
            updatedAt: new Date().toISOString(),
          };
          logAudit('KYC_STATUS_UPDATED', 'CUSTOMER_KYC', id, `Status updated to ${status}. Notes: ${notes || 'N/A'}`);
          return updated;
        }
        return rec;
      })
    );
  };

  const updateKybStatus = (id: string, status: KycStatus, notes?: string) => {
    setKybRecords((prev) =>
      prev.map((rec) => {
        if (rec.id === id) {
          const updated = {
            ...rec,
            status,
            assignedOfficer: currentOfficer.fullName,
            verificationNotes: notes ? `${rec.verificationNotes || ''} | ${notes}` : rec.verificationNotes,
            updatedAt: new Date().toISOString(),
          };
          logAudit('KYB_STATUS_UPDATED', 'BUSINESS_KYB', id, `KYB status updated to ${status}. Notes: ${notes || 'N/A'}`);
          return updated;
        }
        return rec;
      })
    );
  };

  const updateAmlAlertStatus = (id: string, status: AmlAlertStatus, disposition?: string) => {
    setAmlAlerts((prev) =>
      prev.map((alert) => {
        if (alert.id === id) {
          logAudit('AML_ALERT_DISPOSITION', 'AML_ALERT', id, `Alert dispositioned as ${status}. Details: ${disposition || 'No comments'}`);
          return {
            ...alert,
            status,
            dispositionNotes: disposition,
            assignedOfficer: currentOfficer.fullName,
          };
        }
        return alert;
      })
    );
  };

  const convertAmlAlertToCase = (alertId: string, assignedOfficerId?: string): string => {
    const alert = amlAlerts.find((a) => a.id === alertId);
    if (!alert) return '';

    const newCaseId = `CAS-${new Date().getFullYear()}-${String(cases.length + 1).padStart(4, '0')}`;
    const targetOfficer = officers.find((o) => o.id === assignedOfficerId) || currentOfficer;

    const newCase: ComplianceCase = {
      id: newCaseId,
      caseNumber: newCaseId,
      caseType: 'SUSPICIOUS_ACTIVITY',
      title: `Escalated AML Alert: ${alert.ruleName} (${alert.entityName})`,
      targetEntityType: alert.entityType,
      targetEntityId: alert.entityId,
      targetEntityName: alert.entityName,
      jurisdiction: alert.jurisdiction,
      riskLevel: alert.riskLevel,
      priority: alert.severity === 'CRITICAL' ? 'URGENT' : 'HIGH',
      status: 'UNDER_REVIEW',
      assignedOfficerId: targetOfficer.id,
      assignedOfficerName: targetOfficer.fullName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deadlineSla: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
      summary: `Case initiated from AML alert ${alert.id}. Triggered rule: ${alert.ruleName}. ${alert.triggerReason}`,
      involvedAmount: alert.transactionAmount,
      currency: alert.currency,
      relatedAlertIds: [alert.id],
      timeline: [
        {
          id: `TL-${Date.now()}-1`,
          timestamp: new Date().toISOString(),
          officerName: currentOfficer.fullName,
          action: 'CASE_CREATED',
          description: `Case escalated from AML Alert ${alert.id} (${alert.ruleCode})`,
        },
      ],
      evidence: [],
      internalNotes: [
        {
          id: `NT-${Date.now()}-1`,
          timestamp: new Date().toISOString(),
          officerName: currentOfficer.fullName,
          content: `Initial auto-escalation note. Transaction amount: ${alert.currency} ${alert.transactionAmount.toLocaleString()}. Rule: ${alert.ruleName}`,
          isConfidential: false,
        },
      ],
      decision: {
        isResolved: false,
        requiresNfiuCentifFiling: alert.severity === 'CRITICAL',
      },
    };

    setCases((prev) => [newCase, ...prev]);
    updateAmlAlertStatus(alertId, 'CONVERTED_TO_CASE', `Escalated to case ${newCaseId}`);
    logAudit('AML_ALERT_ESCALATED', 'COMPLIANCE_CASE', newCaseId, `Alert ${alertId} converted to investigation case`);
    return newCaseId;
  };

  const updateSanctionsAlertStatus = (id: string, status: SanctionsAlertStatus, disposition?: string) => {
    setSanctionsAlerts((prev) =>
      prev.map((alert) => {
        if (alert.id === id) {
          logAudit('SANCTIONS_DISPOSITION', 'SANCTIONS_ALERT', id, `Sanctions alert resolved as ${status}. Notes: ${disposition || ''}`);
          return {
            ...alert,
            status,
            reviewedBy: currentOfficer.fullName,
            reviewedAt: new Date().toISOString(),
          };
        }
        return alert;
      })
    );
  };

  const createCase = (caseInput: Partial<ComplianceCase>): string => {
    const newCaseId = `CAS-${new Date().getFullYear()}-${String(cases.length + 1).padStart(4, '0')}`;
    const newCase: ComplianceCase = {
      id: newCaseId,
      caseNumber: newCaseId,
      caseType: caseInput.caseType || 'MANUAL_INVESTIGATION',
      title: caseInput.title || `Investigation Case ${newCaseId}`,
      targetEntityType: caseInput.targetEntityType || 'CUSTOMER',
      targetEntityId: caseInput.targetEntityId || 'ENT-000',
      targetEntityName: caseInput.targetEntityName || 'Unknown Entity',
      jurisdiction: caseInput.jurisdiction || currentOfficer.jurisdiction,
      riskLevel: caseInput.riskLevel || 'MEDIUM',
      priority: caseInput.priority || 'MEDIUM',
      status: 'OPEN',
      assignedOfficerId: caseInput.assignedOfficerId || currentOfficer.id,
      assignedOfficerName: caseInput.assignedOfficerName || currentOfficer.fullName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deadlineSla: caseInput.deadlineSla || new Date(Date.now() + 72 * 3600 * 1000).toISOString(),
      summary: caseInput.summary || 'Investigation initiated by compliance team.',
      involvedAmount: caseInput.involvedAmount || 0,
      currency: caseInput.currency || 'NGN',
      relatedAlertIds: caseInput.relatedAlertIds || [],
      timeline: [
        {
          id: `TL-${Date.now()}-1`,
          timestamp: new Date().toISOString(),
          officerName: currentOfficer.fullName,
          action: 'CASE_CREATED',
          description: 'Case opened in Compliance Portal',
        },
      ],
      evidence: [],
      internalNotes: [],
      decision: {
        isResolved: false,
        requiresNfiuCentifFiling: false,
      },
    };

    setCases((prev) => [newCase, ...prev]);
    logAudit('CASE_CREATED', 'COMPLIANCE_CASE', newCaseId, `Case created: ${newCase.title}`);
    return newCaseId;
  };

  const updateCaseStatus = (caseId: string, status: CaseStatus, summary: string) => {
    setCases((prev) =>
      prev.map((c) => {
        if (c.id === caseId) {
          const isResolved = status === 'RESOLVED' || status === 'CLOSED';
          const updatedTimeline = [
            ...c.timeline,
            {
              id: `TL-${Date.now()}`,
              timestamp: new Date().toISOString(),
              officerName: currentOfficer.fullName,
              action: `STATUS_CHANGED_TO_${status}`,
              description: summary,
            },
          ];
          const updatedCase: ComplianceCase = {
            ...c,
            status,
            updatedAt: new Date().toISOString(),
            timeline: updatedTimeline,
            decision: {
              ...c.decision,
              isResolved,
              resolvedAt: isResolved ? new Date().toISOString() : undefined,
              rulingSummary: summary,
              makerOfficerId: currentOfficer.id,
            },
          };
          logAudit('CASE_STATUS_UPDATED', 'COMPLIANCE_CASE', caseId, `Status transitioned to ${status}. Details: ${summary}`);
          return updatedCase;
        }
        return c;
      })
    );
  };

  const addCaseTimelineEntry = (caseId: string, entry: Omit<CaseTimelineEntry, 'id' | 'timestamp'>) => {
    setCases((prev) =>
      prev.map((c) => {
        if (c.id === caseId) {
          const newEntry: CaseTimelineEntry = {
            id: `TL-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            timestamp: new Date().toISOString(),
            ...entry,
          };
          return {
            ...c,
            updatedAt: new Date().toISOString(),
            timeline: [...c.timeline, newEntry],
          };
        }
        return c;
      })
    );
  };

  const addCaseEvidence = (caseId: string, evidence: Omit<CaseEvidence, 'id' | 'uploadedAt'>) => {
    setCases((prev) =>
      prev.map((c) => {
        if (c.id === caseId) {
          const newEvidence: CaseEvidence = {
            id: `EVD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            uploadedAt: new Date().toISOString(),
            ...evidence,
          };
          logAudit('EVIDENCE_ATTACHED', 'COMPLIANCE_CASE', caseId, `Attached evidence: ${evidence.title} (${evidence.fileType})`);
          return {
            ...c,
            updatedAt: new Date().toISOString(),
            evidence: [...c.evidence, newEvidence],
          };
        }
        return c;
      })
    );
  };

  const addCaseNote = (caseId: string, content: string, isConfidential = false) => {
    setCases((prev) =>
      prev.map((c) => {
        if (c.id === caseId) {
          const newNote: CaseNote = {
            id: `NOTE-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            timestamp: new Date().toISOString(),
            officerName: currentOfficer.fullName,
            content,
            isConfidential,
          };
          return {
            ...c,
            updatedAt: new Date().toISOString(),
            internalNotes: [...c.internalNotes, newNote],
          };
        }
        return c;
      })
    );
  };

  const applyAccountRestriction = (restrictionInput: Omit<AccountRestriction, 'id' | 'appliedAt' | 'makerOfficerId' | 'makerOfficerName' | 'status' | 'approvalStatus'>) => {
    const newId = `RST-${Date.now().toString().slice(-6)}`;
    const newRestriction: AccountRestriction = {
      id: newId,
      ...restrictionInput,
      makerOfficerId: currentOfficer.id,
      makerOfficerName: currentOfficer.fullName,
      appliedAt: new Date().toISOString(),
      status: currentOfficer.role === 'HEAD_OF_COMPLIANCE' ? 'ACTIVE' : 'PENDING_MAKER_CHECKER',
      approvalStatus: currentOfficer.role === 'HEAD_OF_COMPLIANCE' ? 'APPROVED' : 'PENDING_APPROVAL',
      checkerOfficerId: currentOfficer.role === 'HEAD_OF_COMPLIANCE' ? currentOfficer.id : undefined,
      checkerOfficerName: currentOfficer.role === 'HEAD_OF_COMPLIANCE' ? currentOfficer.fullName : undefined,
    };

    setRestrictions((prev) => [newRestriction, ...prev]);
    logAudit('ACCOUNT_RESTRICTION_INITIATED', 'ACCOUNT_RESTRICTION', newId, `Applied ${restrictionInput.restrictionType} on ${restrictionInput.targetEntityName}`);
  };

  const approveAccountRestriction = (restrictionId: string) => {
    setRestrictions((prev) =>
      prev.map((r) => {
        if (r.id === restrictionId) {
          logAudit('ACCOUNT_RESTRICTION_APPROVED', 'ACCOUNT_RESTRICTION', restrictionId, `Restriction dual-authorized by ${currentOfficer.fullName}`);
          return {
            ...r,
            status: 'ACTIVE',
            approvalStatus: 'APPROVED',
            checkerOfficerId: currentOfficer.id,
            checkerOfficerName: currentOfficer.fullName,
          };
        }
        return r;
      })
    );
  };

  const liftAccountRestriction = (restrictionId: string, reason: string) => {
    setRestrictions((prev) =>
      prev.map((r) => {
        if (r.id === restrictionId) {
          logAudit('ACCOUNT_RESTRICTION_LIFTED', 'ACCOUNT_RESTRICTION', restrictionId, `Restriction lifted: ${reason}`);
          return {
            ...r,
            status: 'LIFTED',
            approvalStatus: 'APPROVED',
            liftReason: reason,
            liftedAt: new Date().toISOString(),
            liftedByOfficerId: currentOfficer.id,
          };
        }
        return r;
      })
    );
  };

  const submitRegulatoryReport = (reportId: string) => {
    setRegulatoryReports((prev) =>
      prev.map((rep) => {
        if (rep.id === reportId) {
          const ackToken = `ACK-${rep.regulator}-${Date.now().toString().slice(-8)}`;
          logAudit('REGULATORY_REPORT_FILED', 'REGULATORY_REPORT', reportId, `Filed to ${rep.regulator} with ref ${ackToken}`);
          return {
            ...rep,
            filingStatus: 'SUBMITTED',
            submissionDate: new Date().toISOString(),
            submittedByOfficer: currentOfficer.fullName,
            acknowledgementRef: ackToken,
          };
        }
        return rep;
      })
    );
  };

  const acknowledgeCalendarEvent = (eventId: string) => {
    setCalendarEvents((prev) =>
      prev.map((ev) => (ev.id === eventId ? { ...ev, status: 'COMPLETED' } : ev))
    );
    logAudit('CALENDAR_DEADLINE_ACKNOWLEDGED', 'CALENDAR_EVENT', eventId, 'Deadline flagged completed');
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

  const stats = useMemo(() => {
    const filteredCases = selectedJurisdiction === 'ALL' ? cases : cases.filter((c) => c.jurisdiction === selectedJurisdiction);
    const filteredAml = selectedJurisdiction === 'ALL' ? amlAlerts : amlAlerts.filter((a) => a.jurisdiction === selectedJurisdiction);
    const filteredSanctions = selectedJurisdiction === 'ALL' ? sanctionsAlerts : sanctionsAlerts.filter((s) => s.jurisdiction === selectedJurisdiction);
    const filteredKyc = selectedJurisdiction === 'ALL' ? kycRecords : kycRecords.filter((k) => k.jurisdiction === selectedJurisdiction);
    const filteredKyb = selectedJurisdiction === 'ALL' ? kybRecords : kybRecords.filter((k) => k.jurisdiction === selectedJurisdiction);
    const filteredRestrictions = selectedJurisdiction === 'ALL' ? restrictions : restrictions.filter((r) => r.jurisdiction === selectedJurisdiction);

    const totalOpenCases = filteredCases.filter((c) => c.status === 'OPEN' || c.status === 'UNDER_REVIEW' || c.status === 'ESCALATED').length;
    const totalAmlAlerts = filteredAml.filter((a) => a.status === 'NEW' || a.status === 'INVESTIGATING').length;
    const totalSanctionsAlerts = filteredSanctions.filter((s) => s.status === 'POTENTIAL_MATCH' || s.status === 'CONFIRMED_MATCH').length;
    const pendingKycKyb = filteredKyc.filter((k) => k.status === 'PENDING' || k.status === 'IN_REVIEW').length +
      filteredKyb.filter((k) => k.status === 'PENDING' || k.status === 'IN_REVIEW').length;
    const activeRestrictions = filteredRestrictions.filter((r) => r.status === 'ACTIVE' || r.status === 'PENDING_MAKER_CHECKER').length;
    const overdueDeadlines = calendarEvents.filter((ev) => ev.status === 'OVERDUE').length;
    const highRiskEntitiesCount = filteredKyc.filter((k) => k.riskRating === 'HIGH' || k.riskRating === 'CRITICAL').length +
      filteredKyb.filter((k) => k.riskRating === 'HIGH' || k.riskRating === 'CRITICAL').length;

    return {
      totalOpenCases,
      totalAmlAlerts,
      totalSanctionsAlerts,
      pendingKycKyb,
      activeRestrictions,
      overdueDeadlines,
      highRiskEntitiesCount,
    };
  }, [cases, amlAlerts, sanctionsAlerts, kycRecords, kybRecords, restrictions, calendarEvents, selectedJurisdiction]);

  return (
    <ComplianceContext.Provider
      value={{
        locale,
        setLocale,
        t,
        selectedJurisdiction,
        setSelectedJurisdiction,
        currentOfficer,
        setCurrentOfficer,
        officers,
        kycRecords,
        kybRecords,
        amlAlerts,
        sanctionsAlerts,
        cases,
        restrictions,
        telemetry,
        regulatoryReports,
        policies,
        calendarEvents,
        auditLogs,
        updateKycStatus,
        updateKybStatus,
        updateAmlAlertStatus,
        convertAmlAlertToCase,
        updateSanctionsAlertStatus,
        createCase,
        updateCaseStatus,
        addCaseTimelineEntry,
        addCaseEvidence,
        addCaseNote,
        applyAccountRestriction,
        approveAccountRestriction,
        liftAccountRestriction,
        submitRegulatoryReport,
        acknowledgeCalendarEvent,
        formatCurrency,
        formatDate,
        stats,
      }}
    >
      {children}
    </ComplianceContext.Provider>
  );
};

export const useCompliance = (): ComplianceContextType => {
  const context = useContext(ComplianceContext);
  if (!context) {
    throw new Error('useCompliance must be used within a ComplianceProvider');
  }
  return context;
};
