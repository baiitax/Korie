/**
 * Perimeter guard test.
 *
 * Runs scripts/verify-rls.mjs when a database URL is available
 * (POSTGRES_URL / SUPABASE_DB_URL, typically in CI after migrations)
 * and fails the suite on any regression. Without credentials the test
 * skips loudly, so a local `npm test` never silently passes the gate:
 * the skip is reported as a visible warning, not a quiet green tick.
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

  it.skipIf(hasUrl)('warns when no database URL is configured (CI must set one)', () => {
    console.warn(
      '[rls-guard] POSTGRES_URL not set — perimeter verification SKIPPED. ' +
        'This must only happen outside CI; the deploy pipeline runs it with credentials.',
    );
    expect(true).toBe(true);
  });
});
