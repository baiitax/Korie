"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAdminData } from "./AdminDataGateway";
import {
  LayoutDashboard,
  ArrowRightLeft,
  Users,
  Building2,
  Layers,
  ShieldCheck,
  Server,
  LifeBuoy,
  Lock,
  BrainCircuit,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { KorieLogo as BrandLogo } from "@/components/brand/KorieLogo";

/**
 * AdminRail — floating vertical navigation rail (collapsed 80px → expanded
 * 264px), the primary desktop navigation for the command center.
 *
 * Collapsed: one icon per section with a hover tooltip and live badge counts
 * (KYC queue, reconciliation exceptions, open disputes — real numbers from
 * /api/admin/overview; no badge when the count is zero or unavailable).
 * Expanded: the full grouped navigation with labels.
 *
 * The static "P0 / Live / 2 Exp / Alert" badges the old sidebar carried are
 * gone — they asserted states no backend had reported.
 */

interface RailItem {
  label: string;
  href: string;
}
interface RailSection {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  badgeSource?: "kyc" | "reconciliation" | "disputes";
  items?: RailItem[];
}

export const AdminRailSections: RailSection[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    href: "/admin",
  },
  {
    key: "operations",
    label: "Operations",
    icon: ArrowRightLeft,
    href: "/admin/transactions",
    items: [
      { label: "Transactions", href: "/admin/transactions" },
      { label: "Transfers (NIP/CFA)", href: "/admin/transfers" },
      { label: "Bill Payments", href: "/admin/bill-payments" },
      { label: "Cash & Vaults (CIT)", href: "/admin/cash-operations" },
      { label: "Settlements", href: "/admin/settlements" },
    ],
  },
  {
    key: "customers",
    label: "Customers",
    icon: Users,
    href: "/admin/customers",
    badgeSource: "kyc",
    items: [
      { label: "Customers", href: "/admin/customers" },
      { label: "KYC / KYB Review", href: "/admin/kyc" },
      { label: "Adashi / Ajo (ROSCA)", href: "/admin/adashi" },
      { label: "Disputes & Claims", href: "/admin/disputes" },
      { label: "Wallets Control", href: "/admin/wallets" },
    ],
  },
  {
    key: "agency",
    label: "Agency & Merchants",
    icon: Building2,
    href: "/admin/agents",
    items: [
      { label: "Agents & POS", href: "/admin/agents" },
      { label: "Merchants", href: "/admin/merchants" },
      { label: "BDC / FX Desks", href: "/admin/bdc" },
      { label: "Corporate Business", href: "/admin/businesses" },
      { label: "Aggregators", href: "/admin/aggregators" },
    ],
  },
  {
    key: "finance",
    label: "Finance",
    icon: Layers,
    href: "/admin/ledger",
    badgeSource: "reconciliation",
    items: [
      { label: "Immutable Ledger", href: "/admin/ledger" },
      { label: "Reconciliation", href: "/admin/reconciliation" },
      { label: "Treasury & Liquidity", href: "/admin/treasury" },
      { label: "FX Rates Engine", href: "/admin/fx" },
      { label: "Products", href: "/admin/products" },
    ],
  },
  {
    key: "compliance",
    label: "Risk & Compliance",
    icon: ShieldCheck,
    href: "/admin/compliance",
    items: [
      { label: "Compliance Console", href: "/admin/compliance" },
      { label: "Risk & Fraud Monitor", href: "/admin/risk" },
      { label: "KYC / KYB Review", href: "/admin/kyc" },
    ],
  },
  {
    key: "infrastructure",
    label: "Banking Nodes",
    icon: Server,
    href: "/admin/banking-nodes",
    items: [
      { label: "Banking Nodes", href: "/admin/banking-nodes" },
      { label: "APIs & Logs", href: "/admin/apis" },
      { label: "Webhooks Dispatcher", href: "/admin/webhooks" },
      { label: "System Health", href: "/admin/system-health" },
    ],
  },
  {
    key: "support",
    label: "Support",
    icon: LifeBuoy,
    href: "/admin/support",
    badgeSource: "disputes",
    items: [
      { label: "Support Tickets", href: "/admin/support" },
      { label: "Disputes & Claims", href: "/admin/disputes" },
    ],
  },
  {
    key: "security",
    label: "Security & Audit",
    icon: Lock,
    href: "/admin/security",
    items: [
      { label: "Security & Sessions", href: "/admin/security" },
      { label: "Immutable Audit Log", href: "/admin/audit" },
      { label: "Team & Roles", href: "/admin/team" },
    ],
  },
  {
    key: "intelligence",
    label: "Intelligence",
    icon: BrainCircuit,
    href: "/admin/intelligence",
    items: [
      { label: "AI & Decision Intel", href: "/admin/intelligence" },
      { label: "Reports Builder", href: "/admin/reports" },
    ],
  },
  {
    key: "settings",
    label: "Settings",
    icon: Settings,
    href: "/admin/settings",
  },
];

export const AdminRail: React.FC = () => {
  const pathname = usePathname();
  const { overview } = useAdminData();
  const [expanded, setExpanded] = useState(false);

  // The sign-in route renders without the shell.

  const badgeCount = (source?: RailSection["badgeSource"]): number | null => {
    if (!source || !overview) return null;
    if (source === "kyc") {
      const d = overview.kycQueue.data;
      return d && d.pending > 0 ? d.pending : null;
    }
    if (source === "reconciliation") {
      const d = overview.reconciliation.data;
      return d && d.openExceptions > 0 ? d.openExceptions : null;
    }
    if (source === "disputes") {
      const d = overview.disputes.data;
      return d && d.open > 0 ? d.open : null;
    }
    return null;
  };

  const isSectionActive = (s: RailSection) =>
    s.href === "/admin" ? pathname === "/admin" : pathname === s.href || pathname.startsWith(`${s.href}/`) ||
      (s.items ?? []).some((i) => pathname === i.href || pathname.startsWith(`${i.href}/`));

  return (
    <aside
      aria-label="Admin primary navigation"
      className={`hidden lg:flex sticky top-4 h-[calc(100vh-2rem)] shrink-0 flex-col rounded-3xl border border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur-xl shadow-[var(--shadow-card)] z-30 transition-[width] duration-200 ease-out ${
        expanded ? "w-[264px]" : "w-20"
      }`}
    >
      {/* Brand */}
      <div className={`flex items-center gap-2.5 border-b border-[var(--border)] px-3 py-4 ${expanded ? "" : "justify-center"}`}>
        <Link href="/admin" aria-label="KoriePay Admin home" className="flex items-center gap-2.5">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[var(--brand-soft)]">
            <BrandLogo className="h-6 w-6" />
          </span>
          {expanded && (
            <span className="flex flex-col leading-tight">
              <span className="text-[13px] font-extrabold tracking-tight text-[var(--foreground)]">KORIEPAY</span>
              <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--brand-primary)]">Command</span>
            </span>
          )}
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2.5 py-3">
        <ul className="space-y-1">
          {AdminRailSections.map((s) => {
            const active = isSectionActive(s);
            const Icon = s.icon;
            const badge = badgeCount(s.badgeSource);
            return (
              <li key={s.key} className={expanded ? "" : "flex justify-center"}>
                {expanded ? (
                  <div className="rounded-2xl">
                    <Link
                      href={s.href}
                      aria-current={active ? "page" : undefined}
                      className={`flex min-h-[44px] items-center gap-3 rounded-2xl px-3 transition-colors ${
                        active
                          ? "bg-[var(--brand-soft)] text-[var(--brand-primary)]"
                          : "text-[var(--foreground-muted)] hover:bg-[var(--surface-elevated)] hover:text-[var(--foreground)]"
                      }`}
                    >
                      <Icon className="h-[18px] w-[18px] shrink-0" />
                      <span className="flex-1 truncate text-[13px] font-semibold">{s.label}</span>
                      {badge !== null && (
                        <span className="rounded-full bg-[var(--brand-primary)] px-1.5 py-0.5 text-[10px] font-bold text-white tabular-nums">
                          {badge}
                        </span>
                      )}
                    </Link>
                    {(s.items ?? []).length > 0 && (
                      <ul className="mt-0.5 mb-1 ml-[26px] space-y-0.5 border-l border-[var(--border)] pl-2.5">
                        {s.items!.map((item) => {
                          const itemActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                          return (
                            <li key={item.href}>
                              <Link
                                href={item.href}
                                aria-current={itemActive ? "page" : undefined}
                                className={`block truncate rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition-colors ${
                                  itemActive
                                    ? "text-[var(--brand-primary)] font-semibold"
                                    : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
                                }`}
                              >
                                {item.label}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                ) : (
                  <div className="group/rail relative">
                    <Link
                      href={s.href}
                      aria-label={s.label}
                      aria-current={active ? "page" : undefined}
                      className={`relative flex h-12 w-12 items-center justify-center rounded-2xl transition-colors ${
                        active
                          ? "bg-[var(--brand-soft)] text-[var(--brand-primary)]"
                          : "text-[var(--foreground-muted)] hover:bg-[var(--surface-elevated)] hover:text-[var(--foreground)]"
                      }`}
                    >
                      {active && (
                        <span
                          aria-hidden="true"
                          className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 -translate-x-2 rounded-full bg-[var(--brand-primary)]"
                        />
                      )}
                      <Icon className="h-5 w-5" />
                      {badge !== null && (
                        <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-[var(--brand-primary)] px-1 text-[9px] font-bold text-white tabular-nums">
                          {badge > 99 ? "99+" : badge}
                        </span>
                      )}
                    </Link>
                    {/* Tooltip */}
                    <span
                      role="tooltip"
                      className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg bg-[var(--foreground)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--background)] opacity-0 shadow-lg transition-opacity duration-150 group-hover/rail:opacity-100"
                    >
                      {s.label}
                    </span>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Expand toggle */}
      <div className={`border-t border-[var(--border)] p-2.5 ${expanded ? "" : "flex justify-center"}`}>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-pressed={expanded}
          aria-label={expanded ? "Collapse navigation" : "Expand navigation"}
          className={`flex min-h-[40px] items-center gap-2 rounded-xl text-[var(--foreground-muted)] transition-colors hover:bg-[var(--surface-elevated)] hover:text-[var(--foreground)] ${expanded ? "w-full px-3" : "h-10 w-10 justify-center"}`}
        >
          {expanded ? <PanelLeftClose className="h-[18px] w-[18px]" /> : <PanelLeftOpen className="h-[18px] w-[18px]" />}
          {expanded && <span className="text-[12px] font-semibold">Collapse</span>}
        </button>
      </div>
    </aside>
  );
};

export default AdminRail;
