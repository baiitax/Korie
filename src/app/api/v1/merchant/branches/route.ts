import { NextRequest } from 'next/server';
import { authenticateMerchantRequest } from '@/lib/security/merchantAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';

export async function GET(req: NextRequest) {
  const auth = await authenticateMerchantRequest(req, { requireActiveStatus: false });
  if (!auth.isAuthenticated || !auth.staff) {
    return createErrorResponse({ code: auth.errorCode || 'UNAUTHORIZED', message: auth.errorMessage || 'Unauthorized', requestId: `KP-REQ-${Date.now()}`, httpStatus: auth.httpStatus || 401 });
  }
  const { staff } = auth;
  const admin = getSupabaseAdminClient();

  const { data, error } = await admin
    .from('merchant_branches')
    .select('*')
    .eq('merchant_id', staff.merchantId)
    .order('created_at', { ascending: true });

  if (error) {
    return createErrorResponse({ code: 'BRANCHES_LOOKUP_FAILED', message: 'Could not load branches.', requestId: staff.requestId, httpStatus: 500 });
  }

  const { data: terminalCountData } = await admin.rpc('count_merchant_active_terminals', { p_merchant_id: staff.merchantId });
  const totalActiveTerminals = Number(terminalCountData || 0);

  const branchIds = (data || []).map((b: any) => b.id);
  let salesByBranch: Record<string, { total: number; count: number }> = {};
  if (branchIds.length > 0) {
    const todayStart = new Date().toISOString().slice(0, 10);
    const { data: txs } = await admin
      .from('merchant_payment_transactions')
      .select('branch_id, amount')
      .eq('merchant_id', staff.merchantId)
      .in('branch_id', branchIds)
      .gte('created_at', todayStart)
      .in('status', ['SUCCESSFUL', 'PENDING_PROVIDER_INTEGRATION', 'PROCESSING']);
    for (const t of txs || []) {
      const key = (t as any).branch_id;
      if (!salesByBranch[key]) salesByBranch[key] = { total: 0, count: 0 };
      salesByBranch[key].total += Number((t as any).amount);
      salesByBranch[key].count += 1;
    }
  }

  const mapped = (data || []).map((b: any) => ({
    id: b.id,
    branchName: b.branch_name,
    branchCode: b.branch_code,
    address: b.address,
    city: b.city,
    stateOrRegion: b.state_or_region,
    country: b.country,
    managerName: b.manager_name,
    virtualNuban: b.virtual_nuban,
    todayGrossSales: salesByBranch[b.id]?.total || 0,
    todayTransactionsCount: salesByBranch[b.id]?.count || 0,
    status: b.status,
  }));

  // Real merchant-wide active terminal count from public.terminals
  // (assigned_merchant_id). The terminals/terminal_assignments schema has
  // no branch_id column, so a genuine per-branch breakdown is not
  // possible today — this total is reported once at the business level
  // rather than fabricating a per-branch split.
  return createSuccessResponse(
    { branches: mapped, totalActiveTerminals },
    { code: 'BRANCHES_RETRIEVED', requestId: staff.requestId, environment: 'PRODUCTION' },
  );
}
