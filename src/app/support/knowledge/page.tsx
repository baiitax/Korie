"use client";

// =============================================================================
// File: src/app/support/knowledge/page.tsx
// Description: Knowledge Base (spec §41–§43) — trilingual articles,
// server-side search, category filter, per-language rendering.
// =============================================================================

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Search, ThumbsUp } from "lucide-react";
import { useSupportOps } from "@/components/support/SupportOpsProvider";
import { EmptyState, ErrorState, LoadingPanel, OfflineBanner, relTime } from "@/components/support/SupportUI";
import { supportOps, isSupportApiError, KnowledgeDto } from "@/services/supportOpsClient";

const CATEGORIES = [
  "TRANSFER",
  "PENDING_TRANSACTION",
  "FAILED_TRANSACTION",
  "REFUND",
  "REVERSAL",
  "AGENT_FLOAT",
  "FRAUD_SECURITY",
  "KYC_TIER",
  "LOGIN_ACCESS",
  "MERCHANT_SETTLEMENT",
  "TECHNICAL_API",
  "UNAUTHORIZED",
] as const;

export default function KnowledgePage() {
  const { t, lang, setLang, activeOfficer, isOnline } = useSupportOps();
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [rows, setRows] = useState<KnowledgeDto[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params: Record<string, string> = { lang };
    if (q) params.q = q;
    if (category) params.category = category;
    const res = await supportOps.knowledge(params, activeOfficer?.id);
    if (isSupportApiError(res)) {
      setError(res.message);
      setLoading(false);
      return;
    }
    setRows(res.items);
    setLoading(false);
  }, [q, category, lang, activeOfficer?.id]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (isOnline) void load();
    }, q ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [isOnline, load, q]);

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight">{t("supportOps.knowledge.title")}</h1>
          <p className="mt-0.5 text-[13px] text-[var(--foreground-muted)]">{t("supportOps.knowledge.searchPlaceholder")}</p>
        </div>
        <div className="flex items-center gap-1 rounded-[var(--support-radius-input)] border border-[var(--border)] bg-[var(--surface)] p-0.5">
          {(["en", "fr", "ha"] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              aria-pressed={lang === l}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-extrabold uppercase ${
                lang === l ? "bg-[var(--brand-soft-strong)] text-[var(--brand-primary)]" : "text-[var(--muted)]"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {!isOnline && <OfflineBanner message={t("supportOps.dashboard.offlineBanner")} />}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("supportOps.knowledge.searchPlaceholder")}
            aria-label={t("supportOps.knowledge.searchPlaceholder")}
            className="w-full rounded-[var(--support-radius-input)] border border-[var(--border)] bg-[var(--input-bg)] py-2 pl-10 pr-4 text-sm outline-none placeholder:text-[var(--muted)] focus:border-[var(--brand-border)]"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-label={t("supportOps.common.category")}
          className="rounded-[var(--support-radius-input)] border border-[var(--border)] bg-[var(--input-bg)] px-2.5 py-2 text-xs font-semibold outline-none focus:border-[var(--brand-border)]"
        >
          <option value="">{t("supportOps.common.category")}: {t("supportOps.common.all")}</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{t(`supportOps.knowledge.categoryLabels.${c}`)}</option>
          ))}
        </select>
      </div>

      {loading && <LoadingPanel rows={5} />}
      {error && <ErrorState message={error} onRetry={() => void load()} />}
      {!loading && !error && rows && rows.length === 0 && <EmptyState title={t("supportOps.knowledge.none")} hint={t("supportOps.knowledge.noneHint")} />}
      {!loading && !error && rows && rows.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {rows.map((k) => (
            <Link
              key={k.id}
              href={`/support/knowledge/${k.id}`}
              className="group flex flex-col rounded-[var(--support-radius-card)] border border-[var(--card-border)] bg-[var(--card-bg)] p-4 backdrop-blur-[var(--glass-blur-01)] transition-colors hover:border-[var(--brand-border)]"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-full bg-[var(--brand-soft)] px-2 py-0.5 text-[10px] font-extrabold text-[var(--brand-primary)]">
                  {t(`supportOps.knowledge.categoryLabels.${k.category}`) ?? k.category}
                </span>
                <span className="flex items-center gap-1 text-[10px] font-bold text-[var(--muted)]">
                  <ThumbsUp className="h-3 w-3" /> {k.helpfulCount}
                </span>
              </div>
              <h2 className="mt-2 text-[14px] font-extrabold leading-snug text-[var(--foreground)] group-hover:text-[var(--brand-primary)]">
                {k.body.title}
              </h2>
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[var(--foreground-muted)]">{k.body.problem}</p>
              <p className="mt-3 text-[10px] text-[var(--muted)]">
                {t("supportOps.knowledge.version", { version: k.version })} · {t("supportOps.knowledge.updatedBy", { author: k.author })} · {relTime(k.updatedAt, t)}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
