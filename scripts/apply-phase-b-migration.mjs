import fs from 'node:fs';
import path from 'node:path';
import { Client } from 'pg';

let url = process.env.POSTGRES_URL_NON_POOLING;
if (!url) {
  console.error('POSTGRES_URL_NON_POOLING not set');
  process.exit(1);
}
// Strip sslmode from the query string so it doesn't force verify-full;
// we set ssl options explicitly below instead.
url = url.replace(/([?&])sslmode=[^&]*&?/, '$1').replace(/[?&]$/, '');

const migrationPath = path.resolve('supabase/migrations/20260916000058_aggregator_mfa_and_ip_allowlist.sql');
const sql = fs.readFileSync(migrationPath, 'utf8');

const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
  console.log('Connected. Applying migration:', migrationPath);
  await client.query(sql);
  console.log('Migration applied successfully.');

  // Quick smoke checks
  const col = await client.query(
    `SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name = 'aggregators' AND column_name = 'mfa_required'`
  );
  console.log('aggregators.mfa_required column:', col.rows);

  const tbl = await client.query(
    `SELECT to_regclass('public.aggregator_ip_allowlist') AS exists`
  );
  console.log('aggregator_ip_allowlist table exists:', tbl.rows);

  const fn = await client.query(
    `SELECT proname FROM pg_proc WHERE proname = 'is_ip_allowed_for_aggregator'`
  );
  console.log('is_ip_allowed_for_aggregator function exists:', fn.rows);
} catch (err) {
  console.error('Migration failed:', err.message);
  process.exit(1);
} finally {
  await client.end();
}
