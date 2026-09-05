"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useCustomer } from "@/components/customer/CustomerContext";
import { ArrowLeft, CheckCircle2, Clock, Upload, FileCheck2, ShieldCheck } from "lucide-react";

export default function CustomerKycPage() {
  const { customer, t } = useCustomer();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const handleUploadSimulate = (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);
    setTimeout(() => { setIsUploading(false); setUploadSuccess(true); }, 1200);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 pb-2 border-b border-[var(--border)]">
        <Link href="/customer" className="p-2 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground-muted)] transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[var(--foreground)] tracking-tight">{t("kyc.title")}</h1>
          <p className="text-xs text-[var(--foreground-muted)]">{t("kyc.subtitle")}</p>
        </div>
      </div>

      {/* Current Tier Badge Card */}
      <div className="rounded-3xl bg-[var(--surface)] border border-[var(--brand-border)] p-6 space-y-3 shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono uppercase text-[var(--brand-primary)] font-bold tracking-wider">{t("kyc.currentTier")}</span>
          <span className="px-3 py-0.5 rounded-full bg-[var(--brand-soft)] text-[var(--brand-primary)] font-mono font-bold text-xs border border-[var(--brand-border)]">
            ● {customer.kycStatus}
          </span>
        </div>
        <div className="text-2xl font-extrabold text-[var(--foreground)] tracking-tight">
          {customer.kycTier} — {t("customer.kycPage.verifiedIndividual")}
        </div>
        <p className="text-xs text-[var(--foreground-muted)]">{t("customer.kycPage.dailyLimitNote")}</p>

        <div className="grid grid-cols-2 gap-2 pt-2 text-xs font-mono">
          <div className="p-2.5 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)]">
            <div className="text-[10px] text-[var(--foreground-muted)]">{t("customer.kycPage.dailyTransferLimit")}</div>
            <div className="font-bold text-[var(--foreground)] mt-0.5">₦5,000,000</div>
          </div>
          <div className="p-2.5 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)]">
            <div className="text-[10px] text-[var(--foreground-muted)]">{t("customer.kycPage.maxBalance")}</div>
            <div className="font-bold text-[var(--brand-primary)] mt-0.5 uppercase">{t("customer.kycPage.unlimited")}</div>
          </div>
        </div>
      </div>

      {/* Tier Breakdown Roadmap */}
      <div className="space-y-3">
        <h2 className="text-xs font-mono uppercase font-bold text-[var(--foreground-muted)] tracking-wider">{t("kyc.documentsRequired")}</h2>

        <TierRow icon={<CheckCircle2 className="w-5 h-5 text-[var(--success)]" />} label={t("customer.kycPage.tier1Label")} limit={t("customer.kycPage.tier1Limit")} status={t("customer.kycPage.completed")} tone="muted" />
        <TierRow icon={<CheckCircle2 className="w-5 h-5 text-[var(--success)]" />} label={t("customer.kycPage.tier2Label")} limit={t("customer.kycPage.tier2Limit")} status={t("customer.kycPage.active")} tone="active" />
        <TierRow icon={<Clock className="w-5 h-5 text-[var(--foreground-muted)]" />} label={t("customer.kycPage.tier3Label")} limit={t("customer.kycPage.tier3Limit")} status={t("customer.kycPage.available")} tone="muted" />
      </div>

      {/* Document Upload for Tier 3 */}
      <div className="rounded-3xl bg-[var(--surface)] border border-[var(--border)] p-5 space-y-4 shadow-[var(--shadow-card)]">
        <div className="flex items-center gap-2 text-[var(--foreground)] font-bold text-xs">
          <FileCheck2 className="w-4 h-4 text-[var(--brand-primary)]" />
          <span>{t("customer.kycPage.upgradeTier3")}</span>
        </div>
        <p className="text-xs text-[var(--foreground-muted)]">{t("customer.kycPage.upgradeTier3Desc")}</p>

        {uploadSuccess ? (
          <div className="p-4 rounded-2xl bg-[var(--success-soft)] border border-[var(--success-soft)] text-center text-xs text-[var(--success)] space-y-1">
            <CheckCircle2 className="w-6 h-6 mx-auto" />
            <div className="font-bold">{t("customer.kycPage.uploadNote")}</div>
            <p className="text-[11px] text-[var(--foreground-muted)]">{t("customer.kycPage.reviewNote")}</p>
          </div>
        ) : (
          <form onSubmit={handleUploadSimulate} className="space-y-3">
            <div className="border-2 border-dashed border-[var(--border)] rounded-2xl p-6 text-center space-y-2 hover:border-[var(--brand-border)] transition-colors cursor-pointer bg-[var(--surface-elevated)]">
              <Upload className="w-8 h-8 text-[var(--foreground-muted)] mx-auto" />
              <div className="text-xs text-[var(--foreground)] font-semibold">{t("customer.kycPage.cacPlaceholder")}</div>
              <p className="text-[10px] text-[var(--foreground-muted)]">{t("customer.kycPage.fileHint")}</p>
            </div>
            <button type="submit" disabled={isUploading}
              className="w-full py-3 rounded-xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white font-bold text-xs transition-colors shadow-[var(--shadow-md)] disabled:opacity-50">
              {isUploading ? t("customer.kycPage.uploading") : t("kyc.uploadDocument")}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function TierRow({ icon, label, limit, status, tone }: { icon: React.ReactNode; label: string; limit: string; status: string; tone: "active" | "muted" }) {
  return (
    <div className={`p-4 rounded-2xl border flex items-center justify-between ${tone === "active" ? "bg-[var(--brand-soft)] border-[var(--border-strong)] shadow-[var(--shadow-sm)]" : "bg-[var(--surface)] border-[var(--border)] opacity-80"}`}>
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <div className="text-xs font-bold text-[var(--foreground)]">{label}</div>
          <div className="text-[11px] text-[var(--foreground-muted)] font-mono">{limit}</div>
        </div>
      </div>
      <span className={`text-xs font-bold font-mono ${tone === "active" ? "text-[var(--brand-primary)]" : "text-[var(--foreground-muted)]"}`}>{status}</span>
    </div>
  );
}
