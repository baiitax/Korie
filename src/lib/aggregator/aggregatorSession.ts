import { getSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * Real Supabase session helper for Aggregator Portal API calls — mirrors
 * merchantSession.ts's shape exactly, with NO demo-credential shortcut: an
 * aggregator staff user must have actually signed in (via /login, which
 * resolves their real role and routes them to /aggregator) for a session to
 * exist. If no session is present, callers should redirect to /login rather
 * than silently authenticating as anyone.
 */
export async function getAggregatorAccessToken(): Promise<string | null> {
  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || null;
}

export async function aggregatorApiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await getAggregatorAccessToken();
  if (!token) {
    throw new Error("AGGREGATOR_SESSION_UNAVAILABLE");
  }

  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(path, { ...init, headers });
}
