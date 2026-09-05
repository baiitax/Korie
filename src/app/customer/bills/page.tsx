"use client";

import React from "react";
import Link from "next/link";
import { useCustomer } from "@/components/customer/CustomerContext";
import ComingSoonServiceCard from "@/components/customer/ui/ComingSoonCard";
import { ArrowLeft, Smartphone, Wifi, Flame, Tv, CalendarClock } from "lucide-react";

/**
 * Bills & Services — COMING SOON (directive §28/§29/§30).
 *
 * Airtime, Data, Electricity and Cable TV are not yet available. This page
 * communicates that clearly with the standardized ComingSoonServiceCard and
 * exposes NO amount entry, recipient entry, confirmation or transaction
 * creation. Users can only learn about the product.
 */
export default function CustomerBillsPage() {
  const { t } = useCustomer();

  const services = [
    { id: "airtime", icon: Smartphone, title: t("bills.airtime"), tone: "text-[var(--brand-primary)]" },
    { id: "data", icon: Wifi, title: t("bills.data"), tone: "text-[var(--info)]" },
    { id: "electricity", icon: Flame, title: t("bills.electricity"), tone: "text-amber-500" },
    { id: "cableTv", icon: Tv, title: t("bills.cableTv"), tone: "text-pink-500" },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 pb-2 border-b border-[var(--border)]">
        <Link href="/customer" className="p-2 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground-muted)] transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[var(--foreground)] tracking-tight">{t("bills.title")}</h1>
          <p className="text-xs text-[var(--foreground-muted)]">{t("bills.subtitle")}</p>
        </div>
      </div>

      {/* Coming soon banner */}
      <div className="flex items-center gap-3 rounded-2xl bg-[var(--brand-soft)] border border-[var(--brand-border)] px-4 py-3 text-xs text-[var(--brand-primary)]">
        <CalendarClock className="w-5 h-5 shrink-0" />
        <span>{t("bills.comingSoonBanner")}</span>
      </div>

      {/* Services grid — Coming Soon, no transaction flow */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {services.map((s) => (
          <ComingSoonServiceCard
            key={s.id}
            icon={s.icon}
            title={s.title}
            description={t(`services.${s.id}.comingSoonDesc`)}
            tone={s.tone}
            statusLabel={t("common.comingSoon")}
          />
        ))}
      </div>

      <div className="rounded-3xl bg-[var(--surface)] border border-[var(--border)] p-5 text-center shadow-[var(--shadow-card)]">
        <p className="text-xs text-[var(--foreground-muted)] leading-relaxed">
          {t("bills.learnMore")}
        </p>
        <Link
          href="/customer/support"
          className="mt-3 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white font-bold text-xs transition-colors shadow-[var(--shadow-md)]"
        >
          {t("common.learnMore")}
        </Link>
      </div>
    </div>
  );
}
