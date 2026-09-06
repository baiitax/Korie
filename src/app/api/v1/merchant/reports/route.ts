import { NextRequest } from 'next/server';
import { authenticateMerchantRequest } from '@/lib/security/merchantAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';

const REPORT_TYPES = ['DAILY_Z_REPORT', 'SETTLEMENT_STATEMENT', 'BRANCH_COMPARATIVE', 'TRANSACTION_LEDGER'];

/**
 * GET /api/v1/merchant/reports?type=...&format=csv
 *
 * Generates a real CSV export computed live from this merchant's own
 * merchant_payment_transactions / merchant_settlement_batches /
 * merchant_branches rows — replaces the old page that downloaded a fake
 * placeholder text blob with an invented "Status: Verified" line. Every
 * row in the export is a real database row; a freshly registered merchant
 * with no activity simply gets a header-only CSV, not fabricated figures.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticateMerchantRequest(req, { requireActiveStatus: false });
  if (!auth.isAuthenticated || !auth.staff) {
    return createErrorResponse({ code: auth.errorCode || 'UNAUTHORIZED', message: auth.errorMessage || 'Unauthorized', requestId: `KP-REQ-${Date.now()}`, httpStatus: auth.httpStatus || 401 });
  }
  const { staff } = auth;
  const admin = getSupabaseAdminClient();

  const url = new URL(req.url);
  const type = (url.searchParams.get('type') || 'TRANSACTION_LEDGER').toUpperCase();
  if (!REPORT_TYPES.includes(type)) {
    return createErrorResponse({ code: 'INVALID_REPORT_TYPE', message: 'Unsupported report type.', requestId: staff.requestId, httpStatus: 400 });
  }

  let rows: string[] = [];
  let filename = 'report.csv';

  if (type === 'DAILY_Z_REPORT') {
    const todayStart = new Date().toISOString().slice(0, 10);
    const { data } = await admin
      .from('merchant_payment_transactions')
      .select('reference, amount, fee, net_amount, currency, payment_method, channel, status, created_at')
      .eq('merchant_id', staff.merchantId)
      .gte('created_at', todayStart)
      .order('created_at', { ascending: true });
    rows.push('Reference,Amount,Fee,Net Amount,Currency,Payment Method,Channel,Status,Created At');
    for (const t of data || []) {
      rows.push([t.reference, t.amount, t.fee, t.net_amount, t.currency, t.payment_method, t.channel || '', t.status, t.created_at].join(','));
    }
    filename = `daily-z-report-${todayStart}.csv`;
  } else if (type === 'SETTLEMENT_STATEMENT') {
    const { data } = await admin
      .from('merchant_settlement_batches')
      .select('batch_reference, gross_amount, total_fees, refunds_deducted, net_amount, currency, bank_name, account_number, status, transaction_count, settled_at, created_at')
      .eq('merchant_id', staff.merchantId)
      .order('created_at', { ascending: false });
    rows.push('Batch Reference,Gross Amount,Total Fees,Refunds Deducted,Net Amount,Currency,Bank,Account Number,Status,Transaction Count,Settled At');
    for (const b of data || []) {
      rows.push([b.batch_reference, b.gross_amount, b.total_fees, b.refunds_deducted, b.net_amount, b.currency, b.bank_name || '', b.account_number || '', b.status, b.transaction_count, b.settled_at || ''].join(','));
    }
    filename = `settlement-statement-${Date.now()}.csv`;
  } else if (type === 'BRANCH_COMPARATIVE') {
    const { data: branches } = await admin
      .from('merchant_branches')
      .select('id, branch_name, city, state_or_region, status')
      .eq('merchant_id', staff.merchantId);
    const branchIds = (branches || []).map((b: any) => b.id);
    let salesByBranch: Record<string, { total: number; count: number }> = {};
    if (branchIds.length > 0) {
      const { data: txs } = await admin
        .from('merchant_payment_transactions')
        .select('branch_id, amount, status')
        .eq('merchant_id', staff.merchantId)
        .in('branch_id', branchIds);
      for (const t of txs || []) {
        if ((t as any).status !== 'SUCCESSFUL') continue;
        const key = (t as any).branch_id;
        if (!salesByBranch[key]) salesByBranch[key] = { total: 0, count: 0 };
        salesByBranch[key].total += Number((t as any).amount);
        salesByBranch[key].count += 1;
      }
    }
    rows.push('Branch Name,City,State/Region,Status,Total Sales,Transaction Count');
    for (const b of branches || []) {
      const s = salesByBranch[b.id] || { total: 0, count: 0 };
      rows.push([b.branch_name, b.city || '', b.state_or_region || '', b.status, s.total, s.count].join(','));
    }
    filename = `branch-comparative-${Date.now()}.csv`;
  } else {
    const { data } = await admin
      .from('merchant_payment_transactions')
      .select('reference, customer_name, amount, fee, net_amount, currency, status, created_at, settled_at')
      .eq('merchant_id', staff.merchantId)
      .order('created_at', { ascending: false })
      .limit(1000);
    rows.push('Reference,Customer,Amount,Fee,Net Amount,Currency,Status,Created At,Settled At');
    for (const t of data || []) {
      rows.push([t.reference, t.customer_name || '', t.amount, t.fee, t.net_amount, t.currency, t.status, t.created_at, t.settled_at || ''].join(','));
    }
    filename = `transaction-ledger-${Date.now()}.csv`;
  }

  const csv = rows.join('\n');

  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'X-Request-Id': staff.requestId,
    },
  });
}
