/**
 * Jurisdiction scope for the whole portal.
 *
 * A standalone module (rather than React context) because the *service* has to
 * honour it: when an officer narrows to Niger, the rail badges, the dashboard
 * counters and the queue tables must all shrink together. If only the table
 * filtered, the badge would keep shouting "12" next to a list of five, which is
 * exactly the sort of quiet inconsistency that makes an officer distrust the
 * tool.
 *
 * It is read inside effects, never during render, so the first paint is not
 * driven by `localStorage`.
 */

export type JurisdictionFilter = 'ALL' | 'NG' | 'NE';

const STORAGE_KEY = 'kp_compliance_jurisdiction';

let current: JurisdictionFilter = 'ALL';
const listeners = new Set<() => void>();

function normalise(value: string | null | undefined): JurisdictionFilter {
  return value === 'NG' || value === 'NE' ? value : 'ALL';
}

export function getJurisdiction(): JurisdictionFilter {
  return current;
}

export function initJurisdiction(): JurisdictionFilter {
  if (typeof window === 'undefined') return current;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) current = normalise(stored);
  } catch {
    /* private mode: keep the default */
  }
  return current;
}

export function setJurisdiction(next: JurisdictionFilter): void {
  current = normalise(next);
  try {
    window.localStorage.setItem(STORAGE_KEY, current);
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

export function subscribeJurisdiction(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function jurisdictionLabel(code: JurisdictionFilter): string {
  if (code === 'NG') return 'Nigeria';
  if (code === 'NE') return 'Niger';
  return 'All jurisdictions';
}

/**
 * Rows carry jurisdiction in one of three shapes depending on where they came
 * from (engine currency, identity country code, or an explicit field). One
 * predicate, so every screen narrows the same way.
 */
export function rowMatchesJurisdiction(row: unknown, filter: JurisdictionFilter): boolean {
  if (filter === 'ALL') return true;
  if (!row || typeof row !== 'object') return true;
  const record = row as Record<string, unknown>;
  const candidates = [record.jurisdiction, record.countryCode, record.country];
  for (const raw of candidates) {
    if (typeof raw !== 'string' || !raw) continue;
    const value = raw.toUpperCase();
    if (value === filter) return true;
    if (value.startsWith('CROSS_BORDER') || value === 'ALL') return true;
    if (value.includes('NIGERIA') && filter === 'NG') return true;
    if ((value.includes('NIGER') || value === 'XOF' || value.includes('UEMOA')) && filter === 'NE') return true;
    if (value === 'NGN' && filter === 'NG') return true;
    // A row that states a country explicitly and it is not the filter: exclude.
    if (value === 'NG' || value === 'NE') return value === filter;
  }
  // No jurisdiction on the record (e.g. a platform metric): never hide it.
  return true;
}
