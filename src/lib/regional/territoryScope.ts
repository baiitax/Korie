import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import type { AuthenticatedRegionalManagerContext } from '@/lib/security/regionalManagerAuth';

/** Shared server-side helpers for every /api/regional route. One
 *  implementation of territory scoping, PII masking and health rules —
 *  routes never re-derive these. */

export interface TerritoryScope {
  agents: { id: string; agent_code: string; agent_name: string; state_or_region: string; status: string; aggregator_territory_id: string | null; created_at: string }[];
  agentIds: string[];
  /** aggregator_territories rows inside the manager's region. */
  territories: { id: string; name: string; code: string; state_or_region: string; aggregator_id: string }[];
  /** Distinct aggregator ids operating in the territory. */
  aggregatorIds: string[];
  aggregatorByTerritory: Map<string, string>;
}

/**
 * Resolves everything the manager is allowed to see, from the database:
 * agents in their states/regions and the aggregator territories there.
 * Client-supplied ids are never trusted — routes filter against these sets.
 */
export async function resolveTerritoryScope(manager: AuthenticatedRegionalManagerContext): Promise<TerritoryScope> {
  const admin = getSupabaseAdminClient();
  const { country, territories } = manager;

  const { data: territoryRows } = await admin
    .from('aggregator_territories')
    .select('id, name, code, state_or_region, aggregator_id')
    .eq('country', country)
    .in('state_or_region', territories);

  const terrRows = (territoryRows ?? []).map((t: any) => ({
    id: t.id,
    name: t.name,
    code: t.code,
    state_or_region: t.state_or_region,
    aggregator_id: t.aggregator_id,
  }));

  const { data: agentRows } = await admin
    .from('agents')
    .select('id, agent_code, agent_name, state_or_region, status, aggregator_territory_id, created_at')
    .eq('country', country)
    .in('state_or_region', territories)
    .limit(5000);

  const agents = (agentRows ?? []).map((a: any) => ({
    id: a.id,
    agent_code: a.agent_code,
    agent_name: a.agent_name,
    state_or_region: a.state_or_region,
    status: a.status,
    aggregator_territory_id: a.aggregator_territory_id ?? null,
    created_at: a.created_at,
  }));

  return {
    agents,
    agentIds: agents.map((a) => a.id),
    territories: terrRows,
    aggregatorIds: Array.from(new Set(terrRows.map((t) => t.aggregator_id))).filter(Boolean),
    aggregatorByTerritory: new Map(terrRows.map((t) => [t.id, t.aggregator_id])),
  };
}

/** Territory check for a single aggregator — routes refuse anything outside. */
export function aggregatorInScope(scope: TerritoryScope, aggregatorId: string): boolean {
  return scope.aggregatorIds.includes(aggregatorId);
}

/** Territory check for a single agent — routes refuse anything outside. */
export function agentInScope(scope: TerritoryScope, agentId: string): boolean {
  return scope.agentIds.includes(agentId);
}

/* ------------------------------------------------------------------ */
/* PII masking — the minimum the supervision role needs, no more.      */
/* ------------------------------------------------------------------ */

export function maskName(name: string | null | undefined): string {
  if (!name) return '—';
  const parts = String(name).trim().split(/\s+/);
  return parts
    .map((p, i) => (i === 0 ? p : p.slice(0, 1) + '•'.repeat(Math.max(1, p.length - 1))))
    .join(' ');
}

export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return '—';
  const s = String(phone).replace(/\s+/g, '');
  if (s.length <= 4) return '••••';
  return s.slice(0, 3) + '•••' + s.slice(-3);
}

export function maskEmail(email: string | null | undefined): string {
  if (!email) return '—';
  const s = String(email);
  const at = s.indexOf('@');
  if (at <= 1) return '•' + s.slice(at);
  return s.slice(0, 1) + '•••' + s.slice(at);
}

/* ------------------------------------------------------------------ */
/* Currency handling — XOF is shown first (primary corridor currency), */
/* then NGN. Values are never combined across currencies.             */
/* ------------------------------------------------------------------ */

export const CURRENCY_ORDER = ['XOF', 'NGN'];

export function orderCurrencies(currencies: Iterable<string>): string[] {
  const set = new Set(currencies);
  const ordered: string[] = [];
  for (const c of CURRENCY_ORDER) if (set.has(c)) ordered.push(c);
  for (const c of Array.from(set)) if (!ordered.includes(c)) ordered.push(c);
  return ordered;
}

/* ------------------------------------------------------------------ */
/* Liquidity health — a documented rule, computed from real balances.  */
/* Coverage = balance ÷ configured cash_threshold_min on the account.  */
/*   CRITICAL: coverage < 1.0 (below the operational minimum)          */
/*   LOW:      coverage < 1.5                                          */
/*   MONITOR:  coverage < 2.0                                          */
/*   HEALTHY:  coverage ≥ 2.0 (or no threshold configured)             */
/* ------------------------------------------------------------------ */

export type LiquidityStatus = 'HEALTHY' | 'MONITOR' | 'LOW' | 'CRITICAL';

export function liquidityStatus(balance: number, thresholdMin: number | null): LiquidityStatus {
  if (thresholdMin === null || thresholdMin === undefined || thresholdMin <= 0) return 'HEALTHY';
  const coverage = balance / thresholdMin;
  if (coverage < 1.0) return 'CRITICAL';
  if (coverage < 1.5) return 'LOW';
  if (coverage < 2.0) return 'MONITOR';
  return 'HEALTHY';
}

/** Days since date, for dormancy classification. Documented rule:
 *  active ≤ 7 days since last transaction, low activity ≤ 30, dormant > 30. */
export function activityClass(lastTransactionAt: string | null | undefined): 'ACTIVE' | 'LOW_ACTIVITY' | 'DORMANT' | 'NO_ACTIVITY' {
  if (!lastTransactionAt) return 'NO_ACTIVITY';
  const days = (Date.now() - new Date(lastTransactionAt).getTime()) / 86400_000;
  if (days <= 7) return 'ACTIVE';
  if (days <= 30) return 'LOW_ACTIVITY';
  return 'DORMANT';
}

export const HEALTH_RULES_NOTE =
  'Liquidity: coverage = ledger balance ÷ configured cash threshold (CRITICAL <1.0, LOW <1.5, MONITOR <2.0, HEALTHY ≥2.0). Agent activity: ACTIVE ≤7d since last transaction, LOW ≤30d, DORMANT >30d.';
