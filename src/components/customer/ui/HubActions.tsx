"use client";

import React from "react";
import Link from "next/link";
import { useCustomer } from "../CustomerContext";
import { Plus, Send, Landmark, CreditCard, Sparkles, ShieldCheck } from "lucide-react";

/**
 * HubActions — simple, scannable icon tiles (icon + label, never icon-only) for
 * the most common customer actions, mirroring the reference dashboard. Each
 * tile is a soft rounded surface with a clear label underneath.
 */
export const HubActions: React.FC<{ className?: string }> = ({ className = "" }) => {
  const { t } = useCustomer();

  const actions = [
    { href: "/customer/send-money", icon: Plus, label: t("customer.hub.fund"), tone: "accent" },
    { href: "/customer/send-money", icon: Send, label: t("customer.hub.koriePay"), tone: "brand" },
    { href: "/customer/send-money", icon: Landmark, label: t("customer.hub.interBank"), tone: "dark" },
    { href: "/customer/cards", icon: CreditCard, label: t("customer.hub.cards"), tone: "light" },
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
            <span
              className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-transform group-hover:-translate-y-0.5 ${tones[a.tone]}`}
            >
              <Icon className="h-5 w-5" />
            </span>
            <span className="text-[11px] font-semibold text-[var(--foreground)]">{a.label}</span>
          </Link>
        );
      })}
    </div>
  );
};

export default HubActions;
