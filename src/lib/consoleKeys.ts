/**
 * Console API keys — how the admin and developer consoles authenticate to
 * their BFF routes (`/api/admin/*`, `/api/developers/*`).
 *
 * Each console keeps ONE key in localStorage (set on the bootstrap gate the
 * first time the console opens). Every console fetch wrapper attaches it as
 * the Bearer token. When no key is stored the request fires bare and the
 * route answers an honest 401 — the gate, not the fetch, owns the UX.
 *
 * The SANDBOX_*_BOOTSTRAP_KEY values below are PUBLIC documented demo
 * credentials (the matching verifiers live in DeveloperWorkspaceEngine's
 * seed rows). They exist so a fresh sandbox has a first credential. They
 * must never be used outside SANDBOX, and every surface that offers them
 * labels them "sandbox bootstrap — rotate me".
 */

export const ADMIN_KEY_STORAGE = 'korie_admin_key';
export const DEV_KEY_STORAGE = 'korie_dev_key';

export const SANDBOX_DEV_BOOTSTRAP_KEY = 'kp_test_cdb3db2b9b22a98c9c1b';
export const SANDBOX_ADMIN_BOOTSTRAP_KEY = 'kp_test_admin_sandbox_7f3a9c2e5b1d8046';

export type ConsoleKind = 'admin' | 'dev';

const storageFor = (kind: ConsoleKind) =>
  kind === 'admin' ? ADMIN_KEY_STORAGE : DEV_KEY_STORAGE;

function readStored(kind: ConsoleKind): string | null {
  try {
    const v = localStorage.getItem(storageFor(kind));
    return v && v.trim() ? v.trim() : null;
  } catch {
    return null;
  }
}

function writeStored(kind: ConsoleKind, key: string): void {
  try {
    localStorage.setItem(storageFor(kind), key.trim());
  } catch {
    /* storage unavailable — the gate will keep prompting honestly */
  }
}

function clearStored(kind: ConsoleKind): void {
  try {
    localStorage.removeItem(storageFor(kind));
  } catch {
    /* noop */
  }
}

export const getAdminKey = (): string | null => readStored('admin');
export const getDevKey = (): string | null => readStored('dev');
export const setAdminKey = (key: string): void => writeStored('admin', key);
export const setDevKey = (key: string): void => writeStored('dev', key);
export const clearAdminKey = (): void => clearStored('admin');
export const clearDevKey = (): void => clearStored('dev');

export const isAdminBootstrapKey = (key: string | null): boolean =>
  key === SANDBOX_ADMIN_BOOTSTRAP_KEY;
export const isDevBootstrapKey = (key: string | null): boolean =>
  key === SANDBOX_DEV_BOOTSTRAP_KEY;

/** Display-only fingerprint for "this console's key" surfaces. Never a verifier. */
export function maskConsoleKey(key: string | null): string {
  if (!key) return 'none stored';
  if (key.length <= 12) return `${key.slice(0, 4)}…`;
  return `${key.slice(0, 8)}…${key.slice(-4)}`;
}

async function keyFetch(
  kind: ConsoleKind,
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(init.headers || {});
  if (!headers.has('Authorization')) {
    const key = readStored(kind);
    if (key) headers.set('Authorization', `Bearer ${key}`);
  }
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  return fetch(input, { ...init, headers });
}

/** Authenticated fetch for `/api/admin/*` (key from the admin gate). */
export function adminFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  return keyFetch('admin', input, init);
}

/** Authenticated fetch for `/api/developers/*` (key from the developer gate). */
export function devFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  return keyFetch('dev', input, init);
}

/** Bearer header value for call sites that build header objects by hand. */
export function getAdminBearer(): string {
  const key = getAdminKey();
  return key ? `Bearer ${key}` : '';
}

/** Bearer header value for call sites that build header objects by hand. */
export function getDevBearer(): string {
  const key = getDevKey();
  return key ? `Bearer ${key}` : '';
}
