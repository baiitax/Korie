"use client";

// =============================================================================
// File: src/app/support/notifications/page.tsx
// Description: Notifications center — SLA alerts, escalations, CSAT (spec §14).
// =============================================================================

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";
import { useSupportOps } from "@/components/support/SupportOpsProvider";
import { EmptyState, ErrorState, LoadingPanel, OfflineBanner, relTime } from "@/components/support/SupportUI";
import { supportOps, isSupportApiError } from "@/services/supportOpsClient";

interface NotificationRow {
  id: string;
  officerId: string;
  type: string;
  title: string;
  body: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

export default function NotificationsPage() {
  const { t, activeOfficer, isOnline, toast } = useSupportOps();
  const [rows, setRows] = useState<NotificationRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await supportOps.notifications();
    if (isSupportApiError(res)) {
      setError(res.message);
      setLoading(false);
      return;
    }
    setRows(res.items);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isOnline) void load();
  }, [isOnline, load]);

  const markAll = async () => {
    if (!rows) return;
    for (const n of rows.filter((x) => !x.read)) {
      await supportOps.markNotificationRead(n.id);
    }
    setRows((prev) => (prev ? prev.map((n) => ({ ...n, read: true })) : prev));
    toast(t("supportOps.toasts.notificationRead"), "info");
  };

  const unread = rows?.filter((n) => !n.read).length ?? 0;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-extrabold tracking-tight">{t("supportOps.notifications.title")}</h1>
        {unread > 0 && (
          <button
            onClick={() => void markAll()}
            className="flex items-center gap-1.5 rounded-[var(--support-radius-input)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-extrabold text-[var(--brand-primary)] hover:bg-[var(--surface-3)]"
          >
            <CheckCheck className="h-4 w-4" /> {t("supportOps.notifications.markAllRead")}
          </button>
        )}
      </div>

      {!isOnline && <OfflineBanner message={t("supportOps.dashboard.offlineBanner")} />}
      {loading && <LoadingPanel rows={6} />}
      {error && <ErrorState message={error} onRetry={() => void load()} />}
      {!loading && !error && rows && rows.length === 0 && (
        <EmptyState icon={<Bell className="h-5 w-5" />} title={t("supportOps.notifications.empty")} />
      )}
      {!loading && !error && rows && rows.length > 0 && (
        <div className="overflow-hidden rounded-[var(--support-radius-card)] border border-[var(--card-border)] bg-[var(--card-bg)] backdrop-blur-[var(--glass-blur-01)]">
          {rows.map((n) => (
            <button
              key={n.id}
              onClick={async () => {
                if (!n.read) {
                  await supportOps.markNotificationRead(n.id);
                  setRows((prev) => (prev ? prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)) : prev));
                }
                if (n.link) window.location.href = n.link;
              }}
              className={`flex w-full items-start gap-3 border-b border-[var(--card-border)] px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-[var(--surface-2)] ${
                !n.read ? "" : "opacity-60"
              }`}
            >
              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${!n.read ? "bg-[var(--brand-primary)]" : "bg-transparent"}`} />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-extrabold text-[var(--foreground)]">{n.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-[var(--foreground-muted)]">{n.body}</p>
              </div>
              <span className="shrink-0 text-[10px] font-semibold tabular-nums text-[var(--muted)]">{relTime(n.createdAt, t)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
