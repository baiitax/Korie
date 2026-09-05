/**
 * Demo store — the mutable half of the demonstration dataset.
 *
 * A visual demo has to behave like a system: an analyst should be able to
 * dispose an alert, watch the queue shrink and see the action appear in the
 * audit list. That only works if the demo data is stateful, so the state lives
 * here, in one file, with two hard rules:
 *
 *   1. it is only reachable when demo mode is enabled (`demoEnabled`), and
 *   2. every mutation appends a demo audit row and is reported back to the UI
 *      as `recorded: false`, so no screen can say "saved" about it.
 *
 * Reload the page and it resets. That is deliberate and is stated in the
 * Settings screen too — a demo that silently persisted half-written decisions
 * would be the worst of both worlds.
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
  SanctionsAlert,
} from '@/types/compliance';
import {
  DEMO_AUDIT_LOGS,
  DEMO_CALENDAR,
  DEMO_KYC_RECORDS,
  DEMO_KYB_RECORDS,
  DEMO_OFFICERS,
  DEMO_POLICIES,
  DEMO_REPORTS,
  DEMO_RESTRICTIONS,
  DEMO_SANCTIONS_ALERTS,
} from './fixtures';

export interface DemoState {
  kyc: KycVerificationRecord[];
  kyb: KybVerificationRecord[];
  sanctions: SanctionsAlert[];
  restrictions: AccountRestriction[];
  reports: RegulatoryReport[];
  policies: CompliancePolicy[];
  calendar: ComplianceCalendarEvent[];
  audit: ComplianceAuditEntry[];
  officers: ComplianceOfficer[];
}

function clone<T>(value: T): T {
  return typeof structuredClone === 'function'
    ? structuredClone(value)
    : (JSON.parse(JSON.stringify(value)) as T);
}

function initial(): DemoState {
  return {
    kyc: clone(DEMO_KYC_RECORDS),
    kyb: clone(DEMO_KYB_RECORDS),
    sanctions: clone(DEMO_SANCTIONS_ALERTS),
    restrictions: clone(DEMO_RESTRICTIONS),
    reports: clone(DEMO_REPORTS),
    policies: clone(DEMO_POLICIES),
    calendar: clone(DEMO_CALENDAR),
    audit: clone(DEMO_AUDIT_LOGS),
    officers: clone(DEMO_OFFICERS),
  };
}

let state: DemoState = initial();
let version = 0;
const listeners = new Set<() => void>();

function bump() {
  version += 1;
  listeners.forEach((l) => l());
}

export function getDemoVersion(): number {
  return version;
}

export function subscribeDemo(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function readDemo<T>(select: (s: DemoState) => T[]): { rows: T[]; version: number } {
  return { rows: select(state), version };
}

/**
 * Apply a demo mutation and record it in the demo audit list.
 * `recorded` is false by construction: nothing reached a real system.
 */
export function applyDemoMutation<T>(opts: {
  mutate: (s: DemoState) => T;
  action: string;
  entityType: string;
  entityId: string;
  officerName: string;
  details: string;
}): { value: T; recorded: false } {
  const value = opts.mutate(state);
  const entry: ComplianceAuditEntry = {
    id: `aud-demo-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    officerId: 'demo-actor',
    officerName: opts.officerName,
    officerRole: 'COMPLIANCE_OFFICER',
    action: opts.action,
    entityType: opts.entityType,
    entityId: opts.entityId,
    details: opts.details,
    jurisdiction: 'NG',
  };
  state.audit = [entry, ...state.audit];
  bump();
  return { value, recorded: false };
}

export function resetDemo(): void {
  state = initial();
  bump();
}
