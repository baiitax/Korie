import { redirect } from "next/navigation";

/**
 * /support/login → /login
 *
 * Sign-in is centralized: the main /login page authenticates against real
 * Supabase Auth and asks /api/auth/session/resolve which persona this
 * account is (RBAC), then routes support officers (public.support_officers)
 * to /support. This route only remains so old bookmarks land on the central
 * page.
 */
export default function SupportLoginPage() {
  redirect("/login");
}
