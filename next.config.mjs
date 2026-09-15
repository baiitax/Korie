/** @type {import('next').NextConfig} */
const nextConfig = {
  // Security / headless niceness: drop the X-Powered-By header.
  poweredByHeader: false,

  // Let Vercel / Next apply gzip + brotli compression to HTML/JS/CSS.
  compress: true,

  // Target modern browsers + automatic SWC minification.
  swcMinify: true,

  // React dev strictness (double-invoke checks in dev, no effect in prod).
  reactStrictMode: true,

  // Strip verbosity from production client bundles but keep error logs.
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? { exclude: ["error", "warn"] }
        : false,
  },

  // Serve brand imagery in modern formats where supported.
  images: {
    formats: ["image/avif", "image/webp"],
  },

  // Only import the used icons rather than the whole lucide-react barrel
  // (and keep framer/other optionals out of the bundle when not used).
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },

  // Baseline HTTP security headers on every response (Task I / Phase 0).
  // Deliberately does NOT set X-Frame-Options / frame-ancestors here: this
  // app is also served embedded in a cross-origin sandbox preview iframe
  // during development, and a hard frame-block would break that preview.
  // Clickjacking protection for the real production domain should be
  // applied at the edge/CDN (Vercel project settings) where the exact
  // allowed embedding origin is known, not hardcoded into the app build.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Prevents browsers from MIME-sniffing a response away from its
          // declared Content-Type — closes a class of stored-XSS vectors
          // where an uploaded file (e.g. a KYC document) could otherwise be
          // served back and interpreted as HTML/JS by an old browser.
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Never leak the full referring URL (which may contain a
          // transaction reference or ticket id in the path) to third-party
          // destinations; same-origin navigations still get the full path.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Disable powerful browser APIs this app never uses, so an XSS
          // that got past everything else still can't pivot into camera/
          // mic/geolocation access.
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
          // Force HTTPS for a year (with subdomains) once served over TLS —
          // Next.js/Vercel only sends this over an actual HTTPS response, so
          // it is a no-op (and harmless) on plain-HTTP local/preview.
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          { key: "X-DNS-Prefetch-Control", value: "off" },
        ],
      },
      {
        // Every JSON API route serves either an authenticated caller's own
        // financial/PII data or an auth/session-adjacent response. None of
        // it may ever be cached by a shared cache (a CDN, a corporate proxy,
        // a misconfigured browser disk cache) — a cached response for one
        // caller served back to a different caller on the same path (e.g.
        // GET /api/v1/wallets/:id/balance, GET /api/customer/360) would be a
        // cross-tenant data leak indistinguishable from an IDOR. Next.js's
        // App Router already treats routes that read cookies/headers/search
        // params as dynamic (never statically cached at build time), but
        // this header is the explicit, protocol-level guarantee that no
        // downstream cache — one this app's own code doesn't control — ever
        // stores or replays a response. Applied at the framework level
        // (not per-route) so it can't be missed on any of the 180+ existing
        // route handlers or forgotten on a future one.
        source: "/api/:path*",
        headers: [
          { key: "Cache-Control", value: "private, no-store, no-cache, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
