import { NextRequest } from 'next/server';
import { DisasterRecoveryEngine } from '@/lib/resilience/DisasterRecoveryEngine';
import { ApiResponse } from '@/lib/security/apiResponse';

export async function GET(req: NextRequest) {
  try {
    const incidents = DisasterRecoveryEngine.getAllIncidents();
    return ApiResponse.success({
      count: incidents.length,
      incidents,
    });
  } catch (err: any) {
    return ApiResponse.error(err.message, 'INCIDENTS_FETCH_ERROR', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { severity, title, impactedServices, incidentCommander, rootCause } = body;

    if (!title || !incidentCommander) {
      return ApiResponse.badRequest('title and incidentCommander are required to create an incident.');
    }

    const incident = DisasterRecoveryEngine.createIncident({
      severity: severity || 'SEV_2',
      title,
      impactedServices: impactedServices || ['PAYMENTS_CORE'],
      incidentCommander,
      rootCause,
    });

    return ApiResponse.created(incident, `Incident [${incident.incidentReference}] logged and dispatched to CMT.`);
  } catch (err: any) {
    return ApiResponse.error(err.message, 'INCIDENT_CREATION_ERROR', 400);
  }
}
