"use client";

import React from "react";
import Link from "next/link";
import { useAdminData } from "./AdminDataGateway";
import type { AdminOverviewPayload, Section } from "@/lib/admin/overviewData";
import {
  Database,
  Server,
  CheckCircle2,
  HelpCircle,
  AlertTriangle,
  ArrowRight,
  Users,
  Building2,
  ArrowRightLeft,
  FileCheck2,
  ShieldCheck,
  Scale,
  Radio,
  History,
} from "lucide-react";

/**
 * CommandCenterOverview — the admin dashboard.
 *
 * Every number on this screen comes from /api/admin/overview, which reads
 * the live database. Sections that could not be read render an explicit
 * "unavailable" chip — never a placeholder number. Banking nodes without
 * telemetry render Unknown, per the rebuild brief: unknown is never
 * converted into operational.
 *
 * What this replaced: getExecutiveFinancialMetrics() — a function that
 * returned hardcoded ₦842.15M volume, 48,920 customers and a 99.2% success
 * rate on the most visible screen in the portal.
 */

function UnavailableChip({ error }: { error?: string }) {
  return (
    <span
      title={error ?? "This section could not be read from the backend."}
      className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-700"
    >
      <AlertTriangle className="h-2.5 w-2.5" />
      Unavailable
    </span>
  );
}

function KpiCard({
  href,
  icon: Icon,
  label,
  value,
  sub,
  error,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value?: string;
  sub?: string;
  error?: string;
}) {
  return (
    <Link
      href={href}
      className="group flex min-h-[118px] flex-col justify-between rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)] transition-colors hover:border-[var(--brand-border)]"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
          <Icon className="h-3.5 w-3.5" />
          {label}
        </span>
        {error ? <UnavailableChip error={error} /> : <ArrowRight className="h-3.5 w-3.5 text-[var(--foreground-muted)] opacity-0 transition-opacity group-hover:opacity-100" />}
      </div>
      <div>
        <p className="font-mono text-xl font-extrabold tabular-nums tracking-tight text-[var(--foreground)] sm:text-2xl">
          {error ? "—" : value}
        </p>
        {sub && <p className="mt-0.5 text-[10px] leading-snug text-[var(--foreground-muted)]">{sub}</p>}
      </div>
    </Link>
  );
}

function formatNgn(n: number): string {
  return `₦${n.toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;
}
function formatXof(n: number): string {
  return `CFA ${n.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}`;
}

function HealthDot({ state }: { state: string }) {
  const tone =
    state === "operational"
      ? "bg-emerald-500"
      : state === "unreachable"
        ? "bg-red-500"
        : "bg-slate-400";
  return <span className={`inline-block h-2 w-2 rounded-full ${tone}`} aria-hidden="true" />;
}

function BankingNodeCard({ node }: { node: AdminOverviewPayload["bankingNodes"]["nodes"][number] }) {
  const tone =
    node.status === "operational"
      ? "border-emerald-200 bg-emerald-50/60"
      : node.status === "unknown"
        ? "border-[var(--border)] bg-[var(--surface)]"
        : "border-amber-200 bg-amber-50/60";
  return (
    <div className={`rounded-3xl border p-4 ${tone}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--surface)] shadow-[var(--shadow-sm)]">
            <Server className="h-4 w-4 text-[var(--brand-primary)]" />
          </span>
          <div>
            <p className="text-[13px] font-extrabold text-[var(--foreground)]">{node.name}</p>
            <p className="text-[10px] font-semibold text-[var(--foreground-muted)]">
              {node.country === "NG" ? "Nigeria · NGN rails" : "Niger Republic · XOF rails"}
            </p>
          </div>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
            node.status === "operational"
              ? "border-emerald-200 bg-white text-emerald-700"
              : node.status === "unknown"
                ? "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground-muted)]"
                : "border-amber-200 bg-white text-amber-700"
          }`}
        >
          {node.status === "unknown" ? <HelpCircle className="h-2.5 w-2.5" /> : <CheckCircle2 className="h-2.5 w-2.5" />}
          {node.status}
        </span>
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div>
          <dt className="text-[9px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">Latency</dt>
          <dd className="mt-0.5 font-mono text-xs font-bold text-[var(--foreground)]">
            {node.latencyMs != null ? `${node.latencyMs} ms` : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-[9px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">24h success</dt>
          <dd className="mt-0.5 font-mono text-xs font-bold text-[var(--foreground)]">
            {node.successRate24h != null ? `${(Number(node.successRate24h) * 100).toFixed(1)}%` : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-[9px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">Last ping</dt>
          <dd className="mt-0.5 font-mono text-xs font-bold text-[var(--foreground)]">
            {node.lastPingAt ? new Date(node.lastPingAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "—"}
          </dd>
        </div>
      </dl>
      {node.status === "unknown" && (
        <p className="mt-2.5 text-[9px] leading-snug text-[var(--foreground-muted)]">
          No provider telemetry recorded yet — status stays Unknown until a real probe reports it.
        </p>
      )}
    </div>
  );
}

export const CommandCenterOverview: React.FC = () => {
  const { overview, identity, refresh, phase, overviewError } = useAdminData();

  if (phase === "checking" || (phase === "ready" && !overview)) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-busy="true" aria-live="polite">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-[118px] animate-pulse rounded-3xl border border-[var(--border)] bg-[var(--surface)]" />
        ))}
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center">
        <AlertTriangle className="mx-auto h-6 w-6 text-amber-500" />
        <p className="mt-3 text-sm font-bold text-[var(--foreground)]">Overview unavailable</p>
        <p className="mt-1 text-xs text-[var(--foreground-muted)]">{overviewError ?? "The live overview could not be loaded."}</p>
        <button
          type="button"
          onClick={() => void refresh()}
          className="mt-4 min-h-[40px] rounded-xl bg-[var(--brand-primary)] px-4 text-xs font-bold text-white"
        >
          Try again
        </button>
      </div>
    );
  }

  const tx: Section<AdminOverviewPayload["customerTransactions"]["data"]> = overview.customerTransactions;
  const cust = overview.customers;
  const agents = overview.agents;
  const kyc = overview.kycQueue;
  const disputes = overview.disputes;
  const recon = overview.reconciliation;
  const incidents = overview.incidents;
  const outbox = overview.outbox;

  const hour = new Date(overview.generatedAt).getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold tracking-tight text-[var(--foreground)]">
            {greeting}
            {identity?.email ? `, ${identity.email.split("@")[0]}` : ""}.
          </h2>
          <p className="mt-0.5 text-[11px] text-[var(--foreground-muted)]">
            KoriePay operational overview ·{" "}
            <span className="font-mono">
              {new Date(overview.generatedAt).toLocaleTimeString("en-GB")}
            </span>{" "}
            · {identity?.role ?? "—"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          className="min-h-[38px] rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 text-xs font-bold text-[var(--foreground)] transition-colors hover:border-[var(--brand-border)]"
        >
          Refresh
        </button>
      </div>

      {/* System health */}
      <section aria-label="System health" className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
            <Database className="h-3.5 w-3.5" /> System health
          </h3>
        </div>
        <ul className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { name: "API", state: overview.systemHealth.api, note: "proven by this response" },
            { name: "Auth", state: overview.systemHealth.auth, note: "session verified" },
            { name: "Database", state: overview.systemHealth.database, note: overview.systemHealth.databaseLatencyMs != null ? `${overview.systemHealth.databaseLatencyMs} ms probe` : "probe failed" },
            { name: "Transaction engine", state: overview.systemHealth.transactionEngine, note: "no probe yet" },
            { name: "Webhook engine", state: overview.systemHealth.webhookEngine, note: "no probe yet" },
            { name: "Notifications", state: overview.systemHealth.notificationEngine, note: "no probe yet" },
          ].map((s) => (
            <li key={s.name} className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-2.5">
              <p className="flex items-center gap-1.5 text-[10px] font-bold text-[var(--foreground)]">
                <HealthDot state={s.state} />
                {s.name}
              </p>
              <p className="mt-1 text-[9px] font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">
                {s.state === "operational" ? "Operational" : s.state === "unknown" ? "Unknown" : "Unreachable"}
              </p>
              <p className="mt-0.5 text-[9px] text-[var(--foreground-muted)]">{s.note}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* KPI grid — drill-down everything */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          href="/admin/customers"
          icon={Users}
          label="Customers"
          value={cust.data ? cust.data.total.toLocaleString() : undefined}
          sub={cust.data ? `${cust.data.active.toLocaleString()} active` : undefined}
          error={cust.error}
        />
        <KpiCard
          href="/admin/agents"
          icon={Building2}
          label="Agents"
          value={agents.data ? agents.data.total.toLocaleString() : undefined}
          sub={agents.data ? `${agents.data.active.toLocaleString()} active · ${agents.data.pendingApplications.toLocaleString()} applications pending` : undefined}
          error={agents.error}
        />
        <KpiCard
          href="/admin/transactions"
          icon={ArrowRightLeft}
          label="Transactions"
          value={tx.data ? tx.data.total.toLocaleString() : undefined}
          sub={
            tx.data
              ? `${tx.data.successful.toLocaleString()} successful · ${tx.data.failed.toLocaleString()} failed · ${tx.data.pending.toLocaleString()} pending`
              : undefined
          }
          error={tx.error}
        />
        <KpiCard
          href="/admin/transactions"
          icon={Scale}
          label="Volume (recent window)"
          value={tx.data ? `${formatNgn(tx.data.volumeNgn)} · ${formatXof(tx.data.volumeXof)}` : undefined}
          sub={tx.data ? tx.data.volumeWindowLabel : undefined}
          error={tx.error}
        />
      </div>

      {/* Banking nodes */}
      <section aria-label="Banking nodes" className="grid gap-3 lg:grid-cols-2">
        {overview.bankingNodes.nodes.map((n) => (
          <BankingNodeCard key={n.code} node={n} />
        ))}
      </section>

      {/* Work queues */}
      <section aria-label="Operational queues" className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
          What needs attention
        </h3>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          {[
            { href: "/admin/kyc", icon: FileCheck2, label: "KYC queue", data: kyc, count: (d: any) => d.pending },
            { href: "/admin/reconciliation", icon: Scale, label: "Reconciliation exceptions", data: recon, count: (d: any) => d.openExceptions },
            { href: "/admin/disputes", icon: ShieldCheck, label: "Open disputes", data: disputes, count: (d: any) => d.open },
            { href: "/admin/system-health", icon: AlertTriangle, label: "Open incidents", data: incidents, count: (d: any) => d.open },
            { href: "/admin/webhooks", icon: Radio, label: "Outbox pending / failed", data: outbox, count: (d: any) => d.pending + d.failed, sub: (d: any) => `${d.pending} pending · ${d.failed} failed` },
          ].map((q) => {
            const Icon = q.icon;
            const ok = q.data.status === "ok" && q.data.data;
            const count = ok ? q.count(q.data.data) : null;
            return (
              <li key={q.href}>
                <Link
                  href={q.href}
                  className="flex min-h-[64px] items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-3 transition-colors hover:border-[var(--brand-border)]"
                >
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${count && count > 0 ? "bg-amber-50 text-amber-600" : "bg-[var(--surface-elevated)] text-[var(--foreground-muted)]"}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[11px] font-bold text-[var(--foreground)]">{q.label}</span>
                    {ok ? (
                      <span className="block text-[10px] text-[var(--foreground-muted)]">
                        {q.sub ? q.sub(q.data.data) : `${count} open`}
                      </span>
                    ) : (
                      <UnavailableChip error={q.data.error} />
                    )}
                  </span>
                  {ok && (
                    <span className={`font-mono text-lg font-extrabold tabular-nums ${count && count > 0 ? "text-amber-600" : "text-[var(--foreground-muted)]"}`}>
                      {count}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Activity — the immutable audit record */}
      <section aria-label="Recent activity" className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
            <History className="h-3.5 w-3.5" /> Recent activity
          </h3>
          <Link href="/admin/audit" className="text-[11px] font-bold text-[var(--brand-primary)] hover:underline">
            Full audit log →
          </Link>
        </div>
        {overview.activity.events.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--background)] p-4 text-center text-[11px] text-[var(--foreground-muted)]">
            No audit events recorded yet. Administrative and system actions will appear here as they happen.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-[var(--border)]">
            {overview.activity.events.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 py-2.5">
                <span className="min-w-0">
                  <span className="block truncate font-mono text-[11px] font-bold text-[var(--foreground)]">{e.action}</span>
                  <span className="block truncate text-[10px] text-[var(--foreground-muted)]">
                    {e.actorEmail ?? "system"}{e.actorRole ? ` · ${e.actorRole}` : ""}
                    {e.resourceType ? ` · ${e.resourceType}` : ""}
                  </span>
                </span>
                <span className="shrink-0 font-mono text-[10px] text-[var(--foreground-muted)]">
                  {e.createdAt ? new Date(e.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "—"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

export default CommandCenterOverview;
