"use client";

import React, { useEffect, useState } from "react";
import { useRegional } from "@/components/regional/RegionalContext";
import { regionalApiFetch } from "@/lib/regional/regionalSession";
import { PageHeader, EmptyState, LoadingRows, ErrorNote, Pill } from "@/components/regional/ui";
import { Bell, AlertOctagon, AlertTriangle, Info, Megaphone } from "lucide-react";

interface Note {
  id: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "INFO";
  title: string;
  detail: string;
  at: string;
  source: string;
}

const SEV_ICON = { CRITICAL: AlertOctagon, HIGH: AlertTriangle, MEDIUM: Megaphone, INFO: Info } as const;
const SEV_KIND = { CRITICAL: "bad", HIGH: "warn", MEDIUM: "info", INFO: "muted" } as const;

export default function RegionalNotificationsPage() {
  const { t, formatDate, manager, managerError } = useRegional();
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [counts, setCounts] = useState<{ critical: number; high: number; medium: number; info: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("");

  useEffect(() => {
    if (!manager) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await regionalApiFetch("/api/regional/notifications");
        const json = await res.json();
        if (!res.ok) setError(json?.error?.message || "NOTIFICATIONS_FAILED");
        else if (!cancelled) {
          setNotes(json.data.notes);
          setCounts(json.data.counts);
        }
      } catch {
        setError("REGIONAL_SESSION_UNAVAILABLE");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [manager]);

  if (managerError) return <div className="p-6 sm:p-8"><div className="p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border)] text-sm text-[var(--foreground-muted)]">{t("session.error")}</div></div>;

  const shown = (notes ?? []).filter((n) => !filter || n.severity === filter);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <PageHeader title={t("notifications.title")} subtitle={t("notifications.subtitle")} />

      {counts && (
        <div className="flex flex-wrap gap-2">
          {(["CRITICAL", "HIGH", "MEDIUM", "INFO"] as const).map((sev) => (
            <button
              key={sev}
              onClick={() => setFilter(filter === sev ? "" : sev)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${filter === sev ? "border-[var(--brand-border)] bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]" : "border-[var(--border)] text-[var(--foreground-muted)]"}`}
            >
              {t(`notifications.${sev.toLowerCase()}`)}: {counts[sev.toLowerCase() as "critical" | "high" | "medium" | "info"]}
            </button>
          ))}
        </div>
      )}

      {error && <ErrorNote message={error} />}
      {notes === null && !error ? (
        <LoadingRows rows={5} />
      ) : shown.length === 0 ? (
        <EmptyState icon={Bell} title={t("notifications.empty")} />
      ) : (
        <div className="space-y-2">
          {shown.map((n) => {
            const Icon = SEV_ICON[n.severity];
            return (
              <div key={n.id} className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] flex items-start gap-3">
                <span className="mt-0.5 shrink-0"><Icon className={`w-4 h-4 ${n.severity === "CRITICAL" ? "text-rose-500" : n.severity === "HIGH" ? "text-amber-500" : "text-[var(--foreground-muted)]"}`} /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold">{n.title}</span>
                    <Pill kind={SEV_KIND[n.severity]}>{n.severity}</Pill>
                  </div>
                  <div className="text-xs text-[var(--foreground-muted)] mt-1">{n.detail}</div>
                  <div className="text-[10px] font-mono text-[var(--foreground-muted)] mt-1.5">{t("notifications.source")}: {n.source} · {formatDate(n.at)}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
