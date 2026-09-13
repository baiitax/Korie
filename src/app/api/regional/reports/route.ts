import { NextRequest } from 'next/server';
import { authorizeRegionalRequest } from '@/lib/security/regionalManagerAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSuccessResponse } from '@/lib/security/apiResponse';

export const dynamic = 'force-dynamic';

/**
 * GET /api/regional/reports — the manager's export history from the
 * append-only audit table, plus the current rate-limit window usage.
 */
export async function GET(req: NextRequest) {
  const auth = await authorizeRegionalRequest(req, 'regional.reports.view');
  if (!auth.ok) return auth.response;
  const manager = auth.manager;
  const admin = getSupabaseAdminClient();

  const { data: exports } = await admin
    .from('regional_report_exports')
    .select('id, dataset, params, row_count, status, created_at')
    .eq('manager_id', manager.managerId)
    .order('created_at', { ascending: false })
    .limit(50);

  const { count: lastHour } = await admin
    .from('regional_report_exports')
    .select('id', { count: 'exact', head: true })
    .eq('manager_id', manager.managerId)
    .gte('created_at', new Date(Date.now() - 3600_000).toISOString());

  return createSuccessResponse(
    {
      exports: (exports ?? []).map((e: any) => ({
        id: e.id,
        dataset: e.dataset,
        params: e.params,
        rowCount: e.row_count,
        status: e.status,
        createdAt: e.created_at,
      })),
      rateLimit: { usedLastHour: lastHour ?? 0, maxPerHour: 10 },
    },
    { requestId: `KP-REQ-${Date.now()}`, environment: 'PRODUCTION' },
  );
}
