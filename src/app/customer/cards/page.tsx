"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useCustomer } from "@/components/customer/CustomerContext";
import { formatMoney } from "@/services/customerDataService";
import {
  ArrowLeft,
  CreditCard,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  ShieldCheck,
  Plus,
  Globe,
  Sliders,
  CheckCircle2,
} from "lucide-react";

export default function CustomerCardsPage() {
  const { cards, toggleCardFreeze, t } = useCustomer();
  const [selectedCardId, setSelectedCardId] = useState(cards[0]?.id || "card-01");
  const [showFullDetails, setShowFullDetails] = useState(false);

  const currentCard = cards.find((c) => c.id === selectedCardId) || cards[0];
  const isFrozen = currentCard?.status === "FROZEN";

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-white/10">
        <div className="flex items-center gap-3">
          <Link
            href="/customer"
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white">
              {t("cards.title")}
            </h1>
            <p className="text-xs text-slate-400">
              {t("cards.subtitle")}
            </p>
          </div>
        </div>

        <button
          onClick={() => alert("New virtual card creation is verified through your KYC tier.")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">New Card</span>
        </button>
      </div>

      {/* Card Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {cards.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelectedCardId(c.id)}
            className={`px-4 py-2 rounded-2xl text-xs font-mono font-bold shrink-0 transition-all ${
              selectedCardId === c.id
                ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                : "bg-white/5 text-slate-400 hover:text-white"
            }`}
          >
            {c.currency} {c.brand} ({c.maskedPan.slice(-4)})
          </button>
        ))}
      </div>

      {/* High-End Glassmorphic Virtual Card Hero */}
      {currentCard && (
        <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-tr from-slate-950 via-[#0c1830] to-[#142848] border border-white/20 shadow-2xl space-y-6 aspect-[1.58/1]">
          {/* Ambient Card Glow */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

          {/* Card Top Row */}
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-2">
              <span className="text-sm sm:text-base font-extrabold tracking-widest text-white">
                KORIEPAY
              </span>
              <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-white/10 text-emerald-300 border border-white/10">
                {currentCard.cardType}
              </span>
            </div>

            <div className="text-sm sm:text-base font-black font-mono tracking-wider text-white">
              {currentCard.brand}
            </div>
          </div>

          {/* Chip & Status */}
          <div className="flex items-center justify-between relative z-10">
            {/* Simulated Gold Chip */}
            <div className="w-11 h-8 rounded-lg bg-gradient-to-br from-amber-300 via-amber-400 to-amber-600 border border-amber-200/50 shadow-inner flex items-center justify-center">
              <div className="w-full h-[1px] bg-amber-800/40" />
            </div>

            {isFrozen && (
              <span className="px-2.5 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[10px] font-mono font-bold flex items-center gap-1">
                <Lock className="w-3 h-3" />
                <span>{t("cards.cardStatusFrozen")}</span>
              </span>
            )}
          </div>

          {/* Card Number */}
          <div className="relative z-10 pt-2">
            <div className="text-lg sm:text-2xl font-mono font-bold text-white tracking-widest select-all">
              {showFullDetails ? "4111 8920 4491 4281" : currentCard.maskedPan}
            </div>
          </div>

          {/* Card Bottom: Holder & Expiry */}
          <div className="flex items-end justify-between relative z-10 text-xs font-mono">
            <div>
              <div className="text-[9px] uppercase tracking-wider text-slate-400">Cardholder</div>
              <div className="font-bold text-white tracking-wider">{currentCard.cardholderName}</div>
            </div>
            <div className="text-right">
              <div className="text-[9px] uppercase tracking-wider text-slate-400">Expires / CVV</div>
              <div className="font-bold text-white">
                {currentCard.expiryMonth}/{currentCard.expiryYear} {showFullDetails && "• 842"}
              </div>
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
                  ? "bg-emerald-500/15 border-emerald-500 text-emerald-300"
                  : "bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/30 text-rose-300"
              }`}
            >
              {isFrozen ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              <span>{isFrozen ? t("cards.unfreezeCard") : t("cards.freezeCard")}</span>
            </button>

            <button
              onClick={() => setShowFullDetails(!showFullDetails)}
              className="p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white flex items-center justify-center gap-2 transition-colors"
            >
              {showFullDetails ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              <span>{showFullDetails ? t("cards.hideDetails") : t("cards.cardDetails")}</span>
            </button>
          </div>

          {/* Spending Limit Monitor */}
          <div className="rounded-3xl bg-[#090f1e] border border-white/10 p-5 space-y-3 shadow-xl">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-white">{t("cards.monthlyLimit")}</span>
              <span className="font-mono text-emerald-400 font-bold">
                {formatMoney(currentCard.spentThisMonth, currentCard.currency)} / {formatMoney(currentCard.spendingLimitMonthly, currentCard.currency)}
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2.5 rounded-full bg-slate-900 overflow-hidden border border-white/5">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                style={{
                  width: `${Math.min(
                    100,
                    (currentCard.spentThisMonth / currentCard.spendingLimitMonthly) * 100
                  )}%`,
                }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
              <span>{t("cards.onlinePayments")}</span>
              <span className="text-emerald-400 font-bold">Enabled</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>{t("cards.internationalUsage")}</span>
              <span className="text-emerald-400 font-bold">Enabled</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
