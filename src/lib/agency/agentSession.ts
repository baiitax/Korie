import { getSupabaseBrowserClient } from '@/lib/supabase/client';

/**
 * Ensures the browser holds a real Supabase session for the agency portal
 * and returns a fetch-ready Authorization header. This is intentionally
 * separate from the main customer AuthContext so that agency banking API
 * calls are backed by a REAL, verifiable Supabase session token rather than
 * a client-trusted role string.
 *
 * Real per-agent login is now wired: /login resolves the signed-in Auth
 * user's role (via /api/auth/session/resolve) and routes agents to /agent,
 * which relies on this same Supabase session. No demo credential shortcut
 * is used here anymore — if there is no real session, callers should treat
 * that as "not signed in" and redirect to /login rather than silently
 * authenticating as anyone.
 */
export async function getAgentAccessToken(): Promise<string | null> {
  const supabase = getSupabaseBrowserClient();
  const { data: sessionData } = await supabase.auth.getSession();
  return sessionData.session?.access_token || null;
}

export async function agencyApiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await getAgentAccessToken();
  if (!token) {
    throw new Error('AGENT_SESSION_UNAVAILABLE');
  }

  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(path, { ...init, headers });
}
