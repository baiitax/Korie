import { createBrowserClient } from '@supabase/ssr';

/**
 * Creates a browser-compatible Supabase client.
 * Uses environment variables if configured, or gracefully falls back to mock-safe defaults.
 */
export function getSupabaseBrowserClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mock-supabase.koriepay.internal';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'kp_anon_placeholder_key_for_client_session_validation';

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
