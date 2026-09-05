"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useCustomer } from "@/components/customer/CustomerContext";
import { formatMoney, maskAccountNumber } from "@/lib/money";
import { CustomerCurrency } from "@/types/customer";
import {
  ArrowLeft,
  ArrowRight,
  User,
  Store,
  Landmark,
  Copy,
  Check,
  Info,
} from "lucide-react";

type Source = "AGENT" | "BANK_TRANSFER";
type Step = 1 | 2 | 3;

/**
 * Fund Account — explicitly asks the customer WHERE the funds are coming from
 * (directive §21–§25), then the destination account (XOF first, NGN second),
 * amount, review, and instructions/confirmation.
 *
 * Only funding sources genuinely supported by the backend are shown. There is
 * no fabricated crypto/card/P2P funding, and no fabricated "nearby agents".
 * Confirmation of a received credit is driven by the funding source (an
 * authorised agent or the bank statement), not by a fake in-app success.
 */
export default function CustomerFundPage() {
  const { wallets, t } = useCustomer();
  const [step, setStep] = useState<Step>(1);
  const [source, setSource] = useState<Source>("AGENT");
  const [destCurrency, setDestCurrency] = useState<CustomerCurrency>("XOF");
  const [amountStr, setAmountStr] = useState("");
  const [agentId, setAgentId] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const destWallet = wallets.find((w) => w.currency === destCurrency) || wallets[0];
  const amount = parseFloat(amountStr) || 0;

  const copy = async (key: string, value: string) => {
    try { await navigator.clipboard.writeText(value); setCopied(key); setTimeout(() => setCopied(null), 1600); } catch { /* noop */ }
  };

  const handleProceed = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) return;
    setStep(2);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/customer" className="p-2 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground-muted)] transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[var(--foreground)]">{t("fund.title")}</h1>
          <p className="text-xs text-[var(--foreground-muted)]">{t("fund.subtitle")}</p>
        </div>
      </div>

      {/* STEP 1: SOURCE + DESTINATION + AMOUNT */}
      {step === 1 && (
        <form onSubmit={handleProceed} className="space-y-6">
          {/* Funding source */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono uppercase text-[var(--foreground-muted)] font-semibold">{t("fund.fundingSource")}</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(
                [
                  { id: "AGENT" as Source, icon: Store, label: t("fund.agent"), desc: t("fund.agentDesc") },
                  { id: "BANK_TRANSFER" as Source, icon: Landmark, label: t("fund.bankTransfer"), desc: t("fund.bankTransferDesc") },
                ]
              ).map((opt) => {
                const active = source === opt.id;
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSource(opt.id)}
                    className={`p-4 rounded-2xl border text-left transition-all ${
                      active ? "border-[var(--brand-border)] bg-[var(--brand-soft)] shadow-[var(--shadow-sm)]" : "border-[var(--border)] bg-[var(--surface)]"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${active ? "bg-[var(--brand-primary)] text-white" : "bg-[var(--surface-elevated)] text-[var(--foreground-muted)]"}`}>
                        <Icon className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-[var(--foreground)]">{opt.label}</div>
                        <div className="text-[10px] text-[var(--foreground-muted)]">{opt.desc}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Destination account — XOF first */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono uppercase text-[var(--foreground-muted)] font-semibold">{t("fund.destinationAccount")}</label>
            <div className="space-y-2">
              {wallets.map((w) => {
                const active = destCurrency === w.currency;
                return (
                  <button
                    key={w.currency}
                    type="button"
                    onClick={() => setDestCurrency(w.currency)}
                    className={`w-full p-4 rounded-2xl border flex items-center justify-between transition-all ${
                      active ? "border-[var(--brand-border)] bg-[var(--brand-soft)]" : "border-[var(--border)] bg-[var(--surface)]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${active ? "border-[var(--brand-primary)]" : "border-[var(--border-strong)]"}`}>
                        {active && <span className="h-2.5 w-2.5 rounded-full bg-[var(--brand-primary)]" />}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-[var(--foreground)]">{w.currency}</div>
                        <div className="text-[10px] font-mono text-[var(--foreground-muted)]">{maskAccountNumber(w.accountNumber)}</div>
                      </div>
                    </div>
                    <span className="text-sm font-mono font-extrabold text-[var(--foreground)]">{formatMoney(w.availableBalance, w.currency)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Amount */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--foreground)]">{t("common.amount")} ({destWallet?.currency || "XOF"})</label>
            <div className="relative">
              <span className="absolute left-4 top-3.5 text-lg font-bold text-[var(--foreground-muted)] font-mono">{destCurrency === "XOF" ? "CFA " : "₦"}</span>
              <input type="number" min="100" required placeholder="0.00" value={amountStr} onChange={(e) => setAmountStr(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] text-xl font-bold font-mono text-[var(--foreground)]" />
            </div>
          </div>

          {/* Agent identifier (only if Agent funding) */}
          {source === "AGENT" && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--foreground)]">{t("fund.agentId")}</label>
              <input type="text" placeholder={t("fund.agentIdPlaceholder")} value={agentId} onChange={(e) => setAgentId(e.target.value)}
                className="w-full p-3.5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] text-sm text-[var(--foreground)]" />
              <p className="text-[11px] text-[var(--foreground-muted)] flex items-start gap-1.5">
                <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />{t("fund.agentNote")}
              </p>
            </div>
          )}

          <button type="submit" disabled={amount <= 0} className="w-full py-4 rounded-2xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] disabled:opacity-50 text-white font-extrabold text-sm transition-all shadow-[var(--shadow-md)]">
            {t("common.continue")}
          </button>
        </form>
      )}

      {/* STEP 2: REVIEW */}
      {step === 2 && (
        <div className="space-y-6 animate-in fade-in">
          <div className="rounded-3xl bg-[var(--surface)] border border-[var(--border)] p-6 space-y-5 shadow-[var(--shadow-card)]">
            <div className="text-center space-y-1 py-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--foreground-muted)] font-bold">{t("fund.youAreFunding")}</span>
              <div className="text-3xl sm:text-4xl font-extrabold text-[var(--foreground)] font-mono tabular">{formatMoney(amount, destCurrency)}</div>
              <div className="text-xs font-mono text-[var(--brand-primary)] font-bold">{destCurrency} · {destWallet?.accountName}</div>
            </div>

            <div className="rounded-2xl bg-[var(--surface-elevated)] border border-[var(--border)] divide-y divide-[var(--border)] text-xs">
              <div className="flex items-center justify-between p-3.5"><span className="text-[var(--foreground-muted)]">{t("fund.fundingSource")}</span><span className="font-semibold text-[var(--foreground)]">{source === "AGENT" ? t("fund.agent") : t("fund.bankTransfer")}</span></div>
              <div className="flex items-center justify-between p-3.5"><span className="text-[var(--foreground-muted)]">{t("fund.destinationAccount")}</span><span className="font-mono font-semibold text-[var(--foreground)]">{destCurrency} · {destWallet?.accountNumber ? maskAccountNumber(destWallet.accountNumber) : "—"}</span></div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button type="button" onClick={() => setStep(1)} className="w-1/2 py-3.5 rounded-2xl bg-[var(--surface)] hover:bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground)] font-semibold text-xs transition-colors">{t("common.back")}</button>
              <button type="button" onClick={() => setStep(3)} className="w-1/2 py-3.5 rounded-2xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white font-bold text-xs transition-colors shadow-[var(--shadow-md)]">{t("common.continue")}</button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: INSTRUCTIONS / CONFIRMATION */}
      {step === 3 && (
        <div className="space-y-6 animate-in fade-in">
          <div className="rounded-3xl bg-[var(--surface)] border border-[var(--border)] p-6 space-y-5 shadow-[var(--shadow-card)]">
            <div className="text-center space-y-1">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--brand-soft)] text-[var(--brand-primary)] mx-auto"><Store className="h-6 w-6" /></div>
              <h2 className="text-xl font-extrabold text-[var(--foreground)]">{source === "AGENT" ? t("fund.agentInstructionsTitle") : t("fund.bankInstructionsTitle")}</h2>
              <p className="text-xs text-[var(--foreground-muted)] max-w-md mx-auto">{source === "AGENT" ? t("fund.agentInstructionsBody") : t("fund.bankInstructionsBody")}</p>
            </div>

            <div className="rounded-2xl bg-[var(--surface-elevated)] border border-[var(--border)] divide-y divide-[var(--border)] text-xs">
              <CopyRow copied={copied === "bank"} onCopy={() => copy("bank", destWallet?.bankName || "")} label={t("fund.bankName")} value={destWallet?.bankName || "—"} />
              <CopyRow copied={copied === "acct"} onCopy={() => copy("acct", destWallet?.accountNumber || "")} label={t("fund.accountNumber")} value={destWallet?.accountNumber || "—"} />
              <CopyRow copied={copied === "name"} onCopy={() => copy("name", destWallet?.accountName || "")} label={t("fund.accountName")} value={destWallet?.accountName || "—"} />
            </div>

            <div className="flex items-start gap-2 rounded-2xl bg-[var(--brand-soft)] border border-[var(--brand-border)] p-3.5 text-[11px] text-[var(--brand-primary)]">
              <Info className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{t("fund.confirmationNote")}</span>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button onClick={() => window.print()} className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white font-bold text-xs transition-colors shadow-[var(--shadow-md)]">{t("fund.printInstructions")}</button>
              <Link href="/customer" className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-[var(--surface)] hover:bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground)] font-semibold text-xs transition-colors">{t("common.done")}</Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CopyRow({ label, value, copied, onCopy }: { label: string; value: string; copied: boolean; onCopy: () => void }) {
  return (
    <div className="flex items-center justify-between p-3.5">
      <span className="text-[var(--foreground-muted)]">{label}</span>
      <div className="flex items-center gap-2">
        <span className="font-mono font-semibold text-[var(--foreground)]">{value}</span>
        <button onClick={onCopy} className="text-[var(--foreground-muted)] hover:text-[var(--brand-primary)]" aria-label={`Copy ${label}`}>
          {copied ? <Check className="w-3.5 h-3.5 text-[var(--success)]" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
}
