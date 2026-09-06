"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCustomer } from "../CustomerContext";
import KorieLogo from "@/components/brand/KorieLogo";
import PortalFooter from "@/components/ui/PortalFooter";
import LanguageSelector from "./LanguageSelector";
import TransactionReceiptModal from "./TransactionReceiptModal";
import ReportDisputeModal from "./ReportDisputeModal";
import FloatingMobileNav from "./FloatingMobileNav";
import NotificationCenter from "./NotificationCenter";
import { isServiceAvailable } from "@/lib/customer/customerFeatures";
import {
  Home,
  Receipt,
  Send,
  Wallet,
  ArrowRightLeft,
  Zap,
  CreditCard,
  Settings,
  ShieldCheck,
  LifeBuoy,
  
  Repeat2,
  Users,
  Coins,
  WifiOff,
  ChevronRight,
  Download,
  LogOut,
  Sun,
  Moon,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthContext";
import { useTheme } from "@/components/ui/ThemeContext";
import { useLoading } from "@/components/loading";

type NavDef = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Service id from customerFeatures — gates the "Coming soon" marker. */
  service?: Parameters<typeof isServiceAvailable>[0] | null;
};

/**
 * CustomerShell — desktop sidebar + header + the floating mobile nav.
 *
 * Header discipline (§48): brand · notifications · language · theme · profile.
 * The balance-privacy switch is NOT here (it lives beside the balance, §45) and
 * neither of the old duplicates remain.
 */
export const CustomerShell: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  // The wordmark ships two cuts — ink for light surfaces, white for dark. Pinning
  // one of them in markup is what left the logo almost invisible in dark mode.
  const { theme: appearance } = useTheme();
  const logoTheme = appearance === "dark" ? "dark" : "light";
  const pathname = usePathname();
  const {
    customer,
    isOffline,
    activeWallet,
    isBalanceHidden,
    t,
    notificationsCount,
    notificationsPhase,
    dataSource,
    getServiceStatus,
    portalPhase,
    portalError,
    refreshPortal,
  } = useCustomer();
  const { logout } = useAuth();
  const { resetBootstrapReady } = useLoading();

  // Ordered by real customer workflow: profile → money out → money in →
  // record → services. A service whose status is COMING_SOON keeps its row but
  // is labelled, so the sidebar never offers a silent dead end.
  // §30 order — the record and the money movement come before the account
  // catalogue, because that is the order a customer asks for them in.
  const primaryNav: NavDef[] = [
    { label: t("nav.home"), href: "/customer", icon: Home },
    { label: t("nav.activity"), href: "/customer/transactions", icon: Receipt },
    { label: t("nav.transfers"), href: "/customer/send-money", icon: ArrowRightLeft, service: "sendMoney" },
    { label: t("customer.accounts.title"), href: "/customer/wallets", icon: Wallet },
    { label: t("customer.fund.title"), href: "/customer/fund", icon: Download, service: "fund" },
  ];
  const serviceNav: NavDef[] = [
    // Adashi is listed first because it is live — real circles, contribution
    // obligations and payouts — while everything after it is COMING_SOON. A
    // real product must not sit behind a URL nobody links to.
    { label: t("nav.adashi"), href: "/customer/adashi", icon: Coins },
    { label: t("nav.fx"), href: "/customer/fx", icon: Repeat2, service: "fx" },
    { label: t("nav.bills"), href: "/customer/bills", icon: Zap, service: "bills" },
    { label: t("nav.cards"), href: "/customer/cards", icon: CreditCard, service: "cards" },
    { label: t("nav.beneficiaries"), href: "/customer/beneficiaries", icon: Users },
  ];
  const secondaryNav: NavDef[] = [
    { label: t("nav.verification"), href: "/customer/kyc", icon: ShieldCheck },
    { label: t("nav.security"), href: "/customer/security", icon: Settings },
    { label: t("nav.support"), href: "/customer/support", icon: LifeBuoy },
  ];

  const isActive = (href: string) =>
    href === "/customer" ? pathname === "/customer" : pathname === href || pathname.startsWith(`${href}/`);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      /* session teardown must not block sign-out */
    }
    // Re-arm the boot gate: the next session must wait for its own data rather
    // than inheriting this one's "already loaded" flag.
    resetBootstrapReady();
    try {
      sessionStorage.removeItem("koriepay_loaded");
    } catch {
      /* private mode */
    }
    await logout();
  };

  const NavRow = ({ item }: { item: NavDef }) => {
    const active = isActive(item.href);
    const Icon = item.icon;
    const soon = item.service ? !isServiceAvailable(item.service) : false;
    return (
      <Link
        href={item.href}
        className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors min-h-[40px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] ${
          active
            ? "bg-[var(--brand-soft)] text-[var(--brand-primary)] font-bold"
            : "text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-elevated)]"
        }`}
        aria-current={active ? "page" : undefined}
      >
        <span className="flex items-center gap-2.5 min-w-0">
          <Icon className={`w-4 h-4 shrink-0 ${active ? "text-[var(--brand-primary)]" : "text-[var(--foreground-muted)]"}`} />
          <span className="truncate">{item.label}</span>
        </span>
        {soon ? (
          <span className="shrink-0 text-[8px] font-mono font-bold uppercase text-[var(--foreground-muted)] border border-[var(--border)] rounded-md px-1 py-0.5">
            {t("common.comingSoon")}
          </span>
        ) : (
          active && <ChevronRight className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        )}
      </Link>
    );
  };

  return (
    <div className="kp-portal min-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col antialiased selection:bg-[var(--brand-primary)] selection:text-[var(--brand-on-primary)]">
      {/* Offline / degraded-data status bars. Distinct messages: offline is the
          customer's transport, unavailable is ours. */}
      {isOffline ? (
        <div
          className="bg-[var(--danger)] text-white text-xs font-semibold px-4 py-2 flex items-center justify-center gap-2 sticky top-0 z-50"
          role="status"
        >
          <WifiOff className="w-4 h-4" aria-hidden="true" />
          <span>
            {t("common.offline")}: {t("common.offlineDesc")}
          </span>
        </div>
      ) : dataSource === "unavailable" && portalPhase === "error" ? (
        <div
          className="bg-[var(--warning-soft)] text-[var(--foreground)] text-xs font-semibold px-4 py-2 flex items-center justify-center gap-2 sticky top-0 z-50 border-b border-[var(--border)]"
          role="alert"
        >
          <span>{portalError?.message ?? t("customer.shell.dataUnavailable")}</span>
          <button
            type="button"
            onClick={() => void refreshPortal()}
            className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-0.5 text-[11px] font-bold hover:bg-[var(--surface-elevated)]"
          >
            {t("common.tryAgain")}
          </button>
        </div>
      ) : null}

      <div className="flex flex-1">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex flex-col justify-between w-64 bg-[var(--surface)]/80 backdrop-blur-xl border-r border-[var(--border)] sticky top-0 shadow-[var(--shadow-sm)] h-screen overflow-y-auto z-[var(--z-page)] shrink-0">
          <div>
            <div className="p-5 border-b border-[var(--border)] flex items-center justify-between">
              <Link href="/customer" className="flex min-h-[40px] items-center gap-2 rounded-xl px-1">
                {/* linkHref="" — the logo component links by default, and an <a>
                    inside this <a> is invalid HTML that costs a hydration pass and
                    a duplicate focus stop. Here the wrapper owns the navigation. */}
                <KorieLogo variant="compact" theme={logoTheme} height={28} linkHref="" />
              </Link>
              {/* XOF is the primary currency — never reordered, never swapped for USD. */}
              <span className="px-2 py-0.5 rounded-md bg-[var(--brand-soft)] border border-[var(--brand-border)] text-[10px] font-mono text-[var(--brand-primary)] font-bold">
                XOF
              </span>
            </div>

            {/* Balance preview. Mirrors the masking preference; carries no extra
                toggle so there is exactly one control beside the money. */}
            <div className="p-3 mx-3 my-3 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--border)] space-y-1">
              <div className="text-[10px] font-mono text-[var(--foreground-muted)] uppercase">
                {activeWallet ? t("dashboard.availableBalance") : t("customer.shell.loadingAccount")}
              </div>
              <div className="text-base font-extrabold text-[var(--foreground)] font-mono tabular-nums">
                {portalPhase === "loading"
                  ? "••••••"
                  : activeWallet
                    ? isBalanceHidden
                      ? `${activeWallet.symbol} •••••••`
                      : `${activeWallet.symbol} ${activeWallet.availableBalance.toLocaleString()}`
                    : t("customer.shell.noAccountYet")}
              </div>
              <div className="text-[10px] text-[var(--brand-primary)] font-mono truncate">
                {activeWallet?.bankName ?? ""}
              </div>
            </div>

            <nav className="p-3 space-y-0.5" aria-label={t("customer.shell.primaryNav")}>
              {primaryNav.map((item) => (
                <NavRow key={item.href} item={item} />
              ))}
            </nav>

            <div className="px-3 pt-2 pb-1">
              <span className="text-[9px] font-mono uppercase tracking-wider text-[var(--foreground-muted)]">
                {t("customer.shell.servicesGroup")}
              </span>
            </div>
            <nav className="p-3 pt-0 space-y-0.5 border-t border-[var(--border)]" aria-label={t("customer.shell.servicesNav")}>
              {serviceNav.map((item) => (
                <NavRow key={item.href} item={item} />
              ))}
            </nav>

            <nav className="p-3 pt-2 space-y-0.5 border-t border-[var(--border)]" aria-label={t("customer.shell.accountNav")}>
              {secondaryNav.map((item) => (
                <NavRow key={item.href} item={item} />
              ))}
            </nav>
          </div>

          <div className="p-3 border-t border-[var(--border)] bg-[var(--surface-elevated)]">
            <Link
              href="/customer/profile"
              className="flex items-center justify-between p-2 rounded-xl bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--brand-border)] transition-colors"
            >
              <span className="flex items-center gap-2 min-w-0">
                <span className="w-8 h-8 rounded-lg bg-[var(--brand-soft)] text-[var(--brand-primary)] flex items-center justify-center text-xs font-bold font-mono shrink-0">
                  {customer ? `${customer.firstName[0]}${customer.lastName[0] || ""}` : "••"}
                </span>
                <span className="truncate max-w-[110px]">
                  <span className="block text-xs font-bold text-[var(--foreground)] truncate">
                    {customer?.fullName ?? t("common.loading")}
                  </span>
                  <span className="block text-[10px] text-[var(--brand-primary)] font-mono">
                    {customer?.kycTier ?? "—"}
                  </span>
                </span>
              </span>
              <ChevronRight className="w-4 h-4 text-[var(--foreground-muted)] shrink-0" aria-hidden="true" />
            </Link>
          </div>
        </aside>

        {/* Content column — extra bottom padding clears the floating pill */}
        <div className="flex-1 flex flex-col min-w-0 pb-[var(--kp-content-clearance)] lg:pb-10">
          <header className="sticky top-0 z-[var(--z-nav)] glass-nav px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Link
                href="/customer"
                className="lg:hidden -ml-1 flex min-h-[42px] items-center rounded-xl px-1"
                aria-label={t("customer.shell.homeAria")}
              >
                <KorieLogo variant="compact" theme={logoTheme} height={26} linkHref="" />
              </Link>
              <div className="hidden lg:block min-w-0">
                <span className="text-xs text-[var(--foreground-muted)]">{t("customer.shell.greeting")}</span>
                <div className="text-sm font-bold text-[var(--foreground)] flex items-center gap-1.5 min-w-0">
                  <span className="truncate">{customer?.fullName ?? t("common.loading")}</span>
                  {customer && (
                    <span className="text-[var(--brand-primary)] text-xs shrink-0">● {customer.kycTier}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Appearance — desktop keeps the fast control; mobile gets it in
                  More + Settings, which is what was missing before. */}
              <div className="hidden lg:block">
                <ThemeSelectorInline />
              </div>

              <NotificationCenter />

              <LanguageSelector />

              <Link
                href="/customer/profile"
                className="w-8 h-8 rounded-xl bg-[var(--brand-primary)] text-[var(--brand-on-primary)] flex items-center justify-center text-xs font-extrabold shadow-[var(--shadow-sm)] hidden sm:flex"
                aria-label={t("nav.profile")}
              >
                {customer?.firstName?.[0] ?? "•"}
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                className="p-2 rounded-xl bg-[var(--surface)] hover:text-[var(--danger)] border border-[var(--border)] text-[var(--foreground-muted)] transition-colors min-h-[36px] min-w-[36px] grid place-items-center"
                aria-label={t("common.sign_out")}
                title={t("common.sign_out")}
              >
                <LogOut className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </header>

          <main className="flex-1 w-full max-w-7xl mx-auto" id="main-content">
            {children}
          </main>
          <PortalFooter portal="customer" />
        </div>
      </div>

      {/* Floating mobile navigation + More sheet */}
      <FloatingMobileNav />

      <TransactionReceiptModal />
      <ReportDisputeModal />
    </div>
  );
};

/** Compact desktop appearance control (same component as Settings/More). */
const ThemeSelectorInline: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const { t } = useCustomer();
  const isDark = theme === "dark";
  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="p-2 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors min-h-[36px] min-w-[36px] grid place-items-center"
      aria-label={isDark ? t("customer.settings.appearanceToLight") : t("customer.settings.appearanceToDark")}
      title={isDark ? t("customer.settings.appearanceLight") : t("customer.settings.appearanceDark")}
      aria-pressed={isDark}
    >
      {isDark ? <Sun className="w-4 h-4" aria-hidden="true" /> : <Moon className="w-4 h-4" aria-hidden="true" />}
    </button>
  );
};

export default CustomerShell;
