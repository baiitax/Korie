"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Receipt, Send, Wallet, Ellipsis } from "lucide-react";
import { useCustomer } from "../CustomerContext";
import { MoreMenuSheet } from "./MoreMenuSheet";
import { KpayInlineLoader } from "@/components/loading/KpayInlineLoader";

/**
 * FloatingMobileNav — the capsule (directive §21–§29).
 *
 * Five destinations, and only five: Home · Transactions · Send · Accounts ·
 * More. The version this replaced had **Cards** (a `COMING_SOON` dead end) in a
 * primary slot and no entry point at all for transaction history, which is the
 * screen customers actually go looking for.
 *
 * Geometry lives in `.kp-nav` (globals.css) so the numbers are stated once:
 * 92% width, 430px max, 26px radius, 62px tall, and `env(safe-area-inset-bottom)`
 * added to the 14px inset. §29's clearance is the matching `--kp-content-clearance`
 * on the shell's content column, so the last row of a list can never sit under it.
 *
 * §25 Send: raised 10px with the brand fill — the strongest affordance in the
 * bar, but it is *inside* the capsule and uses the same radius family, so it
 * reads as one control cluster rather than a floating action button glued on top.
 *
 * §27 scroll: scrolling down quiets the capsule (opacity 0.9, 2px settle,
 * lighter shadow); scrolling up restores it. It never unmounts or slides away —
 * during a transfer or a funding flow (`/customer/send-money`, `/customer/fund`,
 * `/customer/receive-money`) the condensing is switched off entirely, because
 * navigation that fades while a customer is moving money is a stability problem
 * dressed up as polish.
 *
 * §69 layering: the capsule is `--z-nav`; sheets `--z-sheet`; scrims
 * `--z-scrim`; dialogs `--z-modal`; loaders `--z-loader`. One ladder, so a sheet
 * is always above the nav and the nav can never cover a dialog's action bar.
 */

const PRIMARY = [
  { href: "/customer", labelKey: "nav.home", icon: Home },
  { href: "/customer/transactions", labelKey: "nav.activity", icon: Receipt },
  { href: "/customer/send-money", labelKey: "nav.send", icon: Send, emphasis: true },
  { href: "/customer/wallets", labelKey: "customer.accounts.title", icon: Wallet },
] as const;

/** §27 — flows where the bar must stay exactly where it is. */
const CRITICAL_ROUTES = ["/customer/send-money", "/customer/fund", "/customer/receive-money", "/customer/kyc"];

export const FloatingMobileNav: React.FC = () => {
  const pathname = usePathname();
  const { t, notificationsCount, notificationsPhase } = useCustomer();
  const [moreOpen, setMoreOpen] = useState(false);
  const [condensed, setCondensed] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const lastY = useRef(0);

  const critical = CRITICAL_ROUTES.some((r) => pathname.startsWith(r));

  // Scroll affordance, throttled to one write per frame.
  useEffect(() => {
    if (critical || moreOpen) {
      setCondensed(false);
      return;
    }
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const y = window.scrollY || 0;
        const goingDown = y > lastY.current + 6;
        const goingUp = y < lastY.current - 6;
        if (goingDown && y > 96) setCondensed(true);
        else if (goingUp) setCondensed(false);
        lastY.current = Math.max(y, 0);
      });
    };
    lastY.current = window.scrollY || 0;
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
  }, [critical, moreOpen]);

  // A route change is a new context: restore full prominence.
  useEffect(() => setCondensed(false), [pathname]);

  const isActive = (href: string) =>
    href === "/customer" ? pathname === "/customer" : pathname === href || pathname.startsWith(`${href}/`);

  const moreActive =
    moreOpen ||
    ["/customer/settings", "/customer/security", "/customer/kyc", "/customer/support", "/customer/fund", "/customer/beneficiaries"].some(
      (href) => isActive(href),
    );

  return (
    <>
      <MoreMenuSheet open={moreOpen} onClose={() => { setMoreOpen(false); triggerRef.current?.focus(); }} />

      <nav
        className="kp-nav flex items-stretch justify-around gap-0.5 px-1.5 py-1.5"
        aria-label={t("customer.more.primaryNav")}
        data-condensed={condensed ? "true" : "false"}
      >
        {PRIMARY.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          const raised = "emphasis" in item && item.emphasis;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-[48px] min-w-[54px] flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] ${
                raised
                  ? "kp-nav-send"
                  : active
                    ? "bg-[var(--brand-soft)]"
                    : "hover:bg-[var(--surface-elevated)]"
              }`}
            >
              <span
                className={`rounded-xl p-1 ${active && !raised ? "bg-[var(--brand-soft-strong)]" : ""}`}
                aria-hidden="true"
              >
                <Icon
                  className={`h-[20px] w-[20px] ${
                    raised ? "text-white" : active ? "text-[var(--brand-primary)]" : "text-[var(--foreground-muted)]"
                  } ${active || raised ? "stroke-[2.4]" : ""}`}
                />
              </span>
              <span
                className={`text-[10px] font-semibold leading-tight ${
                  raised ? "text-white" : active ? "text-[var(--brand-primary)]" : "text-[var(--foreground-muted)]"
                }`}
              >
                {t(item.labelKey)}
              </span>
            </Link>
          );
        })}

        <button
          ref={triggerRef}
          type="button"
          onClick={() => setMoreOpen((v) => !v)}
          aria-expanded={moreOpen}
          aria-haspopup="dialog"
          className={`relative flex min-h-[48px] min-w-[54px] flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] ${
            moreActive ? "bg-[var(--brand-soft)]" : "hover:bg-[var(--surface-elevated)]"
          }`}
        >
          <span className={`rounded-xl p-1 ${moreActive ? "bg-[var(--brand-soft-strong)]" : ""}`} aria-hidden="true">
            {/* The icon stays `Ellipsis`: More is More. Alert volume is already
                carried by the pip, and swapping the glyph to a bell made the
                destination read as two different things depending on state. */}
            <Ellipsis className={`h-[20px] w-[20px] ${moreActive ? "text-[var(--brand-primary)] stroke-[2.4]" : "text-[var(--foreground-muted)]"}`} />
          </span>
          <span className={`text-[10px] font-semibold leading-tight ${moreActive ? "text-[var(--brand-primary)]" : "text-[var(--foreground-muted)]"}`}>
            {t("nav.more")}
          </span>
          {(notificationsCount > 0 || notificationsPhase === "loading") && (
            <span className="absolute right-1.5 top-1 grid place-items-center">
              {notificationsPhase === "loading" ? (
                <KpayInlineLoader size="xs" label={t("customer.more.loadingAlerts")} />
              ) : (
                <span className="h-2 w-2 rounded-full bg-[var(--brand-gold)]" aria-hidden="true" />
              )}
              {notificationsCount > 0 && (
                <span className="sr-only">{t("customer.more.alertsCount", { count: notificationsCount })}</span>
              )}
            </span>
          )}
        </button>
      </nav>
    </>
  );
};

export default FloatingMobileNav;
