import { NextRequest, NextResponse } from "next/server";

/**
 * Content-Security-Policy (Task I / Phase 0-1).
 *
 * This app had no CSP at all before this change — every other baseline
 * header (X-Content-Type-Options, Referrer-Policy, Permissions-Policy,
 * HSTS) was already set in next.config.mjs, but nothing constrained which
 * script/style/connect origins a page is allowed to load from. That is the
 * single header that actually blocks a successful XSS from doing anything
 * (exfiltrating a session token, loading an attacker script, etc.), so its
 * absence was a real Phase 0/1 gap.
 *
 * A nonce-based policy is used (not 'unsafe-inline') because the app has
 * exactly two first-party inline <script> tags (the pre-hydration theme
 * setter and the JSON-LD structured-data blocks in src/app/layout.tsx) and
 * no third-party script/analytics/tracking tags anywhere in the codebase
 * (confirmed by repo-wide search before writing this policy) — so a strict
 * nonce policy costs nothing in lost functionality and is meaningfully
 * stronger than 'unsafe-inline', which would make the CSP close to
 * decorative against injected <script> tags.
 *
 * connect-src allows the app's own Supabase project (the browser client
 * talks to Supabase directly for auth session refresh and any
 * publicly-policy-gated realtime/storage calls) — the wildcard subdomain
 * form is used instead of hardcoding the project ref, since the ref is
 * already public in NEXT_PUBLIC_SUPABASE_URL and this keeps the policy
 * stable across environments (local/preview/prod each have their own
 * Supabase project) without needing a build-time templated value.
 *
 * style-src carries 'unsafe-inline': React/Next.js emit inline `style="..."`
 * attributes for a number of first-party components (e.g. a progress-bar
 * width, a computed color) that are not attacker-controlled, and CSP has no
 * practical per-attribute nonce/hash mechanism for that pattern at scale.
 * This is a standard, accepted trade-off for React apps — the protection
 * that matters most (blocking injected <script> execution) is not
 * weakened by it.
 *
 * frame-ancestors is deliberately NOT set here, mirroring the same
 * decision already made for X-Frame-Options in next.config.mjs: this app
 * is also served embedded in a cross-origin sandbox preview iframe during
 * development/review, and a hard frame-block would break that preview.
 * Clickjacking protection for the real production domain belongs at the
 * edge/CDN (Vercel project settings), where the exact allowed embedding
 * origin is known — not hardcoded into the app build.
 */
export function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isDev = process.env.NODE_ENV !== "production";

  const cspHeader = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""};
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data: https:;
    font-src 'self' data:;
    connect-src 'self' https://*.supabase.co wss://*.supabase.co;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    upgrade-insecure-requests;
  `;

  const contentSecurityPolicyHeaderValue = cspHeader.replace(/\s{2,}/g, " ").trim();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", contentSecurityPolicyHeaderValue);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.headers.set("Content-Security-Policy", contentSecurityPolicyHeaderValue);

  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
