"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAgent } from "../AgentContext";
import { KorieFloatingRail, KorieDock } from "@/components/nav/KorieFloatingRail";
import KorieLogo from "@/components/brand/KorieLogo";
import ShellAccount from "@/components/ui/ShellAccount";
import PortalFooter from "@/components/ui/PortalFooter";
import AgentReceiptModal from "./AgentReceiptModal";
import DailyReconciliationModal from "./DailyReconciliationModal";
import {
  Home,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  Zap,
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
  ChevronRight,
} from "lucide-react";

export const AgencyShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const {
    agent,
    liquidity,
    isBalanceHidden,
    toggleHideBalance,
    language,
    setLanguage,
    terminal,
    isOffline,
    t,
    notificationsCount,
  } = useAgent();

  const desktopNavGroups = [
    {
      title: "COMMAND CENTER",
      items: [{ label: "Executive Overview", href: "/agent", icon: Home }],
    },
    {
      title: "OPERATIONS",
      items: [
        { label: t("common.cashIn"), href: "/agent/cash-in", icon: ArrowDownLeft },
        { label: t("common.cashOut"), href: "/agent/cash-out", icon: ArrowUpRight },
        { label: "Adashi / Ajo (ROSCA)", href: "/agent/adashi", icon: Coins },
        { label: t("common.sendTransfer"), href: "/agent/transfer", icon: ArrowRightLeft },
        { label: t("common.customers"), href: "/agent/customers", icon: Users },
        { label: t("common.transactions"), href: "/agent/transactions", icon: Activity },
      ],
    },
    {
      title: "FINANCIAL & FLOAT",
      items: [
        { label: t("common.liquidityCenter"), href: "/agent/liquidity", icon: Coins },
        { label: t("common.commissions"), href: "/agent/commissions", icon: CheckCircle2 },
        { label: t("common.reconciliation"), href: "/agent/reconciliation", icon: FileSpreadsheet },
        { label: "Bank Settlements", href: "/agent/settlement", icon: ShieldCheck },
      ],
    },
    {
      title: "HARDWARE & SETTINGS",
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

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col antialiased selection:bg-amber-500 selection:text-slate-950">
      {/* Offline Warning Banner */}
      {isOffline && (
        <div className="bg-rose-600 text-white text-xs font-semibold px-4 py-2 flex items-center justify-center gap-2 sticky top-0 z-50">
          <WifiOff className="w-4 h-4 animate-pulse" />
          <span>Offline Network: Financial transactions blocked for liquidity safety.</span>
        </div>
      )}

      <div className="flex flex-1">
        {/* Desktop floating navigation rail (premium spec) */}
        <KorieFloatingRail
          groups={desktopNavGroups.map((g) => ({ title: g.title, items: g.items.map((it) => ({ label: it.label, href: it.href, icon: it.icon })) }))}
          primary={[
            '/agent', '/agent/cash-in', '/agent/cash-out', '/agent/transfer',
            '/agent/transactions', '/agent/customers', '/agent/liquidity',
            '/agent/commissions', '/agent/settings',
          ]}
          role="AGENCY OPS"
          tone="amber"
          word="KoriePay Agent"
          settingsHref="/agent/settings"
          storeKey="korie_agent_rail"
          context={
            <div className="p-2.5 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] space-y-1.5">
              <div className="text-[10px] font-mono text-[var(--muted,#64748b)] uppercase tracking-wider">
                {t("common.availableLiquidity")}
              </div>
              <div className="text-base font-extrabold text-[var(--foreground)] font-mono">
                {isBalanceHidden ? "••••••••" : `₦${liquidity.totalLiquidity.toLocaleString()}`}
              </div>
              <div className="flex items-center justify-between text-[10px] text-[var(--muted,#64748b)] font-mono pt-1">
                <span>Cash: ₦{liquidity.cashInHand.toLocaleString()}</span>
                <span className="text-[var(--brand-primary,#059669)] font-bold">● {liquidity.health}</span>
              </div>
            </div>
          }
          footer={
            <div className="flex items-center justify-between rounded-xl bg-[var(--surface-2)] border border-[var(--border)] px-2.5 py-2 text-xs">
              <div className="min-w-0">
                <div className="font-bold text-[var(--foreground)] truncate">{agent.agentName}</div>
                <div className="text-[10px] text-[var(--brand-primary,#059669)] font-mono">{agent.agentCode}</div>
              </div>
              <span className="text-[10px] font-mono text-[var(--muted,#64748b)]">{terminal.model.slice(-2)}</span>
            </div>
          }
        />


        {/* Center Main Column */}
        <div className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-8">
          {/* Top Sticky Header */}
          <header className="sticky top-0 z-30 glass-nav px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Link href="/agent" className="lg:hidden flex items-center">
                <KorieLogo variant="compact" theme="dark" height={26} linkHref="" />
              </Link>
              <div className="hidden lg:block">
                <span className="text-xs text-slate-400">{agent.businessName}</span>
                <div className="text-sm font-bold text-white flex items-center gap-2">
                  <span>{agent.agentName}</span>
                  <span className="px-2 py-0.2 rounded text-[10px] font-mono bg-amber-500/15 text-amber-300 border border-amber-500/20">
                    {agent.tier}
                  </span>
                </div>
              </div>
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* POS Status Badge */}
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-bold">
                <Radio className="w-3.5 h-3.5 animate-pulse" />
                <span>{terminal.terminalId}</span>
              </div>

              {/* Hide Balance Eye */}
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
                  onClick={() => setLanguage("ha")}
                  className={`px-2 py-1 rounded-lg transition-colors ${
                    language === "ha" ? "bg-amber-500 text-slate-950" : "text-slate-400"
                  }`}
                >
                  HA
                </button>
                <button
                  onClick={() => setLanguage("en")}
                  className={`px-2 py-1 rounded-lg transition-colors ${
                    language === "en" ? "bg-amber-500 text-slate-950" : "text-slate-400"
                  }`}
                >
                  EN
                </button>
                <button
                  onClick={() => setLanguage("fr")}
                  className={`px-2 py-1 rounded-lg transition-colors ${
                    language === "fr" ? "bg-amber-500 text-slate-950" : "text-slate-400"
                  }`}
                >
                  FR
                </button>
              </div>

              {/* Profile Avatar */}
              <Link
                href="/agent/profile"
                className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-slate-950 flex items-center justify-center font-extrabold text-xs shadow-md shadow-amber-500/20"
              >
                AG
              </Link>

              {/* Day / Night + Sign out */}
              <ShellAccount />
            </div>
          </header>

          <main className="flex-1 w-full max-w-6xl mx-auto">{children}</main>
          <PortalFooter portal="agency" />
        </div>
      </div>

      {/* Mobile Fixed Bottom Navigation (48px+ touch targets) */}
      <KorieDock items={mobileBottomNavItems} />

      {/* Universal Agency Modals */}
      <AgentReceiptModal />
      <DailyReconciliationModal />
    </div>
  );
};

export default AgencyShell;
