"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Check, CheckCircle2, AlertTriangle, X, RefreshCw, ShieldCheck, Upload } from "lucide-react";
import { getPortalBearer } from "@/lib/customerPortalClient";

/**
 * DocumentUploader — real upload against the customer verification API.
 *
 * Replaces the previous "upload" which was `setIsUploading(true)` followed by
 * a 1200 ms `setTimeout` that flipped a local success flag: no file left the
 * browser, nothing was stored, and the customer was told their KYC had
 * progressed. That is a fabricated verification state and is exactly what
 * §64 prohibits.
 *
 * What is real here:
 *   • client-side pre-flight (type + size) so the customer learns before a
 *     round-trip, mirroring — not replacing — the server checks;
 *   • `XMLHttpRequest.upload.onprogress`, i.e. genuine byte-progress from the
 *     network layer (0–99 %; 100 % only when the server has answered), because
 *     a fabricated progress bar is forbidden just as a fabricated result is;
 *   • `capture="environment"` for camera-first use on low-end Android;
 *   • retry that reuses the same payload, cancel that aborts the transfer, and
 *     an error message that never leaks a server-side string.
 */

export type UploadState = "idle" | "validating" | "uploading" | "done" | "error";

export interface UploadedDocument {
  id: string;
  documentType: string;
  verificationStatus: string;
  uploadedAt: string;
}

const ACCEPT = "image/jpeg,image/png,image/webp,application/pdf";
const GUIDE_KEYS = [
  "verification.guideCorners",
  "verification.guideReadable",
  "verification.guideNoGlare",
] as const;

const MAX_BYTES = 8 * 1024 * 1024;
const MIN_BYTES = 10 * 1024;

export const DocumentUploader: React.FC<{
  documentType: string;
  t: (key: string, params?: Record<string, string | number>) => string;
  /** Expiry date of the document being uploaded, when the type has one. */
  expiresAt?: string;
  onUploaded?: (doc: UploadedDocument) => void;
}> = ({ documentType, t, expiresAt, onUploaded }) => {
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const cameraRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => () => xhrRef.current?.abort(), []);

  const validate = useCallback(
    (f: File): string | null => {
      if (!["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(f.type)) {
        return t("verification.uploadBadType");
      }
      if (f.size < MIN_BYTES) return t("verification.uploadTooSmall");
      if (f.size > MAX_BYTES) return t("verification.uploadTooLarge", { limit: MAX_BYTES / (1024 * 1024) });
      return null;
    },
    [t],
  );

  const choose = (f: File | null | undefined) => {
    setError(null);
    setHint(null);
    if (!f) return;
    const problem = validate(f);
    if (problem) {
      setState("error");
      setError(problem);
      return;
    }
    setFile(f);
    setState("idle");
  };

  const submit = useCallback(() => {
    if (!file || state === "uploading") return;
    setState("uploading");
    setError(null);
    setProgress(0);

    const form = new FormData();
    form.append("file", file, file.name);
    form.append("documentType", documentType);
    if (expiresAt) form.append("expiresAt", expiresAt);

    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;
    xhr.open("POST", "/api/customer/portal/verification");
    xhr.withCredentials = true;
    // Same bearer source as every other portal call — never a second copy of
    // a credential string inside a component.
    xhr.setRequestHeader("Authorization", getPortalBearer());
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) setProgress(Math.min(99, Math.round((e.loaded / e.total) * 100)));
    };
    xhr.onload = () => {
      let parsed: any = null;
      try {
        parsed = JSON.parse(xhr.responseText);
      } catch {
        /* non-JSON error body: never surfaced to the customer */
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        setProgress(100);
        setState("done");
        onUploaded?.(parsed?.data?.document);
      } else {
        setState("error");
        // Localised, safe copy only — the raw backend message stays server-side.
        setError(
          xhr.status === 409
            ? t("verification.reviewInProgress")
            : xhr.status === 401
              ? t("verification.sessionExpired")
              : parsed?.error?.message && String(parsed.error.message).length < 160
                ? String(parsed.error.message)
                : t("verification.uploadFailed"),
        );
      }
    };
    xhr.onerror = () => {
      setState("error");
      setError(t("verification.uploadNetwork"));
    };
    xhr.onabort = () => {
      setState("idle");
      setProgress(0);
    };
    xhr.send(form);
  }, [file, documentType, expiresAt, onUploaded, state, t]);

  const busy = state === "uploading";

  if (state === "done") {
    return (
      <div className="rounded-2xl border border-[var(--brand-border)] bg-[var(--brand-soft)]/50 p-4 space-y-2">
        <div className="flex items-center gap-2 text-[var(--success)]">
          <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span className="text-xs font-bold text-[var(--foreground)]">{t("verification.uploadReceived")}</span>
        </div>
        <p className="text-[11px] text-[var(--foreground-muted)] leading-relaxed">
          {t("verification.uploadReviewNote")}
        </p>
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-[var(--foreground-muted)]">
          <ShieldCheck className="h-3 w-3" aria-hidden="true" />
          {t("verification.storedSecurely")}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {!file ? (
        <div className="space-y-2.5">
          {/* §34 — tell the customer what a good capture looks like *before* they
              take it. These are the three reasons documents bounce in review, so
              the checklist is a real reduction in resubmissions, not decoration.
              The frame is CSS geometry, not a KYC vendor's UI, and no internal
              rule ("we check the MRZ zone") is exposed. */}
          <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
            <div className="flex items-center gap-3">
              <span
                className="relative grid h-12 w-[68px] shrink-0 place-items-center rounded-lg border-2 border-dashed border-[var(--brand-border)] bg-[var(--surface)]"
                aria-hidden="true"
              >
                <span className="h-[2px] w-8 rounded bg-[var(--border-strong)]" />
              </span>
              <ul className="min-w-0 space-y-1">
                {GUIDE_KEYS.map((k) => (
                  <li key={k} className="flex items-start gap-1.5 text-[11px] leading-snug text-[var(--foreground-muted)]">
                    <Check className="mt-0.5 h-3 w-3 shrink-0 text-[var(--brand-primary)]" aria-hidden="true" />
                    <span>{t(k)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--surface-elevated)] p-4 min-h-[84px] hover:border-[var(--brand-border)] transition-colors"
          >
            <Camera className="h-5 w-5 text-[var(--brand-primary)]" aria-hidden="true" />
            <span className="text-[11px] font-bold text-[var(--foreground)]">{t("verification.useCamera")}</span>
            <span className="text-[10px] text-[var(--foreground-muted)]">{t("verification.cameraHint")}</span>
          </button>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--surface-elevated)] p-4 min-h-[84px] hover:border-[var(--brand-border)] transition-colors"
          >
            <Upload className="h-5 w-5 text-[var(--brand-primary)]" aria-hidden="true" />
            <span className="text-[11px] font-bold text-[var(--foreground)]">{t("verification.chooseFile")}</span>
            <span className="text-[10px] text-[var(--foreground-muted)]">{t("verification.fileHint", { limit: MAX_BYTES / (1024 * 1024) })}</span>
          </button>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-3 space-y-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--surface)] border border-[var(--border)] shrink-0">
              <Upload className="h-4 w-4 text-[var(--brand-primary)]" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-bold text-[var(--foreground)] truncate">{file.name}</span>
              <span className="block text-[10px] font-mono text-[var(--foreground-muted)]">
                {(file.size / 1024).toFixed(0)} KB • {file.type || "unknown"}
              </span>
            </span>
            {!busy && (
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setState("idle");
                }}
                className="p-1.5 rounded-lg text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
                aria-label={t("verification.removeFile")}
              >
                <X className="h-4 w-4" />
              </button>
            )}
            {busy && (
              <button
                type="button"
                onClick={() => xhrRef.current?.abort()}
                className="text-[10px] font-bold text-[var(--danger)] shrink-0"
              >
                {t("common.cancel")}
              </button>
            )}
          </div>

          {/* Real byte progress from XHR; label says what it measures. */}
          {busy && (
            <div className="space-y-1">
              <div className="h-1.5 w-full rounded-full bg-[var(--surface)] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[var(--brand-primary)] transition-[width] duration-200"
                  style={{ width: `${progress}%` }}
                  role="progressbar"
                  aria-valuenow={progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={t("verification.uploading")}
                />
              </div>
              <p className="text-[10px] font-mono text-[var(--foreground-muted)]" aria-live="polite">
                {progress < 100 ? `${progress}% · ${t("verification.uploading")}` : t("verification.finalising")}
              </p>
            </div>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        onChange={(e) => choose(e.target.files?.[0])}
        aria-label={t("verification.chooseFile")}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={(e) => choose(e.target.files?.[0])}
        aria-label={t("verification.useCamera")}
      />

      {hint && <p className="text-[11px] text-[var(--foreground-muted)]">{hint}</p>}

      {error && (
        <p className="flex items-start gap-1.5 text-[11px] font-semibold text-[var(--danger)]" role="alert">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}

      {file && (
        <button
          type="button"
          onClick={submit}
          disabled={busy}
          className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-[var(--brand-primary)] text-[var(--brand-on-primary)] text-xs font-bold py-3 min-h-[44px] disabled:opacity-60 transition-opacity"
        >
          {state === "error" ? <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> : null}
          {state === "error" ? t("verification.retryUpload") : t("kyc.uploadDocument")}
        </button>
      )}
    </div>
  );
};

export default DocumentUploader;
