"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, ChevronRight, RefreshCw, X } from "lucide-react";
import { useCustomer, CustomerNotificationItem } from "../CustomerContext";
import { KoriePaySkeleton } from "./KoriePaySkeletons";

/**
 * NotificationCenter — the bell, and the panel behind it (§26 / §47 / §65).
 *
 * What this replaces: a bell icon in the header that navigated to **Settings**
 * with no indication of why, and a badge that used to be `useState(3)` — a
 * fabricated count from `customer.mfaEnabled`. Both were decoration pretending to
 * be a feature.
 *
 * Now the panel reads `notifications` from the portal context, which is derived
 * server-side from the customer's own ledger rows and verification state. Every
 * element of it is a real consequence of a real record:
 *   • loading   → skeleton, and the badge shows a small activity pip, not a digit;
 *   • nothing   → "You're all caught up" (§47) rather than an empty white sheet;
 *   • failed    → says the feed is unavailable with a Retry. A failed read never
 *                 renders as "no notifications", because "nothing to see" and "we
 *                 could not look" are different facts for a customer.
 *
 * There is deliberately **no "mark all read" button**: `unreadCount` is derived,
 * there is no `readAt` column in the store, and a control that cannot change
 * anything is the exact pattern this pass exists to remove.
 */
export const NotificationCenter: React.FC<{ className?: string }> = ({ className = "" }) => {
  const { notifications, notificationsCount, notificationsPhase, refreshNotifications, language, t } = useCustomer();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    const onDown = (e: MouseEvent) => {
      const el = e.target as Node;
      if (!panelRef.current?.contains(el) && !triggerRef.current?.contains(el)) close();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [open, close]);

  const failed = notificationsPhase === "error";
  const loading = notificationsPhase === "loading" || notificationsPhase === "idle";

  return (
    <div className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`relative inline-grid h-9 w-9 place-items-center rounded-xl border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] ${
          open
            ? "border-[var(--brand-border)] bg-[var(--brand-soft)] text-[var(--brand-primary)]"
            : "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
        }`}
        aria-label={
          failed
            ? t("customer.shell.alertsUnavailable")
            : notificationsCount > 0
              ? t("customer.shell.alertsWithCount", { count: notificationsCount })
              : t("customer.shell.alertsNone")
        }
      >
        <Bell className="h-4 w-4" aria-hidden="true" />
        {failed ? (
          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[var(--warning)]" aria-hidden="true" />
        ) : notificationsCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--brand-primary)] px-1 font-mono text-[9px] font-bold tabular text-[var(--brand-on-primary)]">
            {notificationsCount > 9 ? "9+" : notificationsCount}
          </span>
        ) : loading ? (
          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 animate-pulse rounded-full bg-[var(--border-strong)]" aria-hidden="true" />
        ) : null}
      </button>

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="false"
          aria-label={t("customer.notifications.title")}
          className="absolute right-0 top-11 z-[var(--z-sheet)] w-[min(92vw,22rem)] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] shadow-[var(--shadow-lg)]"
        >
          <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] px-3.5 py-2.5">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-[var(--foreground)]">
              {t("customer.notifications.title")}
            </h2>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => void refreshNotifications()}
                disabled={loading}
                className="inline-grid h-8 w-8 place-items-center rounded-lg text-[var(--foreground-muted)] transition-colors hover:bg-[var(--surface-3)] hover:text-[var(--foreground)] disabled:opacity-50"
                aria-label={t("customer.notifications.refresh")}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={close}
                className="inline-grid h-8 w-8 place-items-center rounded-lg text-[var(--foreground-muted)] transition-colors hover:bg-[var(--surface-3)] hover:text-[var(--foreground)]"
                aria-label={t("common.close")}
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="max-h-[60vh] overflow-y-auto overscroll-contain">
            {failed ? (
              <div className="p-4 text-center">
                <p className="text-xs font-semibold text-[var(--foreground)]">{t("customer.notifications.unavailable")}</p>
                <p className="mt-1 text-[11px] text-[var(--foreground-muted)]">{t("customer.notifications.unavailableHint")}</p>
                <button
                  type="button"
                  onClick={() => void refreshNotifications()}
                  className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-[11px] font-bold text-[var(--foreground)] hover:bg-[var(--surface-elevated)]"
                >
                  {t("common.tryAgain")}
                </button>
              </div>
            ) : loading && notifications.length === 0 ? (
              <div className="p-4">
                <KoriePaySkeleton lines={3} />
              </div>
            ) : notifications.length === 0 ? (
              <p className="p-5 text-center text-xs text-[var(--foreground-muted)]">{t("customer.notifications.allCaughtUp")}</p>
            ) : (
              <ul className="divide-y divide-[var(--border)]">
                {notifications.map((n) => (
                  <NotificationRow key={n.id} item={n} language={language} t={t} onDone={close} />
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const TONE_DOT: Record<CustomerNotificationItem["tone"], string> = {
  info: "bg-[var(--brand-primary)]",
  success: "bg-[var(--success)]",
  warning: "bg-[var(--warning)]",
  danger: "bg-[var(--danger)]",
};

const NotificationRow: React.FC<{
  item: CustomerNotificationItem;
  language: string;
  t: (key: string, params?: Record<string, string | number>) => string;
  onDone: () => void;
}> = ({ item, language, t, onDone }) => {
  const body = (
    <>
      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${TONE_DOT[item.tone]}`} aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-bold text-[var(--foreground)]">{t(item.titleKey, item.params)}</span>
        <span className="mt-0.5 block text-[11px] leading-snug text-[var(--foreground-muted)]">
          {t(item.bodyKey, item.params)}
        </span>
        <span className="mt-1 block font-mono text-[10px] text-[var(--foreground-muted)]">
          {new Date(item.createdAt).toLocaleDateString(language === "fr" ? "fr-FR" : "en-GB", {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </span>
    </>
  );

  const shell = "flex w-full items-start gap-2.5 px-3.5 py-3 text-left transition-colors hover:bg-[var(--surface-2)]";

  return (
    <li>
      {item.link ? (
        <Link href={item.link.href} onClick={onDone} className={shell}>
          {body}
          <span className="mt-1 inline-flex items-center gap-0.5 shrink-0 text-[10px] font-bold text-[var(--brand-primary)]">
            {t(item.link.labelKey)}
            <ChevronRight className="h-3 w-3" aria-hidden="true" />
          </span>
        </Link>
      ) : (
        <div className={shell}>{body}</div>
      )}
    </li>
  );
};

export default NotificationCenter;
