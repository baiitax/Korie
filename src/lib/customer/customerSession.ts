import { getSupabaseBrowserClient } from '@/lib/supabase/client';

/**
 * Real Supabase-session accessor for the customer portal.
 *
 * Unlike `src/lib/agency/agentSession.ts` (which silently signs in a fixed
 * demo agent for portal demonstration), this module never fabricates a
 * session. It only ever returns the token of whoever is genuinely signed in
 * via `supabase.auth.signInWithPassword` from the real login form
 * (`AuthContext.login`). If nobody is signed in, callers get `null` and must
 * treat the customer as unauthenticated — there is no synthetic fallback
 * identity for the wallet/transfer/KYC surfaces.
 */
export async function getCustomerAccessToken(): Promise<string | null> {
  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

/**
 * Fetch wrapper for `/api/customer/*` routes that attaches the caller's real
 * Supabase access token. Throws `CUSTOMER_SESSION_UNAVAILABLE` if there is no
 * live session — the caller (usually CustomerContext) should catch this and
 * route the user back to /login rather than silently degrading to mock data.
 */
export async function customerApiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await getCustomerAccessToken();
  if (!token) {
    throw new Error('CUSTOMER_SESSION_UNAVAILABLE');
  }

  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(path, { ...init, headers });
}
