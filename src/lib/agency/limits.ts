import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Resolves the effective per-agent transaction limits: an active
 * agent_limit_overrides row (if any and not expired) takes precedence over
 * the agent's own agents.daily_cash_limit/single_transaction_limit, which in
 * turn were provisioned from agent_tier_limit_policies at onboarding time.
 * This function is the single source of truth the API layer consults before
 * allowing any financial mutation — the frontend never decides this itself.
 */
export interface EffectiveLimits {
  dailyCashLimit: number;
  singleTransactionLimit: number;
}

export async function getEffectiveLimits(
  admin: SupabaseClient,
  agentId: string
): Promise<EffectiveLimits> {
  const { data: agent, error: agentError } = await admin
    .from('agents')
    .select('daily_cash_limit, single_transaction_limit')
    .eq('id', agentId)
    .single();

  if (agentError || !agent) {
    throw new Error('AGENT_NOT_FOUND');
  }

  const { data: override } = await admin
    .from('agent_limit_overrides')
    .select('daily_cash_limit, single_transaction_limit, expires_at')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const overrideActive = override && (!override.expires_at || new Date(override.expires_at) > new Date());

  return {
    dailyCashLimit: overrideActive && override.daily_cash_limit != null
      ? Number(override.daily_cash_limit)
      : Number(agent.daily_cash_limit),
    singleTransactionLimit: overrideActive && override.single_transaction_limit != null
      ? Number(override.single_transaction_limit)
      : Number(agent.single_transaction_limit),
  };
}
