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
  Settings,
  ShieldCheck,
  LifeBuoy,
  Bell,
  Wallet,
  Repeat2,
  Users,
  WifiOff,
  ChevronRight,
  Coins,
  Eye,
  EyeOff,
  Send,
} from "lucide-react";

export const CustomerShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const { customer, isOffline, activeWallet, isBalanceHidden, toggleHideBalance, t, notificationsCount } = useCustomer();
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);

  const desktopNavItems = [
    { label: t("nav.home"), href: "/customer", icon: Home },
    { label: t("customer.accounts.title"), href: "/customer/wallets", icon: Wallet },
    { label: t("nav.transfers"), href: "/customer/send-money", icon: ArrowRightLeft },
    { label: t("nav.bills"), href: "/customer/bills", icon: Zap },
    { label: t("nav.cards"), href: "/customer/cards", icon: CreditCard },
    { label: t("nav.fx"), href: "/customer/fx", icon: Repeat2 },
    { label: t("nav.activity"), href: "/customer/transactions", icon: Activity },
    { label: t("nav.beneficiaries"), href: "/customer/beneficiaries", icon: Users },
  ];

  const mobileBottomNavItems = [
    { label: t("nav.home"), href: "/customer", icon: Home },
    { label: t("customer.accounts.title"), href: "/customer/wallets", icon: Wallet },
    { label: t("nav.transfers"), href: "/customer/send-money", icon: Send },
    { label: t("nav.cards"), href: "/customer/cards", icon: CreditCard },
    { label: t("nav.more"), href: "/customer/settings", icon: Settings },
  ];

  const isActive = (href: string) =>
    pathname === href ||
    (href !== "/customer" && pathname.startsWith(href + "/")) ||
    (href === "/customer" && pathname === "/customer");

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col antialiased selection:bg-emerald-500 selection:text-white">
      {/* Offline Status Warning Bar */}
      {isOffline && (
        <div className="bg-[var(--danger)] text-white text-xs font-semibold px-4 py-2 flex items-center justify-center gap-2 sticky top-0 z-50">
          <WifiOff className="w-4 h-4 animate-pulse" />
          <span>{t("common.offline")}: {t("common.offlineDesc")}</span>
        </div>
      )}

      {/* Main App Layout */}
      <div className="flex flex-1">
        {/* Desktop Left Sidebar — light, token-driven, z-fixed */}
        <aside className="hidden lg:flex flex-col justify-between w-64 bg-[var(--surface)]/80 backdrop-blur-xl border-r border-[var(--border)] sticky top-0 shadow-[var(--shadow-sm)] h-screen overflow-y-auto z-40 shrink-0">
          <div>
            {/* Logo */}
            <div className="p-5 border-b border-[var(--border)] flex items-center justify-between">
              <Link href="/customer" className="flex items-center gap-2">
                <KorieLogo variant="compact" theme="light" height={28} />
              </Link>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[var(--brand-soft)] border border-[var(--brand-border)] text-[10px] font-mono text-[var(--brand-primary)] font-bold">
                <span>{customer.country === "NG" ? "🇳🇬 NG" : "🇳🇪 NE"}</span>
              </div>
            </div>

            {/* Quick Balance Preview Card */}
            <div className="p-3 mx-3 my-3 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--border)] space-y-1">
              <div className="text-[10px] font-mono text-[var(--foreground-muted)] uppercase">
                {t("dashboard.availableBalance")}
              </div>
              <div className="text-base font-extrabold text-[var(--foreground)] font-mono tabular">
                {isBalanceHidden ? "••••••••" : `${activeWallet.symbol} ${activeWallet.availableBalance.toLocaleString()}`}
              </div>
              <div className="text-[10px] text-[var(--brand-primary)] font-mono truncate">
                {activeWallet.bankName}
              </div>
            </div>

            {/* Navigation Items */}
            <nav className="p-3 space-y-0.5">
              {desktopNavItems.map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      active
                        ? "bg-[var(--brand-soft)] text-[var(--brand-primary)] font-bold"
                        : "text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-elevated)]"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${active ? "text-[var(--brand-primary)]" : "text-[var(--foreground-muted)]"}`} />
                      <span>{item.label}</span>
                    </div>
                    {active && <ChevronRight className="w-3.5 h-3.5" />}
                  </Link>
                );
              })}
            </nav>

            {/* Secondary nav group */}
            <nav className="p-3 pt-2 space-y-0.5 border-t border-[var(--border)]">
              {[
                { label: t("nav.security"), href: "/customer/security", icon: ShieldCheck },
                { label: t("nav.support"), href: "/customer/support", icon: LifeBuoy },
                { label: t("nav.settings"), href: "/customer/settings", icon: Settings },
              ].map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      active
                        ? "bg-[var(--brand-soft)] text-[var(--brand-primary)] font-bold"
                        : "text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-elevated)]"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${active ? "text-[var(--brand-primary)]" : "text-[var(--foreground-muted)]"}`} />
                      <span>{item.label}</span>
                    </div>
                    {active && <ChevronRight className="w-3.5 h-3.5" />}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Desktop User Footer */}
          <div className="p-3 border-t border-[var(--border)] bg-[var(--surface-elevated)]">
            <Link
              href="/customer/profile"
              className="flex items-center justify-between p-2 rounded-xl bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--brand-border)] transition-all"
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[var(--brand-soft)] text-[var(--brand-primary)] flex items-center justify-center text-xs font-bold font-mono">
                  {customer.firstName[0]}{customer.lastName[0]}
                </div>
                <div className="truncate max-w-[110px]">
                  <div className="text-xs font-bold text-[var(--foreground)] truncate">{customer.fullName}</div>
                  <div className="text-[10px] text-[var(--brand-primary)] font-mono">{customer.kycTier}</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[var(--foreground-muted)]" />
            </Link>
          </div>
        </aside>

        {/* Center Content Column */}
        <div className="flex-1 flex flex-col min-w-0 pb-28 lg:pb-10">
          {/* Top Sticky Header */}
          <header className="sticky top-0 z-30 glass-nav px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
            {/* Mobile Brand / Greeting */}
            <div className="flex items-center gap-3">
              <Link href="/customer" className="lg:hidden flex items-center">
                <KorieLogo variant="compact" theme="light" height={26} />
              </Link>
              <div className="hidden lg:block">
                <span className="text-xs text-[var(--foreground-muted)]">{t("customer.shell.greeting")}</span>
                <div className="text-sm font-bold text-[var(--foreground)] flex items-center gap-1.5">
                  <span>{customer.fullName}</span>
                  <span className="text-[var(--brand-primary)] text-xs">● {customer.kycTier}</span>
                </div>
              </div>
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Desktop-only cluster (hidden on phone): country badge, balance
                  visibility, language, notifications, avatar */}
              <div className="hidden lg:flex items-center gap-2 sm:gap-3">
                {/* Country / Currency badge */}
                <div className="px-2 py-1 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-xs font-mono font-semibold text-[var(--foreground-muted)] flex items-center gap-1.5">
                  <span>{customer.country === "NG" ? "🇳🇬 NGN" : "🇳🇪 XOF"}</span>
                </div>

                {/* Hide / Show Balance (persistent) */}
                <button
                  onClick={toggleHideBalance}
                  className="p-2 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors"
                  title={isBalanceHidden ? t("customer.accounts.showBalance") : t("customer.accounts.hideBalance")}
                  aria-label={isBalanceHidden ? t("customer.accounts.showBalance") : t("customer.accounts.hideBalance")}
                >
                  {isBalanceHidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>

                {/* Language Switcher */}
                <LanguageSelector />

                {/* Notifications Bell */}
                <Link
                  href="/customer/settings"
                  className="relative p-2 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors"
                  title="Notifications"
                >
                  <Bell className="w-4 h-4" />
                  {notificationsCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[var(--brand-primary)] text-white font-bold font-mono text-[9px] flex items-center justify-center">
                      {notificationsCount}
                    </span>
                  )}
                </Link>

                {/* User Avatar */}
                <Link
                  href="/customer/profile"
                  className="w-8 h-8 rounded-xl bg-gradient-to-tr from-teal-600 to-teal-500 text-white flex items-center justify-center text-xs font-extrabold shadow-md shadow-[var(--brand-soft-strong)]"
                >
                  {customer.firstName[0]}
                </Link>
              </div>

              {/* Day/Night + Sign out — collapses to Logout-only on phone */}
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

      {/* Mobile Floating Rounded Pill Bottom Navigation */}
      <nav
        className="lg:hidden fixed bottom-3 left-3 right-3 z-40 mx-auto max-w-md px-1.5 py-1.5 rounded-3xl
          glass-03
          flex items-center justify-around
          safe-area-bottom"
        aria-label="Primary"
      >
        {mobileBottomNavItems.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-1 px-3 min-w-[58px] min-h-[52px] rounded-2xl transition-all ${
                active
                  ? "bg-[var(--brand-soft)]"
                  : "hover:bg-[var(--surface-elevated)]"
              }`}
              aria-current={active ? "page" : undefined}
            >
              <div className={`rounded-xl p-1 transition-all ${active ? "bg-[var(--brand-soft-strong)]" : ""}`}>
                <Icon className={`w-[22px] h-[22px] transition-all ${active ? "text-[var(--brand-primary)] stroke-[2.5]" : "text-[var(--foreground-muted)]"}`} />
              </div>
              <span className={`text-[10px] leading-tight font-semibold tracking-tight ${active ? "text-[var(--brand-primary)]" : "text-[var(--foreground-muted)]"}`}>
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
