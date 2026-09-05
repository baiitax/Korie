"use client";

import React from "react";
import Link from "next/link";
import { useCustomer } from "../CustomerContext";
import { ComingSoonBadge } from "./ComingSoonCard";
import { Smartphone, Wifi, Zap, Tv } from "lucide-react";

/**
 * EverydayServices — quick service pills (Airtime, Data, Power, Cable TV).
 *
 * These are all COMING SOON. Each pill clearly shows the service icon AND an
 * explicit Coming Soon badge (never icon-only, never implying an active flow).
 * Selecting one opens the Bills & Services page, which again communicates
 * Coming Soon. No amount/recipient entry is possible from here.
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
    <div className={`grid grid-cols-2 sm:grid-cols-4 gap-2 ${className}`}>
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
  );
};

export default EverydayServices;
