import { getSupabaseBrowserClient } from '@/lib/supabase/client';

/**
 * Ensures the browser holds a real Supabase session for the agency portal
 * and returns a fetch-ready Authorization header. This is intentionally
 * separate from the main customer AuthContext (which is still mocked) so
 * that agency banking API calls are backed by a REAL, verifiable Supabase
 * session token rather than a client-trusted role string.
 *
 * NOTE: this signs in with the seeded demo agent credentials for portal
 * demonstration purposes. In production this call is replaced by the
 * agent's real login flow (see /login) which already collects a
 * password — only the session-issuance mechanism changes.
 */
const DEMO_AGENT_EMAIL = 'garba.kano@korieagent.com';
const DEMO_AGENT_PASSWORD = 'KorieAgent@2026!';

export async function getAgentAccessToken(): Promise<string | null> {
  const supabase = getSupabaseBrowserClient();

  const { data: sessionData } = await supabase.auth.getSession();
  if (sessionData.session?.access_token) {
    return sessionData.session.access_token;
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: DEMO_AGENT_EMAIL,
    password: DEMO_AGENT_PASSWORD,
  });

  if (error || !data.session) {
    return null;
  }

  return data.session.access_token;
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
