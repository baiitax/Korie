"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCustomer } from "../CustomerContext";
import KorieLogo from "@/components/brand/KorieLogo";
import ShellAccount from "@/components/ui/ShellAccount";
import PortalFooter from "@/components/ui/PortalFooter";
import LanguageSelector from "./LanguageSelector";
import TransactionReceiptModal from "./TransactionReceiptModal";
import ReportDisputeModal from "./ReportDisputeModal";
import {
  Home,
  ArrowRightLeft,
  Zap,
  CreditCard,
  Activity,
  User,
  Settings,
  ShieldCheck,
  LifeBuoy,
  Bell,
  Wallet,
  Repeat2,
  Users,
  WifiOff,
  ChevronRight,
  LogOut,
  Sparkles,
  Coins,
} from "lucide-react";

export const CustomerShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const { customer, isOffline, activeWallet, isBalanceHidden, t, notificationsCount } = useCustomer();
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);

  const desktopNavItems = [
    { label: t("nav.home"), href: "/customer", icon: Home },
    { label: "Adashi / Ajo (Savings)", href: "/customer/adashi", icon: Coins },
    { label: t("nav.transfers"), href: "/customer/send-money", icon: ArrowRightLeft },
    { label: t("nav.bills"), href: "/customer/bills", icon: Zap },
    { label: t("nav.cards"), href: "/customer/cards", icon: CreditCard },
    { label: t("nav.fx"), href: "/customer/fx", icon: Repeat2 },
    { label: t("nav.activity"), href: "/customer/transactions", icon: Activity },
    { label: t("nav.beneficiaries"), href: "/customer/beneficiaries", icon: Users },
    { label: t("nav.wallet"), href: "/customer/wallets", icon: Wallet },
    { label: t("nav.security"), href: "/customer/security", icon: ShieldCheck },
    { label: t("nav.support"), href: "/customer/support", icon: LifeBuoy },
    { label: t("nav.settings"), href: "/customer/settings", icon: Settings },
  ];

  const mobileBottomNavItems = [
    { label: t("nav.home"), href: "/customer", icon: Home },
    { label: t("nav.transfers"), href: "/customer/send-money", icon: ArrowRightLeft },
    { label: t("nav.bills"), href: "/customer/bills", icon: Zap },
    { label: t("nav.activity"), href: "/customer/transactions", icon: Activity },
    { label: t("nav.more"), href: "/customer/settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col antialiased selection:bg-emerald-500 selection:text-slate-950">
      {/* Offline Status Warning Bar */}
      {isOffline && (
        <div className="bg-rose-600 text-white text-xs font-semibold px-4 py-2 flex items-center justify-center gap-2 sticky top-0 z-50">
          <WifiOff className="w-4 h-4 animate-pulse" />
          <span>{t("common.offline")}: {t("common.offlineDesc")}</span>
        </div>
      )}

      {/* Main App Layout */}
      <div className="flex flex-1">
        {/* Desktop Left Sidebar */}
        <aside className="hidden lg:flex flex-col justify-between w-64 bg-[var(--surface)]/80 border-r border-[var(--border)] sticky top-0 shadow-[var(--shadow-sm)] h-screen overflow-y-auto z-40 shrink-0">
          <div>
            {/* Logo */}
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <Link href="/customer" className="flex items-center gap-2">
                <KorieLogo variant="compact" theme="dark" height={28} />
              </Link>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-mono text-emerald-400 font-bold">
                <span>{customer.country === "NG" ? "🇳🇬 NG" : "🇳🇪 NE"}</span>
              </div>
            </div>

            {/* Quick Balance Preview Card */}
            <div className="p-3 mx-3 my-3 rounded-2xl bg-[var(--surface-2)] border border-white/10 space-y-1">
              <div className="text-[10px] font-mono text-slate-400 uppercase">
                {t("dashboard.availableBalance")}
              </div>
              <div className="text-base font-extrabold text-white font-mono">
                {isBalanceHidden ? "••••••••" : `${activeWallet.symbol} ${activeWallet.availableBalance.toLocaleString()}`}
              </div>
              <div className="text-[10px] text-emerald-400 font-mono truncate">
                {activeWallet.bankName}
              </div>
            </div>

            {/* Navigation Items */}
            <nav className="p-3 space-y-1">
              {desktopNavItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? "bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20"
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
            </nav>
          </div>

          {/* Desktop User Footer */}
          <div className="p-3 border-t border-white/10 bg-[var(--surface-2)]">
            <Link
              href="/customer/profile"
              className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-white/5 hover:border-white/15 transition-all"
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold font-mono">
                  {customer.firstName[0]}
                  {customer.lastName[0]}
                </div>
                <div className="truncate max-w-[110px]">
                  <div className="text-xs font-bold text-white truncate">{customer.fullName}</div>
                  <div className="text-[10px] text-emerald-400 font-mono">{customer.kycTier}</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </Link>
          </div>
        </aside>

        {/* Center Content Column */}
        <div className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-8">
          {/* Top Sticky Header */}
          <header className="sticky top-0 z-30 glass-nav px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
            {/* Mobile Brand / Greeting */}
            <div className="flex items-center gap-3">
              <Link href="/customer" className="lg:hidden flex items-center">
                <KorieLogo variant="compact" theme="dark" height={26} />
              </Link>
              <div className="hidden lg:block">
                <span className="text-xs text-slate-400">KoriePay Digital Banking</span>
                <div className="text-sm font-bold text-white flex items-center gap-1.5">
                  <span>{customer.fullName}</span>
                  <span className="text-emerald-400 text-xs">● {customer.kycTier}</span>
                </div>
              </div>
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Country Badge */}
              <div className="px-2 py-1 rounded-xl bg-white/5 border border-white/10 text-xs font-mono font-semibold text-slate-300 flex items-center gap-1.5">
                <span>{customer.country === "NG" ? "🇳🇬 NGN" : "🇳🇪 XOF"}</span>
              </div>

              {/* Language Switcher */}
              <LanguageSelector />

              {/* Notifications Bell */}
              <Link
                href="/customer/settings"
                className="relative p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-colors"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                {notificationsCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-slate-950 font-bold font-mono text-[9px] flex items-center justify-center">
                    {notificationsCount}
                  </span>
                )}
              </Link>

              {/* User Avatar */}
              <Link
                href="/customer/profile"
                className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 flex items-center justify-center text-xs font-extrabold shadow-md shadow-emerald-500/20"
              >
                {customer.firstName[0]}
              </Link>

              {/* Day / Night + Sign out */}
              <ShellAccount />
            </div>
          </header>

          {/* Dynamic Route Page Body */}
          <main className="flex-1 w-full max-w-7xl mx-auto">
            {children}
          </main>
          <PortalFooter portal="customer" />
        </div>
      </div>

      {/* Mobile Fixed Bottom Navigation Bar (48px+ touch targets, icon + label) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--nav-bg)] backdrop-blur-2xl border-t border-white/10 px-2 py-2 flex items-center justify-around safe-area-bottom shadow-2xl">
        {mobileBottomNavItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 px-3 min-w-[56px] min-h-[48px] rounded-2xl transition-all ${
                isActive
                  ? "text-emerald-400 font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <div className={`p-1 rounded-xl transition-all ${isActive ? "bg-emerald-500/20" : ""}`}>
                <Icon className={`w-5 h-5 ${isActive ? "text-emerald-400 stroke-[2.5]" : "text-slate-400"}`} />
              </div>
              <span className="text-[10px] mt-0.5 leading-tight font-medium tracking-tight">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Universal Modals */}
      <TransactionReceiptModal />
      <ReportDisputeModal />
    </div>
  );
};

export default CustomerShell;
