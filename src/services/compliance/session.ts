/**
 * Who is operating the portal.
 *
 * The previous version of this screen offered a dropdown to "switch Active
 * Compliance Officer" and labelled it *(RBAC Simulation)*. That is the exact
 * shape of a frontend-only permission model: clicking your way into the MLRO
 * seat changes nothing on the server, and it teaches an officer that roles are
 * cosmetic. It is gone.
 *
 * What replaces it is the real thing — `/api/compliance/session` resolves the
 * officer behind the verified Supabase session from the database (profile,
 * department, roles, MFA standing). The old `/api/security/me` endpoint
 * answered with a hardcoded in-memory identity no matter who called; this
 * service no longer consults it. If the session call fails, the profile menu
 * shows the auth-context name and says the rest is unavailable. The server
 * remains the only place access is decided.
 */

import { complianceFetch } from '@/lib/compliancePortalClient';

export interface ComplianceSessionView {
  displayName?: string;
  email?: string;
  department?: string;
  roles: string[];
  country?: string;
  mfaEnforced?: boolean;
  mfaMethod?: string;
  assuranceLevel?: string;
  activeSessions?: number;
  deviceTrust?: string;
  /** Populated when `/api/compliance/session` could not be read. */
  unavailableReason?: string;
  /** When `unavailableReason` is SESSION_NOT_AUTHORISED: was there no session
   *  at all (NO_SESSION) or a session without a compliance role (NO_ROLE)? */
  unauthorizedKind?: 'NO_SESSION' | 'NO_ROLE';
}

type MeEnvelope = {
  success?: boolean;
  status?: string;
  data?: Record<string, any>;
  actor?: Record<string, any>;
  assuranceLevel?: string;
  activeSessionsCount?: number;
  deviceTrust?: string;
};

export async function loadComplianceSession(signal?: AbortSignal): Promise<ComplianceSessionView> {
  try {
    const res = await complianceFetch('/api/compliance/session', { method: 'GET', signal });
    if (res.status === 401) {
      return { roles: [], unavailableReason: 'SESSION_NOT_AUTHORISED', unauthorizedKind: 'NO_SESSION' };
    }
    if (res.status === 403) {
      // A session exists but the officer holds no active compliance role.
      return { roles: [], unavailableReason: 'SESSION_NOT_AUTHORISED', unauthorizedKind: 'NO_ROLE' };
    }
    if (!res.ok) return { roles: [], unavailableReason: `HTTP_${res.status}` };
    const payload = (await res.json()) as MeEnvelope;
    const data = (payload?.data ?? payload ?? {}) as Record<string, any>;
    const actor = (data?.actor ?? undefined) as Record<string, any> | undefined;
    if (!actor) return { roles: [], unavailableReason: 'NO_ACTOR' };

    return {
      displayName: typeof actor.fullName === 'string' ? actor.fullName : undefined,
      email: typeof actor.email === 'string' ? actor.email : undefined,
      department: typeof actor.department === 'string' ? actor.department : undefined,
      roles: Array.isArray(actor.roles) ? actor.roles.map(String) : [],
      country: typeof actor.country === 'string' ? actor.country : undefined,
      mfaEnforced: typeof actor.mfaEnforced === 'boolean' ? actor.mfaEnforced : undefined,
      mfaMethod: typeof actor.mfaMethod === 'string' ? actor.mfaMethod : undefined,
      assuranceLevel: data?.assuranceLevel ?? (typeof actor.currentAal === 'string' ? actor.currentAal : undefined),
      activeSessions: typeof data?.activeSessionsCount === 'number' ? data.activeSessionsCount : undefined,
      deviceTrust: typeof data?.deviceTrust === 'string' ? data.deviceTrust : undefined,
    };
  } catch (err: any) {
    if (err?.name === 'AbortError') throw err;
    return { roles: [], unavailableReason: 'NETWORK' };
  }
}
