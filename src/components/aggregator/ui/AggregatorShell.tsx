"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAggregator } from "../AggregatorContext";
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
    <div className="min-h-screen bg-[#040711] text-slate-100 flex flex-col antialiased selection:bg-teal-500 selection:text-slate-950">
      {isOffline && (
        <div className="bg-rose-600 text-white text-xs font-semibold px-4 py-2 flex items-center justify-center gap-2 sticky top-0 z-50">
          <WifiOff className="w-4 h-4 animate-pulse" />
          <span>Offline Network: Financial float distribution and transactions are paused for safety.</span>
        </div>
      )}

      <div className="flex flex-1">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex flex-col justify-between w-64 bg-[#060a16] border-r border-white/10 sticky top-0 h-screen overflow-y-auto z-40 shrink-0">
          <div>
            {/* Header Brand */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <Link href="/aggregator" className="flex items-center gap-2">
                <KorieLogo variant="compact" theme="dark" height={28} />
              </Link>
              <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
                AGGREGATOR TIER-1
              </span>
            </div>

            {/* Country & Territory Switcher */}
            <div className="p-3 mx-3 my-3 rounded-2xl bg-[#091122] border border-white/5 space-y-2">
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 uppercase">
                <span>Active Network Node</span>
                <Globe className="w-3 h-3 text-teal-400" />
              </div>

              <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950/80 rounded-xl border border-white/5 text-[11px] font-mono font-bold">
                <button
                  onClick={() => setSelectedCountry("NG")}
                  className={`py-1 rounded-lg transition-colors flex items-center justify-center gap-1 ${
                    selectedCountry === "NG" ? "bg-teal-500 text-slate-950" : "text-slate-400 hover:text-white"
                  }`}
                >
                  <span>🇳🇬 NG (₦)</span>
                </button>
                <button
                  onClick={() => setSelectedCountry("NE")}
                  className={`py-1 rounded-lg transition-colors flex items-center justify-center gap-1 ${
                    selectedCountry === "NE" ? "bg-teal-500 text-slate-950" : "text-slate-400 hover:text-white"
                  }`}
                >
                  <span>🇳🇪 NE (CFA)</span>
                </button>
              </div>

              <div>
                <select
                  value={selectedTerritoryId}
                  onChange={(e) => setSelectedTerritoryId(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-teal-500"
                >
                  <option value="ALL">📍 All Territories</option>
                  {territories.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="p-3 space-y-5">
              {navGroups.map((group, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="px-3 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-1">
                    {group.title}
                  </div>
                  {group.items.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                          isActive
                            ? "bg-teal-500 text-slate-950 font-bold shadow-md shadow-teal-500/20"
                            : "text-slate-400 hover:text-white hover:bg-white/5"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-slate-950" : "text-slate-400"}`} />
                          <span className="truncate">{item.label}</span>
                        </div>
                        {item.badge && (
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold ${
                              item.badge === "REALTIME"
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse"
                                : "bg-rose-500 text-white"
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              ))}
            </nav>
          </div>

          {/* Sidebar Footer */}
          <div className="p-3 border-t border-white/10 bg-[#040711]">
            <div className="p-2.5 rounded-xl bg-slate-900 border border-white/5 text-xs space-y-1">
              <div className="font-bold text-white truncate">{aggregator.name}</div>
              <div className="text-[10px] text-teal-400 font-mono flex items-center justify-between">
                <span>{aggregator.settlementBank.split(" ")[0]} Node</span>
                <span className="text-emerald-400">● Live</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Center Main View */}
        <div className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-8">
          <header className="sticky top-0 z-30 bg-[#060a16]/90 backdrop-blur-xl border-b border-white/10 px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Link href="/aggregator" className="lg:hidden flex items-center">
                <KorieLogo variant="compact" theme="dark" height={26} />
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
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#060a16]/95 backdrop-blur-2xl border-t border-white/10 px-2 py-1.5 flex items-center justify-around safe-area-bottom shadow-2xl">
        {mobileNavItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 px-3 min-w-[56px] min-h-[48px] rounded-2xl transition-all ${
                isActive ? "text-teal-400 font-bold" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <div className={`p-1 rounded-xl transition-all ${isActive ? "bg-teal-500/20" : ""}`}>
                <Icon className={`w-5 h-5 ${isActive ? "text-teal-400 stroke-[2.5]" : "text-slate-400"}`} />
              </div>
              <span className="text-[10px] mt-0.5 leading-tight font-medium tracking-tight">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Modals & Drawers */}
      <LiquidityDistributionModal />
      <TransactionInvestigationDrawer />
    </div>
  );
};

export default AggregatorShell;
