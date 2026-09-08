"use client";

import React, { useState } from "react";
import { CreditCard, Loader2, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { safeFetch } from "@/lib/customer/customerApiError";

export interface IdentifierRow {
  id: string;
  idType: "BVN" | "NIN" | "NIF" | "NNI";
  idNumberMasked: string;
  status: "PENDING" | "VERIFIED" | "FAILED" | "MANUAL_REVIEW";
  rejectionReason?: string;
  createdAt: string;
}

/**
 * NationalIdentifierForm — BVN/NIN (Nigeria) or NIF/NNI (Niger) capture.
 *
 * Writes to POST /api/customer/portal/verification/identifiers, which
 * encrypts the value at rest and stores it PENDING for a human reviewer —
 * KoriePay has no live NIBSS/NIMC/CENTIF-NE integration, so this is never
 * auto-approved (see identifierVerification.ts). Only a masked preview
 * (already returned by the API) is ever shown back to the customer; the
 * plaintext value never leaves the request that submitted it.
 */
export const NationalIdentifierForm: React.FC<{
  idType: "BVN" | "NIN" | "NIF" | "NNI";
  existing?: IdentifierRow;
  t: (key: string, params?: Record<string, string | number>) => string;
  onSubmitted: () => void;
}> = ({ idType, existing, t, onSubmitted }) => {
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canRetry = existing?.status === "FAILED";
  const locked = existing && existing.status !== "FAILED";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (locked || value.trim().length !== 11) return;
    setSaving(true);
    setError(null);
    const result = await safeFetch<any>(
      "/api/customer/portal/verification/identifiers",
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idType, value: value.trim() }) },
      { timeoutMs: 15000 },
    );
    setSaving(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setValue("");
    onSubmitted();
  };

  if (locked) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] px-3 py-2.5 text-[11px]">
        <span className="flex items-center gap-1.5 min-w-0">
          {existing!.status === "VERIFIED" ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-[var(--success)] shrink-0" aria-hidden="true" />
          ) : (
            <Clock className="h-3.5 w-3.5 text-[var(--brand-primary)] shrink-0" aria-hidden="true" />
          )}
          <span className="font-bold text-[var(--foreground)]">{idType}</span>
          <span className="font-mono text-[var(--foreground-muted)] truncate">{existing!.idNumberMasked}</span>
        </span>
        <span className="shrink-0 font-mono text-[9px] font-bold uppercase text-[var(--brand-primary)]">
          {existing!.status === "VERIFIED" ? t("verification.identifier.verified") : t("verification.identifier.pending")}
        </span>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-1.5">
      <label htmlFor={`kyc-id-${idType}`} className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--foreground)]">
        <CreditCard className="w-3.5 h-3.5" aria-hidden="true" />
        {idType}
      </label>
      {canRetry && existing?.rejectionReason && (
        <p className="text-[10px] text-[var(--danger)]">{existing.rejectionReason}</p>
      )}
      <div className="flex gap-2">
        <input
          id={`kyc-id-${idType}`}
          type="text"
          inputMode="numeric"
          pattern="\d{11}"
          maxLength={11}
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/\D/g, "").slice(0, 11))}
          placeholder={t("verification.identifier.placeholder", { type: idType })}
          className="flex-1 min-w-0 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2.5 text-xs font-mono text-[var(--foreground)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]"
        />
        <button
          type="submit"
          disabled={saving || value.length !== 11}
          className="shrink-0 rounded-xl bg-[var(--brand-primary)] text-[var(--brand-on-primary)] text-xs font-bold px-4 disabled:opacity-50 transition-opacity flex items-center gap-1.5"
        >
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
          {t("verification.identifier.submit")}
        </button>
      </div>
      <p className="text-[10px] text-[var(--foreground-muted)]">{t("verification.identifier.hint", { type: idType })}</p>
      {error && (
        <p className="flex items-start gap-1.5 text-[11px] font-semibold text-[var(--danger)]" role="alert">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </form>
  );
};

export default NationalIdentifierForm;
