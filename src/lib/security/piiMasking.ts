/**
 * Server-side PII masking for the compliance data plane (portal security
 * roadmap 2.5, PS-11).
 *
 * The support console already follows the model from spec §55: PII is masked
 * BY DEFAULT at the API boundary, unmasking requires a privileged role, and
 * every unmask is audited. This module brings the compliance console's
 * identity-persons reads to the same standard — previously the raw email,
 * phone and date of birth of every customer travelled to the browser of
 * anyone with a compliance-read session.
 *
 * Pure functions, no imports — safe to use from both route handlers and
 * client components (the client only reads PII_UNMASK_ROLES to decide
 * whether to offer the reveal button; the server enforces it).
 */

/** Roles that may unmask customer PII (mirrors COMPLIANCE_WRITE_ROLES in
 *  lib/security/complianceAuth.ts — duplicated here because that module
 *  pulls the server-only admin client and cannot be bundled client-side). */
export const PII_UNMASK_ROLES = [
  "SUPER_ADMIN",
  "ORGANIZATION_OWNER",
  "ORGANIZATION_ADMIN",
  "COMPLIANCE_OFFICER",
] as const;

export function canUnmaskPii(roles: string[] | undefined | null): boolean {
  return !!roles?.some((r) => (PII_UNMASK_ROLES as readonly string[]).includes(r));
}

/** j•••@g•••.com — the account is recognisable to its owner, useless to a shoulder-surfer. */
export function maskEmail(value: string | null | undefined): string | null {
  if (!value) return null;
  const [local, domain] = value.split("@");
  if (!local || !domain) return "•••";
  return `${local[0]}•••@${domain[0]}•••`;
}

/** •••• ••• •• 0847 — last four only, same rule the support console uses. */
export function maskPhone(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.replace(/\s+/g, "");
  const tail = trimmed.slice(-4);
  return `••••••${tail}`;
}

/** 1985-••-•• — the birth YEAR stays because age-band matters for KYC work. */
export function maskDateOfBirth(value: string | null | undefined): string | null {
  if (!value) return null;
  const year = String(value).slice(0, 4);
  return /^\d{4}$/.test(year) ? `${year}-••-••` : "••••-••-••";
}

type PiiRecord = Record<string, unknown>;

function maskRecord(record: PiiRecord): PiiRecord {
  const out: PiiRecord = { ...record };
  const rules: [string[], (v: string | null | undefined) => string | null][] = [
    [["email"], maskEmail],
    [["phone", "phoneNumber", "msisdn"], maskPhone],
    [["dateOfBirth", "dob"], maskDateOfBirth],
  ];
  for (const key of Object.keys(out)) {
    const value = out[key];
    if (typeof value !== "string") continue;
    const camel = key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
    for (const [names, mask] of rules) {
      if (names.includes(key) || names.includes(camel)) {
        out[key] = mask(value);
        break;
      }
    }
  }
  return out;
}

/** Mask the PII fields of identity rows (snake or camel keys) in place-ish. */
export function maskIdentityPersons<T>(rows: T[]): T[] {
  return rows.map((row) => (row && typeof row === "object" ? (maskRecord(row as PiiRecord) as T) : row));
}
