import { NextRequest } from 'next/server';
import { authenticateMerchantRequest } from '@/lib/security/merchantAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';

/**
 * GET /api/v1/merchant/me
 *
 * Returns the authenticated merchant business's own real profile + live
 * settlement ledger balance — the single source of truth replacing the
 * CURRENT_MERCHANT fixture. availableBalance/pendingSettlement/gross sales
 * are computed from real rows; nothing here is fabricated. A freshly
 * self-registered, unverified merchant simply has zero balances and zero
 * counts until real payment activity and settlement runs occur.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticateMerchantRequest(req, { requireActiveStatus: false });
  if (!auth.isAuthenticated || !auth.staff) {
    return createErrorResponse({ code: auth.errorCode || 'UNAUTHORIZED', message: auth.errorMessage || 'Unauthorized', requestId: `KP-REQ-${Date.now()}`, httpStatus: auth.httpStatus || 401 });
  }
  const { staff } = auth;
  const admin = getSupabaseAdminClient();

  const { data: merchant, error } = await admin
    .from('merchant_profiles')
    .select('id, merchant_code, business_name, trading_name, cac_number, tin_number, email, phone, country, currency, category, tier, status, kyb_status, settlement_bank, settlement_account_number, settlement_ledger_account_id, registered_address, registered_city, registered_state, created_at, ledger_accounts(balance)')
    .eq('id', staff.merchantId)
    .single();

  if (error || !merchant) {
    return createErrorResponse({ code: 'MERCHANT_PROFILE_LOOKUP_FAILED', message: 'Could not load business profile.', requestId: staff.requestId, httpStatus: 500 });
  }

  const ledgerRel: any = merchant.ledger_accounts;
  const availableBalance = Number((Array.isArray(ledgerRel) ? ledgerRel[0]?.balance : ledgerRel?.balance) ?? 0);

  const { count: branchesCount } = await admin
    .from('merchant_branches')
    .select('id', { count: 'exact', head: true })
    .eq('merchant_id', staff.merchantId);

  const todayStart = new Date().toISOString().slice(0, 10);
  const { data: todayTx } = await admin
    .from('merchant_payment_transactions')
    .select('amount, status')
    .eq('merchant_id', staff.merchantId)
    .gte('created_at', todayStart);

  const totalGrossSalesToday = (todayTx || [])
    .filter((t: any) => ['SUCCESSFUL', 'PENDING_PROVIDER_INTEGRATION', 'PROCESSING'].includes(t.status))
    .reduce((sum: number, t: any) => sum + Number(t.amount), 0);

  const { data: pendingSettlementBatches } = await admin
    .from('merchant_settlement_batches')
    .select('net_amount')
    .eq('merchant_id', staff.merchantId)
    .in('status', ['SCHEDULED', 'PROCESSING']);

  const pendingSettlement = (pendingSettlementBatches || []).reduce((sum: number, b: any) => sum + Number(b.net_amount), 0);

  const { count: allTxCount } = await admin
    .from('merchant_payment_transactions')
    .select('id', { count: 'exact', head: true })
    .eq('merchant_id', staff.merchantId);

  return createSuccessResponse(
    {
      id: merchant.id,
      merchantCode: merchant.merchant_code,
      businessName: merchant.business_name,
      tradingName: merchant.trading_name,
      cacNumber: merchant.cac_number,
      tinNumber: merchant.tin_number,
      email: merchant.email,
      phone: merchant.phone,
      country: merchant.country,
      currency: merchant.currency,
      category: merchant.category,
      tier: merchant.tier,
      status: merchant.status,
      kybStatus: merchant.kyb_status,
      settlementBank: merchant.settlement_bank,
      settlementAccountMasked: merchant.settlement_account_number ? `****${String(merchant.settlement_account_number).slice(-4)}` : null,
      registeredAddress: merchant.registered_address,
      registeredCity: merchant.registered_city,
      registeredState: merchant.registered_state,
      availableBalance,
      pendingSettlement,
      totalGrossSalesToday,
      totalGrossVolume: availableBalance + pendingSettlement,
      branchesCount: branchesCount || 0,
      totalTransactionsCount: allTxCount || 0,
      createdAt: merchant.created_at,
      staffRole: staff.role,
    },
    { code: 'MERCHANT_PROFILE_RETRIEVED', requestId: staff.requestId, environment: 'PRODUCTION' }
  );
}
