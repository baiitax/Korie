#!/usr/bin/env node
/**
 * verify-rls.mjs — the database perimeter guard.
 *
 * Fails (exit 1) if ANY of these regress:
 *   1. a public table without row-level security,
 *   2. the anon role holding INSERT/UPDATE/DELETE on any public table,
 *   3. the anon or authenticated role able to EXECUTE any public function.
 *
 * Usage:
 *   node scripts/verify-rls.mjs
 *
 * Needs a direct Postgres connection string in POSTGRES_URL (or the
 * SUPABASE_DB_URL env var); in CI it should run as a step holding the
 * database credentials, after migrations.
 */

import pg from 'pg';

const url = process.env.POSTGRES_URL || process.env.SUPABASE_DB_URL;
if (!url) {
  console.error('verify-rls: POSTGRES_URL (or SUPABASE_DB_URL) is required.');
  process.exit(2);
}

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();

  const noRls = await client.query(`
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
    order by c.relname
  `);

  const anonWrites = await client.query(`
    select table_name,
           array_agg(privilege_type order by privilege_type)::text as privileges
    from information_schema.role_table_grants
    where table_schema = 'public'
      and grantee = 'anon'
      and privilege_type in ('INSERT','UPDATE','DELETE')
    group by table_name
    order by table_name
  `);

  const openFunctions = await client.query(`
    select p.proname
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and (has_function_privilege('anon', p.oid, 'EXECUTE')
        or has_function_privilege('authenticated', p.oid, 'EXECUTE'))
    order by p.proname
  `);

  let failures = 0;

  if (noRls.rows.length > 0) {
    failures += noRls.rows.length;
    console.error(`FAIL — ${noRls.rows.length} public table(s) without RLS:`);
    noRls.rows.forEach((r) => console.error(`  ${r.relname}`));
  }

  if (anonWrites.rows.length > 0) {
    failures += anonWrites.rows.length;
    console.error(`FAIL — anon holds write grants on ${anonWrites.rows.length} public table(s):`);
    anonWrites.rows.forEach((r) => {
      const privs = String(r.privileges ?? '').replace(/[{}"]/g, '').split(',').filter(Boolean);
      console.error(`  ${r.table_name}: ${privs.join(', ')}`);
    });
  }

  if (openFunctions.rows.length > 0) {
    failures += openFunctions.rows.length;
    console.error(`FAIL — ${openFunctions.rows.length} public function(s) executable by anon/authenticated:`);
    openFunctions.rows.forEach((r) => console.error(`  ${r.proname}`));
  }

  if (failures > 0) {
    console.error(`\nverify-rls: ${failures} perimeter violation(s). The default posture must be DENY.`);
    process.exit(1);
  }

  console.log('verify-rls: perimeter holds — RLS on all tables, no anon writes, no public function execution for anon/authenticated.');
  process.exit(0);
} catch (err) {
  console.error(`verify-rls: could not verify — ${err.message}`);
  process.exit(2);
} finally {
  await client.end().catch(() => {});
}
