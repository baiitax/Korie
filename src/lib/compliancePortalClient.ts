/**
 * Compliance portal API helper.
 *
 * Same shape as `customerPortalClient` on purpose: the two portals should not
 * invent two different conventions for attaching a credential, and a reviewer
 * comparing them should find one rule — the credential is attached centrally,
 * never per page. (Dropping it on one call is exactly how the customer portal
 * ended up with screens that "worked" in the mock and 401'd in production.)
 *
 * SECURITY NOTE: the value below is the documented KoriePay *test* key. It is
 * a mock credential for sandbox/demo builds and must never be a production
 * secret. In a real deployment the officer session token replaces it by setting
 * NEXT_PUBLIC_KP_COMPLIANCE_TOKEN, and `authenticateApiRequest` on the server
 * remains the only thing that decides what the caller may read.
 */

const SANDBOX_TOKEN = "kp_test_cdb3db2b9b22a98c9c1b";

function getComplianceToken(): string {
  if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_KP_COMPLIANCE_TOKEN) {
    return process.env.NEXT_PUBLIC_KP_COMPLIANCE_TOKEN;
  }
  return SANDBOX_TOKEN;
}

export function getComplianceBearer(): string {
  return `Bearer ${getComplianceToken()}`;
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
  if (!headers.has("Authorization")) {
    headers.set("Authorization", getComplianceBearer());
  }
  if (!headers.has("X-Request-Id")) {
    headers.set("X-Request-Id", newRequestId());
  }
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(input, { ...init, headers });
}

export default complianceFetch;
