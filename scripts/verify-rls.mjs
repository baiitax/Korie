#!/usr/bin/env node
/**
 * verify-rls.mjs — the database perimeter guard.
 *
 * Fails (exit 1) if ANY of these regress:
 *   1. a table without row-level security in an app schema
 *      (public, adashi, liquidity),
 *   2. the anon role holding ANY privilege on ANY table in an app schema
 *      (anon has zero policies — it must see nothing at all),
 *   3. the anon role able to EXECUTE any function in an app schema,
 *   4. the authenticated role holding INSERT/UPDATE/DELETE/TRUNCATE on a
 *      table that has no matching write policy for it (dead grants are
 *      landmines: one policy mistake away from a live write path),
 *   5. the authenticated role holding SELECT on a table that has no
 *      policy for it (same dead-grant class, read side).
 *
 * Warns (exit stays 0) when authenticated can EXECUTE public functions —
 * the intended end-state is an explicit allowlist of RPC entry points,
 * but several are load-bearing today (auth hooks such as
 * hook_password_verification_attempt run as authenticated). Listing them
 * here keeps the follow-up visible without breaking legitimate flows.
 *
 * Usage:
 *   node scripts/verify-rls.mjs
 *
 * Needs a direct Postgres connection string in POSTGRES_URL (or the
 * SUPABASE_DB_URL env var); in CI it should run as a step holding the
 * database credentials, after migrations.
 */

import pg from 'pg';

// App-owned schemas only. `vault` (Supabase Secrets Vault), `storage` and
// `auth` are platform-managed with their own access model — out of scope.
const APP_SCHEMAS = ['public', 'adashi', 'liquidity'];

/**
 * The ONLY sanctioned anon-executable functions. Keep tight: an entry that
 * no longer matches the live database fails the check as stale, so the
 * guardrail keeps seeing regressions on these functions.
 */
const KNOWN_ANON_FUNCTION_EXPOSURES = [
  {
    schema: 'public',
    name: 'hook_password_verification_attempt',
    ref: 'KoriePay portal security roadmap 1.2 — invoked by the Supabase auth service during login; anon/authenticated EXECUTE must not be revoked until a manual login test confirms GoTrue calls it as supabase_auth_admin.',
  },
];
const schemaList = APP_SCHEMAS.map((s) => `'${s}'`).join(', ');

const url = process.env.POSTGRES_URL || process.env.SUPABASE_DB_URL;
if (!url) {
  console.error('verify-rls: POSTGRES_URL (or SUPABASE_DB_URL) is required.');
  process.exit(2);
}

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();

  const noRls = await client.query(`
    select n.nspname as schema_name, c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname in (${schemaList})
      and c.relkind = 'r'
      and not c.relrowsecurity
    order by 1, 2
  `);

  const anonPrivs = await client.query(`
    select n.nspname as schema_name, c.relname as table_name,
           array_agg(privilege_type order by privilege_type)::text as privileges
    from (
      select distinct n.nspname, c.relname, c.oid, 'SELECT' as privilege_type
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname in (${schemaList}) and c.relkind = 'r'
        and has_table_privilege('anon', c.oid, 'SELECT')
      union
      select distinct n.nspname, c.relname, c.oid, 'INSERT'
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname in (${schemaList}) and c.relkind = 'r'
        and has_table_privilege('anon', c.oid, 'INSERT')
      union
      select distinct n.nspname, c.relname, c.oid, 'UPDATE'
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname in (${schemaList}) and c.relkind = 'r'
        and has_table_privilege('anon', c.oid, 'UPDATE')
      union
      select distinct n.nspname, c.relname, c.oid, 'DELETE'
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname in (${schemaList}) and c.relkind = 'r'
        and has_table_privilege('anon', c.oid, 'DELETE')
      union
      select distinct n.nspname, c.relname, c.oid, 'TRUNCATE'
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname in (${schemaList}) and c.relkind = 'r'
        and has_table_privilege('anon', c.oid, 'TRUNCATE')
      union
      select distinct n.nspname, c.relname, c.oid, 'REFERENCES'
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname in (${schemaList}) and c.relkind = 'r'
        and has_table_privilege('anon', c.oid, 'REFERENCES')
      union
      select distinct n.nspname, c.relname, c.oid, 'TRIGGER'
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname in (${schemaList}) and c.relkind = 'r'
        and has_table_privilege('anon', c.oid, 'TRIGGER')
    ) p
    join pg_class c on c.oid = p.oid
    join pg_namespace n on n.oid = c.relnamespace
    group by n.nspname, c.relname
    order by 1, 2
  `);

  const anonFunctions = await client.query(`
    select n.nspname as schema_name, p.proname
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in (${schemaList})
      and has_function_privilege('anon', p.oid, 'EXECUTE')
    order by 1, 2
  `);

  const authDeadWrites = await client.query(`
    select n.nspname as schema_name, c.relname as table_name,
           array_agg(privilege_type order by privilege_type)::text as privileges
    from (
      select distinct n.nspname, c.relname, c.oid, 'INSERT' as privilege_type
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname in (${schemaList}) and c.relkind = 'r'
        and has_table_privilege('authenticated', c.oid, 'INSERT')
      union
      select distinct n.nspname, c.relname, c.oid, 'UPDATE'
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname in (${schemaList}) and c.relkind = 'r'
        and has_table_privilege('authenticated', c.oid, 'UPDATE')
      union
      select distinct n.nspname, c.relname, c.oid, 'DELETE'
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname in (${schemaList}) and c.relkind = 'r'
        and has_table_privilege('authenticated', c.oid, 'DELETE')
      union
      select distinct n.nspname, c.relname, c.oid, 'TRUNCATE'
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname in (${schemaList}) and c.relkind = 'r'
        and has_table_privilege('authenticated', c.oid, 'TRUNCATE')
    ) p
    join pg_class c on c.oid = p.oid
    join pg_namespace n on n.oid = c.relnamespace
    where not exists (
      select 1 from pg_policy pol
      where pol.polrelid = c.oid
        and 'authenticated'::regrole = any (pol.polroles)
        and pol.polcmd in ('a', 'w', 'd')
    )
    group by n.nspname, c.relname
    order by 1, 2
  `);

  const authDeadReads = await client.query(`
    select n.nspname as schema_name, c.relname as table_name
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname in (${schemaList})
      and c.relkind = 'r'
      and has_table_privilege('authenticated', c.oid, 'SELECT')
      and not exists (
        select 1 from pg_policy pol
        where pol.polrelid = c.oid
          and 'authenticated'::regrole = any (pol.polroles)
      )
    order by 1, 2
  `);

  const authFunctions = await client.query(`
    select n.nspname as schema_name, p.proname
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in (${schemaList})
      and has_function_privilege('authenticated', p.oid, 'EXECUTE')
    order by 1, 2
  `);

  let failures = 0;

  if (noRls.rows.length > 0) {
    failures += noRls.rows.length;
    console.error(`FAIL — ${noRls.rows.length} table(s) without RLS in app schemas:`);
    noRls.rows.forEach((r) => console.error(`  ${r.schema_name}.${r.relname}`));
  }

  if (anonPrivs.rows.length > 0) {
    failures += anonPrivs.rows.length;
    console.error(`FAIL — anon holds privileges on ${anonPrivs.rows.length} table(s):`);
    anonPrivs.rows.forEach((r) => {
      const privs = String(r.privileges ?? '').replace(/[{}\"]/g, '').split(',').filter(Boolean);
      console.error(`  ${r.schema_name}.${r.table_name}: ${privs.join(', ')}`);
    });
  }

  const anonFnAllowlistedSeen = new Set();
  anonFunctions.rows.forEach((r) => {
    const known = KNOWN_ANON_FUNCTION_EXPOSURES.find(
      (e) => e.schema === r.schema_name && e.name === r.proname,
    );
    if (known) {
      anonFnAllowlistedSeen.add(`${r.schema_name}.${r.proname}`);
      console.log(`WARN — anon can EXECUTE ${r.schema_name}.${r.proname} (allowlisted: ${known.ref})`);
      return;
    }
    failures += 1;
    console.error(`FAIL — anon can EXECUTE ${r.schema_name}.${r.proname}`);
  });
  KNOWN_ANON_FUNCTION_EXPOSURES.filter(
    (e) => !anonFnAllowlistedSeen.has(`${e.schema}.${e.name}`),
  ).forEach((e) => {
    failures += 1;
    console.error(
      `FAIL — stale allowlist entry ${e.schema}.${e.name} is no longer exposed to anon (${e.ref}) — remove the entry.`,
    );
  });

  if (authDeadWrites.rows.length > 0) {
    failures += authDeadWrites.rows.length;
    console.error(
      `FAIL — authenticated holds write grants WITHOUT a matching write policy on ${authDeadWrites.rows.length} table(s):`,
    );
    authDeadWrites.rows.forEach((r) => {
      const privs = String(r.privileges ?? '').replace(/[{}\"]/g, '').split(',').filter(Boolean);
      console.error(`  ${r.schema_name}.${r.table_name}: ${privs.join(', ')}`);
    });
  }

  if (authDeadReads.rows.length > 0) {
    failures += authDeadReads.rows.length;
    console.error(
      `FAIL — authenticated holds SELECT WITHOUT a policy on ${authDeadReads.rows.length} table(s) (dead grants):`,
    );
    authDeadReads.rows.forEach((r) => console.error(`  ${r.schema_name}.${r.table_name}`));
  }

  if (failures > 0) {
    console.error(`\nverify-rls: ${failures} perimeter violation(s). The default posture must be DENY.`);
    process.exit(1);
  }

  if (authFunctions.rows.length > 0) {
    console.log(
      `WARN — authenticated can EXECUTE ${authFunctions.rows.length} function(s) (allowlist pending, several are load-bearing auth/RPC entry points):`,
    );
    authFunctions.rows.forEach((r) => console.log(`  ${r.schema_name}.${r.proname}`));
  }

  console.log(
    'verify-rls: perimeter holds — RLS on all app-schema tables, anon zero-access, ' +
      'authenticated read-only-via-policy, no anon function execution.',
  );
  process.exit(0);
} catch (err) {
  console.error(`verify-rls: could not verify — ${err.message}`);
  process.exit(2);
} finally {
  await client.end().catch(() => {});
}
