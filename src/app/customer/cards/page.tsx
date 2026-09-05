"use client";

import React from "react";
import Link from "next/link";
import { useCustomer } from "@/components/customer/CustomerContext";
import { ComingSoonBadge } from "@/components/customer/ui/ComingSoonCard";
import { ArrowLeft, CreditCard } from "lucide-react";

/**
 * Cards — COMING SOON (directive §26/§27).
 *
 * KoriePay Cards are not yet available. This page sets the honest product state:
 * an elegant card visual, a clear "Coming Soon" label and an informative
 * description. It exposes NO supported card operations — no issue card, no
 * freeze/unfreeze, no spend-limit controls, no fake card numbers/CVV. The only
 * action is Learn More (no waitlist mechanism exists, so no "Notify Me").
 */
export default function CustomerCardsPage() {
  const { t } = useCustomer();

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 pb-2 border-b border-[var(--border)]">
        <Link href="/customer" className="p-2 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground-muted)] transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[var(--foreground)] tracking-tight">{t("cards.title")}</h1>
          <p className="text-xs text-[var(--foreground-muted)]">{t("cards.subtitle")}</p>
        </div>
      </div>

      {/* Elegant card visual (placeholder — no fake card numbers/CVV) */}
      <div className="relative overflow-hidden rounded-3xl border border-[var(--brand-border)] shadow-[var(--shadow-lg)] aspect-[1.58/1] p-6 sm:p-8 flex flex-col justify-between"
        style={{ background: "linear-gradient(150deg, #0b7a63 0%, #0f6f5c 55%, #12776f 100%)" }}>
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-white/5 blur-3xl pointer-events-none" />

        {/* Top row */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm sm:text-base font-extrabold tracking-widest kp-on-vault">KORIEPAY</span>
          </div>
          <ComingSoonBadge label={t("common.comingSoon")} className="bg-white/15 border-white/30 kp-on-vault" />
        </div>

        {/* Center — coming soon message */}
        <div className="relative z-10">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 kp-on-vault">
            <CreditCard className="h-6 w-6" />
          </div>
          <div className="mt-4 text-xl sm:text-2xl font-extrabold kp-on-vault tracking-tight">{t("cards.comingSoonTitle")}</div>
          <p className="mt-1.5 max-w-md text-xs sm:text-sm kp-on-vault-soft leading-relaxed">
            {t("cards.comingSoonDesc")}
          </p>
        </div>
      </div>

      {/* Informative description + Learn More */}
      <div className="rounded-3xl bg-[var(--surface)] border border-[var(--border)] p-5 text-center shadow-[var(--shadow-card)]">
        <p className="text-xs text-[var(--foreground-muted)] leading-relaxed">{t("cards.learnMore")}</p>
        <Link
          href="/customer/support"
          className="mt-3 inline-flex items-center gap-1.5 px-5 py-2.5 rounded-2xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-[var(--brand-on-primary)] font-bold text-xs transition-colors shadow-[var(--shadow-md)]"
        >
          {t("common.learnMore")}
        </Link>
      </div>
    </div>
  );
}
