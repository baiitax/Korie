"use client";

// =============================================================================
// File: src/app/support/knowledge/[id]/page.tsx
// Description: Knowledge article (spec §43) — rendered in the selected
// language from structured trilingual content (never mixed).
// =============================================================================

import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, ThumbsUp } from "lucide-react";
import { useSupportOps } from "@/components/support/SupportOpsProvider";
import { ErrorState, LoadingPanel, OfflineBanner, SectionCard, relTime } from "@/components/support/SupportUI";
import { supportOps, isSupportApiError, KnowledgeDto } from "@/services/supportOpsClient";

export default function KnowledgeArticlePage() {
  const { id } = useParams<{ id: string }>();
  const { t, lang, setLang, activeOfficer, isOnline, toast } = useSupportOps();
  const [article, setArticle] = useState<KnowledgeDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [voted, setVoted] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await supportOps.knowledgeArticle(id, lang);
    if (isSupportApiError(res)) {
      setError(res.message);
      setLoading(false);
      return;
    }
    setArticle(res);
    setLoading(false);
  }, [id, lang]);

  useEffect(() => {
    if (isOnline) void load();
  }, [isOnline, load]);

  if (loading && !article) return <div className="mx-auto max-w-3xl"><LoadingPanel rows={7} /></div>;
  if (error && !article) return <div className="mx-auto max-w-3xl"><ErrorState message={error} onRetry={() => void load()} /></div>;
  if (!article) return null;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {!isOnline && <OfflineBanner message={t("supportOps.dashboard.offlineBanner")} />}

      <div className="flex items-center justify-between gap-2">
        <button onClick={() => history.back()} className="flex items-center gap-1 text-xs font-extrabold text-[var(--muted)] hover:text-[var(--foreground)]">
          <ArrowLeft className="h-3.5 w-3.5" /> {t("supportOps.common.back")}
        </button>
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

      <SectionCard>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-[var(--brand-soft)] px-2.5 py-0.5 text-[10px] font-extrabold text-[var(--brand-primary)]">
            {t(`supportOps.knowledge.categoryLabels.${article.category}`) ?? article.category}
          </span>
          <span className="rounded-full bg-[var(--surface-3)] px-2.5 py-0.5 text-[10px] font-extrabold text-[var(--foreground-muted)]">
            {t(`supportOps.knowledge.audience.${article.audience}`) ?? article.audience}
          </span>
        </div>
        <h1 className="mt-3 text-xl font-extrabold leading-tight tracking-tight text-[var(--foreground)]">{article.body.title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--foreground-muted)]">{article.body.problem}</p>

        {article.body.symptoms && article.body.symptoms.length > 0 && (
          <div className="mt-4">
            <h2 className="mb-2 text-sm font-extrabold text-[var(--foreground)]">{t("supportOps.knowledge.symptoms")}</h2>
            <ul className="space-y-1.5">
              {article.body.symptoms.map((s, i) => (
                <li key={i} className="flex gap-2 text-[14px] leading-relaxed text-[var(--foreground)]">
                  <span aria-hidden className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--brand-primary)]" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}

        {article.body.resolution && (
          <div className="mt-5">
            <h2 className="mb-2 text-sm font-extrabold text-[var(--foreground)]">{t("supportOps.knowledge.resolution")}</h2>
            <ol className="space-y-2">
              {article.body.resolution.split(/\n(?=\d+[.)]\s)/).map((step, i) => (
                <li key={i} className="flex gap-3 rounded-[10px] bg-[var(--surface-2)] px-3 py-2.5">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--brand-primary)] text-[11px] font-extrabold text-[var(--brand-on-primary)]">
                    {i + 1}
                  </span>
                  <span className="text-[13px] leading-relaxed">{step.replace(/^\d+[.)]\s*/, "")}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {article.body.escalationCondition && (
          <div className="mt-5 rounded-[10px] border border-[var(--state-warning)]/40 bg-[var(--state-warning-soft)] px-3 py-2.5">
            <p className="text-[11px] font-extrabold uppercase tracking-wide text-[var(--state-warning)]">
              {t("supportOps.knowledge.escalation")}
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-[var(--foreground)]">{article.body.escalationCondition}</p>
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-4">
          <p className="text-[11px] text-[var(--muted)]">
            {t("supportOps.knowledge.version", { version: article.version })} · {t("supportOps.knowledge.updatedBy", { author: article.author })} · {relTime(article.updatedAt, t)}
          </p>
          <button
            onClick={() => {
              if (voted) return;
              setVoted(true);
              setArticle((a) => (a ? { ...a, helpfulCount: a.helpfulCount + 1 } : a));
              toast(t("supportOps.knowledge.markHelpful"), "info");
            }}
            disabled={voted}
            className={`flex items-center gap-1.5 rounded-[var(--support-radius-input)] border px-3 py-1.5 text-xs font-extrabold transition-colors ${
              voted
                ? "border-[var(--state-success)]/50 bg-[var(--state-success-soft)] text-[var(--state-success)]"
                : "border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--surface-3)]"
            }`}
          >
            {voted ? <CheckCircle2 className="h-3.5 w-3.5" /> : <ThumbsUp className="h-3.5 w-3.5" />}
            {t("supportOps.knowledge.helpful")} · {article.helpfulCount}
          </button>
        </div>
      </SectionCard>
    </div>
  );
}
