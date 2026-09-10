"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAgent } from "../AgentContext";
import KorieLogo from "@/components/brand/KorieLogo";
import ShellAccount from "@/components/ui/ShellAccount";
import PortalFooter from "@/components/ui/PortalFooter";
import AgentReceiptModal from "./AgentReceiptModal";
import DailyReconciliationModal from "./DailyReconciliationModal";
import { PortalPreloader } from "@/components/loading";
import {
  Home,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  Users,
  Activity,
  Coins,
  FileSpreadsheet,
  CheckCircle2,
  Smartphone,
  ShieldCheck,
  LifeBuoy,
  Settings,
  Bell,
  Eye,
  EyeOff,
  WifiOff,
  Radio,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
} from "lucide-react";

/**
 * AgencyShell — the Agent (agency banking) portal chrome.
 *
 * Mirrors the Admin command center's structural language so every staff/ops
 * portal in the product family reads as one coherent system:
 *   - a floating, collapsible desktop rail (icon-only <-> labeled) instead of
 *     a fixed 264px sidebar with no way to reclaim screen width;
 *   - a slim top command bar carrying the current page title, a search
 *     affordance, and grouped identity/status controls instead of a dense
 *     unlabeled row of icon buttons;
 *   - fully token-driven surfaces (`var(--surface)`, `var(--border)`, etc.)
 *     so the portal adapts correctly between Day and Night mode — the old
 *     shell hardcoded dark navy hexes that stayed dark even in Light mode.
 *
 * The agent brand accent (amber, for the agency/POS domain) is preserved,
 * but only ever layered on top of theme tokens, never used to hardcode a
 * background that must survive a theme switch.
 */

interface RailItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}
interface RailSection {
  key: string;
  title: string;
  items: RailItem[];
}

const TITLES: [prefix: string, title: string][] = [
  ["/agent/cash-in", "Cash-In"],
  ["/agent/cash-out", "Cash-Out"],
  ["/agent/adashi", "Adashi / Ajo (ROSCA)"],
  ["/agent/transfer", "Send Transfer"],
  ["/agent/customers", "Customers"],
  ["/agent/transactions", "Transactions"],
  ["/agent/team", "Sub-Agent Team"],
  ["/agent/liquidity", "Liquidity Center"],
  ["/agent/commissions", "Commissions"],
  ["/agent/reconciliation", "Reconciliation"],
  ["/agent/settlement", "Bank Settlements"],
  ["/agent/terminals", "Terminals"],
  ["/agent/support", "Support"],
  ["/agent/settings", "Settings"],
  ["/agent/kyc", "KYC Verification"],
  ["/agent/notifications", "Notifications"],
  ["/agent/profile", "Profile"],
];

function titleFor(pathname: string): string {
  if (pathname === "/agent") return "Executive Overview";
  const hit = TITLES.find(([p]) => pathname === p || pathname.startsWith(`${p}/`));
  return hit ? hit[1] : "Agency Banking";
}

export const AgencyShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const {
    agent,
    liquidity,
    isBalanceHidden,
    isLiquidityLoading,
    toggleHideBalance,
    language,
    setLanguage,
    terminal,
    isOffline,
    t,
    notificationsCount,
    isBootstrapping,
  } = useAgent();
  const [expanded, setExpanded] = useState(false);

  if (isBootstrapping) {
    return <PortalPreloader context="agency" />;
  }

  const renderShellAmount = (formatted: string) =>
    isLiquidityLoading ? (
      <span className="inline-block h-[1em] w-16 rounded bg-[var(--surface-3)] animate-pulse align-middle" />
    ) : isBalanceHidden ? (
      "••••••••"
    ) : (
      formatted
    );

  const railSections: RailSection[] = [
    {
      key: "command",
      title: "Command Center",
      items: [{ label: "Overview", href: "/agent", icon: Home }],
    },
    {
      key: "operations",
      title: "Koriepay Cash In & Cashout",
      items: [
        { label: t("common.cashIn"), href: "/agent/cash-in", icon: ArrowDownLeft },
        { label: t("common.cashOut"), href: "/agent/cash-out", icon: ArrowUpRight },
        { label: "Adashi / Ajo (ROSCA)", href: "/agent/adashi", icon: Coins },
        { label: t("common.sendTransfer"), href: "/agent/transfer", icon: ArrowRightLeft },
        { label: t("common.customers"), href: "/agent/customers", icon: Users },
        { label: t("common.transactions"), href: "/agent/transactions", icon: Activity },
        ...(agent.tier === "SUPER_AGENT"
          ? [{ label: "Sub-Agent Team", href: "/agent/team", icon: Users }]
          : []),
      ],
    },
    {
      key: "finance",
      title: "Financial & Float",
      items: [
        { label: t("common.liquidityCenter"), href: "/agent/liquidity", icon: Coins },
        { label: t("common.commissions"), href: "/agent/commissions", icon: CheckCircle2 },
        { label: t("common.reconciliation"), href: "/agent/reconciliation", icon: FileSpreadsheet },
        { label: "Bank Settlements", href: "/agent/settlement", icon: ShieldCheck },
      ],
    },
    {
      key: "hardware",
      title: "Hardware & Settings",
      items: [
        { label: t("common.terminals"), href: "/agent/terminals", icon: Smartphone },
        { label: t("common.support"), href: "/agent/support", icon: LifeBuoy },
        { label: t("common.settings"), href: "/agent/settings", icon: Settings },
      ],
    },
  ];

  const mobileBottomNavItems = [
    { label: "Home", href: "/agent", icon: Home },
    { label: "Cash In", href: "/agent/cash-in", icon: ArrowDownLeft },
    { label: "Cash Out", href: "/agent/cash-out", icon: ArrowUpRight },
    { label: "History", href: "/agent/transactions", icon: Activity },
    { label: "More", href: "/agent/settings", icon: Settings },
  ];

  const isItemActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] antialiased selection:bg-amber-500 selection:text-slate-950">
      {/* Offline Warning Banner */}
      {isOffline && (
        <div className="bg-rose-600 text-white text-xs font-semibold px-4 py-2 flex items-center justify-center gap-2 sticky top-0 z-50">
          <WifiOff className="w-4 h-4 animate-pulse" />
          <span>Offline Network: Financial transactions blocked for liquidity safety.</span>
        </div>
      )}

      {agent.status === "PENDING" && (
        <div className="bg-amber-500 text-slate-950 text-xs font-bold px-4 py-2 flex items-center justify-center gap-2 sticky top-0 z-40 text-center">
          <ShieldCheck className="w-4 h-4" />
          <span>
            Account under review — complete KYC verification to unlock cash-in, cash-out and transfers.{" "}
            <Link href="/agent/kyc" className="underline underline-offset-2">
              Upload documents
            </Link>
          </span>
        </div>
      )}
      {(agent.status === "SUSPENDED" || agent.status === "RESTRICTED" || agent.status === "DEACTIVATED") && (
        <div className="bg-rose-600 text-white text-xs font-bold px-4 py-2 flex items-center justify-center gap-2 sticky top-0 z-40 text-center">
          <ShieldCheck className="w-4 h-4" />
          <span>Account {String(agent.status).toLowerCase()} — transactions are disabled. Contact support.</span>
        </div>
      )}

      <div className="flex min-h-screen">
        {/* Desktop Rail — collapsible, like the Admin command center */}
        <div className="hidden lg:block p-4">
          <aside
            aria-label="Agency primary navigation"
            className={`sticky top-4 h-[calc(100vh-2rem)] flex flex-col rounded-3xl border border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur-xl shadow-[var(--shadow-card)] z-30 transition-[width] duration-200 ease-out ${
              expanded ? "w-[264px]" : "w-20"
            }`}
          >
            {/* Collapse/Expand Toggle — top-left corner, above the brand & nav */}
            <div className={`flex items-center border-b border-[var(--border)] px-2.5 py-2 ${expanded ? "" : "justify-center"}`}>
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                aria-pressed={expanded}
                aria-label={expanded ? "Collapse navigation" : "Expand navigation"}
                className={`flex min-h-[36px] items-center gap-2 rounded-xl text-[var(--foreground-muted)] transition-colors hover:bg-[var(--surface-elevated)] hover:text-[var(--foreground)] ${
                  expanded ? "w-full px-3" : "h-10 w-10 justify-center"
                }`}
              >
                {expanded ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
                {expanded && <span className="text-[12px] font-semibold">Collapse</span>}
              </button>
            </div>

            {/* Brand */}
            <div className={`flex items-center gap-2.5 border-b border-[var(--border)] px-3 py-4 ${expanded ? "" : "justify-center"}`}>
              <Link href="/agent" aria-label="KoriePay Agency home" className="flex items-center gap-2.5 min-w-0">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-amber-500/10">
                  <KorieLogo variant="compact" theme="dark" height={22} linkHref="" />
                </span>
                {expanded && (
                  <span className="flex flex-col leading-tight min-w-0">
                    <span className="text-[13px] font-extrabold tracking-tight text-[var(--foreground)] truncate">KORIEPAY</span>
                    <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-amber-500">Agency Ops</span>
                  </span>
                )}
              </Link>
            </div>

            {/* Quick Liquidity Summary — expanded only */}
            {expanded && (
              <div className="mx-3 my-3 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] p-3 space-y-1">
                <div className="text-[10px] font-mono uppercase text-[var(--foreground-muted)]">
                  {t("common.availableLiquidity")}
                </div>
                <div className="text-base font-extrabold font-mono text-[var(--foreground)]">
                  {renderShellAmount(`₦${liquidity.totalLiquidity.toLocaleString()}`)}
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono text-[var(--foreground-muted)] pt-1">
                  <span>Cash: ₦{isLiquidityLoading ? "···" : liquidity.cashInHand.toLocaleString()}</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    ● {isLiquidityLoading ? "SYNCING" : liquidity.health}
                  </span>
                </div>
              </div>
            )}

            {/* Nav */}
            <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2.5 py-3">
              <ul className="space-y-1">
                {railSections.map((section) => (
                  <li key={section.key} className={expanded ? "mb-4" : "mb-2 flex flex-col items-center"}>
                    {expanded && (
                      <div className="px-3 mb-1 text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
                        {section.title}
                      </div>
                    )}
                    <ul className={expanded ? "space-y-0.5" : "space-y-1 flex flex-col items-center"}>
                      {section.items.map((item) => {
                        const active = isItemActive(item.href);
                        const Icon = item.icon;
                        return (
                          <li key={item.href} className={expanded ? "" : "group/rail relative"}>
                            <Link
                              href={item.href}
                              aria-current={active ? "page" : undefined}
                              aria-label={expanded ? undefined : item.label}
                              className={
                                expanded
                                  ? `flex min-h-[40px] items-center gap-3 rounded-xl px-3 text-[13px] font-semibold transition-colors ${
                                      active
                                        ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                                        : "text-[var(--foreground-muted)] hover:bg-[var(--surface-elevated)] hover:text-[var(--foreground)]"
                                    }`
                                  : `relative flex h-11 w-11 items-center justify-center rounded-2xl transition-colors ${
                                      active
                                        ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                                        : "text-[var(--foreground-muted)] hover:bg-[var(--surface-elevated)] hover:text-[var(--foreground)]"
                                    }`
                              }
                            >
                              {!expanded && active && (
                                <span
                                  aria-hidden="true"
                                  className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 -translate-x-2 rounded-full bg-amber-500"
                                />
                              )}
                              <Icon className={expanded ? "h-4 w-4 shrink-0" : "h-[18px] w-[18px]"} />
                              {expanded && <span className="flex-1 truncate">{item.label}</span>}
                            </Link>
                            {!expanded && (
                              <span
                                role="tooltip"
                                className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg bg-[var(--foreground)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--background)] opacity-0 shadow-lg transition-opacity duration-150 group-hover/rail:opacity-100"
                              >
                                {item.label}
                              </span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                ))}
              </ul>
            </nav>

            {/* Terminal / identity footer */}
            <div className={`border-t border-[var(--border)] p-2.5 ${expanded ? "" : "flex justify-center"}`}>
              {expanded ? (
                <div className="flex items-center justify-between rounded-xl bg-[var(--surface-2)] border border-[var(--border)] px-2.5 py-2 text-xs">
                  <div className="min-w-0">
                    <div className="font-bold text-[var(--foreground)] truncate max-w-[130px]">{agent.agentName}</div>
                    <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">{agent.agentCode}</div>
                  </div>
                  <span className="text-[10px] font-mono text-[var(--foreground-muted)]">
                    {terminal ? terminal.model.slice(-2) : "--"}
                  </span>
                </div>
              ) : (
                <div className="h-11 w-11 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-[10px] font-mono font-bold text-[var(--foreground-muted)]">
                  {terminal ? terminal.model.slice(-2) : "--"}
                </div>
              )}
            </div>
          </aside>
        </div>

        {/* Center Main Column */}
        <div className="flex-1 flex flex-col min-w-0 pb-24 lg:pb-0">
          {/* Top Command Bar */}
          <header className="sticky top-0 z-30 flex min-h-[64px] flex-wrap items-center gap-2 border-b border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur-xl px-3 py-2.5 sm:px-6">
            <Link href="/agent" className="lg:hidden flex items-center shrink-0">
              <KorieLogo variant="compact" theme="dark" height={24} linkHref="" />
            </Link>

            <div className="min-w-0 flex-1">
              <h1 className="truncate text-[15px] font-extrabold tracking-tight text-[var(--foreground)]">
                {titleFor(pathname)}
              </h1>
              <p className="hidden sm:block truncate text-[11px] text-[var(--foreground-muted)]">
                {agent.businessName} · {agent.agentName}{" "}
                <span className="ml-1 rounded px-1.5 py-0.5 text-[9px] font-mono font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  {agent.tier}
                </span>
              </p>
            </div>

            {/* POS Status */}
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[11px] font-mono font-bold">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              <span>{terminal ? terminal.terminalId : agent.terminalId}</span>
            </div>

            {/* Customer/transaction quick search */}
            <Link
              href="/agent/customers"
              className="hidden sm:flex min-h-[38px] items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-[12px] text-[var(--foreground-muted)] transition-colors hover:border-amber-500/40 hover:text-[var(--foreground)]"
              aria-label="Search customers"
            >
              <Search className="h-3.5 w-3.5 shrink-0" />
              <span>Find a customer…</span>
            </Link>

            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Hide Balance */}
              <button
                onClick={toggleHideBalance}
                className="grid h-9 w-9 place-items-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground-muted)] transition-colors hover:text-[var(--foreground)]"
                title={isBalanceHidden ? "Show Balance" : "Hide Balance"}
                aria-label={isBalanceHidden ? "Show balance" : "Hide balance"}
              >
                {isBalanceHidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>

              {/* Language Switcher */}
              <div className="hidden sm:flex items-center p-0.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[11px] font-mono font-bold">
                {(["ha", "en", "fr"] as const).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setLanguage(lang)}
                    className={`px-2 py-1 rounded-lg transition-colors ${
                      language === lang
                        ? "bg-amber-500 text-slate-950"
                        : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    {lang.toUpperCase()}
                  </button>
                ))}
              </div>

              {/* Notifications */}
              <Link
                href="/agent/notifications"
                className="relative grid h-9 w-9 place-items-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground-muted)] transition-colors hover:text-[var(--foreground)]"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
                {notificationsCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
                    {notificationsCount > 9 ? "9+" : notificationsCount}
                  </span>
                )}
              </Link>

              {/* Profile */}
              <Link
                href="/agent/profile"
                className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-slate-950 font-extrabold text-[11px] shadow-sm"
                aria-label="Profile"
              >
                AG
              </Link>

              <ShellAccount />
            </div>
          </header>

          <main className="flex-1 w-full max-w-6xl mx-auto">{children}</main>
          <PortalFooter portal="agency" />
        </div>
      </div>

      {/* Mobile Fixed Bottom Navigation (48px+ touch targets) */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--nav-bg)] backdrop-blur-2xl border-t border-[var(--border)] px-2 py-1.5 flex items-center justify-around shadow-2xl"
        style={{ paddingBottom: "max(0.375rem, env(safe-area-inset-bottom))" }}
      >
        {mobileBottomNavItems.map((item) => {
          const isActive = isItemActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 px-3 min-w-[56px] min-h-[48px] rounded-2xl transition-all ${
                isActive ? "text-amber-500 font-bold" : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
              }`}
            >
              <div className={`p-1 rounded-xl transition-all ${isActive ? "bg-amber-500/15" : ""}`}>
                <Icon className={`w-5 h-5 ${isActive ? "text-amber-500 stroke-[2.5]" : ""}`} />
              </div>
              <span className="text-[10px] mt-0.5 leading-tight font-medium tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Universal Agency Modals */}
      <AgentReceiptModal />
      <DailyReconciliationModal />
    </div>
  );
};

export default AgencyShell;
