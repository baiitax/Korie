"use client";

import React from "react";
import { PageHeader, TextCell } from "@/components/admin/AdminPageUI";
import ResourceTable, { StatusChip, ResourceColumn } from "@/components/admin/ResourceTable";
import { useAdminResource } from "@/lib/admin/useAdminResource";

/**
 * Platform settings — the old page was a fake form: every "Save" just set a
 * local flag and changed nothing. Real configuration lives in the database
 * (organizations, api_gateway_routes); anything that requires the runtime
 * engine says so instead of pretending.
 */
export default function SettingsPage() {
  const { rows: orgs, loading, error } = useAdminResource("organizations", { limit: 10 });

  const routeCols: ResourceColumn[] = [
    { key: "route_code", label: "Route", render: (r) => <span className="font-bold text-[var(--foreground)]">{r.route_code}</span> },
    { key: "group_name", label: "Group" },
    { key: "http_method", label: "Method", render: (r) => <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[var(--brand-soft)] text-[var(--brand-primary)] border border-[var(--brand-primary)]/20">{r.http_method}</span> },
    { key: "required_scope", label: "Scope", hideOnMobile: true },
    { key: "rate_limit_per_second", label: "Rate limit", className: "text-right", render: (r) => <span>{r.rate_limit_per_second ?? "—"}/s</span> },
    { key: "is_active", label: "State", render: (r) => <StatusChip value={r.is_active ? "ACTIVE" : "INACTIVE"} /> },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <PageHeader
        eyebrow="Settings"
        title="Platform Settings"
        subtitle="Organization profile and API gateway configuration read live from the database. Operational toggles that require the runtime engine are not simulated here."
      />

      <section className="space-y-3">
        <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--foreground-muted)]">Organizations</h2>
        {loading ? (
          <div className="p-8 rounded-2xl bg-[var(--surface)] border border-[var(--border)] animate-pulse h-24" />
        ) : error ? (
          <div className="p-6 rounded-2xl bg-[var(--surface)] border border-amber-500/20 text-xs text-[var(--foreground-muted)]">
            Could not load organizations: {error.message}
          </div>
        ) : orgs.length === 0 ? (
          <div className="p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border)] text-xs text-[var(--foreground-muted)]">
            No organizations are registered on this deployment.
          </div>
        ) : (
          orgs.map((org) => (
            <div key={String(org.id)} className="p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-base font-extrabold text-[var(--foreground)]">{String(org.name)}</p>
                  <p className="text-xs text-[var(--foreground-muted)] font-mono mt-0.5">{String(org.slug)}</p>
                </div>
                <StatusChip value={String(org.verification_status)} />
              </div>
              <dl className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                {[
                  ["Country", org.country],
                  ["Jurisdiction", org.jurisdiction],
                  ["Business type", org.business_type],
                  ["Tier", org.tier],
                  ["Default currency", org.default_currency],
                ].map(([label, value]) => (
                  <div key={String(label)}>
                    <dt className="text-[10px] font-mono uppercase text-[var(--foreground-muted)]">{String(label)}</dt>
                    <dd className="mt-0.5 font-semibold text-[var(--foreground)]">
                      <TextCell value={value} mono={false} />
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ))
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--foreground-muted)]">API gateway routes</h2>
        <ResourceTable
          resource="api-routes"
          columns={routeCols}
          exportName="api-gateway-routes"
          searchPlaceholder="Search route code, group…"
          filters={[{ key: "http_method", label: "Method" }]}
          limit={50}
        />
      </section>

      <p className="text-[11px] text-[var(--foreground-muted)] font-mono leading-relaxed">
        Note: transaction limits, fees and product rules are governed by versioned banking products (see Products) and
        engine-side configuration. This portal displays the database of record; it does not offer unreviewed edits.
      </p>
    </div>
  );
}
