import { redirect } from "next/navigation";

/**
 * /compliance/login → /login
 *
 * Sign-in is centralized: the main /login page authenticates against real
 * Supabase Auth and asks /api/auth/session/resolve which persona this
 * account is (RBAC), then routes COMPLIANCE_OFFICER sessions here — to
 * /compliance. The one-click automated officer sign-in also lives on /login.
 * This route only remains so old bookmarks land on the central page.
 */
export default function ComplianceLoginPage() {
  redirect("/login");
}
