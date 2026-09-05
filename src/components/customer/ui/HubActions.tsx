"use client";

import React from "react";
import Link from "next/link";
import { useCustomer } from "../CustomerContext";
import { ComingSoonBadge } from "./ComingSoonCard";
import { Plus, Send, ArrowDownLeft, CreditCard, Sparkles, ShieldCheck } from "lucide-react";

/**
 * HubActions — simple, scannable icon tiles (icon + label, never icon-only) for
 * the most common customer actions. Icon + text together, with a clear label
 * beneath. Cards is marked Coming Soon (its page sets the honest product state).
 * Fund now goes to the dedicated Fund Account flow (§21–§25).
 */
export const HubActions: React.FC<{ className?: string }> = ({ className = "" }) => {
  const { t } = useCustomer();

  const actions = [
    { href: "/customer/fund", icon: Plus, label: t("customer.hub.fund"), tone: "accent" },
    { href: "/customer/send-money", icon: Send, label: t("customer.hub.koriePay"), tone: "brand" },
    { href: "/customer/receive-money", icon: ArrowDownLeft, label: t("customer.hub.receive"), tone: "dark" },
    { href: "/customer/cards", icon: CreditCard, label: t("customer.hub.cards"), tone: "light", comingSoon: true },
    { href: "/customer/adashi", icon: Sparkles, label: t("customer.hub.adashi"), tone: "purple" },
    { href: "/customer/kyc", icon: ShieldCheck, label: t("customer.hub.verify"), tone: "amber" },
  ];

  const tones: Record<string, string> = {
    accent: "bg-[var(--brand-soft)] text-[var(--brand-primary)]",
    brand: "bg-[var(--brand-primary)] text-white",
    dark: "bg-[#12263a] text-white",
    light: "bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)]",
    purple: "bg-violet-100 text-violet-700",
    amber: "bg-amber-100 text-amber-700",
  };

  return (
    <div className={`grid grid-cols-3 gap-3 sm:grid-cols-6 ${className}`}>
      {actions.map((a) => {
        const Icon = a.icon;
        return (
          <Link
            key={a.label}
            href={a.href}
            className="group flex flex-col items-center gap-2 text-center"
          >
            <span className={`relative flex h-12 w-12 items-center justify-center rounded-2xl transition-transform group-hover:-translate-y-0.5 ${tones[a.tone]}`}>
              <Icon className="h-5 w-5" />
              {a.comingSoon && (
                <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-amber-400 border-2 border-white" />
              )}
            </span>
            <span className="flex flex-col items-center gap-0.5">
              <span className="text-[11px] font-semibold text-[var(--foreground)]">{a.label}</span>
              {a.comingSoon && <ComingSoonBadge label={t("common.comingSoon")} className="text-[8px] px-1.5" />}
            </span>
          </Link>
        );
      })}
    </div>
  );
};

export default HubActions;
