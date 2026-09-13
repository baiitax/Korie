// Customer-experience truth snapshot — the measurement layer of the CX loop.
// GAP-2 remediation: complaint/SLA/redress/dispute/refund/incident engines and
// the CSAT capture path, read coherently in one payload.
// GET /api/admin/cx/overview?country=GLOBAL|NG|NE
import { NextRequest, NextResponse } from 'next/server';
import { ApiGatewayEngine } from '@/lib/gateway/ApiGatewayEngine';
import { CxTruthService, type CxCountryFilter } from '@/lib/admin/CxTruthService';
import { adminApiGuard } from '@/lib/security/apiGuards';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const guard = await adminApiGuard(req, 'read');
  if (!guard.ok) return guard.response;
  const gateway = ApiGatewayEngine.getInstance();
  try {
    const raw = (new URL(req.url).searchParams.get('country') || 'GLOBAL').toUpperCase();
    const country: CxCountryFilter = raw === 'NG' || raw === 'NE' ? raw : 'GLOBAL';
    const snapshot = CxTruthService.getSnapshot(country);
    return NextResponse.json(gateway.createResponse(snapshot));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'CX truth aggregation failed';
    return NextResponse.json(gateway.createError('CX_TRUTH_UNAVAILABLE', message), { status: 500 });
  }
}
