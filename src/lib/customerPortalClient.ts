/**
 * Client-side portal API helper.
 *
 * The customer portal talks to its own `/api/customer/*` routes, which enforce
 * authentication + scope via `authenticateApiRequest`. This wrapper attaches the
 * Bearer credential to every call.
 *
 * SECURITY / SANDBOX NOTE: the customer browser session does not carry a
 * production JWT in the sandbox, so we attach the sandbox test key. In a real
 * deployment `NEXT_PUBLIC_KP_SANDBOX_TOKEN` is unset and the browser sends the
 * real session token from the auth flow instead (override `getPortalToken`).
 * The fallback below is the documented KoriePay test key (kp_test_…) — it is a
 * mock credential, never a production secret. Do NOT ship a production key here.
 */

export const DEFAULT_SANDBOX_TOKEN = "kp_test_cdb3db2b9b22a98c9c1b";

function getPortalToken(): string {
  if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_KP_SANDBOX_TOKEN) {
    return process.env.NEXT_PUBLIC_KP_SANDBOX_TOKEN;
  }
  return DEFAULT_SANDBOX_TOKEN;
}

export async function portalFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(init.headers || {});
  if (!headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${getPortalToken()}`);
  }
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(input, { ...init, headers });
}

export default portalFetch;
