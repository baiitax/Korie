import { getSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * Real Supabase session helper for Regional Manager Portal API calls —
 * mirrors aggregatorSession.ts exactly, with NO demo-credential shortcut:
 * a regional manager must have actually signed in via /login (which
 * resolves their role from regional_manager_users and routes them to
 * /regional) for a session to exist.
 */
export async function getRegionalAccessToken(): Promise<string | null> {
  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || null;
}

export async function regionalApiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await getRegionalAccessToken();
  if (!token) {
    throw new Error("REGIONAL_SESSION_UNAVAILABLE");
  }

  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(path, { ...init, headers });
}
