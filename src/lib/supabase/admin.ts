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
    global: {
      // Next.js's App Router patches the global `fetch` to apply its own
      // request-memoization/caching semantics. Supabase-js's REST calls go
      // through that same `fetch`, so without an explicit no-store directive
      // a GET issued moments after a write can silently return a stale,
      // pre-write snapshot within the same render pass — exactly the kind of
      // "your money is fine, the read is just lying" bug this portal must
      // never produce. Every admin-client call is always a live read.
      fetch: (input: RequestInfo | URL, init?: RequestInit) =>
        fetch(input, { ...init, cache: 'no-store' }),
    },
  });

  return cachedAdminClient;
}
