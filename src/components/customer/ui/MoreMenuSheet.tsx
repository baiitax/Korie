"use client";

import React, { useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  CreditCard,
  Download,
  LifeBuoy,
  LogOut,
  Repeat2,
  Settings,
  ShieldCheck,
  Users,
  X,
  Zap,
} from "lucide-react";
import { useCustomer } from "../CustomerContext";
import { isServiceAvailable } from "@/lib/customer/customerFeatures";
import { useAuth } from "@/components/auth/AuthContext";
import { useLoading } from "@/components/loading";

/**
 * MoreMenuSheet — the secondary destinations, generated from real routes
 * (directive §26 / §52).
 *
 * Two rules:
 *  • a row exists only if a route exists (`/customer/notifications` does not, so
 *    there is no row for it — the bell in the header opens the real feed from the
 *    portal payload instead of navigating to a page nobody built);
 *  • a service the platform has not wired (`cards`, `bills`, `fx`) still appears,
 *    labelled `Coming Soon`. Hiding it reads as "KoriePay forgot me"; a dead row
 *    that opens an honest explanation page reads as a product with a roadmap.
 *
 * Sign-out lives here on purpose: on mobile it had no other home, and it must
 * re-arm the boot gate so the next session cannot inherit this one's
 * "already loaded" flag.
 */

const ITEMS = [
  { href: "/customer/fund", labelKey: "customer.fund.title", icon: Download, service: "fund" as const },
  { href: "/customer/kyc", labelKey: "nav.verification", icon: ShieldCheck, service: null },
  { href: "/customer/beneficiaries", labelKey: "nav.beneficiaries", icon: Users, service: null },
  { href: "/customer/cards", labelKey: "nav.cards", icon: CreditCard, service: "cards" as const },
  { href: "/customer/bills", labelKey: "nav.bills", icon: Zap, service: "bills" as const },
  { href: "/customer/fx", labelKey: "nav.fx", icon: Repeat2, service: "fx" as const },
  { href: "/customer/settings", labelKey: "nav.settings", icon: Settings, service: null },
  { href: "/customer/support", labelKey: "nav.support", icon: LifeBuoy, service: null },
];

export const MoreMenuSheet: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { t } = useCustomer();
  const { logout } = useAuth();
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const { resetBootstrapReady } = useLoading();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const signOut = async () => {
    onClose();
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      /* session teardown must not block sign-out */
    }
    resetBootstrapReady();
    try {
      sessionStorage.removeItem("koriepay_loaded");
    } catch {
      /* private mode */
    }
    await logout();
  };

  if (!open) return null;

  return (
    <>
      <button type="button" aria-label={t("common.close")} onClick={onClose} className="kp-sheet-scrim fixed inset-0 bg-black/30 backdrop-blur-[2px]" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={t("nav.more")}
        className="kp-sheet fixed inset-x-0 bottom-0 mx-auto flex max-h-[78vh] w-full max-w-md flex-col"
      >
        <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
          <h2 className="text-sm font-extrabold text-[var(--foreground)]">{t("customer.more.title")}</h2>
          <button
            type="button"
            onClick={onClose}
            data-autofocus
            className="inline-grid h-9 w-9 place-items-center rounded-xl text-[var(--foreground-muted)] transition-colors hover:bg-[var(--surface-elevated)] hover:text-[var(--foreground)]"
            aria-label={t("common.close")}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2" aria-label={t("customer.more.secondaryNav")}>
          <ul className="space-y-0.5">
            {ITEMS.map((item) => {
              const soon = item.service ? !isServiceAvailable(item.service) : false;
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className="flex min-h-[52px] items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors hover:bg-[var(--surface-elevated)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]"
                  >
                    <span
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--foreground-muted)]"
                      aria-hidden="true"
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-[var(--foreground)]">{t(item.labelKey)}</span>
                      {soon && (
                        <span className="mt-0.5 inline-flex items-center rounded-full bg-[var(--surface-3)] px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase text-[var(--foreground-muted)]">
                          {t("common.comingSoon")}
                        </span>
                      )}
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-[var(--foreground-muted)]" aria-hidden="true" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-[var(--border)] p-2">
          <button
            type="button"
            onClick={() => void signOut()}
            className="flex min-h-[48px] w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-bold text-[var(--danger)] transition-colors hover:bg-[var(--danger-soft)]/50"
          >
            <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
            {t("common.sign_out")}
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              router.push("/customer/profile");
            }}
            className="mt-0.5 flex min-h-[48px] w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-semibold text-[var(--foreground-muted)] transition-colors hover:bg-[var(--surface-elevated)] hover:text-[var(--foreground)]"
          >
            <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
            {t("nav.profile")}
          </button>
        </div>
      </div>
    </>
  );
};

export default MoreMenuSheet;
