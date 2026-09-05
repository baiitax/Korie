"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useCustomer } from "@/components/customer/CustomerContext";
import { formatMoney } from "@/lib/money";
import { ArrowLeft, CreditCard, Lock, Unlock, ShieldCheck, Plus, Eye, EyeOff } from "lucide-react";

export default function CustomerCardsPage() {
  const { cards, toggleCardFreeze, t } = useCustomer();
  const [selectedCardId, setSelectedCardId] = useState(cards[0]?.id || "card-01");
  const [showFullDetails, setShowFullDetails] = useState(false);

  const currentCard = cards.find((c) => c.id === selectedCardId) || cards[0];
  const isFrozen = currentCard?.status === "FROZEN";

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
        <div className="flex items-center gap-3">
          <Link
            href="/customer"
            className="p-2 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground-muted)] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[var(--foreground)] tracking-tight">{t("cards.title")}</h1>
            <p className="text-xs text-[var(--foreground-muted)]">{t("cards.subtitle")}</p>
          </div>
        </div>

        <button
          onClick={() => alert(t("cards.cardsNew"))}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white font-bold text-xs transition-colors shadow-[var(--shadow-md)]"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">{t("cards.cardsNew")}</span>
        </button>
      </div>

      {/* Card Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {cards.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelectedCardId(c.id)}
            className={`px-4 py-2 rounded-2xl text-xs font-mono font-bold shrink-0 transition-all ${
              selectedCardId === c.id
                ? "bg-[var(--brand-primary)] text-white shadow-[var(--shadow-md)]"
                : "bg-[var(--surface)] text-[var(--foreground-muted)] border border-[var(--border)] hover:text-[var(--foreground)]"
            }`}
          >
            {c.currency} {c.brand} · {c.maskedPan.slice(-4)}
          </button>
        ))}
      </div>

      {/* Premium Virtual Card Hero */}
      {currentCard && (
        <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 border border-[var(--brand-border)] shadow-[var(--shadow-lg)] space-y-6 aspect-[1.58/1]"
          style={{ background: "linear-gradient(135deg, #0f2f4f 0%, #124a6b 50%, #0d9488 100%)" }}>
          {/* Ambient glow */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-[var(--brand-primary)]/25 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-[var(--brand-accent)]/20 rounded-full blur-3xl pointer-events-none" />

          {/* Top row */}
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-2">
              <span className="text-sm sm:text-base font-extrabold tracking-widest text-white">KORIEPAY</span>
              <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-white/15 text-white border border-white/20">
                {currentCard.cardType}
              </span>
            </div>
            <div className="text-sm sm:text-base font-black font-mono tracking-wide text-white">{currentCard.brand}</div>
          </div>

          {/* Chip & Status */}
          <div className="flex items-center justify-between relative z-10">
            <div className="text-base sm:text-lg font-mono font-bold text-white tracking-widest">
              {showFullDetails ? currentCard.maskedPan : `•••• •••• ${currentCard.maskedPan.slice(-4)}`}
            </div>
            {isFrozen && (
              <span className="px-2.5 py-1 rounded-full bg-white/15 border border-white/30 text-white text-[10px] font-mono font-bold flex items-center gap-1">
                <Lock className="w-3 h-3" /> {t("cards.cardStatusFrozen")}
              </span>
            )}
          </div>

          {/* Card bottom */}
          <div className="flex items-end justify-between relative z-10">
            <div>
              <div className="text-[9px] uppercase tracking-wider text-white/60">{t("cards.cardholder")}</div>
              <div className="font-bold text-white tracking-wider text-xs font-mono">{currentCard.cardholderName}</div>
            </div>
            <div className="text-right">
              <div className="text-[9px] uppercase tracking-wider text-white/60">{t("cards.expires")}</div>
              <div className="font-bold text-white font-mono">
                {currentCard.expiryMonth}/{currentCard.expiryYear}
              </div>
            </div>
            <div className="flex items-center gap-1 text-white/60 text-[10px] font-mono">
              <ShieldCheck className="w-3.5 h-3.5" /> {currentCard.currency}
            </div>
          </div>
        </div>
      )}

      {/* Card Controls & Actions */}
      {currentCard && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => toggleCardFreeze(currentCard.id)}
              className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                isFrozen
                  ? "bg-[var(--success-soft)] border-[var(--success)] text-[var(--success)]"
                  : "bg-[var(--danger-soft)] hover:bg-[var(--danger-soft)] border-[var(--danger)]/30 text-[var(--danger)]"
              }`}
            >
              {isFrozen ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              <span>{isFrozen ? t("cards.unfreezeCard") : t("cards.freezeCard")}</span>
            </button>

            <button
              onClick={() => setShowFullDetails(!showFullDetails)}
              className="p-3.5 rounded-2xl bg-[var(--surface)] hover:bg-[var(--surface-elevated)] border border-[var(--border)] text-xs font-bold text-[var(--foreground)] flex items-center justify-center gap-2 transition-colors"
            >
              {showFullDetails ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              <span>{showFullDetails ? t("cards.hideDetails") : t("cards.cardDetails")}</span>
            </button>
          </div>

          {/* Spending Limit Monitor */}
          <div className="rounded-3xl bg-[var(--surface)] border border-[var(--border)] p-5 space-y-3 shadow-[var(--shadow-card)]">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[var(--foreground)]">{t("cards.monthlyLimit")}</span>
              <span className="font-mono text-[var(--brand-primary)] font-bold">
                {formatMoney(currentCard.spentThisMonth, currentCard.currency)} / {formatMoney(currentCard.spendingLimitMonthly, currentCard.currency)}
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2.5 rounded-full bg-[var(--surface-elevated)] overflow-hidden border border-[var(--border)]">
              <div
                className="h-full bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-accent)] rounded-full"
                style={{ width: `${Math.min(100, (currentCard.spentThisMonth / currentCard.spendingLimitMonthly) * 100)}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-[var(--foreground-muted)] pt-1">
              <span>{t("cards.onlinePayments")}</span>
              <span className="text-[var(--success)] font-bold">• Enabled</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-[var(--foreground-muted)]">
              <span>{t("cards.internationalUsage")}</span>
              <span className="text-[var(--success)] font-bold">• Enabled</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
