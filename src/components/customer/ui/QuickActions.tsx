"use client";

import React from "react";
import Link from "next/link";
import { ArrowUpRight, ChevronRight, Download, Receipt, Wallet } from "lucide-react";
import { useCustomer } from "../CustomerContext";
import { QuickActionsSkeleton } from "./KoriePaySkeletons";

/**
 * QuickActions — the one action panel under the balance (directive §14 / §15).
 *
 * Four destinations, and they are the four the portal can actually complete:
 *
 *     Send Money · Fund Account · Accounts · Transactions
 *
 * What this replaced was two competing panels on the same screen — `QuickActions`
 * (Send / Receive / Pay bills / Cards / FX, where three of five routes were
 * `COMING_SOON`) and `HubActions` (six tiles in a different order with different
 * labels, painted with `bg-violet-100` / `bg-[#12263a]` hardcoded values). Two
 * panels means two vocabularies for the same product, and a primary row whose
 * buttons lead to "not yet" is worse than a shorter row: §14 forbids exposing
 * unavailable functionality as a primary action, so unavailable services live in
 * `EverydayServices` below, where they are labelled, not here.
 *
 * `Send` keeps the single brand-filled tile — the primary action gets the
 * primary surface, the rest stay on the neutral field. Pressed feedback is a
 * transform only (no bounce), each tile is ≥56px, labels are always visible
 * (never icon-only for a money operation), and routes are prefetched by `Link`
 * so the first tap is not the slow one. There is no spinner here on purpose:
 * with no way to know when a route is ready, a spinner would be decoration
 * pretending to be progress — §73's "no fake loading".
 */
export const QuickActions: React.FC<{ loading?: boolean; className?: string }> = ({
  loading = false,
  className = "",
}) => {
  const { t } = useCustomer();

  if (loading) return <QuickActionsSkeleton className={className} />;

  const actions = [
    { href: "/customer/send-money", icon: ArrowUpRight, labelKey: "customer.quick.send", primary: true },
    { href: "/customer/fund", icon: Download, labelKey: "customer.fund.title", primary: false },
    { href: "/customer/wallets", icon: Wallet, labelKey: "customer.accounts.title", primary: false },
    { href: "/customer/transactions", icon: Receipt, labelKey: "nav.activity", primary: false },
  ];

  return (
    <div
      className={`rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-2.5 shadow-[var(--shadow-card)] ${className}`}
    >
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-2.5">
        {actions.map((a) => {
          const Icon = a.icon;
          return (
            <li key={a.href}>
              <Link
                href={a.href}
                prefetch
                data-quick-action
                className={`group flex min-h-[64px] flex-col items-start justify-between gap-1.5 rounded-2xl p-3 transition-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] ${
                  a.primary
                    ? "bg-[var(--brand-primary)] text-[var(--brand-on-primary)] hover:bg-[var(--brand-primary-hover)]"
                    : "border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--foreground)] hover:border-[var(--brand-border)]"
                }`}
              >
                <span className="flex w-full items-center justify-between">
                  <span
                    className={`grid h-8 w-8 place-items-center rounded-xl ${
                      a.primary ? "bg-white/15 text-[var(--brand-on-primary)]" : "bg-[var(--brand-soft)] text-[var(--brand-primary)]"
                    }`}
                    aria-hidden="true"
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <ChevronRight
                    className={`h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100 ${
                      a.primary ? "text-[var(--brand-on-primary)]" : "text-[var(--foreground-muted)]"
                    }`}
                    aria-hidden="true"
                  />
                </span>
                <span className="text-[11px] font-bold leading-tight">{t(a.labelKey)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default QuickActions;
