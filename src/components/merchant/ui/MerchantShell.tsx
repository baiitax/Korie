"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMerchant } from "../MerchantContext";
import KorieLogo from "@/components/brand/KorieLogo";
import ShellAccount from "@/components/ui/ShellAccount";
import PortalFooter from "@/components/ui/PortalFooter";
import ReceivePaymentModal from "./ReceivePaymentModal";
import CreatePaymentLinkModal from "./CreatePaymentLinkModal";
import CreateInvoiceModal from "./CreateInvoiceModal";
import {
  LayoutDashboard,
  CreditCard,
  FileText,
  Users,
  Building2,
  FileSpreadsheet,
  BarChart3,
  Code2,
  ShieldCheck,
  LifeBuoy,
  Settings,
  Bell,
  Eye,
  EyeOff,
  Radio,
  QrCode,
  Link as LinkIcon,
  ShoppingBag,
  ArrowRightLeft,
  Coins,
  ChevronRight,
  WifiOff,
} from "lucide-react";

export const MerchantShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const {
    merchant,
    branches,
    selectedBranchId,
    setSelectedBranchId,
    isBalanceHidden,
    toggleHideBalance,
    language,
    setLanguage,
    isOffline,
    t,
    notificationsCount,
  } = useMerchant();

  const desktopNavGroups = [
    {
      title: "COMMAND CENTER",
      items: [{ label: "Executive Dashboard", href: "/merchant", icon: LayoutDashboard }],
    },
    {
      title: "COMMERCE & PAYMENTS",
      items: [
        { label: t("common.viewTransactions"), href: "/merchant/payments", icon: CreditCard },
        { label: t("common.createLink"), href: "/merchant/payment-links", icon: LinkIcon },
        { label: t("common.invoices"), href: "/merchant/invoices", icon: FileText },
        { label: t("common.customers"), href: "/merchant/customers", icon: Users },
      ],
    },
    {
      title: "FINANCIAL & SETTLEMENTS",
      items: [
        { label: "Merchant Wallet", href: "/merchant/wallet", icon: Coins },
        { label: t("common.settlements"), href: "/merchant/settlements", icon: FileSpreadsheet },
        { label: t("common.reconciliation"), href: "/merchant/reconciliation", icon: ArrowRightLeft },
        { label: t("common.analytics"), href: "/merchant/analytics", icon: BarChart3 },
        { label: t("common.reports"), href: "/merchant/reports", icon: FileSpreadsheet },
      ],
    },
    {
      title: "ORGANIZATION & APIS",
      items: [
        { label: t("common.branches"), href: "/merchant/branches", icon: Building2 },
        { label: t("common.team"), href: "/merchant/team", icon: Users },
        { label: t("common.developers"), href: "/merchant/developers", icon: Code2 },
        { label: t("common.support"), href: "/merchant/support", icon: LifeBuoy },
        { label: t("common.settings"), href: "/merchant/settings", icon: Settings },
      ],
    },
  ];

  const mobileBottomNavItems = [
    { label: "Dashboard", href: "/merchant", icon: LayoutDashboard },
    { label: "Payments", href: "/merchant/payments", icon: CreditCard },
    { label: "Invoices", href: "/merchant/invoices", icon: FileText },
    { label: "Analytics", href: "/merchant/analytics", icon: BarChart3 },
    { label: "More", href: "/merchant/settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[var(--surface)] text-slate-100 flex flex-col antialiased selection:bg-teal-500 selection:text-slate-950">
      {isOffline && (
        <div className="bg-rose-600 text-white text-xs font-semibold px-4 py-2 flex items-center justify-center gap-2 sticky top-0 z-50">
          <WifiOff className="w-4 h-4 animate-pulse" />
          <span>Offline Network: Checkout processing paused for connection safety.</span>
        </div>
      )}

      <div className="flex flex-1">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex flex-col justify-between w-64 bg-[var(--surface)] border-r border-white/10 sticky top-0 h-screen overflow-y-auto z-40 shrink-0">
          <div>
            {/* Header Brand */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <Link href="/merchant" className="flex items-center gap-2">
                <KorieLogo variant="compact" theme="dark" height={28} />
              </Link>
              <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-teal-500/10 text-teal-400 border border-teal-500/20">
                MERCHANT OPS
              </span>
            </div>

            {/* Branch Switcher Pill */}
            <div className="p-3 mx-3 my-3 rounded-2xl bg-[var(--surface-2)] border border-white/5 space-y-1.5">
              <div className="text-[10px] font-mono text-slate-400 uppercase">Active Store / Branch</div>
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-teal-500"
              >
                <option value="ALL">🏢 All Stores (HQ Summary)</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.branchName}
                  </option>
                ))}
              </select>
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
                            ? "bg-teal-500 text-slate-950 font-bold shadow-md shadow-teal-500/20"
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

          {/* Sidebar Footer */}
          <div className="p-3 border-t border-white/10 bg-[var(--surface)]">
            <div className="p-2 rounded-xl bg-slate-900 border border-white/5 text-xs">
              <div className="font-bold text-white truncate">{merchant.businessName}</div>
              <div className="text-[10px] text-teal-400 font-mono mt-0.5">
                Providus Settlement • {merchant.settlementAccountMasked}
              </div>
            </div>
          </div>
        </aside>

        {/* Center Main Content */}
        <div className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-8">
          <header className="sticky top-0 z-30 bg-[var(--nav-bg)] backdrop-blur-xl border-b border-white/10 px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Link href="/merchant" className="lg:hidden flex items-center">
                <KorieLogo variant="compact" theme="dark" height={26} />
              </Link>
              <div className="hidden lg:block">
                <span className="text-xs text-slate-400">{merchant.tradingName}</span>
                <div className="text-sm font-bold text-white flex items-center gap-2">
                  <span>{merchant.businessName}</span>
                  <span className="px-2 py-0.2 rounded text-[10px] font-mono bg-teal-500/15 text-teal-300 border border-teal-500/20">
                    {merchant.tier}
                  </span>
                </div>
              </div>
            </div>

            {/* Right Controls */}
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
                href="/merchant/profile"
                className="w-8 h-8 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 text-slate-950 flex items-center justify-center font-extrabold text-xs shadow-md shadow-teal-500/20"
              >
                M
              </Link>

              {/* Day / Night + Sign out */}
              <ShellAccount />
            </div>
          </header>

          <main className="flex-1 w-full max-w-6xl mx-auto">{children}</main>
          <PortalFooter portal="merchant" />
        </div>
      </div>

      {/* Mobile Fixed Bottom Navigation (48px+ touch targets) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--nav-bg)] backdrop-blur-2xl border-t border-white/10 px-2 py-1.5 flex items-center justify-around safe-area-bottom shadow-2xl">
        {mobileBottomNavItems.map((item) => {
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

      {/* Modals */}
      <ReceivePaymentModal />
      <CreatePaymentLinkModal />
      <CreateInvoiceModal />
    </div>
  );
};

export default MerchantShell;
