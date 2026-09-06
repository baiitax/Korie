"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useCustomer } from "@/components/customer/CustomerContext";
import PinModal from "@/components/customer/ui/PinModal";
import { DataEmptyState, DataErrorState } from "@/components/customer/ui/CustomerStateViews";
import { KpaySectionLoader } from "@/components/loading";
import { useLoading } from "@/components/loading";
import { BANK_DIRECTORY } from "@/services/customerDataService";
import { formatMoney, maskAccountNumber } from "@/lib/money";
import { CustomerCurrency, CustomerTransaction } from "@/types/customer";
import {
  ArrowLeft,
  User,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Landmark,
} from "lucide-react";

/**
 * Send Money — simple, XOF-first transfer flow (directive §15–§20).
 *
 * The customer is NEVER asked to choose a payment rail, provider, routing
 * mechanism or settlement network. They pick a "From" account (XOF first), a
 * recipient, an amount, review, confirm — and KoriePay routes internally via
 * the backend routing engine (Coris Bank / Providus as appropriate).
 *
 * The cross-border NGN<->XOF corridor is the supported case; the relevant
 * exchange rate and fee are shown (actual engine values), never USD, never
 * routing details.
 */

type Step = 1 | 2 | 3;

type RecipientSelection = {
  name: string;
  bankCode: string;
  bankName: string;
  accountNumber: string;
  country: "NG" | "NE";
  currency: CustomerCurrency;
};

export default function SendMoneyPage() {
  const {
    wallets,
    activeCurrency,
    setActiveCurrency,
    beneficiaries,
    executeTransfer,
    openReceipt,
    t,
    fxRates,
    portalPhase,
    portalError,
    refreshPortal,
  isBalanceHidden,
  } = useCustomer();
  const { beginTransaction, updateTransactionStatus, endTransaction } = useLoading();

  const [step, setStep] = useState<Step>(1);
  const [sourceCurrency, setSourceCurrency] = useState<CustomerCurrency>("XOF");
  const [amountStr, setAmountStr] = useState("");
  const [description, setDescription] = useState("");
  const [recipient, setRecipient] = useState<RecipientSelection | null>(null);
  const [bankCode, setBankCode] = useState("NE020");
  const [accountNumber, setAccountNumber] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completedTx, setCompletedTx] = useState<CustomerTransaction | null>(null);

  // `wallets` is empty while the portal is loading and stays empty when the
  // profile has no linked account. Every wallet-derived value below assumes a
  // wallet exists, so the page must not render the form until it does.
  const sourceWallet = wallets.find((w) => w.currency === sourceCurrency) || wallets[0];
  const parsesAmount = (parseFloat(amountStr) || 0);

  // Recipient bank determines the destination currency (bank's country).
  const availableBanks = BANK_DIRECTORY.filter((b) => b.country === "NG" || b.country === "NE");
  const selectedBank = availableBanks.find((b) => b.code === bankCode) || availableBanks[0];
  const isCrossBorder = recipient
    ? recipient.currency !== sourceCurrency
    : selectedBank
    ? (selectedBank.currency as CustomerCurrency) !== sourceCurrency
    : false;

  // Cross-border rate from the engine (single source of truth). fee = 0.5%.
  const engineRate = fxRates.find((r) => r.fromCurrency === sourceCurrency);
  const rate = isCrossBorder && engineRate ? engineRate.rate : 0;
  const fee = isCrossBorder ? Math.round(parsesAmount * 0.005) : sourceCurrency === "NGN" ? 50 : 0;
  const recipientReceives = isCrossBorder ? Math.round((parsesAmount - fee) * rate) : parsesAmount - fee;
  // The engine debits the wallet subledger for `parsesAmount` exactly — the
  // fee is taken from within the amount (recipient gets (amount − fee) × rate;
  // GL: amount → netAmount onward + fee to revenue). Adding the fee here made
  // the review screen promise a larger debit than the balance ever showed.
  const totalDebit = parsesAmount;
  const destCurrency: CustomerCurrency = isCrossBorder
    ? (recipient?.currency ?? (selectedBank?.currency as CustomerCurrency))
    : sourceCurrency;

  const handleSelectBeneficiary = (ben: (typeof beneficiaries)[0]) => {
    setRecipient({
      name: ben.name,
      bankCode: ben.bankCode,
      bankName: ben.bankName,
      accountNumber: ben.accountNumber,
      country: ben.country,
      currency: ben.currency,
    });
    setBankCode(ben.bankCode);
    setAccountNumber(ben.accountNumber);
    setRecipientName(ben.name);
  };

  const handleProceed = (e: React.FormEvent) => {
    e.preventDefault();
    if (parsesAmount <= 0) {
      setError(t("transfers.invalidAmount"));
      return;
    }
    if (!sourceWallet) {
      setError(t("customer.dashboard.noAccountTitle"));
      return;
    }
    if (parsesAmount + fee > sourceWallet.availableBalance) {
      setError(
        isBalanceHidden
          ? t("transfers.insufficientFundsHidden")
          : t("transfers.insufficientFunds", { balance: formatMoney(sourceWallet.availableBalance, sourceWallet.currency) }),
      );
      return;
    }
    if (accountNumber.length < 6 || !recipientName) {
      setError(t("transfers.recipientRequired"));
      return;
    }
    setError(null);
    setStep(2);
  };

  const handleConfirmPin = async (pin: string) => {
    setIsPinModalOpen(false);
    setIsExecuting(true);
    setError(null);

    beginTransaction({
      title: t("transfers.confirmTransfer"),
      amount: formatMoney(parsesAmount, sourceCurrency),
      recipient: recipientName,
      summary: [
        { label: t("transfers.recipient"), value: recipientName },
        { label: t("transfers.selectBank"), value: selectedBank?.name || "—" },
        { label: t("transfers.feeIncluded"), value: formatMoney(fee, sourceCurrency) },
        { label: t("transfers.totalDebit"), value: formatMoney(totalDebit, sourceCurrency) },
      ],
      status: "PROCESSING",
      providerWait: true,
    });

    const result = await executeTransfer({
      recipientName,
      recipientBank: selectedBank?.name || "Bank",
      recipientAccount: accountNumber,
      amount: parsesAmount,
      currency: sourceCurrency,
      destinationCurrency: destCurrency,
      description,
      isCrossBorder,
    });

    setIsExecuting(false);
    // The loader is dismissed in the same tick as the real outcome. It used to
    // sit on a `setTimeout(800)` after the response landed, which only made the
    // UI look busy for no reason.
    if (result.success && result.transaction) {
      updateTransactionStatus("SUCCESSFUL");
      endTransaction();
      setCompletedTx(result.transaction);
      setStep(3);
    } else {
      updateTransactionStatus("FAILED");
      endTransaction();
      setError(result.error || t("transfers.transferFailed"));
    }
  };

  /**
   * Wallet-state gate. Loading, failure and a genuinely account-less profile
   * are three different things and must not render the same screen.
   */
  if (!sourceWallet) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-2xl mx-auto">
        <div className="flex items-center gap-3">
          <Link href="/customer" className="p-2 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[var(--foreground)]">{t("transfers.sendMoneyTitle")}</h1>
            <p className="text-xs text-[var(--foreground-muted)]">{t("transfers.sendMoneySubtitle")}</p>
          </div>
        </div>
        {portalPhase === "loading" ? (
          <KpaySectionLoader message={t("customer.shell.loadingAccount")} />
        ) : portalError ? (
          <DataErrorState
            error={portalError}
            retryLabel={t("transactions.refresh")}
            onRetry={() => void refreshPortal()}
            surface="transactions"
          />
        ) : (
          <DataEmptyState
            title={t("customer.dashboard.noAccountTitle")}
            hint={t("customer.dashboard.noAccountHint")}
            action={{ label: t("customer.wallets.title"), href: "/customer/wallets" }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/customer" className="p-2 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[var(--foreground)]">{t("transfers.sendMoneyTitle")}</h1>
          <p className="text-xs text-[var(--foreground-muted)]">{t("transfers.sendMoneySubtitle")}</p>
        </div>
      </div>

      {/* STEP 1: DETAILS */}
      {step === 1 && (
        <form onSubmit={handleProceed} className="space-y-6">
          {/* From — XOF first */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono uppercase text-[var(--foreground-muted)] font-semibold">{t("transfers.from")}</label>
            <div className="grid grid-cols-2 gap-2">
              {wallets.map((w) => {
                const active = sourceCurrency === w.currency;
                return (
                  <button
                    key={w.currency}
                    type="button"
                    onClick={() => { setSourceCurrency(w.currency); setError(null); }}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      active
                        ? "border-[var(--brand-border)] bg-[var(--brand-soft)] shadow-[var(--shadow-sm)]"
                        : "border-[var(--border)] bg-[var(--surface)]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[var(--foreground)]">{w.currency}</span>
                      <span className="text-[10px] font-mono text-[var(--foreground-muted)]">{w.bankName}</span>
                    </div>
                    <div className="mt-1.5 text-sm font-extrabold font-mono tabular text-[var(--foreground)]">
                      {isBalanceHidden ? `${w.symbol} ••••••••` : formatMoney(w.availableBalance, w.currency)}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Saved beneficiaries */}
          {beneficiaries.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-[var(--foreground-muted)]">
                <span className="font-semibold uppercase font-mono text-[11px]">{t("transfers.recipients")}</span>
                <Link href="/customer/beneficiaries" className="text-[var(--brand-primary)] hover:underline">{t("common.viewAll")}</Link>
              </div>
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {beneficiaries.map((ben) => (
                  <button
                    key={ben.id}
                    type="button"
                    onClick={() => { handleSelectBeneficiary(ben); setError(null); }}
                    className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-[var(--surface)] hover:bg-[var(--surface-elevated)] border border-[var(--border)] shrink-0 transition-colors text-left"
                  >
                    <div className="w-7 h-7 rounded-xl bg-[var(--brand-soft)] text-[var(--brand-primary)] font-bold text-xs flex items-center justify-center">
                      {ben.name[0]}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[var(--foreground)] leading-tight truncate max-w-[110px]">{ben.name}</div>
                      <div className="text-[10px] text-[var(--foreground-muted)] font-mono">{ben.currency}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Recipient bank */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--foreground)]">{t("transfers.selectBank")}</label>
            <div className="relative">
              <Landmark className="absolute left-3.5 top-3.5 w-4 h-4 text-[var(--foreground-muted)]" />
              <select
                value={bankCode}
                onChange={(e) => { setBankCode(e.target.value); setRecipient(null); }}
                className="w-full p-3.5 pl-10 rounded-2xl bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground)] text-sm"
              >
                {availableBanks.map((bank) => (
                  <option key={bank.code} value={bank.code}>{bank.name} ({bank.currency})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Account number + name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--foreground)]">{t("transfers.accountNumberLabel")}</label>
            <input
              type="text" required maxLength={20} placeholder={selectedBank?.country === "NE" ? "2279 810 2391" : "0123456789"}
              value={accountNumber} onChange={(e) => { setAccountNumber(e.target.value.replace(/\s+/g, "")); setRecipient(null); }}
              className="w-full p-3.5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] text-sm font-mono text-[var(--foreground)]"
            />
            <input
              type="text" required placeholder={t("transfers.recipientName")}
              value={recipientName} onChange={(e) => { setRecipientName(e.target.value); setRecipient(null); }}
              className="w-full p-3.5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] text-sm text-[var(--foreground)]"
            />
          </div>

          {/* Amount */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label className="font-semibold text-[var(--foreground)]">{t("transfers.amountToTransfer")}</label>
              <span className="font-mono text-[var(--foreground-muted)]">
                {t("common.available")}: {isBalanceHidden ? `${sourceWallet.symbol} ••••••` : formatMoney(sourceWallet.availableBalance, sourceWallet.currency)}
              </span>
            </div>
            <div className="relative">
              <span className="absolute left-4 top-3.5 text-lg font-bold text-[var(--foreground-muted)] font-mono">
                {sourceCurrency === "XOF" ? "CFA " : "₦"}
              </span>
              <input
                type="number" min="100" required placeholder="0.00"
                value={amountStr} onChange={(e) => setAmountStr(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] text-xl font-bold font-mono text-[var(--foreground)]"
              />
            </div>

            {/* Fee + recipient receives — authoritative engine values */}
            {parsesAmount > 0 && (
              <div className="p-3 rounded-2xl bg-[var(--brand-soft)] border border-[var(--brand-border)] text-xs space-y-1.5">
                {isCrossBorder && (
                  <>
                    <div className="flex items-center justify-between text-[var(--brand-primary)]">
                      <span className="font-bold">{t("transfers.exchangeRate")}</span>
                      <span className="font-mono">1 {sourceCurrency} = {rate} {destCurrency}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--foreground-muted)]">{t("transfers.recipientReceives")}</span>
                      <span className="font-mono font-bold text-[var(--foreground)]">{formatMoney(recipientReceives, destCurrency)}</span>
                    </div>
                  </>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-[var(--foreground-muted)]">{t("transfers.feeIncluded")}</span>
                  <span className="font-mono font-bold text-[var(--foreground)]">{sourceCurrency === "XOF" ? "CFA" : "₦"} {fee.toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--foreground)]">{t("transfers.descriptionPlaceholder")}</label>
            <input type="text" placeholder={t("transfers.descriptionPlaceholder")} value={description} onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3.5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] text-sm text-[var(--foreground)]" />
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-[var(--danger-soft)] border border-[var(--danger-soft)] text-xs text-[var(--danger)] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" /><span>{error}</span>
            </div>
          )}

          <button type="submit" disabled={parsesAmount <= 0}
            className="w-full py-4 rounded-2xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] disabled:opacity-50 text-[var(--brand-on-primary)] font-extrabold text-sm transition-all shadow-[var(--shadow-md)]">
            {t("transfers.reviewTransfer")}
          </button>
        </form>
      )}

      {/* STEP 2: REVIEW & CONFIRM */}
      {step === 2 && (
        <div className="space-y-6 animate-in fade-in">
          <div className="rounded-3xl bg-[var(--surface)] border border-[var(--border)] p-6 space-y-5 shadow-[var(--shadow-card)]">
            <div className="text-center space-y-1 py-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--foreground-muted)] font-bold">{t("transfers.youAreSending")}</span>
              <div className="text-3xl sm:text-4xl font-extrabold text-[var(--foreground)] font-mono tabular">{formatMoney(parsesAmount, sourceCurrency)}</div>
              {isCrossBorder && (
                <div className="text-xs font-mono text-[var(--brand-primary)] font-bold">≈ {formatMoney(recipientReceives, destCurrency)}</div>
              )}
            </div>

            <div className="rounded-2xl bg-[var(--surface-elevated)] border border-[var(--border)] divide-y divide-[var(--border)] text-xs">
              <Row label={t("transfers.recipient")} value={recipientName} />
              <Row label={t("transfers.destinationBank")} value={selectedBank?.name} />
              <Row label={t("transfers.accountNumberLabel")} value={maskAccountNumber(accountNumber)} mono accent />
              {isCrossBorder && <Row label={t("transfers.exchangeRate")} value={`1 ${sourceCurrency} = ${rate} ${destCurrency}`} mono />}
              <Row label={t("transfers.feeIncluded")} value={formatMoney(fee, sourceCurrency)} mono />
              <div className="flex items-center justify-between p-3.5 bg-[var(--brand-soft)]">
                <span className="text-[var(--foreground)] font-bold">{t("transfers.totalDebit")}</span>
                <span className="text-[var(--brand-primary)] font-mono font-bold text-sm">{formatMoney(totalDebit, sourceCurrency)}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button type="button" onClick={() => setStep(1)} className="w-1/2 py-3.5 rounded-2xl bg-[var(--surface)] hover:bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground)] font-semibold text-xs transition-colors">
                {t("common.back")}
              </button>
              <button type="button" onClick={() => setIsPinModalOpen(true)} className="w-1/2 py-3.5 rounded-2xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-[var(--brand-on-primary)] font-bold text-xs transition-colors shadow-[var(--shadow-md)]">
                {t("transfers.confirmTransfer")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: SUCCESS & SHORT RECEIPT */}
      {step === 3 && completedTx && (
        <div className="space-y-6 text-center animate-in zoom-in-95 duration-200">
          <div className="rounded-3xl bg-[var(--surface)] border border-[var(--brand-border)] p-8 space-y-5 shadow-[var(--shadow-card)]">
            <div className="w-16 h-16 rounded-full bg-[var(--success-soft)] border border-[var(--brand-soft)] text-[var(--success)] flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div className="space-y-1">
              <h2 className="text-2xl font-extrabold text-[var(--foreground)]">{t("transfers.transferSuccessTitle")}</h2>
              <p className="text-xs text-[var(--foreground-muted)] max-w-sm mx-auto">
                {t("transfers.transferSuccessDesc", { amount: formatMoney(completedTx.amount, completedTx.currency), recipient: completedTx.recipientName || recipientName })}
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 text-[11px] font-mono text-[var(--brand-primary)]">
              <User className="w-3.5 h-3.5" />
              <span className="font-bold">{completedTx.reference}</span>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button onClick={() => openReceipt(completedTx)} className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-[var(--brand-on-primary)] font-bold text-xs transition-colors shadow-[var(--shadow-md)]">
                {t("transfers.viewReceipt")}
              </button>
              <button onClick={() => { setStep(1); setAmountStr(""); setRecipientName(""); setAccountNumber(""); setCompletedTx(null); }}
                className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-[var(--surface)] hover:bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground)] font-semibold text-xs transition-colors">
                {t("transfers.sendAnother")}
              </button>
            </div>
          </div>
        </div>
      )}

      <PinModal isOpen={isPinModalOpen} onClose={() => setIsPinModalOpen(false)} onSuccess={handleConfirmPin} />
    </div>
  );
}

function Row({ label, value, mono, accent }: { label: string; value?: string; mono?: boolean; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between p-3.5">
      <span className="text-[var(--foreground-muted)]">{label}</span>
      <span className={`${accent ? "text-[var(--brand-primary)] font-semibold" : "text-[var(--foreground)]"} ${mono ? "font-mono" : ""} font-semibold`}>{value || "—"}</span>
    </div>
  );
}
