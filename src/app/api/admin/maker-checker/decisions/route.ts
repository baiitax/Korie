// Persists a manual maker-checker decision to the audit trail. The dual-control
// modal used to resolve in component state only; every decision now lands in the
// file-backed audit log (hub Audit tab, kind MAKER_CHECKER_DECISION).
// POST /api/admin/maker-checker/decisions
import { NextRequest, NextResponse } from 'next/server';
import { AdminConfigurationEngine } from '@/lib/admin/AdminConfigurationEngine';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const engine = AdminConfigurationEngine.getInstance();
  const gateway = engine.getGateway();
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const decision = body.decision as string;
    if (decision !== 'APPROVED' && decision !== 'REJECTED') {
      return NextResponse.json(gateway.createError('INVALID_DECISION', 'decision must be APPROVED or REJECTED.'), { status: 400 });
    }
    for (const field of ['requestId', 'actionType', 'resourceType', 'resourceId', 'requestedBy', 'reviewer']) {
      if (typeof body[field] !== 'string' || !(body[field] as string).trim()) {
        return NextResponse.json(gateway.createError('FIELD_REQUIRED', `${field} is required.`), { status: 400 });
      }
    }
    if (typeof body.executed !== 'boolean') {
      return NextResponse.json(gateway.createError('FIELD_REQUIRED', 'executed (boolean) is required — the audit must state whether anything changed.'), { status: 400 });
    }
    const entry = engine.recordMakerCheckerDecision({
      requestId: body.requestId as string,
      decision,
      actionType: body.actionType as string,
      resourceType: body.resourceType as string,
      resourceId: body.resourceId as string,
      resourceName: (body.resourceName as string) || (body.resourceId as string),
      requestedBy: body.requestedBy as string,
      reviewer: body.reviewer as string,
      reviewNotes: typeof body.reviewNotes === 'string' ? body.reviewNotes : undefined,
      executed: body.executed as boolean,
      executionCode: typeof body.executionCode === 'string' ? body.executionCode : undefined,
    });
    return NextResponse.json(gateway.createResponse({ auditId: entry.id, at: entry.at }));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Recording the decision failed';
    return NextResponse.json(gateway.createError('DECISION_RECORD_FAILED', message), { status: 500 });
  }
}
