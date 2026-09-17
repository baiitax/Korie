/**
 * Tenant (org_id) scoping for the shared admin/compliance resource registry.
 *
 * Context (ADMIN_PORTAL_REVIEW.md, finding #1): authorizeAdminRequest() and
 * authorizeComplianceRequest() both resolve ORGANIZATION_OWNER/
 * ORGANIZATION_ADMIN as legitimate admin-portal roles, but nothing ever
 * filtered the resource registry's queries by the caller's org_id — any
 * authenticated holder of one of those roles could list/patch every
 * tenant's rows through /api/admin/data/* and /api/compliance/data/*, not
 * just their own organization's. The platform is genuinely multi-tenant
 * today (KoriePay HQ, a merchant org, and an aggregator org all have real
 * rows in the DB), so this was a live cross-tenant IDOR, not a theoretical
 * one — it was just unexploited because no ORGANIZATION_* role grant has
 * been issued yet in seed data.
 *
 * Fix shape: only the two roles a *tenant's own staff* would hold
 * (ORGANIZATION_OWNER, ORGANIZATION_ADMIN) are scoped. SUPER_ADMIN and the
 * KoriePay-internal operating roles (AGENCY_OPS_ADMIN, FINANCE_OFFICER,
 * COMPLIANCE_OFFICER, AGENCY_COMPLIANCE) keep platform-wide visibility —
 * those roles exist only under the KoriePay HQ org today and model
 * platform staff, not tenant self-service.
 *
 * Coverage is honest, not universal: only resources whose table carries a
 * direct org_id column (declared via ResourceDef.orgScopeColumn in
 * resourceRegistry.ts) can be scoped with a plain `.eq()`. Most of the
 * other ~95 registry tables have no org_id at all — either they're linked
 * transitively through customer_id/agent_id/merchant_id, or they're
 * platform-global reference/ops data (fx_rates, roles, risk_cases,
 * treasury_*, security_incidents, …) with no tenant concept to scope by.
 * Rather than leave those readable-but-unscoped for tenant-role callers
 * (which would silently under-protect them), this module denies
 * tenant-scoped roles access to any resource without a declared scope
 * column. That is more restrictive than before for that gap, but it is
 * the safe default: a resource can be opened up for tenant roles later by
 * adding a real orgScopeColumn (or a deliberate transitive-join scope),
 * not by accident.
 */

export const TENANT_SCOPED_ROLES = ['ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN'] as const;

export function requiresOrgScoping(roleName?: string | null): boolean {
  return !!roleName && (TENANT_SCOPED_ROLES as readonly string[]).includes(roleName);
}
