"use client";

import React, { useState } from "react";
import { CalendarDays, MapPin, Loader2, AlertTriangle } from "lucide-react";
import { safeFetch } from "@/lib/customer/customerApiError";

/**
 * ProfileDetailsForm — the missing write path behind the KYC checklist.
 *
 * The verification checklist has always told customers "Add your date of
 * birth" / "Add the residential address shown on a recent utility bill or
 * bank statement" (see verification.reason.dob / .address), but no screen in
 * the product ever collected those two `customers` columns — a customer
 * whose tier requires them had no way to move past that step. This form is
 * the fix: it PATCHes `/api/customer/portal/profile`, which is the only
 * write path for date_of_birth / residential_address (never kyc_tier,
 * never status — those stay reviewer-controlled).
 *
 * Only the fields the checklist says are still missing are rendered, so a
 * customer who only needs an address is not also asked for a date of birth
 * they already gave.
 */
export const ProfileDetailsForm: React.FC<{
  needsDateOfBirth: boolean;
  needsAddress: boolean;
  t: (key: string, params?: Record<string, string | number>) => string;
  onSaved: () => void;
}> = ({ needsDateOfBirth, needsAddress, t, onSaved }) => {
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const maxDob = new Date();
  maxDob.setUTCFullYear(maxDob.getUTCFullYear() - 18);
  const maxDobStr = maxDob.toISOString().slice(0, 10);
  const minDob = new Date();
  minDob.setUTCFullYear(minDob.getUTCFullYear() - 120);
  const minDobStr = minDob.toISOString().slice(0, 10);

  if (!needsDateOfBirth && !needsAddress) return null;

  const canSubmit =
    (!needsDateOfBirth || dateOfBirth.length === 10) && (!needsAddress || address.trim().length >= 8) && !saving;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setError(null);
    const body: Record<string, string> = {};
    if (needsDateOfBirth) body.dateOfBirth = dateOfBirth;
    if (needsAddress) body.residentialAddress = address.trim();

    const result = await safeFetch<any>(
      "/api/customer/portal/profile",
      { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
      { timeoutMs: 15000 },
    );
    setSaving(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setSaved(true);
    onSaved();
  };

  if (saved) return null;

  return (
    <form
      onSubmit={submit}
      className="rounded-3xl bg-[var(--surface)] border border-[var(--border)] p-5 space-y-4 shadow-[var(--shadow-card)]"
    >
      <div className="flex items-center gap-2 text-[var(--foreground)] font-bold text-xs">
        <CalendarDays className="w-4 h-4 text-[var(--brand-primary)]" aria-hidden="true" />
        <span>{t("verification.profileForm.title")}</span>
      </div>
      <p className="text-[11px] text-[var(--foreground-muted)] leading-relaxed -mt-2">
        {t("verification.profileForm.subtitle")}
      </p>

      {needsDateOfBirth && (
        <div className="space-y-1.5">
          <label htmlFor="kyc-dob" className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--foreground)]">
            <CalendarDays className="w-3.5 h-3.5" aria-hidden="true" />
            {t("verification.step.dob")}
          </label>
          <input
            id="kyc-dob"
            type="date"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
            min={minDobStr}
            max={maxDobStr}
            required
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2.5 text-xs font-mono text-[var(--foreground)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]"
          />
          <p className="text-[10px] text-[var(--foreground-muted)]">{t("verification.profileForm.dobHint")}</p>
        </div>
      )}

      {needsAddress && (
        <div className="space-y-1.5">
          <label
            htmlFor="kyc-address"
            className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--foreground)]"
          >
            <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
            {t("verification.step.address")}
          </label>
          <textarea
            id="kyc-address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            minLength={8}
            maxLength={500}
            rows={3}
            required
            placeholder={t("verification.profileForm.addressPlaceholder")}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2.5 text-xs text-[var(--foreground)] resize-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]"
          />
          <p className="text-[10px] text-[var(--foreground-muted)]">{t("verification.profileForm.addressHint")}</p>
        </div>
      )}

      {error && (
        <p className="flex items-start gap-1.5 text-[11px] font-semibold text-[var(--danger)]" role="alert">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-[var(--brand-primary)] text-[var(--brand-on-primary)] text-xs font-bold py-3 min-h-[44px] disabled:opacity-50 transition-opacity"
      >
        {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
        {t("verification.profileForm.save")}
      </button>
    </form>
  );
};

export default ProfileDetailsForm;
