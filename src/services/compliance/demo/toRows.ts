/**
 * Demo record → portal row adapters.
 *
 * The fixtures reuse the record types the portal already had, so the row shapes
 * the tables render need a projection step. It lives here rather than inside a
 * page, because a page must not know which mode it is fed from — only the
 * envelope's `source` flag says that, and the badge component reads it.
 */

import type {
  AccountRestriction,
  ComplianceAuditEntry,
  ComplianceCalendarEvent,
  ComplianceOfficer,
  CompliancePolicy,
  KycVerificationRecord,
  KybVerificationRecord,
  RegulatoryReport,
} from '@/types/compliance';
import type {
  AuditRow,
  KycRow,
  KybRow,
  ObligationRow,
  OfficerRow,
  PolicyRow,
  ReportRow,
  RestrictionRow,
} from '../types';
import { daysSince } from '../normalizers';

export function restrictionToRow(r: AccountRestriction): RestrictionRow {
  return {
    id: r.id,
    subjectType: r.targetEntityType,
    subjectId: r.targetEntityId,
    subjectName: r.targetEntityName,
    type: r.restrictionType,
    reason: r.reason,
    status: r.status === 'ACTIVE' ? 'ACTIVE' : r.status,
    appliedAt: r.appliedAt,
    makerName: r.makerOfficerName,
    checkerName: r.checkerOfficerName,
    courtOrderReference: r.courtOrderReference,
  };
}

export function policyToRow(p: CompliancePolicy): PolicyRow {
  return {
    id: p.id,
    title: p.title,
    category: p.code.split('-').slice(0, 2).join('-') || 'POLICY',
    version: p.version,
    status: p.status,
    effectiveDate: p.effectiveDate,
    nextReviewDate: p.nextReviewDate,
    owner: p.approvedBy ?? p.ownerRole,
  };
}

export function auditToRow(a: ComplianceAuditEntry): AuditRow {
  return {
    id: a.id,
    action: a.action,
    actor: a.officerName || a.actor || a.officerId,
    entityType: a.entityType,
    entityId: a.entityId,
    at: a.timestamp,
    summary: a.details,
    // Demo rows are not part of the real hash chain — say so rather than implying they are.
    integrity: 'DEMO',
  };
}

export function officerToRow(o: ComplianceOfficer): OfficerRow {
  return {
    id: o.id,
    name: o.fullName,
    email: o.email,
    role: o.role,
    jurisdiction: o.jurisdiction,
    status: o.status,
    queueLoad: o.assignedCasesCount ?? o.activeCasesCount,
  };
}

export function calendarToObligation(c: ComplianceCalendarEvent): ObligationRow {
  return {
    id: c.id,
    title: c.title,
    regulator: c.regulator,
    dueDate: c.dueDate,
    status: c.status,
    owner: c.assignedTo,
  };
}

export function reportToRow(r: RegulatoryReport): ReportRow {
  return {
    id: r.id,
    reference: r.reportReference ?? r.id,
    reportType: r.reportType,
    regulator: r.regulator,
    period: r.reportingPeriod,
    dueDate: r.createdAt ?? '',
    status: r.filingStatus,
    submittedAt: r.submissionDate,
    acknowledgement: r.acknowledgementRef,
    recordCount: r.includedTransactionCount,
  };
}

export function kycRecordToRow(r: KycVerificationRecord): KycRow {
  return {
    id: r.id,
    identityReference: r.customerId,
    customerName: r.customerName,
    tier: r.tier,
    status: r.status,
    riskLevel: r.riskRating,
    countryCode: r.country ?? (r.jurisdiction === 'NE' ? 'NE' : 'NG'),
    submittedAt: r.submittedAt,
    updatedAt: r.updatedAt ?? r.submittedAt,
    ninMasked: r.maskedNin,
    bvnMasked: r.maskedBvn,
    documentCount: r.documents?.length ?? 0,
    verifiedDocumentCount: (r.documents ?? []).filter((d) => d.status === 'VERIFIED').length,
    oldestPendingDays: r.status === 'VERIFIED' ? undefined : daysSince(r.submittedAt),
    assignedOfficer: r.assignedOfficer ?? r.reviewOfficer,
  };
}

export function kybRecordToRow(r: KybVerificationRecord): KybRow {
  return {
    id: r.id,
    identityReference: r.merchantId,
    legalName: r.businessName,
    tradingName: r.tradingName,
    registrationNumber: r.registrationNumber,
    taxIdentifier: r.taxIdentificationNumber,
    businessType: r.businessType,
    countryCode: r.country ?? (r.jurisdiction === 'NE' ? 'NE' : 'NG'),
    kybStatus: r.status,
    entityStatus: r.status === 'VERIFIED' ? 'ACTIVE' : 'REVIEW_REQUIRED',
    riskLevel: r.riskRating,
    beneficialOwnersCount: r.beneficialOwners?.length ?? 0,
    updatedAt: r.updatedAt ?? r.submittedAt,
  };
}
