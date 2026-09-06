"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMerchant } from "../MerchantContext";
import { KorieFloatingRail, KorieDock } from "@/components/nav/KorieFloatingRail";
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
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col antialiased selection:bg-teal-500 selection:text-slate-950">
      {isOffline && (
        <div className="bg-rose-600 text-white text-xs font-semibold px-4 py-2 flex items-center justify-center gap-2 sticky top-0 z-50">
          <WifiOff className="w-4 h-4 animate-pulse" />
          <span>Offline Network: Checkout processing paused for connection safety.</span>
        </div>
      )}

      <div className="flex flex-1">
        {/* Desktop floating navigation rail (premium spec) */}
        <KorieFloatingRail
          groups={desktopNavGroups.map((g) => ({ title: g.title, items: g.items.map((it) => ({ label: it.label, href: it.href, icon: it.icon })) }))}
          primary={[
            '/merchant', '/merchant/payments', '/merchant/payment-links', '/merchant/invoices',
            '/merchant/customers', '/merchant/wallet', '/merchant/settlements',
            '/merchant/analytics', '/merchant/settings',
          ]}
          role="MERCHANT OPS"
          tone="teal"
          word="KoriePay Merchant"
          settingsHref="/merchant/settings"
          storeKey="korie_merchant_rail"
          context={
            <div className="p-2.5 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] space-y-1.5">
              <div className="text-[10px] font-mono text-[var(--muted,#64748b)] uppercase tracking-wider">Active Store / Branch</div>
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground)] text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)]"
              >
                <option value="ALL">🏢 All Stores (HQ Summary)</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.branchName}</option>
                ))}
              </select>
            </div>
          }
          footer={
            <div className="rounded-xl bg-[var(--surface-2)] border border-[var(--border)] px-2.5 py-2 text-xs">
              <div className="font-bold text-[var(--foreground)] truncate">{merchant.businessName}</div>
              <div className="text-[10px] text-[var(--brand-primary,#059669)] font-mono mt-0.5">
                Providus Settlement • {merchant.settlementAccountMasked}
              </div>
            </div>
          }
        />


        {/* Center Main Content */}
        <div className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-8">
          <header className="sticky top-0 z-30 glass-nav px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Link href="/merchant" className="lg:hidden flex items-center">
                <KorieLogo variant="compact" theme="dark" height={26} linkHref="" />
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
      <KorieDock items={mobileBottomNavItems} />

      {/* Modals */}
      <ReceivePaymentModal />
      <CreatePaymentLinkModal />
      <CreateInvoiceModal />
    </div>
  );
};

export default MerchantShell;
