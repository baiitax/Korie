import { redirect } from "next/navigation";

/**
 * /admin/login → /login
 *
 * Sign-in is centralized: the main /login page authenticates against real
 * Supabase Auth and asks /api/auth/session/resolve which persona this
 * account is (RBAC), then routes admin roles (SUPER_ADMIN,
 * ORGANIZATION_OWNER, ORGANIZATION_ADMIN) to /admin. This route only
 * remains so old bookmarks land on the central page.
 */
export default function AdminLoginPage() {
  redirect("/login");
}
