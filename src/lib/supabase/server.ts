import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Creates a server-side Supabase client with cookie management for App Router.
 */
export function getSupabaseServerClient() {
  const cookieStore = cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mock-supabase.koriepay.internal';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'kp_anon_placeholder_key_for_client_session_validation';

  return createServerClient(supabaseUrl, supabaseAnonKey, {
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
