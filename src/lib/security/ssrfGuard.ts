/**
 * SSRF (Server-Side Request Forgery) guard for outbound HTTP calls to
 * merchant/aggregator-supplied URLs — CWE-918.
 *
 * Fixes a real defect: src/app/api/v1/merchant/webhooks/[id]/test/route.ts
 * and src/lib/merchant/webhookDispatch.ts both call `fetch(endpoint.url, ...)`
 * on a URL a merchant chose at registration time, with nothing beyond a
 * `^https://` prefix check. A malicious/compromised merchant could point a
 * webhook endpoint at KoriePay's own internal infrastructure — a private
 * VPC service, localhost, or the cloud metadata endpoint
 * (169.254.169.254, which can expose IAM credentials on AWS/GCP/Azure) —
 * and use KoriePay's server as an unwitting proxy to reach it.
 *
 * `safeFetch()` is a drop-in replacement for the two call sites above. It:
 *   1. Enforces https:// only (already true at registration, re-checked here).
 *   2. Resolves the hostname's DNS A/AAAA records itself and rejects if any
 *      resolved address is private (RFC 1918), loopback, link-local
 *      (which covers every major cloud's metadata IP), multicast, or
 *      otherwise reserved.
 *   3. Pins the actual TCP connection to the one IP address it just
 *      validated (via undici's `lookup` override), so a second, later DNS
 *      resolution inside the HTTP client cannot return a different,
 *      unvalidated address — this closes the classic DNS-rebinding TOCTOU
 *      gap between "checked" and "connected".
 *   4. Disables automatic redirect-following and instead validates each
 *      hop itself (bounded), so a 302 cannot silently redirect the request
 *      to an internal address after the original URL passed validation.
 *
 * This intentionally does not change *when* URLs are accepted at
 * registration (src/app/api/v1/merchant/webhooks/route.ts already requires
 * https://) — it only hardens the actual dispatch path, which is the part
 * that makes a real outbound network request on KoriePay's behalf.
 */

import dns from 'dns/promises';
import { isIP } from 'net';
import { Agent, fetch as undiciFetch, type Dispatcher } from 'undici';

const MAX_REDIRECTS = 3;
const DEFAULT_TIMEOUT_MS = 10_000;

class SsrfBlockedError extends Error {
  constructor(target: string, reason: string) {
    super(`Blocked outbound request to "${target}": ${reason}`);
    this.name = 'SsrfBlockedError';
  }
}

function isPrivateOrReservedIp(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) {
    const parts = ip.split('.').map(Number);
    const [a, b] = parts;
    if (a === 127) return true; // loopback
    if (a === 10) return true; // RFC1918
    if (a === 172 && b >= 16 && b <= 31) return true; // RFC1918
    if (a === 192 && b === 168) return true; // RFC1918
    if (a === 169 && b === 254) return true; // link-local incl. cloud metadata
    if (a === 0) return true; // "this" network
    if (a >= 224) return true; // multicast/reserved/broadcast
    if (a === 100 && b >= 64 && b <= 127) return true; // carrier-grade NAT (RFC6598)
    return false;
  }
  if (version === 6) {
    const lower = ip.toLowerCase();
    if (lower === '::1') return true; // loopback
    if (lower === '::' || lower.startsWith('::ffff:0:0')) return true;
    if (lower.startsWith('fe80:') || lower.startsWith('fe8') || lower.startsWith('fe9') || lower.startsWith('fea') || lower.startsWith('feb')) return true; // link-local
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // unique local (RFC4193)
    if (lower.startsWith('::ffff:')) {
      // IPv4-mapped IPv6 — unwrap and re-check as IPv4
      const mapped = lower.replace('::ffff:', '');
      if (isIP(mapped) === 4) return isPrivateOrReservedIp(mapped);
    }
    return false;
  }
  // Not a literal IP — caller should have already resolved it via DNS.
  return true;
}

async function resolveAndValidateHost(hostname: string): Promise<string> {
  // If the hostname is itself a literal IP (no DNS involved), validate directly.
  if (isIP(hostname)) {
    if (isPrivateOrReservedIp(hostname)) {
      throw new SsrfBlockedError(hostname, 'resolves to a private/reserved IP address');
    }
    return hostname;
  }

  if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
    throw new SsrfBlockedError(hostname, 'localhost is not a permitted webhook destination');
  }

  const [v4, v6] = await Promise.all([
    dns.resolve4(hostname).catch(() => [] as string[]),
    dns.resolve6(hostname).catch(() => [] as string[]),
  ]);
  const addresses = [...v4, ...v6];
  if (addresses.length === 0) {
    throw new SsrfBlockedError(hostname, 'hostname did not resolve to any address');
  }
  for (const addr of addresses) {
    if (isPrivateOrReservedIp(addr)) {
      throw new SsrfBlockedError(hostname, `resolves to private/reserved address ${addr}`);
    }
  }
  // Pin to the first validated address so the HTTP client cannot re-resolve
  // to a different (potentially unvalidated) address later — defeats
  // DNS-rebinding attacks that swap the DNS answer between check and connect.
  return addresses[0];
}

interface SafeFetchOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
}

export interface SafeFetchResult {
  status: number;
  ok: boolean;
  text: () => Promise<string>;
}

/**
 * SSRF-hardened fetch for merchant/aggregator-controlled destination URLs.
 * Throws SsrfBlockedError if the URL (or any redirect target) resolves to
 * a private/internal/reserved address. Use this instead of the global
 * fetch() for any outbound call whose destination host is not a constant
 * KoriePay-controlled value.
 */
export async function safeFetch(url: string, options: SafeFetchOptions = {}): Promise<SafeFetchResult> {
  let currentUrl = url;
  let redirectsFollowed = 0;

  for (;;) {
    const parsed = new URL(currentUrl);
    if (parsed.protocol !== 'https:') {
      throw new SsrfBlockedError(currentUrl, 'only https:// destinations are permitted');
    }

    const validatedIp = await resolveAndValidateHost(parsed.hostname);

    // Pin the TCP connection to the exact IP we just validated, regardless
    // of what a later DNS lookup inside the HTTP stack might return.
    const dispatcher = new Agent({
      connect: {
        lookup: (_hostname, _opts, callback) => {
          callback(null, [{ address: validatedIp, family: isIP(validatedIp) === 6 ? 6 : 4 }] as any);
        },
      },
    }) as unknown as Dispatcher;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

    let response;
    try {
      response = await undiciFetch(currentUrl, {
        method: options.method ?? 'POST',
        headers: options.headers,
        body: options.body,
        redirect: 'manual',
        signal: controller.signal,
        dispatcher,
      } as any);
    } finally {
      clearTimeout(timeout);
    }

    const isRedirect = response.status >= 300 && response.status < 400 && response.headers.get('location');
    if (!isRedirect) {
      return {
        status: response.status,
        ok: response.ok,
        text: () => response.text(),
      };
    }

    redirectsFollowed += 1;
    if (redirectsFollowed > MAX_REDIRECTS) {
      throw new SsrfBlockedError(currentUrl, 'too many redirects');
    }
    // Resolve the redirect target against the current URL and loop back to
    // re-validate it from scratch — a redirect target gets zero trust from
    // the original validation.
    currentUrl = new URL(response.headers.get('location') as string, currentUrl).toString();
  }
}

/**
 * Convenience check for use at webhook *registration* time (not dispatch
 * time) — gives the merchant an immediate, clear validation error instead
 * of a silent delivery failure later. This is NOT the enforcement boundary
 * (a hostname's DNS can change between registration and every future
 * delivery), so registration success here does not exempt dispatch calls
 * from also going through safeFetch().
 */
export async function validateWebhookDestination(url: string): Promise<{ ok: true } | { ok: false; reason: string }> {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') {
      return { ok: false, reason: 'Webhook URL must use https://.' };
    }
    await resolveAndValidateHost(parsed.hostname);
    return { ok: true };
  } catch (err) {
    if (err instanceof SsrfBlockedError) {
      return { ok: false, reason: 'This URL points to an internal or private network address and cannot be used as a webhook destination.' };
    }
    return { ok: false, reason: 'Could not validate this webhook URL.' };
  }
}

export { SsrfBlockedError };
