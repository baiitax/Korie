import { createBrowserClient } from '@supabase/ssr';

/**
 * Creates a browser-compatible Supabase client.
 * Uses environment variables if configured, or gracefully falls back to mock-safe defaults.
 *
 * Session policy (Task I / Phase 1): `@supabase/ssr`'s own default cookie
 * options are `{ sameSite: "lax", secure: false, httpOnly: false }` (see
 * node_modules/@supabase/ssr/dist/main/utils/constants.js) — it never
 * infers the page's own scheme, so left unset, the session/refresh-token
 * cookies are written without the `Secure` attribute even when served over
 * HTTPS in production. That would let the cookie legally be replayed over
 * a plain-HTTP downgrade of the same host. `secure` is forced on whenever
 * the app is actually running over HTTPS (production and any HTTPS
 * preview deployment); it is left off only for plain-HTTP localhost dev,
 * where a `Secure` cookie would simply never be sent at all and break
 * local sign-in. `sameSite: "lax"` is kept (the library default) since the
 * app performs no cross-site form posts that need `strict`, and `lax` is
 * still enough to block classic cross-site CSRF via `<img>`/`<form>` GET.
 */
export function getSupabaseBrowserClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mock-supabase.koriepay.internal';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'kp_anon_placeholder_key_for_client_session_validation';
  const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';

  return createBrowserClient(supabaseUrl, supabaseAnonKey, {
    cookieOptions: {
      sameSite: 'lax',
      secure: isHttps,
      path: '/',
    },
  });
}
