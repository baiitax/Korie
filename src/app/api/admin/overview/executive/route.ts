// Executive home truth feed — every figure derived from engines that actually
// record it (see src/lib/admin/ExecutiveTruthService.ts). GAP-1 remediation.
// GET /api/admin/overview/executive?country=GLOBAL|NG|NE
import { NextRequest, NextResponse } from 'next/server';
import { ApiGatewayEngine } from '@/lib/gateway/ApiGatewayEngine';
import { ExecutiveTruthService, type TruthCountryFilter } from '@/lib/admin/ExecutiveTruthService';
import { adminApiGuard } from '@/lib/security/apiGuards';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const guard = await adminApiGuard(req, 'read');
  if (!guard.ok) return guard.response;
  const gateway = ApiGatewayEngine.getInstance();
  try {
    const raw = (new URL(req.url).searchParams.get('country') || 'GLOBAL').toUpperCase();
    const country: TruthCountryFilter = raw === 'NG' || raw === 'NE' ? raw : 'GLOBAL';
    const snapshot = ExecutiveTruthService.getSnapshot(country);
    return NextResponse.json(gateway.createResponse(snapshot));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Executive truth aggregation failed';
    return NextResponse.json(gateway.createError('EXECUTIVE_TRUTH_UNAVAILABLE', message), { status: 500 });
  }
}
