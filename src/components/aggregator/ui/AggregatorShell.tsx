"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAggregator } from "../AggregatorContext";
import { KorieFloatingRail, KorieDock } from "@/components/nav/KorieFloatingRail";
import KorieLogo from "@/components/brand/KorieLogo";
import ShellAccount from "@/components/ui/ShellAccount";
import PortalFooter from "@/components/ui/PortalFooter";
import LiquidityDistributionModal from "./LiquidityDistributionModal";
import TransactionInvestigationDrawer from "./TransactionInvestigationDrawer";
import {
  LayoutDashboard,
  Activity,
  Users,
  Store,
  MapPin,
  Building2,
  Wallet,
  Coins,
  Receipt,
  FileSpreadsheet,
  ArrowRightLeft,
  AlertOctagon,
  ShieldAlert,
  FileCheck,
  Radio,
  BarChart3,
  Target,
  FileText,
  UserCheck,
  Code2,
  Bell,
  Shield,
  Smartphone,
  History,
  LifeBuoy,
  Settings,
  ChevronRight,
  Eye,
  EyeOff,
  WifiOff,
  Globe,
  SlidersHorizontal,
} from "lucide-react";

export const AggregatorShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const {
    aggregator,
    territories,
    selectedTerritoryId,
    setSelectedTerritoryId,
    selectedCountry,
    setSelectedCountry,
    isBalanceHidden,
    toggleHideBalance,
    language,
    setLanguage,
    isOffline,
    t,
    notificationsCount,
    exceptions,
    riskAlerts,
  } = useAggregator();

  const openAlertsCount =
    riskAlerts.filter((r) => r.status === "OPEN").length +
    exceptions.filter((e) => e.currentState !== "RESOLVED").length;

  const navGroups = [
    {
      title: "COMMAND CENTER",
      items: [
        { label: "Network Dashboard", href: "/aggregator", icon: LayoutDashboard },
        { label: "Live Operations Feed", href: "/aggregator/operations", icon: Activity, badge: "REALTIME" },
      ],
    },
    {
      title: "NETWORK DISTRIBUTION",
      items: [
        { label: "Agency Network", href: "/aggregator/agents", icon: Users },
        { label: "Merchant Network", href: "/aggregator/merchants", icon: Store },
        { label: "Territory Coverage", href: "/aggregator/territories", icon: MapPin },
        { label: "Branch Hubs", href: "/aggregator/branches", icon: Building2 },
      ],
    },
    {
      title: "FINANCIAL & LIQUIDITY",
      items: [
        { label: "Aggregator Wallet", href: "/aggregator/wallet", icon: Wallet },
        { label: "Liquidity Float", href: "/aggregator/liquidity", icon: Coins },
        { label: "Transaction Command", href: "/aggregator/transactions", icon: Receipt },
        { label: "Commission Center", href: "/aggregator/commissions", icon: Coins },
        { label: "Settlement Batches", href: "/aggregator/settlements", icon: FileSpreadsheet },
        { label: "Reconciliation", href: "/aggregator/reconciliation", icon: ArrowRightLeft },
      ],
    },
    {
      title: "RISK & COMPLIANCE",
      items: [
        { label: "Operational Exceptions", href: "/aggregator/exceptions", icon: AlertOctagon, badge: openAlertsCount > 0 ? String(openAlertsCount) : undefined },
        { label: "Risk & Fraud Desk", href: "/aggregator/risk", icon: ShieldAlert },
        { label: "Compliance & KYC", href: "/aggregator/compliance", icon: FileCheck },
        { label: "Banking Node Health", href: "/aggregator/services", icon: Radio },
      ],
    },
    {
      title: "INTELLIGENCE & REPORTS",
      items: [
        { label: "Network Analytics", href: "/aggregator/analytics", icon: BarChart3 },
        { label: "Performance & Growth", href: "/aggregator/performance", icon: Target },
        { label: "Targets & Milestones", href: "/aggregator/targets", icon: Target },
        { label: "Financial Reports", href: "/aggregator/reports", icon: FileText },
      ],
    },
    {
      title: "ORGANIZATION & SYSTEM",
      items: [
        { label: "Team RBAC", href: "/aggregator/team", icon: UserCheck },
        { label: "Developer APIs", href: "/aggregator/developers", icon: Code2 },
        { label: "Notifications", href: "/aggregator/notifications", icon: Bell },
        { label: "Security & MFA", href: "/aggregator/security", icon: Shield },
        { label: "Device Vault", href: "/aggregator/devices", icon: Smartphone },
        { label: "Audit Ledger", href: "/aggregator/audit", icon: History },
        { label: "Support Escalation", href: "/aggregator/support", icon: LifeBuoy },
        { label: "Settings", href: "/aggregator/settings", icon: Settings },
      ],
    },
  ];

  const mobileNavItems = [
    { label: "Command", href: "/aggregator", icon: LayoutDashboard },
    { label: "Agents", href: "/aggregator/agents", icon: Users },
    { label: "Float", href: "/aggregator/liquidity", icon: Coins },
    { label: "Ledger", href: "/aggregator/transactions", icon: Receipt },
    { label: "More", href: "/aggregator/settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col antialiased selection:bg-teal-500 selection:text-slate-950">
      {isOffline && (
        <div className="bg-rose-600 text-white text-xs font-semibold px-4 py-2 flex items-center justify-center gap-2 sticky top-0 z-50">
          <WifiOff className="w-4 h-4 animate-pulse" />
          <span>Offline Network: Financial float distribution and transactions are paused for safety.</span>
        </div>
      )}

      <div className="flex flex-1">
        {/* Desktop floating navigation rail (premium spec) */}
        <KorieFloatingRail
          groups={navGroups.map((g) => ({ title: g.title, items: g.items.map((it) => ({ label: it.label, href: it.href, icon: it.icon, badge: it.badge })) }))}
          primary={[
            '/aggregator', '/aggregator/agents', '/aggregator/liquidity', '/aggregator/transactions',
            '/aggregator/settlements', '/aggregator/risk', '/aggregator/compliance',
            '/aggregator/analytics', '/aggregator/settings',
          ]}
          role="AGGREGATOR TIER-1"
          tone="amber"
          word="KoriePay Aggregator"
          settingsHref="/aggregator/settings"
          storeKey="korie_aggregator_rail"
          context={
            <div className="p-2.5 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] space-y-2">
              <div className="flex items-center justify-between text-[10px] font-mono text-[var(--muted,#64748b)] uppercase">
                <span>Active Network Node</span>
                <Globe className="w-3 h-3 text-[var(--brand-primary,#0d9488)]" />
              </div>
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-[var(--surface)] rounded-xl border border-[var(--border)] text-[11px] font-mono font-bold">
                <button onClick={() => setSelectedCountry("NG")} aria-pressed={selectedCountry === "NG"} className={`py-1 rounded-lg transition-colors ${selectedCountry === "NG" ? "bg-[var(--brand-primary)] text-white" : "text-[var(--muted,#64748b)] hover:text-[var(--foreground)]"}`}>
                  🇳🇬 NG (₦)
                </button>
                <button onClick={() => setSelectedCountry("NE")} aria-pressed={selectedCountry === "NE"} className={`py-1 rounded-lg transition-colors ${selectedCountry === "NE" ? "bg-[var(--brand-primary)] text-white" : "text-[var(--muted,#64748b)] hover:text-[var(--foreground)]"}`}>
                  🇳🇪 NE (CFA)
                </button>
              </div>
              <select
                value={selectedTerritoryId}
                onChange={(e) => setSelectedTerritoryId(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground)] text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)]"
              >
                <option value="ALL">📍 All Territories</option>
                {territories.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          }
          footer={
            <div className="rounded-xl bg-[var(--surface-2)] border border-[var(--border)] px-2.5 py-2 text-xs">
              <div className="font-bold text-[var(--foreground)] truncate">{aggregator.name}</div>
              <div className="text-[10px] text-[var(--brand-primary,#0d9488)] font-mono mt-0.5">{aggregator.settlementBank.split(" ")[0]} Node</div>
            </div>
          }
        />


        {/* Center Main View */}
        <div className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-8">
          <header className="sticky top-0 z-30 glass-nav px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Link href="/aggregator" className="lg:hidden flex items-center">
                <KorieLogo variant="compact" theme="dark" height={26} linkHref="" />
              </Link>
              <div className="hidden lg:block">
                <div className="text-sm font-bold text-white flex items-center gap-2">
                  <span>{aggregator.name}</span>
                  <span className="px-2 py-0.2 rounded text-[10px] font-mono bg-amber-500/15 text-amber-300 border border-amber-500/20">
                    {aggregator.code}
                  </span>
                </div>
                <div className="text-xs text-slate-400 font-mono">
                  Supervising {aggregator.activeAgentsCount} Agents • {aggregator.activeMerchantsCount} Merchants
                </div>
              </div>
            </div>

            {/* Header Right Tools */}
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={toggleHideBalance}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-colors"
                title={isBalanceHidden ? "Show Balance" : "Hide Balance"}
              >
                {isBalanceHidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>

              {/* Language Switcher */}
              <div className="flex items-center p-0.5 rounded-xl bg-white/5 border border-white/10 text-xs font-mono font-bold">
                <button
                  onClick={() => setLanguage("en")}
                  className={`px-2 py-1 rounded-lg transition-colors ${
                    language === "en" ? "bg-teal-500 text-slate-950" : "text-slate-400"
                  }`}
                >
                  EN
                </button>
                <button
                  onClick={() => setLanguage("ha")}
                  className={`px-2 py-1 rounded-lg transition-colors ${
                    language === "ha" ? "bg-teal-500 text-slate-950" : "text-slate-400"
                  }`}
                >
                  HA
                </button>
                <button
                  onClick={() => setLanguage("fr")}
                  className={`px-2 py-1 rounded-lg transition-colors ${
                    language === "fr" ? "bg-teal-500 text-slate-950" : "text-slate-400"
                  }`}
                >
                  FR
                </button>
              </div>

              <Link
                href="/aggregator/profile"
                className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-teal-400 text-slate-950 flex items-center justify-center font-black text-xs shadow-md shadow-amber-500/20"
              >
                A
              </Link>

              {/* Day / Night + Sign out */}
              <ShellAccount />
            </div>
          </header>

          <main className="flex-1 w-full max-w-7xl mx-auto">{children}</main>
          <PortalFooter portal="aggregator" />
        </div>
      </div>

      {/* Mobile Fixed Bottom Navigation (48px+ touch targets) */}
            {/* Mobile Floating Dock */}
      <KorieDock items={mobileNavItems} />

      {/* Modals & Drawers */}
      <LiquidityDistributionModal />
      <TransactionInvestigationDrawer />
    </div>
  );
};

export default AggregatorShell;
