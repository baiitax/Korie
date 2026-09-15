import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Creates a server-side Supabase client with cookie management for App Router.
 *
 * Session policy (Task I / Phase 1): explicitly forces the `Secure`
 * attribute on the auth cookies in production. `@supabase/ssr`'s own
 * default (`secure: false`, see
 * node_modules/@supabase/ssr/dist/main/utils/constants.js) is scheme-blind
 * — left unset, the session/refresh-token cookies this helper writes would
 * be missing `Secure` even when the app is served over HTTPS in
 * production, which would let them legally be replayed over a plain-HTTP
 * downgrade of the same host. Kept off outside production so local
 * plain-HTTP dev (where a `Secure` cookie is simply dropped by the
 * browser) keeps working.
 */
export function getSupabaseServerClient() {
  const cookieStore = cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mock-supabase.koriepay.internal';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'kp_anon_placeholder_key_for_client_session_validation';
  const isProd = process.env.NODE_ENV === 'production';

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookieOptions: {
      sameSite: 'lax',
      secure: isProd,
      path: '/',
    },
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch (error) {
          // In Next.js Server Components, mutating cookies directly is disallowed.
          // Route Handlers and Server Actions permit cookie setting.
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: '', ...options });
        } catch (error) {
          // Handled safely in Server Components
        }
      },
    },
  });
}
