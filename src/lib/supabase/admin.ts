import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * SERVER-ONLY Supabase client using the service role key.
 *
 * This client bypasses Row Level Security and must NEVER be imported into
 * any client component or exposed to the browser bundle. It is used only
 * inside API route handlers / server actions for privileged operations such
 * as posting ledger transactions and resolving an authenticated agent's
 * record from their session.
 */
let cachedAdminClient: SupabaseClient | null = null;

export function getSupabaseAdminClient(): SupabaseClient {
  if (cachedAdminClient) return cachedAdminClient;

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Supabase admin client misconfigured: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set on the server.'
    );
  }

  cachedAdminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  return cachedAdminClient;
}
