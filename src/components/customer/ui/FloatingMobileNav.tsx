"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Receipt,
  Send,
  Wallet,
  Ellipsis,
  Bell,
  ShieldCheck,
  CreditCard,
  LifeBuoy,
  Settings,
  X,
  ChevronRight,
  Download,
  Repeat2,
  Users,
  Zap,
} from "lucide-react";
import { useCustomer } from "../CustomerContext";
import { isServiceAvailable } from "@/lib/customer/customerFeatures";
import { KpayInlineLoader } from "@/components/loading/KpayInlineLoader";

/**
 * FloatingMobileNav — §41–§43 rebuilt.
 *
 * What was wrong before: the floating pill was Home / Accounts / Send /
 * **Cards** / More. Two defects in five slots — Cards is `COMING_SOON`, so a
 * fifth of the primary bar was a dead end, and Transaction History (the P0
 * screen) had no mobile entry point at all. "More" also pointed at Settings,
 * which is not a menu.
 *
 * Now: Home · Transactions · Send · Accounts · More, and the More sheet is
 * generated from real routes + real service availability. A COMING_SOON service
 * still appears — hiding it makes customers think the product forgot them — but
 * it is labelled and never looks like a working destination.
 *
 * Ergonomics: 44–48px+ targets, `safe-area-bottom`, glass pill, single active
 * indicator, Escape/scrim close, focus returned to the trigger on close, and
 * the sheet traps nothing that would block a screen reader from reading it.
 */

const PRIMARY = [
  { href: "/customer", labelKey: "nav.home", icon: Home },
  { href: "/customer/transactions", labelKey: "nav.activity", icon: Receipt },
  { href: "/customer/send-money", labelKey: "nav.send", icon: Send },
  { href: "/customer/wallets", labelKey: "customer.accounts.title", icon: Wallet },
] as const;

export const FloatingMobileNav: React.FC = () => {
  const pathname = usePathname();
  const { t, notificationsCount, notificationsPhase, getServiceStatus } = useCustomer();
  const [open, setOpen] = useState(false);
  const [sheetPhase, setSheetPhase] = useState<"idle" | "closing">("idle");
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    setSheetPhase("idle");
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    // Lock the page behind the sheet so the pill cannot scroll out from under it.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const first = panelRef.current?.querySelector<HTMLElement>("[data-autofocus]");
    first?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, close]);

  const isActive = (href: string) =>
    href === "/customer" ? pathname === "/customer" : pathname === href || pathname.startsWith(`${href}/`);

  // Any primary route inside /customer but not in PRIMARY should light "More".
  const moreActive =
    open ||
    ["/customer/settings", "/customer/security", "/customer/kyc", "/customer/support", "/customer/notifications"].some(
      (href) => isActive(href),
    );

  const secondary = [
    {
      href: "/customer/fund",
      labelKey: "customer.fund.title",
      icon: Download,
      service: "fund" as const,
    },
    { href: "/customer/kyc", labelKey: "nav.verification", icon: ShieldCheck, service: null },
    { href: "/customer/cards", labelKey: "nav.cards", icon: CreditCard, service: "cards" as const },
    { href: "/customer/bills", labelKey: "nav.bills", icon: Zap, service: "bills" as const },
    { href: "/customer/fx", labelKey: "nav.fx", icon: Repeat2, service: "fx" as const },
    { href: "/customer/beneficiaries", labelKey: "nav.beneficiaries", icon: Users, service: null },
    { href: "/customer/support", labelKey: "nav.support", icon: LifeBuoy, service: null },
    { href: "/customer/settings", labelKey: "nav.settings", icon: Settings, service: null },
  ];

  return (
    <>
      {open && (
        <>
          {/* More sheet */}
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={t("nav.more")}
            className="lg:hidden fixed inset-x-3 bottom-[92px] z-50 rounded-3xl glass-modal border border-[var(--border)] shadow-[var(--shadow-lg)] overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
              <h2 className="text-sm font-extrabold text-[var(--foreground)]">{t("customer.more.title")}</h2>
              <button
                type="button"
                onClick={close}
                className="p-2 -m-1 rounded-xl text-[var(--foreground-muted)] hover:bg-[var(--surface-elevated)] min-h-[40px] min-w-[40px] grid place-items-center"
                aria-label={t("common.close")}
                data-autofocus
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Action centre: verification is never buried (§22). */}
            <VerificationPrompt />

            <nav className="max-h-[52vh] overflow-y-auto overscroll-contain p-2">
              <ul className="space-y-0.5">
                {secondary.map((item) => {
                  const soon = item.service ? !isServiceAvailable(item.service) : false;
                  const active = isActive(item.href);
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={close}
                        className={`flex items-center gap-3 rounded-2xl px-3 py-3 min-h-[48px] transition-colors ${
                          active ? "bg-[var(--brand-soft)]" : "hover:bg-[var(--surface-elevated)]"
                        }`}
                        aria-current={active ? "page" : undefined}
                      >
                        <span
                          className={`grid h-9 w-9 place-items-center rounded-xl border ${
                            active
                              ? "bg-[var(--brand-soft-strong)] border-[var(--brand-border)] text-[var(--brand-primary)]"
                              : "bg-[var(--surface-elevated)] border-[var(--border)] text-[var(--foreground-muted)]"
                          }`}
                          aria-hidden="true"
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className={`block truncate text-sm font-bold ${active ? "text-[var(--brand-primary)]" : "text-[var(--foreground)]"}`}>
                            {t(item.labelKey)}
                          </span>
                          {soon && (
                            <span className="mt-0.5 inline-flex items-center rounded-full bg-[var(--surface-3)] px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase text-[var(--foreground-muted)]">
                              {t("common.comingSoon")}
                            </span>
                          )}
                        </span>
                        <ChevronRight className="h-4 w-4 text-[var(--foreground-muted)]" aria-hidden="true" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>

          {/* Scrim */}
          <button
            type="button"
            aria-label={t("common.close")}
            onClick={close}
            className="lg:hidden fixed inset-0 z-40 bg-black/25 backdrop-blur-[2px]"
          />
        </>
      )}

      <nav
        className="lg:hidden fixed bottom-3 left-3 right-3 z-50 mx-auto max-w-md px-1.5 py-1.5 rounded-3xl glass-03 flex items-center justify-around safe-area-bottom"
        aria-label={t("customer.more.primaryNav")}
      >
        {PRIMARY.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-1 px-2.5 min-w-[54px] min-h-[48px] rounded-2xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] ${
                active ? "bg-[var(--brand-soft)]" : "hover:bg-[var(--surface-elevated)]"
              }`}
              aria-current={active ? "page" : undefined}
            >
              <span className={`rounded-xl p-1 ${active ? "bg-[var(--brand-soft-strong)]" : ""}`} aria-hidden="true">
                <Icon className={`h-[21px] w-[21px] ${active ? "text-[var(--brand-primary)] stroke-[2.4]" : "text-[var(--foreground-muted)]"}`} />
              </span>
              <span className={`text-[10px] leading-tight font-semibold ${active ? "text-[var(--brand-primary)]" : "text-[var(--foreground-muted)]"}`}>
                {t(item.labelKey)}
              </span>
            </Link>
          );
        })}

        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-haspopup="dialog"
          className={`relative flex flex-col items-center justify-center gap-1 px-2.5 min-w-[54px] min-h-[48px] rounded-2xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] ${
            moreActive ? "bg-[var(--brand-soft)]" : "hover:bg-[var(--surface-elevated)]"
          }`}
        >
          <span className={`rounded-xl p-1 ${moreActive ? "bg-[var(--brand-soft-strong)]" : ""}`} aria-hidden="true">
            <Ellipsis className={`h-[21px] w-[21px] ${moreActive ? "text-[var(--brand-primary)] stroke-[2.4]" : "text-[var(--foreground-muted)]"}`} />
          </span>
          <span className={`text-[10px] leading-tight font-semibold ${moreActive ? "text-[var(--brand-primary)]" : "text-[var(--foreground-muted)]"}`}>
            {t("nav.more")}
          </span>
          {(notificationsCount > 0 || notificationsPhase === "loading") && (
            <span className="absolute top-1 right-1.5 flex items-center justify-center">
              {notificationsPhase === "loading" && sheetPhase === "idle" ? (
                <KpayInlineLoader size="xs" label={t("customer.more.loadingAlerts")} />
              ) : (
                <span className="h-2 w-2 rounded-full bg-[var(--brand-primary)]" aria-hidden="true" />
              )}
              {notificationsCount > 0 && (
                <span className="sr-only">
                  {t("customer.more.alertsCount", { count: notificationsCount })}
                </span>
              )}
            </span>
          )}
        </button>
      </nav>
    </>
  );
};

/**
 * Verification prompt inside More. The brief forbids making a customer hunt
 * through Settings to discover a KYC problem, so the actionable state is
 * surfaced on the sheet that is always one tap away.
 */
const VerificationPrompt: React.FC = () => {
  const { customer, t } = useCustomer();
  if (!customer) return null;
  if (customer.kycStatus === "VERIFIED") return null;

  const urgent = customer.kycStatus === "REJECTED";
  return (
    <Link
      href="/customer/kyc"
      className={`m-2 mb-0 flex items-center gap-3 rounded-2xl border p-3 ${
        urgent
          ? "border-[var(--danger-soft)] bg-[var(--danger-soft)]/50"
          : "border-[var(--brand-border)] bg-[var(--brand-soft)]/60"
      }`}
    >
      <Bell className={`h-4 w-4 shrink-0 ${urgent ? "text-[var(--danger)]" : "text-[var(--brand-primary)]"}`} aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-bold text-[var(--foreground)]">
          {t(urgent ? "customer.more.verificationRejected" : "customer.more.verificationPending")}
        </span>
        <span className="block text-[11px] text-[var(--foreground-muted)]">{t("customer.more.verificationCta")}</span>
      </span>
      <ChevronRight className="h-4 w-4 text-[var(--foreground-muted)]" aria-hidden="true" />
    </Link>
  );
};

export default FloatingMobileNav;
