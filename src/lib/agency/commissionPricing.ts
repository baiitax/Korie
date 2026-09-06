import { SupabaseClient } from '@supabase/supabase-js';

export interface CommissionQuote {
  customerFee: number;
  agentCommission: number;
  rateId: string;
}

/**
 * Computes the authoritative customer fee + agent commission for a given
 * agency transaction by reading the server-side public.agent_commission_rates
 * table. The UI must never hardcode or independently calculate this figure —
 * it only ever displays what this function (called from a trusted API route)
 * returns.
 */
export async function quoteAgencyCommission(
  admin: SupabaseClient,
  params: { transactionType: 'CASH_IN' | 'CASH_OUT'; currency: 'NGN' | 'XOF'; amount: number }
): Promise<CommissionQuote> {
  const { transactionType, currency, amount } = params;

  const { data: rates, error } = await admin
    .from('agent_commission_rates')
    .select('*')
    .eq('transaction_type', transactionType)
    .eq('currency', currency)
    .eq('is_active', true)
    .lte('min_amount', amount)
    .order('min_amount', { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(`COMMISSION_RATE_LOOKUP_FAILED: ${error.message}`);
  }

  const rate = rates?.[0];
  if (!rate) {
    throw new Error('NO_ACTIVE_COMMISSION_RATE');
  }

  if (rate.max_amount !== null && rate.max_amount !== undefined && amount > Number(rate.max_amount)) {
    throw new Error('AMOUNT_EXCEEDS_RATE_BAND');
  }

  const customerFee =
    Number(rate.customer_fee_flat) + (amount * Number(rate.customer_fee_bps)) / 10000;
  const agentCommission =
    Number(rate.agent_commission_flat) + (amount * Number(rate.agent_commission_bps)) / 10000;

  return {
    customerFee: Math.round(customerFee * 100) / 100,
    agentCommission: Math.round(agentCommission * 100) / 100,
    rateId: rate.id,
  };
}
