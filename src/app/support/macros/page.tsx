"use client";

// =============================================================================
// File: src/app/support/macros/page.tsx
// Description: Macros — predefined response templates (§44–§45).
// Trilingual templates; editing requires manage_macros (supervisor+).
// =============================================================================

import React, { useCallback, useEffect, useState } from "react";
import { Pencil, Power, Plus } from "lucide-react";
import { useSupportOps } from "@/components/support/SupportOpsProvider";
import { EmptyState, ErrorState, LoadingPanel, Modal, OfflineBanner, Spinner, relTime } from "@/components/support/SupportUI";
import { supportOps, isSupportApiError, supportErrorMessage, MacroDto } from "@/services/supportOpsClient";

export default function MacrosPage() {
  const { t, activeOfficer, isOnline, toast, lang } = useSupportOps();
  const [rows, setRows] = useState<MacroDto[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<MacroDto | "new" | null>(null);

  const canManage = activeOfficer?.capabilities?.includes("manage_macros") ?? false;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await supportOps.macros(activeOfficer?.id);
    if (isSupportApiError(res)) {
      setError(res.message);
      setLoading(false);
      return;
    }
    setRows(res.items);
    setLoading(false);
  }, [activeOfficer?.id]);

  useEffect(() => {
    if (isOnline) void load();
  }, [isOnline, load]);

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight">{t("supportOps.nav.macros")}</h1>
          <p className="mt-0.5 text-[13px] text-[var(--foreground-muted)]">{t("supportOps.settings.permissionsHint")}</p>
        </div>
        {canManage && (
          <button
            onClick={() => setEditing("new")}
            disabled={!isOnline}
            className="flex items-center gap-1.5 rounded-[var(--support-radius-input)] bg-[var(--brand-primary)] px-3 py-2 text-xs font-extrabold text-[var(--brand-on-primary)] disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> {t("supportOps.macros.new")}
          </button>
        )}
      </div>

      {!isOnline && <OfflineBanner message={t("supportOps.dashboard.offlineBanner")} />}
      {loading && <LoadingPanel rows={5} />}
      {error && <ErrorState message={error} onRetry={() => void load()} />}
      {!loading && !error && rows && rows.length === 0 && <EmptyState title={t("supportOps.macros.noMacros")} />}
      {!loading && !error && rows && rows.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {rows.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col rounded-[var(--support-radius-card)] border border-[var(--card-border)] bg-[var(--card-bg)] p-4 backdrop-blur-[var(--glass-blur-01)] ${
                !m.enabled ? "opacity-60" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[13px] font-extrabold text-[var(--foreground)]">{m.name}</p>
                  <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]">
                    {m.category} · {m.key}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {canManage && (
                    <>
                      <button
                        onClick={() => setEditing(m)}
                        aria-label={t("supportOps.macros.edit")}
                        className="grid h-7 w-7 place-items-center rounded-md text-[var(--muted)] hover:bg-[var(--surface-3)] hover:text-[var(--foreground)]"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={async () => {
                          const res = await supportOps.updateMacro(m.id, { enabled: !m.enabled }, activeOfficer?.id);
                          if (isSupportApiError(res)) {
                            toast(supportErrorMessage(res), "error");
                            return;
                          }
                          toast(t("supportOps.toasts.macroSaved"));
                          void load();
                        }}
                        aria-label={m.enabled ? t("supportOps.common.disabled") : t("supportOps.common.enabled")}
                        className={`grid h-7 w-7 place-items-center rounded-md ${
                          m.enabled ? "text-[var(--state-success)]" : "text-[var(--muted)]"
                        } hover:bg-[var(--surface-3)]`}
                      >
                        <Power className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
              <p className="mt-2 line-clamp-3 flex-1 whitespace-pre-wrap text-xs leading-relaxed text-[var(--foreground-muted)]">
                {m.body[lang] ?? m.body.en}
              </p>
              {m.variables && m.variables.length > 0 && (
                <p className="mt-2 text-[10px] font-bold text-[var(--muted)]">
                  {t("supportOps.macros.variables")}: {m.variables.map((v) => `{{${v}}}`).join(" ")}
                </p>
              )}
              <p className="mt-2 border-t border-[var(--border)] pt-2 text-[10px] text-[var(--muted)]">
                {t("supportOps.macros.lastUpdated", { author: m.updatedBy })} · {relTime(m.updatedAt, t)}
              </p>
            </div>
          ))}
        </div>
      )}

      <MacroEditor
        macro={editing === "new" ? null : editing}
        open={editing !== null}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          void load();
        }}
      />
    </div>
  );
}

function MacroEditor({
  macro,
  open,
  onClose,
  onSaved,
}: {
  macro: MacroDto | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t, activeOfficer, toast } = useSupportOps();
  const [name, setName] = useState(macro?.name ?? "");
  const [key, setKey] = useState(macro?.key ?? "");
  const [en, setEn] = useState(macro?.body.en ?? "");
  const [fr, setFr] = useState(macro?.body.fr ?? "");
  const [ha, setHa] = useState(macro?.body.ha ?? "");
  const [busy, setBusy] = useState(false);

  React.useEffect(() => {
    if (open) {
      setName(macro?.name ?? "");
      setKey(macro?.key ?? "");
      setEn(macro?.body.en ?? "");
      setFr(macro?.body.fr ?? "");
      setHa(macro?.body.ha ?? "");
    }
  }, [open, macro]);

  const submit = async () => {
    if (!name.trim() || !en.trim()) return;
    setBusy(true);
    let res;
    if (macro) {
      res = await supportOps.updateMacro(macro.id, { body: { en: en.trim(), fr: fr.trim() || en.trim(), ha: ha.trim() || en.trim() }, name: name.trim() }, activeOfficer?.id);
    } else {
      res = await supportOps.createMacro(
        { key: key.trim() || `macro-${Date.now().toString(36)}`, name: name.trim(), body: { en: en.trim(), fr: fr.trim() || en.trim(), ha: ha.trim() || en.trim() }, category: "GENERAL" },
        activeOfficer?.id,
      );
    }
    setBusy(false);
    if (isSupportApiError(res)) {
      toast(supportErrorMessage(res), "error");
      return;
    }
    toast(t("supportOps.toasts.macroSaved"));
    onSaved();
  };

  const inputCls = "w-full rounded-[var(--support-radius-input)] border border-[var(--border)] bg-[var(--input-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--brand-border)]";

  return (
    <Modal open={open} onClose={onClose} title={macro ? t("supportOps.macros.edit") : t("supportOps.macros.new")} wide>
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="mac-name" className="mb-1 block text-xs font-bold">{t("supportOps.newTicket.subject")}</label>
            <input id="mac-name" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
          </div>
          {!macro && (
            <div>
              <label htmlFor="mac-key" className="mb-1 block text-xs font-bold">{t("supportOps.common.category")}</label>
              <input id="mac-key" value={key} onChange={(e) => setKey(e.target.value)} placeholder="greeting-ha" className={inputCls} />
            </div>
          )}
        </div>
        {(["en", "fr", "ha"] as const).map((l) => (
          <div key={l}>
            <label htmlFor={`mac-${l}`} className="mb-1 block text-xs font-bold uppercase">{l} *</label>
            <textarea
              id={`mac-${l}`}
              rows={2}
              value={l === "en" ? en : l === "fr" ? fr : ha}
              onChange={(e) => (l === "en" ? setEn : l === "fr" ? setFr : setHa)(e.target.value)}
              className={`${inputCls} resize-none`}
            />
          </div>
        ))}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-[var(--support-radius-input)] border border-[var(--border)] px-3 py-2 text-xs font-bold text-[var(--foreground-muted)]">
            {t("supportOps.common.cancel")}
          </button>
          <button
            disabled={!name.trim() || !en.trim() || busy}
            onClick={() => void submit()}
            className="flex items-center gap-2 rounded-[var(--support-radius-input)] bg-[var(--brand-primary)] px-4 py-2 text-xs font-extrabold text-[var(--brand-on-primary)] disabled:opacity-50"
          >
            {busy && <Spinner />} {t("supportOps.macros.save")}
          </button>
        </div>
      </div>
    </Modal>
  );
}
