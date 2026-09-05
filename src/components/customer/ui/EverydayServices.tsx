"use client";

import React from "react";
import Link from "next/link";
import { useCustomer } from "../CustomerContext";
import { ComingSoonBadge } from "./ComingSoonCard";
import { Smartphone, Wifi, Zap, Tv, Coins } from "lucide-react";

/**
 * EverydayServices — the one live service, then the quick service pills.
 *
 * ADASHI comes first and is the only REAL service in this section: rotating
 * savings circles with contribution obligations and wallet payouts exist
 * behind `/customer/adashi`. Before this, the grid offered four COMING SOON
 * pills and no path at all to the one service a customer could actually use —
 * the page was reachable only by typing its URL.
 *
 * The pills (Airtime, Data, Power, Cable TV) are all COMING SOON. Each pill
 * clearly shows the service icon AND an explicit Coming Soon badge (never
 * icon-only, never implying an active flow). Selecting one opens the Bills &
 * Services page, which again communicates Coming Soon. No amount/recipient
 * entry is possible from here.
 */
export const EverydayServices: React.FC<{ className?: string }> = ({ className = "" }) => {
  const { t } = useCustomer();

  const services = [
    { href: "/customer/bills", icon: Smartphone, label: t("customer.services.airtime"), tone: "text-[var(--brand-primary)]" },
    { href: "/customer/bills", icon: Wifi, label: t("customer.services.data"), tone: "text-[var(--info)]" },
    { href: "/customer/bills", icon: Zap, label: t("customer.services.power"), tone: "text-amber-500" },
    { href: "/customer/bills", icon: Tv, label: t("customer.services.cable"), tone: "text-pink-500" },
  ];

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Adashi — live service, full-width so it reads as real, not a pill */}
      <Link
        href="/customer/adashi"
        className="flex items-center gap-3 rounded-2xl border border-[var(--brand-border)] bg-[var(--brand-soft)]/60 px-3.5 py-3 transition-colors hover:bg-[var(--brand-soft)]"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-elevated)] text-[var(--brand-primary)]">
          <Coins className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="text-xs font-bold text-[var(--foreground)]">{t("customer.hub.adashi")}</span>
            <span className="rounded-full border border-[var(--success)]/30 bg-[var(--success-soft)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[var(--success)]">
              {t("customer.adashi.hubActive")}
            </span>
          </span>
          <span className="mt-0.5 block truncate text-[11px] text-[var(--foreground-muted)]">
            {t("customer.adashi.trustedRosca")}
          </span>
        </span>
      </Link>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {services.map((s) => {
          const Icon = s.icon;
          return (
            <Link
              key={s.label}
              href={s.href}
              className="flex flex-col items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 py-3.5 text-center transition-colors hover:border-[var(--brand-border)]"
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--surface-elevated)] ${s.tone}`}>
                <Icon className="h-5 w-5" />
              </div>
              <span className="text-[11px] font-semibold text-[var(--foreground)]">{s.label}</span>
              <ComingSoonBadge label={t("common.comingSoon")} />
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default EverydayServices;
