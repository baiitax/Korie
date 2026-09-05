"use client";

import React, { useState } from "react";
import { X, Lock, Delete } from "lucide-react";
import { useCustomer } from "../CustomerContext";

interface PinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (pin: string) => void;
  title?: string;
  subtitle?: string;
}

/**
 * Confirmation sheet for money movement.
 *
 * Two deliberate rules, both from the repair directive:
 *
 *  1. **No simulated authorisation.** This component used to carry a
 *     "Use FaceID / Biometrics" key that called `onSuccess("BIO_PASS")` with no
 *     check of any kind — one tap moved money. It is gone: the customer must
 *     enter the four digits they set. There is no passkey, biometric or device
 *     binding backend in this codebase, so nothing here claims to verify
 *     identity beyond the signed-in session.
 *  2. **No staged delay.** The value is handed to the caller as soon as the
 *     fourth digit lands. The previous 150 ms `setTimeout` existed only to make
 *     the dialog feel like it was doing something.
 *
 * The API does not verify a transaction-level PIN today (no PIN store exists
 * server-side); that gap is reported instead of being papered over in the UI.
 * All colours come from the theme tokens so the sheet follows Light/Dark.
 */
export const PinModal: React.FC<PinModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  title,
  subtitle,
}) => {
  const { t } = useCustomer();
  const [pin, setPin] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleKeyPress = (num: string) => {
    if (pin.length >= 4) return;
    const next = pin + num;
    setPin(next);
    setError(null);
    if (next.length === 4) {
      setPin("");
      onSuccess(next);
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(null);
  };

  const handleCancel = () => {
    setPin("");
    setError(null);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-label={title || t("transfers.enterPin")}
      onKeyDown={(e) => {
        if (e.key === "Escape") handleCancel();
      }}
    >
      <div className="relative w-full max-w-sm rounded-3xl bg-[var(--surface-elevated)] border border-[var(--border)] shadow-[var(--shadow-lg)] p-6 text-center space-y-6">
        <button
          onClick={handleCancel}
          className="absolute top-4 right-4 p-1.5 rounded-full text-[var(--foreground-muted)] hover:bg-[var(--surface)] hover:text-[var(--foreground)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]"
          aria-label={t("common.cancel")}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-1 pt-2">
          <div className="w-12 h-12 rounded-2xl bg-[var(--brand-soft)] border border-[var(--brand-border)] text-[var(--brand-primary)] flex items-center justify-center mx-auto mb-2">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-[var(--foreground)]">
            {title || t("transfers.enterPin")}
          </h3>
          <p className="text-xs text-[var(--foreground-muted)]">
            {subtitle || t("transfers.pinRequiredMsg")}
          </p>
        </div>

        {/* PIN dots — announced so screen readers track progress */}
        <div
          className="flex items-center justify-center gap-4 py-2"
          role="status"
          aria-live="polite"
          aria-label={`${pin.length} / 4`}
        >
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`w-4 h-4 rounded-full border transition-colors duration-100 ${
                pin.length > idx
                  ? "bg-[var(--brand-primary)] border-[var(--brand-primary)]"
                  : "bg-[var(--surface)] border-[var(--border)]"
              }`}
            />
          ))}
        </div>

        {error && (
          <div className="text-xs font-semibold text-[var(--danger)]" role="alert">
            {error}
          </div>
        )}

        <div className="grid grid-cols-3 gap-3 pt-2">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleKeyPress(num)}
              className="h-14 rounded-2xl bg-[var(--surface)] hover:bg-[var(--surface-elevated)] active:bg-[var(--brand-soft)] text-lg font-mono font-bold text-[var(--foreground)] transition-colors border border-[var(--border)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]"
            >
              {num}
            </button>
          ))}
          <span aria-hidden />
          <button
            type="button"
            onClick={() => handleKeyPress("0")}
            className="h-14 rounded-2xl bg-[var(--surface)] hover:bg-[var(--surface-elevated)] active:bg-[var(--brand-soft)] text-lg font-mono font-bold text-[var(--foreground)] transition-colors border border-[var(--border)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="h-14 rounded-2xl bg-[var(--surface)] hover:bg-[var(--surface-elevated)] text-[var(--foreground-muted)] flex items-center justify-center border border-[var(--border)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]"
            aria-label={t("common.back")}
          >
            <Delete className="w-6 h-6" />
          </button>
        </div>

        <p className="text-[11px] leading-relaxed text-[var(--foreground-muted)]">
          {t("transfers.pinNotVerifiedNote")}
        </p>
      </div>
    </div>
  );
};

export default PinModal;
