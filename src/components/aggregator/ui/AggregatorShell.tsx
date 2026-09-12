"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAggregator } from "../AggregatorContext";
import KorieLogo from "@/components/brand/KorieLogo";
import ShellAccount from "@/components/ui/ShellAccount";
import PortalFooter from "@/components/ui/PortalFooter";
import { useTheme } from "@/components/ui/ThemeContext";
import LiquidityDistributionModal from "./LiquidityDistributionModal";
import TransactionInvestigationDrawer from "./TransactionInvestigationDrawer";
import { PortalPreloader } from "@/components/loading";
import {
  LayoutDashboard,
  Activity,
  Users,
  UserCheck,
  Store,
  MapPin,
  Wallet,
  Coins,
  Receipt,
  FileSpreadsheet,
  AlertOctagon,
  ShieldAlert,
  FileCheck,
  Radio,
  BarChart3,
  Target,
  Code2,
  Bell,
  Shield,
  Smartphone,
  History,
  LifeBuoy,
  Settings,
  Eye,
  EyeOff,
  WifiOff,
  Sun,
  Moon,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

/**
 * AggregatorShell — the Aggregator portal chrome.
 *
 * Structural mechanic ported directly from AgencyShell (which itself ports
 * the Admin command center's collapsible floating rail): a desktop rail
 * that collapses to icon-only with tooltips, grouped nav sections, and an
 * active-state left-edge indicator bar — instead of a fixed always-dark
 * sidebar with no way to reclaim screen width.
 *
 * Visual system ported from the Customer portal: every surface uses
 * `var(--token)` CSS variables so the portal is fully Day/Night-mode-aware
 * via `useTheme`, replacing the previous hardcoded dark-only slate/hex
 * palette. The aggregator's dual brand accent (teal primary + amber
 * secondary) is layered on top of tokens with dual-mode-safe utility
 * classes (`text-teal-600 dark:text-teal-400`), never as a raw hex fill.
 *
 * No page is ever omitted from the nav — every route under /aggregator is
 * listed here; access is gated only by the real staff role/territory-scope
 * protocol enforced server-side by aggregatorAuth.ts, never by hiding a
 * link from a staff member who is allowed to see it.
 */

interface RailItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeCount?: number;
}
interface RailSection {
  key: string;
  title: string;
  items: RailItem[];
}

const TITLES: [prefix: string, title: string][] = [
  ["/aggregator/agents/onboarding", "Agent Onboarding"],
  ["/aggregator/agents/performance", "Agent Performance"],
  ["/aggregator/agents", "Agent Network"],
  ["/aggregator/merchants", "Merchant Network"],
  ["/aggregator/territories", "Territories"],
  ["/aggregator/transactions", "Transactions"],
  ["/aggregator/liquidity", "Liquidity & Float"],
  ["/aggregator/wallet", "Wallet"],
  ["/aggregator/commissions", "Commissions"],
  ["/aggregator/settlements", "Settlements"],
  ["/aggregator/reconciliation", "Reconciliation"],
  ["/aggregator/exceptions", "Exceptions"],
  ["/aggregator/risk", "Risk & Fraud"],
  ["/aggregator/compliance", "Compliance"],
  ["/aggregator/operations", "Operations Center"],
  ["/aggregator/analytics", "Analytics"],
  ["/aggregator/performance", "Network Performance"],
  ["/aggregator/targets", "Targets"],
  ["/aggregator/reports", "Reports"],
  ["/aggregator/services", "Service Health"],
  ["/aggregator/team", "Team"],
  ["/aggregator/developers", "Developers"],
  ["/aggregator/notifications", "Notifications"],
  ["/aggregator/devices", "Devices"],
  ["/aggregator/security", "Security"],
  ["/aggregator/audit", "Audit Trail"],
  ["/aggregator/support", "Support"],
  ["/aggregator/settings", "Settings"],
  ["/aggregator/profile", "Profile"],
  ["/aggregator/branches", "Branches"],
  ["/aggregator/dashboard", "Command Center"],
];

function titleFor(pathname: string): string {
  if (pathname === "/aggregator" || pathname === "/aggregator/dashboard") return "Network Command Center";
  const hit = TITLES.find(([p]) => pathname === p || pathname.startsWith(`${p}/`));
  return hit ? hit[1] : "Aggregator Portal";
}

export const AggregatorShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const {
    aggregator,
    liquidity,
    isLiquidityLoading,
    isBalanceHidden,
    toggleHideBalance,
    language,
    setLanguage,
    isOffline,
    notificationsCount,
    exceptions,
    riskAlerts,
    formatCurrency,
    isBootstrapping,
  } = useAggregator();
  const [expanded, setExpanded] = useState(false);

  if (isBootstrapping) {
    return <PortalPreloader context="aggregator" />;
  }

  const logoTheme = theme === "dark" ? "dark" : "light";
  const isDark = theme === "dark";

  const renderShellAmount = (formatted: string) =>
    isLiquidityLoading ? (
      <span className="inline-block h-[1em] w-16 rounded bg-[var(--surface-3)] animate-pulse align-middle" />
    ) : isBalanceHidden ? (
      "••••••••"
    ) : (
      formatted
    );

  const openExceptionsCount = exceptions.filter((e) => e.currentState !== "RESOLVED").length;
  const openRiskCount = riskAlerts.filter((r) => r.status === "OPEN").length;

  const railSections: RailSection[] = [
    {
      key: "command",
      title: "Command Center",
      items: [{ label: "Overview", href: "/aggregator", icon: LayoutDashboard }],
    },
    {
      key: "network",
      title: "Agent & Merchant Network",
      items: [
        { label: "Agent Network", href: "/aggregator/agents", icon: Users },
        { label: "Agent Onboarding", href: "/aggregator/agents/onboarding", icon: UserCheck },
        { label: "Agent Performance", href: "/aggregator/agents/performance", icon: BarChart3 },
        { label: "Merchant Network", href: "/aggregator/merchants", icon: Store },
        { label: "Territories", href: "/aggregator/territories", icon: MapPin },
        { label: "Branches", href: "/aggregator/branches", icon: MapPin },
      ],
    },
    {
      key: "money",
      title: "Money Movement",
      items: [
        { label: "Transactions", href: "/aggregator/transactions", icon: Receipt },
        { label: "Liquidity & Float", href: "/aggregator/liquidity", icon: Coins },
        { label: "Wallet", href: "/aggregator/wallet", icon: Wallet },
        { label: "Commissions", href: "/aggregator/commissions", icon: Coins },
        { label: "Settlements", href: "/aggregator/settlements", icon: FileSpreadsheet },
        { label: "Reconciliation", href: "/aggregator/reconciliation", icon: FileSpreadsheet },
      ],
    },
    {
      key: "risk",
      title: "Risk, Compliance & Ops",
      items: [
        { label: "Exceptions", href: "/aggregator/exceptions", icon: AlertOctagon, badgeCount: openExceptionsCount },
        { label: "Risk & Fraud", href: "/aggregator/risk", icon: ShieldAlert, badgeCount: openRiskCount },
        { label: "Compliance", href: "/aggregator/compliance", icon: FileCheck },
        { label: "Operations Center", href: "/aggregator/operations", icon: Radio },
        { label: "Audit Trail", href: "/aggregator/audit", icon: History },
      ],
    },
    {
      key: "insights",
      title: "Insights & Growth",
      items: [
        { label: "Analytics", href: "/aggregator/analytics", icon: BarChart3 },
        { label: "Network Performance", href: "/aggregator/performance", icon: Activity },
        { label: "Targets", href: "/aggregator/targets", icon: Target },
        { label: "Reports", href: "/aggregator/reports", icon: FileSpreadsheet },
        { label: "Service Health", href: "/aggregator/services", icon: Radio },
      ],
    },
    {
      key: "org",
      title: "Organization & Settings",
      items: [
        { label: "Team", href: "/aggregator/team", icon: Users },
        { label: "Developers", href: "/aggregator/developers", icon: Code2 },
        { label: "Notifications", href: "/aggregator/notifications", icon: Bell, badgeCount: notificationsCount },
        { label: "Devices", href: "/aggregator/devices", icon: Smartphone },
        { label: "Security", href: "/aggregator/security", icon: Shield },
        { label: "Support", href: "/aggregator/support", icon: LifeBuoy },
        { label: "Settings", href: "/aggregator/settings", icon: Settings },
      ],
    },
  ];

  const mobileBottomNavItems = [
    { label: "Home", href: "/aggregator", icon: LayoutDashboard },
    { label: "Agents", href: "/aggregator/agents", icon: Users },
    { label: "Txns", href: "/aggregator/transactions", icon: Receipt },
    { label: "Liquidity", href: "/aggregator/liquidity", icon: Coins },
    { label: "Settings", href: "/aggregator/settings", icon: Settings },
  ];

  const isItemActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] antialiased selection:bg-teal-500 selection:text-white">
      {/* Offline Warning Banner */}
      {isOffline && (
        <div className="bg-rose-600 text-white text-xs font-semibold px-4 py-2 flex items-center justify-center gap-2 sticky top-0 z-50">
          <WifiOff className="w-4 h-4 animate-pulse" />
          <span>Offline Network: Liquidity dispatch and mutations are blocked until connectivity is restored.</span>
        </div>
      )}

      {aggregator.status === "REVIEW" && (
        <div className="bg-amber-500 text-slate-950 text-xs font-bold px-4 py-2 flex items-center justify-center gap-2 sticky top-0 z-40 text-center">
          <Shield className="w-4 h-4" />
          <span>
            Aggregator account under review — some actions unlock once KYB verification is complete.{" "}
            <Link href="/aggregator/compliance" className="underline underline-offset-2">
              View compliance status
            </Link>
          </span>
        </div>
      )}
      {aggregator.status === "SUSPENDED" && (
        <div className="bg-rose-600 text-white text-xs font-bold px-4 py-2 flex items-center justify-center gap-2 sticky top-0 z-40 text-center">
          <Shield className="w-4 h-4" />
          <span>Aggregator account suspended — transactions are disabled. Contact support.</span>
        </div>
      )}

      <div className="flex min-h-screen">
        {/* Desktop Rail — collapsible, same mechanic as Admin/Agency */}
        <div className="hidden lg:block p-4">
          <aside
            aria-label="Aggregator primary navigation"
            className={`sticky top-4 h-[calc(100vh-2rem)] flex flex-col rounded-3xl border border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur-xl shadow-[var(--shadow-card)] z-30 transition-[width] duration-200 ease-out ${
              expanded ? "w-[264px]" : "w-20"
            }`}
          >
            {/* Collapse/Expand Toggle */}
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
              <Link href="/aggregator" aria-label="KoriePay Aggregator home" className="flex items-center gap-2.5 min-w-0">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-teal-500/10">
                  <KorieLogo variant="compact" theme={logoTheme} height={22} linkHref="" />
                </span>
                {expanded && (
                  <span className="flex flex-col leading-tight min-w-0">
                    <span className="text-[13px] font-extrabold tracking-tight text-[var(--foreground)] truncate">KORIEPAY</span>
                    <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-teal-600 dark:text-teal-400">Aggregator</span>
                  </span>
                )}
              </Link>
            </div>

            {/* Quick Liquidity Summary — expanded only */}
            {expanded && (
              <div className="mx-3 my-3 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] p-3 space-y-1">
                <div className="text-[10px] font-mono uppercase text-[var(--foreground-muted)]">Aggregator Main Float</div>
                <div className="text-base font-extrabold font-mono text-[var(--foreground)]">
                  {renderShellAmount(formatCurrency(liquidity.aggregatorMainWallet))}
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono text-[var(--foreground-muted)] pt-1">
                  <span>Agents: {isLiquidityLoading ? "···" : formatCurrency(liquidity.totalAgentFloatLiquidity)}</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    ● {isLiquidityLoading ? "SYNCING" : liquidity.networkLiquidityHealth}
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
                                        ? "bg-teal-500/15 text-teal-600 dark:text-teal-400"
                                        : "text-[var(--foreground-muted)] hover:bg-[var(--surface-elevated)] hover:text-[var(--foreground)]"
                                    }`
                                  : `relative flex h-11 w-11 items-center justify-center rounded-2xl transition-colors ${
                                      active
                                        ? "bg-teal-500/15 text-teal-600 dark:text-teal-400"
                                        : "text-[var(--foreground-muted)] hover:bg-[var(--surface-elevated)] hover:text-[var(--foreground)]"
                                    }`
                              }
                            >
                              {!expanded && active && (
                                <span
                                  aria-hidden="true"
                                  className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 -translate-x-2 rounded-full bg-teal-500"
                                />
                              )}
                              <Icon className={expanded ? "h-4 w-4 shrink-0" : "h-[18px] w-[18px]"} />
                              {expanded && <span className="flex-1 truncate">{item.label}</span>}
                              {!!item.badgeCount && item.badgeCount > 0 && (
                                <span
                                  className={
                                    expanded
                                      ? "min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center"
                                      : "absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center"
                                  }
                                >
                                  {item.badgeCount > 9 ? "9+" : item.badgeCount}
                                </span>
                              )}
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

            {/* Identity footer */}
            <div className={`border-t border-[var(--border)] p-2.5 ${expanded ? "" : "flex justify-center"}`}>
              {expanded ? (
                <div className="flex items-center justify-between rounded-xl bg-[var(--surface-2)] border border-[var(--border)] px-2.5 py-2 text-xs">
                  <div className="min-w-0">
                    <div className="font-bold text-[var(--foreground)] truncate max-w-[130px]">{aggregator.name || "Aggregator"}</div>
                    <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">{aggregator.code}</div>
                  </div>
                  <span className="text-[10px] font-mono text-[var(--foreground-muted)]">
                    {aggregator.country || "--"}
                  </span>
                </div>
              ) : (
                <div className="h-11 w-11 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-[10px] font-mono font-bold text-[var(--foreground-muted)]">
                  {aggregator.country || "--"}
                </div>
              )}
            </div>
          </aside>
        </div>

        {/* Center Main Column */}
        <div className="flex-1 flex flex-col min-w-0 pb-24 lg:pb-0">
          {/* Top Command Bar */}
          <header className="sticky top-0 z-30 flex min-h-[64px] flex-wrap items-center gap-2 border-b border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur-xl px-3 py-2.5 sm:px-6">
            <Link href="/aggregator" className="lg:hidden flex items-center shrink-0">
              <KorieLogo variant="compact" theme={logoTheme} height={24} linkHref="" />
            </Link>

            <div className="min-w-0 flex-1">
              <h1 className="truncate text-[15px] font-extrabold tracking-tight text-[var(--foreground)]">
                {titleFor(pathname)}
              </h1>
              <p className="hidden sm:block truncate text-[11px] text-[var(--foreground-muted)]">
                {aggregator.name || "Aggregator Network"}{" "}
                <span className="ml-1 rounded px-1.5 py-0.5 text-[9px] font-mono font-bold bg-teal-500/10 text-teal-600 dark:text-teal-400">
                  {aggregator.tier === "TIER_1_SUPER_AGGREGATOR" ? "TIER 1" : "TIER 2"}
                </span>
              </p>
            </div>

            {/* Network status */}
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[11px] font-mono font-bold">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              <span>{aggregator.activeAgentsCount} Agents · {aggregator.activeMerchantsCount} Merchants</span>
            </div>

            {/* Agent/merchant quick search */}
            <Link
              href="/aggregator/agents"
              className="hidden sm:flex min-h-[38px] items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-[12px] text-[var(--foreground-muted)] transition-colors hover:border-teal-500/40 hover:text-[var(--foreground)]"
              aria-label="Search agent network"
            >
              <Search className="h-3.5 w-3.5 shrink-0" />
              <span>Find an agent…</span>
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

              {/* Theme Toggle */}
              <button
                type="button"
                onClick={() => setTheme(isDark ? "light" : "dark")}
                className="grid h-9 w-9 place-items-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground-muted)] transition-colors hover:text-[var(--foreground)]"
                aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
                title={isDark ? "Light mode" : "Dark mode"}
              >
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>

              {/* Language Switcher */}
              <div className="hidden sm:flex items-center p-0.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[11px] font-mono font-bold">
                {(["en", "fr", "ha"] as const).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setLanguage(lang)}
                    className={`px-2 py-1 rounded-lg transition-colors ${
                      language === lang
                        ? "bg-teal-500 text-white"
                        : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    {lang.toUpperCase()}
                  </button>
                ))}
              </div>

              {/* Notifications */}
              <Link
                href="/aggregator/notifications"
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
                href="/aggregator/profile"
                className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-tr from-teal-500 to-amber-500 text-white font-extrabold text-[11px] shadow-sm"
                aria-label="Profile"
              >
                {(aggregator.code || "AG").slice(0, 2).toUpperCase()}
              </Link>

              <ShellAccount />
            </div>
          </header>

          <main className="flex-1 w-full max-w-6xl mx-auto">{children}</main>
          <PortalFooter portal="aggregator" />
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
                isActive ? "text-teal-600 dark:text-teal-400 font-bold" : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
              }`}
            >
              <div className={`p-1 rounded-xl transition-all ${isActive ? "bg-teal-500/15" : ""}`}>
                <Icon className={`w-5 h-5 ${isActive ? "stroke-[2.5]" : ""}`} />
              </div>
              <span className="text-[10px] mt-0.5 leading-tight font-medium tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Universal Aggregator Modals */}
      <LiquidityDistributionModal />
      <TransactionInvestigationDrawer />
    </div>
  );
};

export default AggregatorShell;
