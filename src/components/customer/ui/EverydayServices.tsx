"use client";

import React from "react";
import Link from "next/link";
import { useCustomer } from "../CustomerContext";
import { Smartphone, Wifi, Zap, Tv } from "lucide-react";

/**
 * EverydayServices — quick service pills (Airtime, Data, Power, Cable TV),
 * mirroring the reference dashboard's grouped service shortcuts.
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
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {services.map((s) => {
        const Icon = s.icon;
        return (
          <Link
            key={s.label}
            href={s.href}
            className="flex items-center gap-2.5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-xs font-semibold text-[var(--foreground)] transition-colors hover:border-[var(--brand-border)]"
          >
            <Icon className={`h-4 w-4 ${s.tone}`} />
            {s.label}
          </Link>
        );
      })}
    </div>
  );
};

export default EverydayServices;
