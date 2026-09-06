import { getSupabaseBrowserClient } from '@/lib/supabase/client';

/**
 * Real Supabase session plumbing for the Support Portal, mirroring
 * src/lib/agency/agentSession.ts for agents and
 * src/lib/customer/customerSession.ts for customers. The support UI no
 * longer asserts an officer identity via a client-supplied header — every
 * request carries a real, server-verified Supabase access token, and the
 * server resolves the officer + RBAC from public.support_officers.
 */

const OFFICER_STORAGE_KEY = 'koriepay_support_session_hint';

export async function getSupportOfficerAccessToken(): Promise<string | null> {
  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function signInSupportOfficer(
  email: string,
  password: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    return { ok: false, message: error?.message || 'Could not sign in with those credentials.' };
  }
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(OFFICER_STORAGE_KEY, email);
  }
  return { ok: true };
}

export async function signOutSupportOfficer(): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  await supabase.auth.signOut();
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(OFFICER_STORAGE_KEY);
  }
}

export async function supportApiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await getSupportOfficerAccessToken();
  if (!token) {
    throw new Error('SUPPORT_SESSION_UNAVAILABLE');
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
