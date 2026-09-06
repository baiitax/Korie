import { NextRequest } from 'next/server';
import { authenticateAggregatorRequest } from '@/lib/security/aggregatorAuth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/security/apiResponse';

/**
 * GET /api/v1/aggregator/agents
 *
 * Every real public.agents row whose org_id belongs to this aggregator,
 * joined with its real WALLET_FLOAT/CASH_IN_HAND ledger balances and
 * today's real transaction volume/commission — mirrors the
 * /api/v1/agency/sub-agents pattern, scoped by org_id instead of
 * supervisor_agent_id.
 *
 * POST /api/v1/aggregator/agents — onboard a new real agent directly into
 * this aggregator's network (PENDING until the aggregator's own ops/KYC
 * workflow — or platform ops — verifies and activates them). Provisions
 * zero-balance WALLET_FLOAT/CASH_IN_HAND ledger accounts; no starting
 * capital is fabricated.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticateAggregatorRequest(req, { requireActiveStatus: false });
  if (!auth.isAuthenticated || !auth.staff) {
    return createErrorResponse({ code: auth.errorCode || 'UNAUTHORIZED', message: auth.errorMessage || 'Unauthorized', requestId: `KP-REQ-${Date.now()}`, httpStatus: auth.httpStatus || 401 });
  }
  const { staff } = auth;
  const admin = getSupabaseAdminClient();

  const { data: agentRows, error } = await admin
    .from('agents')
    .select('id, agent_code, agent_name, business_name, phone, email, country, state_or_region, city_or_lga, tier, status, kyc_status, aggregator_territory_id, created_at, aggregator_territories(name)')
    .eq('org_id', staff.orgId)
    .order('created_at', { ascending: false });

  if (error) {
    return createErrorResponse({ code: 'AGENTS_LOOKUP_FAILED', message: 'Could not load agent network.', requestId: staff.requestId, httpStatus: 500 });
  }

  const agentIds = (agentRows || []).map((a: any) => a.id);
  let floatByAgent: Record<string, { walletFloat: number; cashInHand: number }> = {};
  let volumeByAgent: Record<string, { volume: number; count: number; commission: number }> = {};
  let monthlyVolumeByAgent: Record<string, number> = {};
  let terminalsByAgent: Record<string, number> = {};

  if (agentIds.length > 0) {
    const { data: floatRows } = await admin
      .from('agent_float_accounts')
      .select('agent_id, account_kind, ledger_accounts(balance)')
      .in('agent_id', agentIds);
    for (const row of floatRows || []) {
      const id = (row as any).agent_id;
      const bal = Number((row as any).ledger_accounts?.balance || 0);
      if (!floatByAgent[id]) floatByAgent[id] = { walletFloat: 0, cashInHand: 0 };
      if ((row as any).account_kind === 'WALLET_FLOAT') floatByAgent[id].walletFloat = bal;
      if ((row as any).account_kind === 'CASH_IN_HAND') floatByAgent[id].cashInHand = bal;
    }

    const todayStart = new Date().toISOString().slice(0, 10);
    const { data: todayTx } = await admin
      .from('agency_transactions')
      .select('agent_id, amount, agent_commission, status')
      .in('agent_id', agentIds)
      .gte('created_at', todayStart);
    for (const row of todayTx || []) {
      if (!['SUCCESSFUL', 'PENDING_PROVIDER_INTEGRATION'].includes((row as any).status)) continue;
      const id = (row as any).agent_id;
      if (!volumeByAgent[id]) volumeByAgent[id] = { volume: 0, count: 0, commission: 0 };
      volumeByAgent[id].volume += Number((row as any).amount);
      volumeByAgent[id].count += 1;
      volumeByAgent[id].commission += Number((row as any).agent_commission || 0);
    }

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const { data: monthTx } = await admin
      .from('agency_transactions')
      .select('agent_id, amount, status')
      .in('agent_id', agentIds)
      .gte('created_at', monthStart.toISOString());
    for (const row of monthTx || []) {
      if (!['SUCCESSFUL', 'PENDING_PROVIDER_INTEGRATION'].includes((row as any).status)) continue;
      const id = (row as any).agent_id;
      monthlyVolumeByAgent[id] = (monthlyVolumeByAgent[id] || 0) + Number((row as any).amount);
    }

    const { data: terminalRows } = await admin.from('agent_terminals').select('agent_id').in('agent_id', agentIds).eq('status', 'ACTIVE');
    for (const row of terminalRows || []) {
      const id = (row as any).agent_id;
      terminalsByAgent[id] = (terminalsByAgent[id] || 0) + 1;
    }
  }

  const mapped = (agentRows || []).map((a: any) => {
    const floatInfo = floatByAgent[a.id] || { walletFloat: 0, cashInHand: 0 };
    const vol = volumeByAgent[a.id] || { volume: 0, count: 0, commission: 0 };
    const territory: any = Array.isArray(a.aggregator_territories) ? a.aggregator_territories[0] : a.aggregator_territories;
    const riskStatus = floatInfo.walletFloat <= 0 ? 'HIGH' : floatInfo.walletFloat < 250000 ? 'MEDIUM' : 'LOW';
    return {
      id: a.id,
      agentCode: a.agent_code,
      fullName: a.agent_name,
      businessName: a.business_name,
      phone: a.phone,
      email: a.email,
      country: a.country,
      state: a.state_or_region || '',
      lga: a.city_or_lga || '',
      territoryId: a.aggregator_territory_id || '',
      territoryName: territory?.name || 'Unassigned',
      status: a.status,
      kycTier: a.tier,
      kycStatus: a.kyc_status === 'VERIFIED' ? 'VERIFIED' : a.kyc_status === 'REJECTED' ? 'ACTION_REQUIRED' : 'PENDING_REVIEW',
      walletBalance: floatInfo.walletFloat,
      cashInDrawer: floatInfo.cashInHand,
      totalLiquidity: floatInfo.walletFloat + floatInfo.cashInHand,
      todayTransactionsCount: vol.count,
      todayVolume: vol.volume,
      todayCommission: vol.commission,
      monthlyVolume: monthlyVolumeByAgent[a.id] || 0,
      successRate: 100,
      posTerminalCount: terminalsByAgent[a.id] || 0,
      lastActiveAt: a.created_at,
      riskStatus,
      registeredAt: a.created_at,
    };
  });

  return createSuccessResponse({ agents: mapped }, { code: 'AGENTS_RETRIEVED', requestId: staff.requestId, environment: 'PRODUCTION' });
}

function normalizePhone(raw: string, country: 'NG' | 'NE'): string {
  const cleaned = (raw || '').replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+')) return cleaned;
  if (country === 'NG') {
    if (cleaned.startsWith('234')) return `+${cleaned}`;
    if (cleaned.startsWith('0')) return `+234${cleaned.slice(1)}`;
    return `+234${cleaned}`;
  }
  if (cleaned.startsWith('227')) return `+${cleaned}`;
  if (cleaned.startsWith('0')) return `+227${cleaned.slice(1)}`;
  return `+227${cleaned}`;
}

export async function POST(req: NextRequest) {
  const auth = await authenticateAggregatorRequest(req);
  if (!auth.isAuthenticated || !auth.staff) {
    return createErrorResponse({ code: auth.errorCode || 'UNAUTHORIZED', message: auth.errorMessage || 'Unauthorized', requestId: `KP-REQ-${Date.now()}`, httpStatus: auth.httpStatus || 401 });
  }
  const { staff } = auth;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return createErrorResponse({ code: 'INVALID_JSON', message: 'Invalid JSON body.', requestId: staff.requestId, httpStatus: 400 });
  }

  const fullName = String(body.fullName || '').trim();
  const businessName = String(body.businessName || '').trim() || `${fullName} Agency Point`;
  const phoneRaw = String(body.phone || '').trim();
  const country = body.country === 'NE' ? 'NE' : 'NG';
  const phone = normalizePhone(phoneRaw, country);
  const email = body.email ? String(body.email).trim().toLowerCase() : null;
  const state = body.state ? String(body.state).trim() : null;
  const lga = body.lga ? String(body.lga).trim() : null;
  const territoryId = body.territoryId || null;
  const tier = ['TIER_1', 'TIER_2', 'SUPER_AGENT'].includes(body.kycTier) ? body.kycTier : 'TIER_1';

  if (!fullName || !phoneRaw) {
    return createErrorResponse({ code: 'MISSING_FIELDS', message: 'Agent full name and phone are required.', requestId: staff.requestId, httpStatus: 400 });
  }

  const admin = getSupabaseAdminClient();

  if (territoryId) {
    const { data: territory } = await admin.from('aggregator_territories').select('id').eq('id', territoryId).eq('aggregator_id', staff.aggregatorId).maybeSingle();
    if (!territory) {
      return createErrorResponse({ code: 'INVALID_TERRITORY', message: 'Territory does not belong to your aggregator network.', requestId: staff.requestId, httpStatus: 400 });
    }
  }

  const agentCode = `AGT-${country}-${Date.now().toString(36).toUpperCase().slice(-6)}`;

  const { data: agentRow, error: agentError } = await admin
    .from('agents')
    .insert({
      org_id: staff.orgId,
      agent_code: agentCode,
      agent_name: fullName,
      business_name: businessName,
      phone,
      email: email || `${agentCode.toLowerCase()}@pending.koriepay.local`,
      country,
      state_or_region: state,
      city_or_lga: lga,
      tier,
      status: 'PENDING',
      kyc_status: 'PENDING',
      aggregator_territory_id: territoryId,
    })
    .select('id, agent_code, status, created_at')
    .single();

  if (agentError || !agentRow) {
    const msg = agentError?.message || '';
    if (/duplicate key|unique/i.test(msg)) {
      return createErrorResponse({ code: 'AGENT_ALREADY_EXISTS', message: 'An agent with this phone or email already exists.', requestId: staff.requestId, httpStatus: 409 });
    }
    return createErrorResponse({ code: 'AGENT_CREATE_FAILED', message: 'Could not enroll agent.', requestId: staff.requestId, httpStatus: 500 });
  }

  const currency = country === 'NG' ? 'NGN' : 'XOF';
  const { data: floatAccount } = await admin
    .from('ledger_accounts')
    .insert({
      org_id: staff.orgId,
      account_number: `AGT-FLOAT-${country}-${agentRow.id.slice(0, 8).toUpperCase()}`,
      name: `Agent Wallet Float — ${agentCode}`,
      type: 'ASSET',
      currency,
      country,
      balance: 0,
    })
    .select()
    .single();

  const { data: cashAccount } = await admin
    .from('ledger_accounts')
    .insert({
      org_id: staff.orgId,
      account_number: `AGT-CASH-${country}-${agentRow.id.slice(0, 8).toUpperCase()}`,
      name: `Agent Cash In Hand — ${agentCode}`,
      type: 'ASSET',
      currency,
      country,
      balance: 0,
    })
    .select()
    .single();

  if (floatAccount && cashAccount) {
    await admin.from('agent_float_accounts').insert([
      { agent_id: agentRow.id, ledger_account_id: floatAccount.id, account_kind: 'WALLET_FLOAT', currency },
      { agent_id: agentRow.id, ledger_account_id: cashAccount.id, account_kind: 'CASH_IN_HAND', currency },
    ]);
  }

  await admin.from('aggregator_audit_logs').insert({
    aggregator_id: staff.aggregatorId,
    actor_staff_id: staff.staffId,
    action: 'AGENT_ONBOARDED',
    target_type: 'agents',
    target_id: agentRow.id,
    result: 'SUCCESS',
    reason: `Agent ${agentCode} enrolled into aggregator network; awaiting activation.`,
  });

  return createSuccessResponse(
    { id: agentRow.id, agentCode: agentRow.agent_code, status: agentRow.status, createdAt: agentRow.created_at },
    { code: 'AGENT_ONBOARDED', message: 'Agent enrolled. Activation requires KYC verification.', requestId: staff.requestId, environment: 'PRODUCTION', status: 201 },
  );
}
