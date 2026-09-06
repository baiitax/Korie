/**
 * Client-side portal API helper.
 *
 * The customer portal talks to its own `/api/customer/*` routes, which are
 * now protected by `authenticateCustomerRequest` — a REAL Supabase Bearer
 * token check against `public.customers.auth_user_id`. This wrapper attaches
 * whatever the genuinely signed-in customer's live Supabase session token is
 * (via `customerSession.ts`). There is no sandbox/demo credential fallback:
 * if nobody is signed in, calls fail loudly with `CUSTOMER_SESSION_UNAVAILABLE`
 * so the UI can route back to /login instead of rendering someone else's
 * (or nobody's) data.
 */

import { getCustomerAccessToken } from "@/lib/customer/customerSession";

/** @deprecated No sandbox token exists anymore — real auth only. Left as an
 * empty string only so any stale import doesn't crash at module load. */
export const DEFAULT_SANDBOX_TOKEN = "";

/** Bearer value for customer portal calls (single source for fetch + XHR). */
export async function getPortalBearer(): Promise<string> {
  const token = await getCustomerAccessToken();
  if (!token) {
    throw new Error("CUSTOMER_SESSION_UNAVAILABLE");
  }
  return `Bearer ${token}`;
}

export async function portalFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const token = await getCustomerAccessToken();
  if (!token) {
    throw new Error("CUSTOMER_SESSION_UNAVAILABLE");
  }
  const headers = new Headers(init.headers || {});
  if (!headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(input, { ...init, headers });
}

export default portalFetch;
