import { getSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * Real Supabase session helper for Merchant Portal API calls — mirrors
 * agentSession.ts's shape, but with NO demo-credential shortcut: a
 * merchant staff user must have actually signed in (via /login, which
 * resolves their real role and routes them to /merchant) for a session to
 * exist. If no session is present, callers should redirect to /login
 * rather than silently authenticating as anyone.
 */
export async function getMerchantAccessToken(): Promise<string | null> {
  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || null;
}

export async function merchantApiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await getMerchantAccessToken();
  if (!token) {
    throw new Error("MERCHANT_SESSION_UNAVAILABLE");
  }

  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(path, { ...init, headers });
}
