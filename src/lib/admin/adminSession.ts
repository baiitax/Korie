import { getSupabaseBrowserClient } from '@/lib/supabase/client';

/**
 * Real Supabase session plumbing for the Admin Portal, mirroring
 * src/lib/support/officerSession.ts (support officers) and
 * src/lib/agency/agentSession.ts (agents).
 *
 * The admin UI never asserts an identity — every request carries a real,
 * server-verified Supabase access token, and /api/admin/* resolves the
 * administrator + RBAC from public.organization_members (see
 * src/lib/security/adminAuth.ts).
 */

const ADMIN_STORAGE_KEY = 'koriepay_admin_session_hint';

export async function getAdminAccessToken(): Promise<string | null> {
  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function signInAdmin(
  email: string,
  password: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    return { ok: false, message: error?.message || 'Could not sign in with those credentials.' };
  }
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(ADMIN_STORAGE_KEY, email);
  }
  return { ok: true };
}

export async function signOutAdmin(): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  await supabase.auth.signOut();
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(ADMIN_STORAGE_KEY);
  }
}

export async function adminApiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await getAdminAccessToken();
  if (!token) {
    throw new Error('ADMIN_SESSION_UNAVAILABLE');
  }
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }
  headers.set(
    'x-kp-request-id',
    `KP-REQ-BROWSER-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
  );
  return fetch(path, { ...init, headers, cache: 'no-store' });
}
