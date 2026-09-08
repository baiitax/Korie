"use client";

// =============================================================================
// Agency shell — light customer-portal design language. Consumes the engine-
// backed AgentPortal context (no mock constants). Modals render receipt +
// daily cash reconciliation over the new light kit.
// =============================================================================

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAgentPortal } from "../AgentContext";
import { KorieFloatingRail, KorieDock } from "@/components/nav/KorieFloatingRail";
import KorieLogo from "@/components/brand/KorieLogo";
import ShellAccount from "@/components/ui/ShellAccount";
import PortalFooter from "@/components/ui/PortalFooter";
import AgentReceiptModal from "./AgentReceiptModal";
import {
  Home,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  Users,
  Activity,
  Coins,
  FileSpreadsheet,
  BadgePercent,
  ShieldCheck,
  Smartphone,
  LifeBuoy,
  Settings,
  Eye,
  EyeOff,
  WifiOff,
  Radio,
  Store,
} from "lucide-react";
import { AgentFreshnessBar } from "./AgentUi";
import { formatMoney } from "@/lib/money";

export const AgencyShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const {
    summary,
    isBalanceHidden,
    toggleHideBalance,
    language,
    setLanguage,
    phase,
    refresh,
    refreshedAt,
  } = useAgentPortal();

  const profile = summary?.agent;
  const float = summary?.float;
  const till = summary?.till;

  const isOnPortalHome = pathname === "/agent" || pathname === "/agent/";
  const railActive = new Set([
    "/agent", "/agent/cash-in", "/agent/cash-out", "/agent/transfer",
    "/agent/transactions", "/agent/customers", "/agent/liquidity",
    "/agent/commissions", "/agent/settlement", "/agent/reconciliation",
    "/agent/terminals", "/agent/support", "/agent/adashi", "/agent/profile",
  ]);

  const desktopNavGroups = [
    {
      title: "Overview",
      items: [{ label: "Executive Overview", href: "/agent", icon: Home }],
    },
    {
      title: "Operations",
      items: [
        { label: "Cash In", href: "/agent/cash-in", icon: ArrowDownLeft },
        { label: "Cash Out", href: "/agent/cash-out", icon: ArrowUpRight },
        { label: "Send Transfer", href: "/agent/transfer", icon: ArrowRightLeft },
        { label: "Customers", href: "/agent/customers", icon: Users },
        { label: "Transactions", href: "/agent/transactions", icon: Activity },
        { label: "Adashi / Ajo (ROSCA)", href: "/agent/adashi", icon: Coins },
      ],
    },
    {
      title: "Float & Money",
      items: [
        { label: "Float & Liquidity", href: "/agent/liquidity", icon: Coins },
        { label: "Commissions", href: "/agent/commissions", icon: BadgePercent },
        { label: "Cash Reconciliation", href: "/agent/reconciliation", icon: FileSpreadsheet },
        { label: "Bank Settlements", href: "/agent/settlement", icon: ShieldCheck },
      ],
    },
    {
      title: "Device & Support",
      items: [
        { label: "POS Terminal", href: "/agent/terminals", icon: Smartphone },
        { label: "Support & Disputes", href: "/agent/support", icon: LifeBuoy },
        { label: "Settings", href: "/agent/settings", icon: Settings },
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

  const offline = typeof navigator !== "undefined" && !navigator.onLine;

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background,#f5f8fc)] text-[var(--foreground,#0e1a2b)] antialiased">
      {offline && (
        <div className="sticky top-0 z-50 flex items-center justify-center gap-2 bg-rose-600 px-4 py-2 text-xs font-semibold text-white">
          <WifiOff className="h-4 w-4" />
          <span>Offline — financial transactions are blocked until you reconnect.</span>
        </div>
      )}

      <div className="flex flex-1">
        <KorieFloatingRail
          groups={desktopNavGroups.map((g) => ({ title: g.title, items: g.items.map((it) => ({ label: it.label, href: it.href, icon: it.icon })) }))}
          primary={Array.from(railActive)}
          role="AGENCY OPS"
          tone="emerald"
          word="KoriePay Agent"
          settingsHref="/agent/settings"
          storeKey="korie_agent_rail"
          context={
            <div className="space-y-1.5 rounded-2xl border border-stone-200 bg-white p-3 shadow-sm">
              <div className="text-[10px] font-mono uppercase tracking-wider text-stone-400">
                Wallet float
              </div>
              <div className="font-mono text-base font-extrabold text-stone-900">
                {isBalanceHidden || !float ? "••••••••" : formatMoney(float.availableFloat, "NGN")}
              </div>
              <div className="flex items-center justify-between border-t border-stone-100 pt-1.5 font-mono text-[10px] text-stone-500">
                <span>Cash: {isBalanceHidden ? "•••••" : formatMoney(till?.availablePhysicalCash || 0, "NGN")}</span>
                <span className="font-bold text-emerald-600">● {till?.liquidityStatus || "HEALTHY"}</span>
              </div>
            </div>
          }
          footer={
            <div className="flex items-center justify-between rounded-xl border border-stone-200 bg-white px-2.5 py-2 shadow-sm">
              <div className="min-w-0">
                <div className="truncate text-xs font-bold text-stone-800">{profile?.tradingName || "Agency"}</div>
                <div className="font-mono text-[10px] text-emerald-600">{profile?.agentCode || ""}</div>
              </div>
              <span className="font-mono text-[10px] text-stone-400">{profile?.tier || ""}</span>
            </div>
          }
        />

        <div className="flex min-w-0 flex-1 flex-col pb-20 lg:pb-8">
          <header className="glass-nav sticky top-0 z-30 border-b border-stone-200/70 px-4 py-3 sm:px-6">
            <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Link href="/agent" className="flex items-center lg:hidden">
                  <KorieLogo variant="compact" height={26} linkHref="" />
                </Link>
                <div className="hidden lg:block">
                  <span className="text-xs text-stone-500">{profile?.tradingName || "Agency"}</span>
                  <div className="flex items-center gap-2 text-sm font-bold text-stone-900">
                    <span>{profile?.legalName || "Agency"}</span>
                    <span className="rounded bg-emerald-50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-200">
                      {profile?.tier || "TIER_2"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
                <div className="hidden items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-mono text-xs font-bold text-emerald-700 sm:flex">
                  <Radio className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{summary?.terminal.terminalId || ""}</span>
                </div>

                <button
                  type="button"
                  onClick={toggleHideBalance}
                  aria-label={isBalanceHidden ? "Show balances" : "Hide balances"}
                  className="rounded-lg border border-stone-200 bg-white p-2 text-stone-500 shadow-sm transition hover:bg-stone-50 hover:text-stone-800"
                >
                  {isBalanceHidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>

                <div className="flex items-center rounded-lg border border-stone-200 bg-white p-0.5 text-xs font-bold shadow-sm">
                  {(["en", "ha", "fr"] as const).map((code) => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => setLanguage(code)}
                      aria-pressed={language === code}
                      className={`rounded-md px-2 py-1 uppercase transition-colors ${
                        language === code ? "bg-emerald-600 text-white" : "text-stone-400 hover:text-stone-600"
                      }`}
                    >
                      {code}
                    </button>
                  ))}
                </div>

                <Link
                  href="/agent/profile"
                  aria-label="Agency profile"
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-emerald-600 to-teal-500 text-xs font-extrabold text-white shadow-sm"
                >
                  {profile?.tradingName?.[0] || "A"}
                </Link>
                <ShellAccount />
              </div>
            </div>
          </header>

          <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-6 pt-5 sm:px-6">
            {isOnPortalHome && phase === "ready" ? (
              <div className="mb-4">
                <AgentFreshnessBar
                  refreshedAt={refreshedAt}
                  refreshing={false}
                  onRefresh={() => void refresh({ silent: true })}
                  note={`${summary?.recentOperations.length ?? 0} operations today`}
                />
              </div>
            ) : null}
            {children}
          </main>
          <PortalFooter portal="agency" />
        </div>
      </div>

      <KorieDock items={mobileBottomNavItems} />

      <AgentReceiptModal />
    </div>
  );
};

export default AgencyShell;
