"use client";

import React from "react";
import Link from "next/link";
import { useCustomer } from "../CustomerContext";
import {
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
  Zap,
  CreditCard,
  Repeat2,
} from "lucide-react";

/**
 * QuickActions — the primary action row for the customer dashboard.
 * Icon + label (never icon-only for financial operations). Links route only
 * to capabilities the backend actually supports.
 */
export const QuickActions: React.FC<{ className?: string }> = ({ className = "" }) => {
  const { t } = useCustomer();

  const actions = [
    {
      href: "/customer/send-money",
      icon: ArrowUpRight,
      label: t("customer.quick.send"),
      tone: "primary" as const,
    },
    {
      href: "/customer/receive-money",
      icon: ArrowDownLeft,
      label: t("customer.quick.receive"),
      tone: "surface" as const,
    },
    {
      href: "/customer/bills",
      icon: Zap,
      label: t("customer.quick.payBills"),
      tone: "surface" as const,
    },
    {
      href: "/customer/cards",
      icon: CreditCard,
      label: t("customer.quick.cards"),
      tone: "surface" as const,
    },
    {
      href: "/customer/fx",
      icon: Repeat2,
      label: t("customer.quick.fx"),
      tone: "surface" as const,
    },
  ];

  return (
    <div className={`grid grid-cols-2 gap-2 sm:grid-cols-5 sm:gap-3 ${className}`}>
      {actions.map((a) => {
        const Icon = a.icon;
        const isPrimary = a.tone === "primary";
        return (
          <Link
            key={a.href}
            href={a.href}
            className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl p-3 text-center font-semibold transition-all active:scale-[0.98] ${
              isPrimary
                ? "bg-[var(--brand-primary)] text-white shadow-md shadow-[var(--brand-soft-strong)] hover:bg-[var(--brand-primary-hover)]"
                : "bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)] hover:border-[var(--brand-border)] hover:text-[var(--brand-primary)]"
            }`}
          >
            <Icon className={`w-5 h-5 ${isPrimary ? "text-white" : "text-[var(--brand-primary)]"}`} />
            <span className="text-[11px] leading-tight">{a.label}</span>
          </Link>
        );
      })}
    </div>
  );
};

export default QuickActions;
