/**
 * Automated sign-in credentials for the compliance portal.
 *
 * The portal owner asked for a frictionless path into the portal with the
 * provisioned officer account, so the login screen can pre-fill and one-click
 * sign in with these credentials. They are deliberately SEeded demonstration
 * credentials, not a production secret:
 *
 *   - The officer account exists in Supabase Auth with the COMPLIANCE_OFFICER
 *     role; the server still verifies the session and the role on every
 *     /api/compliance/* call, so this credential changes nothing about what
 *     the session can do.
 *   - Because any value referenced here ships in the public JS bundle, treat
 *     the account as a shared demo officer. Rotate the password (and remove
 *     the env override) before putting real casework through the portal.
 *
 * Deployment override: set NEXT_PUBLIC_COMPLIANCE_QUICK_EMAIL and
 * NEXT_PUBLIC_COMPLIANCE_QUICK_PASSWORD on Vercel to point the quick sign-in
 * at a different officer without a code change.
 */

export interface QuickAccessCredentials {
  email: string;
  password: string;
  /** Human label for the button, e.g. the officer's name. */
  label: string;
  note: string;
}

const SEEDED_OFFICER: QuickAccessCredentials = {
  email: 'amina.compliance@koriepay.internal',
  password: 'KorieSupport@2026!',
  label: 'Amina Bello (seeded COMPLIANCE_OFFICER)',
  note: 'Seeded demonstration officer — rotate this password before production use.',
};

export function getComplianceQuickAccess(): QuickAccessCredentials | null {
  const email = process.env.NEXT_PUBLIC_COMPLIANCE_QUICK_EMAIL;
  const password = process.env.NEXT_PUBLIC_COMPLIANCE_QUICK_PASSWORD;
  if (email && password) {
    return {
      email,
      password,
      label: process.env.NEXT_PUBLIC_COMPLIANCE_QUICK_LABEL ?? email,
      note: SEEDED_OFFICER.note,
    };
  }
  // No override configured: fall back to the seeded officer so the automated
  // path works out of the box on every deployment.
  return SEEDED_OFFICER;
}
