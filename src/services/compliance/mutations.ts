/**
 * Compliance actions — the only way the portal writes anything.
 *
 * The rule this file enforces: a success message requires a server that said
 * yes. Four actions are wired to real engines today (alert disposition,
 * alert→case conversion, case note, case decision) and they are the only ones
 * a live build offers. Everything else either does not exist yet, or — in a
 * demo build — mutates the demo store and comes back `recorded: false`, which
 * the UI renders as "Demo only · not recorded" instead of a green tick.
 */

import { complianceFetch } from '@/lib/compliancePortalClient';
import { LIVE_ACTIONS } from './endpoints';
import { clearComplianceCache, demoAllowed } from './service';
import { applyDemoMutation } from './demo/store';
import type { ComplianceMutationResult } from './types';
import { camelRow, mapAlert, mapApproval, mapCase, mapDecision, mapEscalation } from './normalizers';
import type { MonitoringRow } from './types';
import type { AlertRow, ApprovalRow, CaseRow, EscalationRow } from './types';

export type LiveActionKey = keyof typeof LIVE_ACTIONS;

function clearComplianceCacheAfterWrite() {
  clearComplianceCache();
}

function newIdempotencyKey(scope: string): string {
  return `${scope}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

async function post(
  path: string,
  body: Record<string, unknown>,
): Promise<{ ok: boolean; status: number; payload: any; requestId?: string }> {
  try {
    const res = await complianceFetch(path, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Idempotency-Key': newIdempotencyKey('cmp') },
    });
    let payload: any = null;
    try {
      payload = await res.json();
    } catch {
      payload = null;
    }
    return { ok: res.ok && payload?.success !== false && payload?.status !== 'error', status: res.status, payload, requestId: payload?.meta?.request_id };
  } catch {
    return { ok: false, status: 0, payload: null };
  }
}

async function patch(
  path: string,
  body: Record<string, unknown>,
): Promise<{ ok: boolean; status: number; payload: any; requestId?: string }> {
  try {
    const res = await complianceFetch(path, {
      method: 'PATCH',
      body: JSON.stringify(body),
      headers: { 'Idempotency-Key': newIdempotencyKey('cmp') },
    });
    let payload: any = null;
    try {
      payload = await res.json();
    } catch {
      payload = null;
    }
    return { ok: res.ok && payload?.success !== false && payload?.status !== 'error', status: res.status, payload, requestId: payload?.meta?.request_id };
  } catch {
    return { ok: false, status: 0, payload: null };
  }
}

/**
 * Run a wired action against the audited compliance API.
 * `id` is the alert/case id — never a client-computed reference.
 *
 * `patch` actions update registry-whitelisted columns on one record; the
 * server stamps actor identity and writes an audit_events row. `post` actions
 * are the workflow transitions (alert→case conversion, case note) whose
 * endpoints do more than update a column.
 */
export async function runLiveAction<K extends LiveActionKey>(
  key: K,
  id: string,
  body: Record<string, unknown>,
): Promise<ComplianceMutationResult<AlertRow | CaseRow>> {
  const spec = LIVE_ACTIONS[key];
  let res: { ok: boolean; status: number; payload: any; requestId?: string };
  try {
    const response =
      spec.kind === 'patch'
        ? await complianceFetch(`${spec.path}/${encodeURIComponent(id)}`, {
            method: 'PATCH',
            body: JSON.stringify(body),
            headers: { 'Idempotency-Key': newIdempotencyKey('cmp') },
          })
        : await complianceFetch(spec.path, {
            method: 'POST',
            body: JSON.stringify(
              key === 'alerts.convert'
                ? { alertId: id, rationale: body.rationale ?? body.investigatorEmail, priority: body.priority }
                : { caseId: id, content: body.content ?? body.note, noteType: body.noteType ?? (body.isConfidential ? 'CONFIDENTIAL' : 'INVESTIGATION') },
            ),
            headers: { 'Idempotency-Key': newIdempotencyKey('cmp') },
          });
    let payload: any = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
    res = { ok: response.ok && payload?.status !== 'error', status: response.status, payload, requestId: payload?.meta?.request_id };
  } catch {
    res = { ok: false, status: 0, payload: null };
  }
  // A write invalidates the read cache: an officer must not stare at a queue
  // that was refreshed for somebody else a second ago.
  clearComplianceCacheAfterWrite();

  if (!res.ok) {
    const errObj = res.payload?.error;
    const message =
      typeof errObj === 'string'
        ? errObj
        : typeof errObj?.message === 'string'
          ? errObj.message
          : res.status === 404
            ? 'The record is no longer in the database, so nothing was changed.'
            : 'The compliance service refused the request.';
    return {
      ok: false,
      recorded: false,
      source: 'live',
      error: {
        code: res.status === 401 || res.status === 403 ? 'UNAUTHORIZED' : `HTTP_${res.status || 'NETWORK'}`,
        message,
        hint:
          res.status === 401 || res.status === 403
            ? 'This action needs an officer account with the compliance write scope.'
            : 'Retry once; if it fails again, note the request id and raise an incident.',
      },
    };
  }

  const record = res.payload?.record ?? res.payload?.case ?? res.payload?.note ?? res.payload?.alert ?? res.payload?.data ?? res.payload;
  const value = key.startsWith('alerts') ? mapAlert(camelRow(record ?? {})) : mapCase(camelRow(record ?? {}));
  return { ok: true, recorded: true, source: 'live', value, error: undefined };
}

/**
 * Demo-mode workflow: update the in-memory store so the queue visibly changes,
 * and report it as unrecorded. `recorded: false` is the whole point — the UI
 * must not be able to mistake this for a write that reached a system.
 */
export function runDemoAction(input: {
  action: string;
  entityType: string;
  entityId: string;
  officerName: string;
  details: string;
  mutate: (s: import('./demo/store').DemoState) => unknown;
}): ComplianceMutationResult {
  if (!demoAllowed()) {
    return {
      ok: false,
      recorded: false,
      source: 'live',
      error: {
        code: 'ACTION_NOT_WIRED',
        message: 'This action has no compliance endpoint, so it cannot be performed.',
        hint: 'It is intentionally unavailable rather than simulated: a decision that no system recorded is worse than no decision.',
      },
    };
  }
  const { value } = applyDemoMutation({
    mutate: input.mutate,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    officerName: input.officerName,
    details: `${input.details} (demo action — not recorded)`,
  });
  return { ok: true, recorded: false, source: 'demo', value };
}

/**
 * Risk evaluation is a real engine call: it produces a decision record and a
 * hold, not a UI state change. The transaction reference and subject id are the
 * caller's inputs, while the amount is taken in minor units exactly as the
 * engine expects — the portal does not silently re-scale money.
 */
export async function runRiskEvaluation(body: {
  transactionReference: string;
  entityId: string;
  amountMinor: number;
  currency?: string;
  countryCode?: 'NG' | 'NE';
  entityType?: string;
  transactionType?: string;
}): Promise<ComplianceMutationResult<MonitoringRow>> {
  const res = await post('/api/compliance/actions/risk-evaluate', body);
  if (!res.ok) {
    return {
      ok: false,
      recorded: false,
      source: 'live',
      error: {
        code: res.payload?.code ? String(res.payload.code) : `HTTP_${res.status || 'NETWORK'}`,
        message:
          typeof res.payload?.message === 'string'
            ? res.payload.message
            : 'The risk engine did not return a decision.',
        hint: 'The evaluation needs a transaction reference, a subject id and an amount in minor units.',
      },
    };
  }
  const record = res.payload?.decision ?? res.payload?.data ?? res.payload;
  return { ok: true, recorded: true, source: 'live', value: mapDecision(camelRow(record ?? {})) };
}

/**
 * Approving a privileged-access request is a real dual-authorization write:
 * `PATCH /api/compliance/data/pam-requests/:id` flips the request to APPROVED,
 * stamps the checker from the verified session and writes an audit row with
 * before/after state. There is no reject endpoint in the deployment, so this
 * module deliberately offers no "deny" button — the request is declined out of
 * band, and the page says so rather than simulating a decision no system would
 * store.
 */
export async function approvePamRequest(id: string, checkerEmail: string): Promise<ComplianceMutationResult<ApprovalRow>> {
  // The checker is stamped from the verified session server-side; the
  // client-passed email is ignored by the API (kept in the signature for the
  // UI contract, which labels who is approving).
  void checkerEmail;
  const res = await patch(`/api/compliance/data/pam-requests/${encodeURIComponent(id)}`, { status: 'APPROVED' });
  clearComplianceCacheAfterWrite();
  if (!res.ok) {
    const code = typeof res.payload?.error === 'string' ? res.payload.error : `HTTP_${res.status || 'NETWORK'}`;
    return {
      ok: false,
      recorded: false,
      source: 'live',
      error: {
        code,
        message: code.startsWith('SEPARATION_OF_DUTIES')
          ? 'The compliance service rejected this: the requester cannot be the checker.'
          : code === 'REQUEST_NOT_FOUND'
            ? 'That request is no longer in the privileged-access register.'
            : 'The privileged-access service refused the approval.',
        hint:
          code.startsWith('SEPARATION_OF_DUTIES')
            ? 'Sign in as a different officer, or have the named checker approve it from their own session.'
            : 'Confirm the request id, then retry once.',
      },
    };
  }
  return { ok: true, recorded: true, source: 'live', value: mapApproval(camelRow(res.payload?.record ?? res.payload?.request ?? res.payload?.data ?? {})) };
}

/** Screening is a real POST with a real engine result — and writes nothing. */
export async function runScreening(input: {
  name: string;
  jurisdiction: 'NG' | 'NE';
}): Promise<ComplianceMutationResult<any>> {
  const res = await post('/api/compliance/actions/screening', { name: input.name, jurisdiction: input.jurisdiction });
  clearComplianceCache();
  if (!res.ok) {
    return {
      ok: false,
      recorded: false,
      source: 'live',
      error: {
        code: `HTTP_${res.status || 'NETWORK'}`,
        message: typeof res.payload?.error === 'string' ? res.payload.error : 'The screening provider did not answer.',
      },
    };
  }
  return { ok: true, recorded: true, source: 'live', value: res.payload?.screening ?? res.payload?.data ?? res.payload };
}

/**
 * Move a customer escalation to its next regulatory status.
 *
 * This is the complaints engine's own transition
 * (`PATCH /api/complaints/:id { action: 'TRANSITION_STATUS' }`), so the SLA
 * clock, the assignment and the resolution timestamp are written by the engine,
 * not by this screen. Two things the caller must know, both true today:
 *
 * 1. the endpoint accepts `notes` but `ComplaintDisputeEngine.transitionStatus`
 *    does not persist them, so the portal sends none and tells the officer where
 *    the narrative belongs (the case file);
 * 2. financial compensation exists on the same route (`COMPENSATE`) but is not
 *    offered in this console: it trusts an amount typed into the request, and
 *    nothing on this side can verify that figure against a settlement source.
 */
export async function transitionEscalation(
  id: string,
  status: string,
  assignedToEmail?: string,
): Promise<ComplianceMutationResult<EscalationRow>> {
  let res: { ok: boolean; status: number; payload: any };
  try {
    const response = await complianceFetch(`/api/compliance/data/complaints/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, ...(assignedToEmail ? { assigned_to_email: assignedToEmail } : {}) }),
      headers: { 'Idempotency-Key': newIdempotencyKey('esc') },
    });
    let payload: any = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
    res = { ok: response.ok && payload?.success !== false && payload?.status !== 'error', status: response.status, payload };
  } catch {
    res = { ok: false, status: 0, payload: null };
  }
  clearComplianceCacheAfterWrite();

  if (!res.ok) {
    return {
      ok: false,
      recorded: false,
      source: 'live',
      error: {
        code: res.status === 404 ? 'COMPLAINT_NOT_FOUND' : `HTTP_${res.status || 'NETWORK'}`,
        message:
          typeof res.payload?.error === 'string' ? res.payload.error : 'The complaints service refused the transition.',
        hint: 'Refresh the queue: the record may have been closed by another officer.',
      },
    };
  }
  return { ok: true, recorded: true, source: 'live', value: mapEscalation(camelRow(res.payload?.record ?? res.payload?.complaint ?? res.payload?.data ?? {})) };
}
