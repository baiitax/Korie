"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAgent } from "../AgentContext";
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
    <div className="min-h-screen bg-[#050811] text-slate-100 flex flex-col antialiased selection:bg-amber-500 selection:text-slate-950">
      {/* Offline Warning Banner */}
      {isOffline && (
        <div className="bg-rose-600 text-white text-xs font-semibold px-4 py-2 flex items-center justify-center gap-2 sticky top-0 z-50">
          <WifiOff className="w-4 h-4 animate-pulse" />
          <span>Offline Network: Financial transactions blocked for liquidity safety.</span>
        </div>
      )}

      <div className="flex flex-1">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex flex-col justify-between w-64 bg-[#070b16] border-r border-white/10 sticky top-0 h-screen overflow-y-auto z-40 shrink-0">
          <div>
            {/* Header Brand */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <Link href="/agent" className="flex items-center gap-2">
                <KorieLogo variant="compact" theme="dark" height={28} />
              </Link>
              <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
                AGENCY OPS
              </span>
            </div>

            {/* Quick Liquidity Summary */}
            <div className="p-3 mx-3 my-3 rounded-2xl bg-[#0c1426] border border-white/5 space-y-1">
              <div className="text-[10px] font-mono text-slate-400 uppercase">
                {t("common.availableLiquidity")}
              </div>
              <div className="text-base font-extrabold text-white font-mono">
                {isBalanceHidden ? "••••••••" : `₦${liquidity.totalLiquidity.toLocaleString()}`}
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1">
                <span>Cash: ₦{liquidity.cashInHand.toLocaleString()}</span>
                <span className="text-emerald-400 font-bold">● {liquidity.health}</span>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="p-3 space-y-5">
              {desktopNavGroups.map((group, idx) => (
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
                            ? "bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20"
                            : "text-slate-400 hover:text-white hover:bg-white/5"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon className={`w-4 h-4 ${isActive ? "text-slate-950" : "text-slate-400"}`} />
                          <span>{item.label}</span>
                        </div>
                        {isActive && <ChevronRight className="w-3.5 h-3.5" />}
                      </Link>
                    );
                  })}
                </div>
              ))}
            </nav>
          </div>

          {/* Sidebar Terminal Footer */}
          <div className="p-3 border-t border-white/10 bg-[#050811]">
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-white/5 text-xs">
              <div>
                <div className="font-bold text-white truncate max-w-[130px]">{agent.agentName}</div>
                <div className="text-[10px] text-emerald-400 font-mono">{agent.agentCode}</div>
              </div>
              <span className="text-[10px] font-mono text-slate-400">{terminal.model.slice(-2)}</span>
            </div>
          </div>
        </aside>

        {/* Center Main Column */}
        <div className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-8">
          {/* Top Sticky Header */}
          <header className="sticky top-0 z-30 bg-[#070b16]/90 backdrop-blur-xl border-b border-white/10 px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Link href="/agent" className="lg:hidden flex items-center">
                <KorieLogo variant="compact" theme="dark" height={26} />
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
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#070b16]/95 backdrop-blur-2xl border-t border-white/10 px-2 py-1.5 flex items-center justify-around safe-area-bottom shadow-2xl">
        {mobileBottomNavItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 px-3 min-w-[56px] min-h-[48px] rounded-2xl transition-all ${
                isActive ? "text-amber-400 font-bold" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <div className={`p-1 rounded-xl transition-all ${isActive ? "bg-amber-500/20" : ""}`}>
                <Icon className={`w-5 h-5 ${isActive ? "text-amber-400 stroke-[2.5]" : "text-slate-400"}`} />
              </div>
              <span className="text-[10px] mt-0.5 leading-tight font-medium tracking-tight">
                {item.label}
              </span>
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
