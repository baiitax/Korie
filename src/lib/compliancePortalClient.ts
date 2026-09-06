/**
 * Compliance portal API helper.
 *
 * SECURITY CHANGE: this client used to attach a hardcoded sandbox token
 * (`kp_test_...`) to every compliance request. That token was a mock
 * credential — nothing on the server verified an officer identity, and the
 * value was readable by anyone who opened the JavaScript bundle. It is gone.
 *
 * Every request now carries the officer's REAL Supabase access token
 * (mirroring src/lib/admin/adminSession.ts). `/api/compliance/*` resolves
 * the officer + RBAC from the token on the server; the client never
 * asserts an identity or a role.
 */

import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export async function getComplianceAccessToken(): Promise<string | null> {
  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function signInCompliance(
  email: string,
  password: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    return { ok: false, message: error?.message || 'Could not sign in with those credentials.' };
  }
  return { ok: true };
}

export async function signOutCompliance(): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  await supabase.auth.signOut();
}

/** Trace id for one portal action, so an officer can quote it in an incident. */
export function newRequestId(): string {
  return `KPC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

export async function complianceFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(init.headers || {});
  const token = await getComplianceAccessToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!headers.has('X-Request-Id')) {
    headers.set('X-Request-Id', newRequestId());
  }
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  return fetch(input, { ...init, headers, cache: 'no-store' });
}

export default complianceFetch;
