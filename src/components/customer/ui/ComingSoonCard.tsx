"use client";

import React from "react";
import { useCustomer } from "../CustomerContext";
import { LucideIcon } from "lucide-react";

/**
 * ComingSoonBadge — small uppercase "COMING SOON" tag. Always paired with a
 * label so the state is not communicated by colour alone.
 */
export const ComingSoonBadge: React.FC<{ label: string; className?: string }> = ({
  label,
  className = "",
}) => (
  <span
    className={`inline-flex items-center rounded-full bg-[var(--surface-elevated)] border border-[var(--border)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[var(--foreground-muted)] ${className}`}
  >
    {label}
  </span>
);

export const ComingSoonServiceCard: React.FC<{
  icon: LucideIcon;
  title: string;
  description?: string;
  tone?: string;
  statusLabel: string;
  className?: string;
}> = ({ icon: Icon, title, description, tone = "text-[var(--brand-primary)]", statusLabel = "Coming Soon", className = "" }) => (
  <div className={`flex flex-col items-center justify-between gap-3 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6 text-center shadow-[var(--shadow-card)] ${className}`}>
    <div className="flex flex-col items-center gap-3">
      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--surface-elevated)] ${tone}`}>
        <Icon className="h-6 w-6" />
      </div>
      <div className="text-sm font-bold text-[var(--foreground)]">{title}</div>
      <span className="inline-flex items-center rounded-full bg-[var(--brand-soft)] border border-[var(--brand-border)] px-3 py-1 text-[9px] font-extrabold uppercase tracking-wider text-[var(--brand-primary)]">
        {statusLabel}
      </span>
    </div>
    {description && (
      <p className="text-[11px] leading-relaxed text-[var(--foreground-muted)]">{description}</p>
    )}
  </div>
);

export default ComingSoonServiceCard;
