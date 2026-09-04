"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useCustomer } from "@/components/customer/CustomerContext";
import PinModal from "@/components/customer/ui/PinModal";
import { useLoading } from "@/components/loading";
import { BANK_DIRECTORY, getFXRate } from "@/services/customerDataService";
import { formatMoney } from "@/lib/money";
import { CustomerCurrency, CustomerTransaction } from "@/types/customer";
import {
  ArrowLeft,
  Building2,
  User,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
} from "lucide-react";

type Rail = "BANK_NG" | "BANK_NE" | "CROSS_BORDER" | "KORIE_USER";

export default function SendMoneyPage() {
  const {
    customer,
    wallets,
    activeWallet,
    beneficiaries,
    executeTransfer,
    openReceipt,
    t,
  } = useCustomer();
  const { beginTransaction, updateTransactionStatus, endTransaction } = useLoading();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [rail, setRail] = useState<Rail>("BANK_NG");

  const [selectedBankCode, setSelectedBankCode] = useState("058");
  const [accountNumber, setAccountNumber] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [isVerifyingAccount, setIsVerifyingAccount] = useState(false);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [sourceCurrency, setSourceCurrency] = useState<CustomerCurrency>("NGN");

  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [completedTx, setCompletedTx] = useState<CustomerTransaction | null>(null);

  const availableBanks = BANK_DIRECTORY.filter((b) =>
    rail === "BANK_NE" || rail === "CROSS_BORDER" ? b.country === "NE" : b.country === "NG",
  );
  const selectedBank = availableBanks.find((b) => b.code === selectedBankCode) || availableBanks[0];

  const fxQuote = getFXRate("NGN", "XOF");
  const parsedAmount = parseFloat(amount) || 0;
  const isCrossBorder = rail === "CROSS_BORDER";
  const fee = isCrossBorder ? 1250 : sourceCurrency === "NGN" ? 50 : 25;
  const totalDebit = parsedAmount + fee;
  const convertedDestinationAmount = isCrossBorder && fxQuote ? parsedAmount * fxQuote.midRate : 0;

  const railOptions: { id: Rail; flag: string; label: string; sub: string; country: string }[] = [
    { id: "BANK_NG", flag: "🇳🇬", label: t("transfers.railNgBank"), sub: t("transfers.railNgBankSub"), country: "NG" },
    { id: "CROSS_BORDER", flag: "🇳🇬 ⇄ 🇳🇪", label: t("transfers.railCrossBorder"), sub: t("transfers.railCrossBorderSub"), country: "NG" },
    { id: "BANK_NE", flag: "🇳🇪", label: t("transfers.railNeBank"), sub: t("transfers.railNeBankSub"), country: "NE" },
  ];

  const handleAccountNumberChange = (val: string) => {
    const cleaned = val.replace(/\D/g, "").slice(0, 10);
    setAccountNumber(cleaned);
    if (cleaned.length === 10) {
      setIsVerifyingAccount(true);
      setTimeout(() => {
        setIsVerifyingAccount(false);
        if (cleaned === "0142981891") setRecipientName("Aisha Mohammed");
        else if (cleaned === "0123984123") setRecipientName("Dawanau Agro Traders Ltd");
        else setRecipientName("Alhaji Musa Dan-Kano");
      }, 500);
    } else {
      setRecipientName("");
    }
  };

  const handleSelectBeneficiary = (ben: (typeof beneficiaries)[0]) => {
    if (ben.country === "NE") {
      setRail("CROSS_BORDER");
      setSourceCurrency("NGN");
    } else {
      setRail("BANK_NG");
      setSourceCurrency("NGN");
    }
    setSelectedBankCode(ben.bankCode);
    setAccountNumber(ben.accountNumber);
    setRecipientName(ben.name);
  };

  const handleProceedToReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedAmount <= 0) return;
    if (parsedAmount + fee > activeWallet.availableBalance) {
      setExecutionError(t("transfers.insufficientFunds", { balance: formatMoney(activeWallet.availableBalance, activeWallet.currency) }));
      return;
    }
    setExecutionError(null);
    setStep(2);
  };

  const handleConfirmPin = async (pin: string) => {
    setIsPinModalOpen(false);
    setIsExecuting(true);
    setExecutionError(null);

    beginTransaction({
      title: t("transfers.confirmTransfer"),
      amount: formatMoney(parsedAmount, sourceCurrency),
      recipient: recipientName,
      summary: [
        { label: t("transfers.recipient"), value: recipientName || "—" },
        { label: t("transfers.selectBank"), value: selectedBank?.name || "—" },
        { label: t("transfers.transferFee"), value: formatMoney(fee, sourceCurrency) },
        { label: t("transfers.totalDebit"), value: formatMoney(totalDebit, sourceCurrency) },
      ],
      status: "PROCESSING",
      providerWait: true,
    });

    const result = await executeTransfer({
      recipientName: recipientName || "Verified Recipient",
      recipientBank: selectedBank?.name || "Commercial Bank",
      recipientAccount: accountNumber,
      amount: parsedAmount,
      currency: sourceCurrency,
      destinationCurrency: isCrossBorder ? "XOF" : sourceCurrency,
      description,
      isCrossBorder,
    });

    setIsExecuting(false);

    if (result.success && result.transaction) {
      updateTransactionStatus("SUCCESSFUL");
      setTimeout(() => {
        endTransaction();
        setCompletedTx(result.transaction!);
        setStep(3);
      }, 900);
    } else {
      updateTransactionStatus("FAILED");
      setTimeout(() => {
        endTransaction();
        setExecutionError(result.error || "Transfer failed. Please try again.");
      }, 900);
    }
  };

  const amountPrefix = sourceCurrency === "NGN" ? "₦" : "CFA ";

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/customer"
          className="p-2 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-3)] border border-[var(--border)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[var(--foreground)]">{t("transfers.sendMoneyTitle")}</h1>
          <p className="text-xs text-[var(--foreground-muted)]">{t("transfers.sendMoneySubtitle")}</p>
        </div>
      </div>

      {/* STEP 1: DETAILS */}
      {step === 1 && (
        <form onSubmit={handleProceedToReview} className="space-y-6">
          {/* Transfer Rail Selector */}
          <div className="space-y-2">
            <label className="text-xs font-mono uppercase text-[var(--foreground-muted)] font-semibold">
              {t("transfers.transferType")}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {railOptions.map((opt) => {
                const active = rail === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setRail(opt.id);
                      setSourceCurrency(opt.id === "BANK_NE" ? "XOF" : "NGN");
                      setSelectedBankCode(opt.id === "BANK_NG" ? "058" : "NE020");
                    }}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      active
                        ? "border-[var(--brand-border)] bg-[var(--brand-soft)] text-[var(--foreground)] font-bold shadow-[var(--shadow-sm)]"
                        : "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground-muted)] hover:border-[var(--brand-border)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    <div className="text-xs font-semibold">{opt.flag} {opt.label}</div>
                    <div className={`text-[10px] font-mono mt-0.5 ${active ? "text-[var(--brand-primary)]" : "text-[var(--foreground-muted)]"}`}>
                      {opt.sub}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Saved Beneficiaries */}
          {beneficiaries.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-[var(--foreground-muted)]">
                <span className="font-semibold uppercase font-mono text-[11px]">{t("transfers.recipients")}</span>
                <Link href="/customer/beneficiaries" className="text-[var(--brand-primary)] hover:underline">
                  {t("common.viewAll")}
                </Link>
              </div>
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {beneficiaries.map((ben) => (
                  <button
                    key={ben.id}
                    type="button"
                    onClick={() => handleSelectBeneficiary(ben)}
                    className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-[var(--surface)] hover:bg-[var(--surface-2)] border border-[var(--border)] shrink-0 transition-colors text-left"
                  >
                    <div className={`w-7 h-7 rounded-xl ${ben.avatarColor} text-white font-bold text-xs flex items-center justify-center`}>
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

          {/* Bank Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--foreground)]">{t("transfers.selectBank")}</label>
            <select
              value={selectedBankCode}
              onChange={(e) => setSelectedBankCode(e.target.value)}
              className="glass-input w-full p-3.5 rounded-2xl text-sm text-[var(--foreground)]"
            >
              {availableBanks.map((bank) => (
                <option key={bank.code} value={bank.code}>
                  {bank.name} ({bank.currency})
                </option>
              ))}
            </select>
          </div>

          {/* Account Number */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--foreground)]">{t("transfers.accountNumberLabel")}</label>
            <div className="relative">
              <input
                type="text"
                required
                maxLength={10}
                placeholder="0123456789"
                value={accountNumber}
                onChange={(e) => handleAccountNumberChange(e.target.value)}
                className="glass-input w-full p-3.5 rounded-2xl text-sm font-mono text-[var(--foreground)]"
              />
              {isVerifyingAccount && (
                <span className="absolute right-3.5 top-3.5 text-xs text-[var(--brand-primary)] font-mono animate-pulse">
                  {t("transfers.verifying")}
                </span>
              )}
            </div>
            {recipientName && (
              <div className="p-3 rounded-xl bg-[var(--brand-soft)] border border-[var(--brand-border)] text-xs text-[var(--brand-primary)] flex items-center justify-between animate-in fade-in">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span className="font-bold">{recipientName}</span>
                </div>
                <span className="text-[10px] font-mono uppercase">{selectedBank?.name}</span>
              </div>
            )}
          </div>

          {/* Amount */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-[var(--foreground)]">
              <label className="font-semibold">{t("transfers.amountToTransfer")}</label>
              <span className="text-[var(--foreground-muted)] font-mono">
                {t("common.available")}: {formatMoney(activeWallet.availableBalance, activeWallet.currency)}
              </span>
            </div>
            <div className="relative">
              <span className="absolute left-4 top-3.5 text-lg font-bold text-[var(--foreground-muted)] font-mono">
                {amountPrefix}
              </span>
              <input
                type="number"
                min="100"
                required
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="glass-input w-full pl-12 pr-4 py-3.5 rounded-2xl text-xl font-bold font-mono text-[var(--foreground)]"
              />
            </div>

            {/* Bilateral Conversion Live Notice — shows only authoritative FX */}
            {isCrossBorder && fxQuote && parsedAmount > 0 && (
              <div className="p-3 rounded-2xl bg-[var(--brand-soft)] border border-[var(--brand-border)] text-xs text-[var(--brand-primary)] space-y-1">
                <div className="flex items-center justify-between font-bold">
                  <span>{t("transfers.recipientReceives")}:</span>
                  <span className="text-sm font-mono text-[var(--foreground)]">{formatMoney(convertedDestinationAmount, "XOF")}</span>
                </div>
                <div className="text-[10px] text-[var(--foreground-muted)] font-mono">
                  {t("transfers.rateNotice", { rate: fxQuote.midRate })}
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--foreground)]">{t("transfers.descriptionPlaceholder")}</label>
            <input
              type="text"
              placeholder={t("transfers.descriptionPlaceholder")}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="glass-input w-full p-3.5 rounded-2xl text-sm text-[var(--foreground)]"
            />
          </div>

          {executionError && (
            <div className="p-3 rounded-xl bg-[var(--danger-soft)] border border-[var(--danger-soft)] text-xs text-[var(--danger)] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{executionError}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={!recipientName || parsedAmount <= 0}
            className="w-full py-4 rounded-2xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] disabled:opacity-50 text-white font-extrabold text-sm transition-all shadow-[var(--shadow-md)]"
          >
            {t("transfers.reviewTransfer")}
          </button>
        </form>
      )}

      {/* STEP 2: REVIEW & CONFIRM */}
      {step === 2 && (
        <div className="space-y-6 animate-in fade-in">
          <div className="rounded-3xl bg-[var(--surface)] border border-[var(--border)] p-6 space-y-5 shadow-[var(--shadow-card)]">
            <div className="text-center space-y-1 py-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--foreground-muted)] font-bold">
                {t("transfers.youAreSending")}
              </span>
              <div className="text-3xl sm:text-4xl font-extrabold text-[var(--foreground)] font-mono tabular">
                {formatMoney(parsedAmount, sourceCurrency)}
              </div>
              {isCrossBorder && (
                <div className="text-xs font-mono text-[var(--brand-secondary)] font-bold">
                  ≈ {formatMoney(convertedDestinationAmount, "XOF")} in Niger
                </div>
              )}
            </div>

            {/* Breakdown */}
            <div className="rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] divide-y divide-[var(--border)] text-xs">
              <Row label={t("transfers.recipient")} value={recipientName} />
              <Row label={t("transfers.destinationBank")} value={selectedBank?.name} />
              <Row label={t("transfers.accountNumberLabel")} value={accountNumber} mono accent />
              {isCrossBorder && fxQuote && (
                <Row label={t("transfers.exchangeRate")} value={`1 NGN = ${fxQuote.midRate} XOF`} />
              )}
              <Row label={t("transfers.feeLabel")} value={formatMoney(fee, sourceCurrency)} mono />
              <div className="flex items-center justify-between p-3.5 bg-[var(--brand-soft)]">
                <span className="text-[var(--foreground)] font-bold">{t("transfers.totalDebit")}</span>
                <span className="text-[var(--brand-primary)] font-mono font-bold text-sm">{formatMoney(totalDebit, sourceCurrency)}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-1/2 py-3.5 rounded-2xl bg-[var(--surface)] hover:bg-[var(--surface-2)] border border-[var(--border)] text-[var(--foreground)] font-semibold text-xs transition-colors"
              >
                {t("common.back")}
              </button>
              <button
                type="button"
                onClick={() => setIsPinModalOpen(true)}
                className="w-1/2 py-3.5 rounded-2xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white font-bold text-xs transition-colors shadow-[var(--shadow-md)]"
              >
                {t("transfers.confirmTransfer")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: SUCCESS & RECEIPT */}
      {step === 3 && completedTx && (
        <div className="space-y-6 text-center animate-in zoom-in-95 duration-200">
          <div className="rounded-3xl bg-[var(--surface)] border border-[var(--brand-border)] p-8 space-y-5 shadow-[var(--shadow-card)]">
            <div className="w-16 h-16 rounded-full bg-[var(--success-soft)] border border-[var(--brand-soft)] text-[var(--success)] flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div className="space-y-1">
              <h2 className="text-2xl font-extrabold text-[var(--foreground)]">{t("transfers.transferSuccessTitle")}</h2>
              <p className="text-xs text-[var(--foreground-muted)] max-w-sm mx-auto">
                {t("transfers.transferSuccessDesc", {
                  amount: formatMoney(completedTx.amount, completedTx.currency),
                  recipient: completedTx.recipientName || recipientName,
                })}
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] font-mono text-xs text-[var(--brand-primary)] flex items-center justify-between">
              <span className="text-[var(--foreground-muted)]">{t("transfers.referenceLabel")}:</span>
              <span className="font-bold">{completedTx.reference}</span>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                onClick={() => openReceipt(completedTx)}
                className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white font-bold text-xs transition-colors shadow-[var(--shadow-md)]"
              >
                {t("transfers.viewReceipt")}
              </button>
              <button
                onClick={() => { setStep(1); setAmount(""); setRecipientName(""); setAccountNumber(""); setCompletedTx(null); }}
                className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-[var(--surface)] hover:bg-[var(--surface-2)] border border-[var(--border)] text-[var(--foreground)] font-semibold text-xs transition-colors"
              >
                {t("transfers.sendAnother")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PIN Modal */}
      <PinModal isOpen={isPinModalOpen} onClose={() => setIsPinModalOpen(false)} onSuccess={handleConfirmPin} />
    </div>
  );
}

function Row({ label, value, mono, accent }: { label: string; value?: string; mono?: boolean; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between p-3.5">
      <span className="text-[var(--foreground-muted)]">{label}</span>
      <span className={`${accent ? "text-[var(--brand-primary)] font-semibold" : "text-[var(--foreground)]"} ${mono ? "font-mono" : ""} font-semibold`}>
        {value || "—"}
      </span>
    </div>
  );
}
