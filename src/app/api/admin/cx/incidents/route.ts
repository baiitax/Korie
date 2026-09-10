// =============================================================================
// Prevention loop — systemic customer-harm incidents.
//
// GAP-2: the CX loop ends at "prevent", and the only thing that can hold a
// prevention action is a CustomerHarmIncidentEngine record. This route turns a
// recurring-harm cluster (category × agent/terminal that keeps repeating) into
// that record, and moves it through the engine's real status machine.
//
//   POST   /api/admin/cx/incidents   raise an incident from a cluster
//   PATCH  /api/admin/cx/incidents   transition status / attach root cause
//
// Nothing is pre-filled from a template: the counts and exposure on the
// incident come from the caller's cluster, which came from the complaint book.
// =============================================================================

import { NextResponse } from 'next/server';
import { ApiGatewayEngine } from '@/lib/gateway/ApiGatewayEngine';
import { CustomerHarmIncidentEngine } from '@/lib/consumer/CustomerHarmIncidentEngine';
import { ComplaintDisputeEngine } from '@/lib/complaints/ComplaintDisputeEngine';

export const dynamic = 'force-dynamic';

const SEVERITIES = ['SEV_1_CRITICAL', 'SEV_2_HIGH', 'SEV_3_MODERATE'] as const;
const STATUSES = ['OPEN', 'INVESTIGATING', 'MITIGATED', 'REMEDIATING', 'RESOLVED', 'POSTMORTEM_PUBLISHED'] as const;

type Severity = (typeof SEVERITIES)[number];
type IncidentStatus = (typeof STATUSES)[number];

export async function POST(request: Request) {
  const gateway = ApiGatewayEngine.getInstance();
  try {
    const body = await request.json().catch(() => ({}));

    const clusterKey = String(body.clusterKey || '').trim();
    const severity = String(body.severity || 'SEV_3_MODERATE').toUpperCase() as Severity;
    const rootCause = body.rootCause ? String(body.rootCause).slice(0, 1000) : undefined;
    const remediationPlan = body.remediationPlan ? String(body.remediationPlan).slice(0, 1000) : undefined;
    const actor = String(body.actor || '').trim();

    if (!SEVERITIES.includes(severity)) {
      return NextResponse.json(gateway.createError('INVALID_SEVERITY', `severity must be one of ${SEVERITIES.join(', ')}`), { status: 400 });
    }
    if (!actor.includes('@')) {
      return NextResponse.json(gateway.createError('ACTOR_REQUIRED', 'An operator email is required — incidents are attributable records.'), { status: 400 });
    }
    const [category, scopeValue] = clusterKey.split('::');
    if (!category || !scopeValue) {
      return NextResponse.json(
        gateway.createError('CLUSTER_KEY_REQUIRED', 'clusterKey must be "<CATEGORY>::<agentId|terminalId|country>".'),
        { status: 400 },
      );
    }

    // Re-derive the cluster from the complaint book rather than trusting the
    // client's numbers: the incident must describe what the engine holds.
    const cases = ComplaintDisputeEngine.getInstance()
      .getComplaints()
      .filter((c) => c.category === category && (c.agentId || c.terminalId || c.country) === scopeValue);

    if (cases.length < 2) {
      return NextResponse.json(
        gateway.createError('CLUSTER_NOT_REPEATING', `Only ${cases.length} case(s) match ${clusterKey}; prevention incidents require a repeat pattern.`),
        { status: 409 },
      );
    }

    const currency = cases[0].currency;
    const openCases = cases.filter((c) => c.status !== 'RESOLVED' && c.status !== 'CLOSED');
    const distinctCustomers = new Set(cases.map((c) => c.customerId)).size;
    const exposure = cases.reduce((a, c) => a + (c.disputedAmount || 0), 0);
    const agentId = cases[0].agentId;

    const incident = CustomerHarmIncidentEngine.getInstance().createIncident({
      title: `${category.replace(/_/g, ' ')} repeat pattern — ${scopeValue} (${cases.length} cases)`,
      severity,
      affectedProvider: undefined,
      affectedCorridor: agentId ? `AGENT_${agentId}` : `SCOPE_${scopeValue}`,
      affectedCustomersCount: distinctCustomers,
      affectedAgentsCount: agentId ? 1 : 0,
      totalFinancialExposure: exposure,
      currency,
      rootCause: rootCause || undefined,
      remediationPlan: remediationPlan || undefined,
      regulatoryNotified: false,
      startedAt: cases[cases.length - 1]?.createdAt || new Date().toISOString(),
    });

    return NextResponse.json({
      ...gateway.createResponse({
        incident,
        cluster: {
          key: clusterKey,
          cases: cases.length,
          openCases: openCases.length,
          distinctCustomers,
          exposure,
          currency,
          references: cases.map((c) => c.complaintReference),
        },
        raisedBy: actor,
      }),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Incident creation failed';
    return NextResponse.json(gateway.createError('INCIDENT_CREATE_FAILED', message), { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const gateway = ApiGatewayEngine.getInstance();
  try {
    const body = await request.json().catch(() => ({}));
    const incidentId = String(body.incidentId || '').trim();
    const status = String(body.status || '').toUpperCase() as IncidentStatus;
    const actor = String(body.actor || '').trim();

    if (!incidentId) {
      return NextResponse.json(gateway.createError('INCIDENT_ID_REQUIRED', 'incidentId is required.'), { status: 400 });
    }
    if (!STATUSES.includes(status)) {
      return NextResponse.json(gateway.createError('INVALID_STATUS', `status must be one of ${STATUSES.join(', ')}`), { status: 400 });
    }
    if (!actor.includes('@')) {
      return NextResponse.json(gateway.createError('ACTOR_REQUIRED', 'An operator email is required for a status change.'), { status: 400 });
    }

    const result = CustomerHarmIncidentEngine.getInstance().updateIncidentStatus({
      incidentId,
      status,
      rootCause: body.rootCause ? String(body.rootCause).slice(0, 1000) : undefined,
      remediationPlan: body.remediationPlan ? String(body.remediationPlan).slice(0, 1000) : undefined,
    });

    if (!result.success) {
      return NextResponse.json(gateway.createError('INCIDENT_NOT_FOUND', result.error || 'INCIDENT_NOT_FOUND'), { status: 404 });
    }
    return NextResponse.json(gateway.createResponse({ incident: result.incident, changedBy: actor }));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Incident update failed';
    return NextResponse.json(gateway.createError('INCIDENT_UPDATE_FAILED', message), { status: 500 });
  }
}
