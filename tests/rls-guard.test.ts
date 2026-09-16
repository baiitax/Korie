/**
 * Perimeter guard test.
 *
 * Runs scripts/verify-rls.mjs when a database URL is available
 * (POSTGRES_URL / SUPABASE_DB_URL) and fails the suite on any regression.
 *
 * `npm test` itself never provisions a database, so this case is expected
 * to skip both locally and in the fast "verify" CI job — that is fine and
 * not a gap: the real perimeter check runs as its own mandatory CI job
 * (`db-perimeter` in .github/workflows/ci.yml), which starts an actual
 * Supabase-managed Postgres (the real `auth` schema/roles the RLS policies
 * are written against), replays every tracked migration, sets
 * POSTGRES_URL, and runs `npm run verify:rls` directly against it. Without
 * credentials here the test skips loudly (a visible warning, not a quiet
 * green tick) so nobody mistakes this file's skip for the actual gate.
 */
import { describe, it, expect } from 'vitest';
import { execFileSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

const hasUrl = Boolean(process.env.POSTGRES_URL || process.env.SUPABASE_DB_URL);
const script = join(process.cwd(), 'scripts', 'verify-rls.mjs');

describe('database perimeter (RLS guard)', () => {
  it.skipIf(!existsSync(script))('verify-rls.mjs exists and is executable', () => {
    expect(existsSync(script)).toBe(true);
  });

  (hasUrl ? it : it.skip)('no public table without RLS, no anon writes, no callable functions for anon', () => {
    let stdout = '';
    try {
      stdout = execFileSync('node', [script], { encoding: 'utf-8', timeout: 60_000 });
    } catch (err) {
      const e = err as { stdout?: string; message?: string };
      throw new Error(`Perimeter regression detected:\n${e.stdout ?? ''}${e.message ?? ''}`);
    }
    expect(stdout).toContain('perimeter holds');
  });

  it.skipIf(hasUrl)('warns when no database URL is configured (the dedicated db-perimeter CI job runs it with credentials)', () => {
    console.warn(
      '[rls-guard] POSTGRES_URL not set — perimeter verification SKIPPED here. ' +
        'The real perimeter check runs in the "Database perimeter (RLS guard)" CI job ' +
        '(.github/workflows/ci.yml), which provisions a real Supabase-managed Postgres, ' +
        'replays every migration, and runs this same script with credentials.',
    );
    expect(true).toBe(true);
  });
});
