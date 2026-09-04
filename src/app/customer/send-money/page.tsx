"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useCustomer } from "@/components/customer/CustomerContext";
import PinModal from "@/components/customer/ui/PinModal";
import { BANK_DIRECTORY, formatMoney, getFXRate } from "@/services/customerDataService";
import { CustomerCurrency, CustomerCountry, CustomerTransaction } from "@/types/customer";
import {
  ArrowLeft,
  Building2,
  Phone,
  User,
  ArrowRightLeft,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Copy,
  Share2,
  Check,
  Clock,
  Sparkles,
} from "lucide-react";

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

  // Step state: 1 = Details, 2 = Review, 3 = Completed
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [rail, setRail] = useState<"BANK_NG" | "BANK_NE" | "CROSS_BORDER" | "KORIE_USER">("BANK_NG");

  // Form Fields
  const [selectedBankCode, setSelectedBankCode] = useState("058"); // Default GTBank
  const [accountNumber, setAccountNumber] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [isVerifyingAccount, setIsVerifyingAccount] = useState(false);
  const [amount, setAmount] = useState<string>("");
  const [description, setDescription] = useState("");
  const [sourceCurrency, setSourceCurrency] = useState<CustomerCurrency>("NGN");
  const [saveAsBen, setSaveAsBen] = useState(true);

  // Security & Execution state
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [completedTx, setCompletedTx] = useState<CustomerTransaction | null>(null);

  // Filter banks by selected rail
  const availableBanks = BANK_DIRECTORY.filter((b) =>
    rail === "BANK_NE" || rail === "CROSS_BORDER" ? b.country === "NE" : b.country === "NG"
  );

  const selectedBank = availableBanks.find((b) => b.code === selectedBankCode) || availableBanks[0];

  // Live FX Rate for Cross-Border
  const fxQuote = getFXRate("NGN", "XOF");
  const parsedAmount = parseFloat(amount) || 0;
  const isCrossBorder = rail === "CROSS_BORDER";
  const fee = isCrossBorder ? 1250 : sourceCurrency === "NGN" ? 50 : 25;
  const totalDebit = parsedAmount + fee;
  const convertedDestinationAmount = isCrossBorder && fxQuote ? parsedAmount * fxQuote.midRate : 0;

  // Simulate instant bank name inquiry on 10 digits
  const handleAccountNumberChange = (val: string) => {
    const cleaned = val.replace(/\D/g, "").slice(0, 10);
    setAccountNumber(cleaned);

    if (cleaned.length === 10) {
      setIsVerifyingAccount(true);
      setTimeout(() => {
        setIsVerifyingAccount(false);
        if (cleaned === "0142981891") {
          setRecipientName("Aisha Mohammed");
        } else if (cleaned === "0123984123") {
          setRecipientName("Dawanau Agro Traders Ltd");
        } else {
          setRecipientName("Alhaji Musa Dan-Kano");
        }
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
      setCompletedTx(result.transaction);
      setStep(3);
    } else {
      setExecutionError(result.error || "Transfer failed. Please try again.");
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 pb-2 border-b border-white/10">
        <Link
          href="/customer"
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white">
            {t("transfers.sendMoneyTitle")}
          </h1>
          <p className="text-xs text-slate-400">
            {t("transfers.sendMoneySubtitle")}
          </p>
        </div>
      </div>

      {/* STEP 1: TRANSFER DETAILS */}
      {step === 1 && (
        <form onSubmit={handleProceedToReview} className="space-y-6">
          {/* Transfer Rail Selector */}
          <div className="space-y-2">
            <label className="text-xs font-mono uppercase text-slate-400 font-semibold">
              {t("transfers.transferType")}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setRail("BANK_NG");
                  setSourceCurrency("NGN");
                  setSelectedBankCode("058");
                }}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  rail === "BANK_NG"
                    ? "bg-emerald-500/15 border-emerald-500 text-white font-bold"
                    : "bg-white/[0.02] border-white/10 text-slate-400 hover:text-white"
                }`}
              >
                <div className="text-xs">🇳🇬 Nigerian Bank</div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">NIP Rail (₦50)</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setRail("CROSS_BORDER");
                  setSourceCurrency("NGN");
                  setSelectedBankCode("NE020");
                }}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  rail === "CROSS_BORDER"
                    ? "bg-emerald-500/15 border-emerald-500 text-white font-bold"
                    : "bg-white/[0.02] border-white/10 text-slate-400 hover:text-white"
                }`}
              >
                <div className="text-xs">🇳🇬 ⇄ 🇳🇪 Corridor</div>
                <div className="text-[10px] text-emerald-400 font-mono mt-0.5">Bilateral (Sub-sec)</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setRail("BANK_NE");
                  setSourceCurrency("XOF");
                  setSelectedBankCode("NE020");
                }}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  rail === "BANK_NE"
                    ? "bg-emerald-500/15 border-emerald-500 text-white font-bold"
                    : "bg-white/[0.02] border-white/10 text-slate-400 hover:text-white"
                }`}
              >
                <div className="text-xs">🇳🇪 Niger Bank</div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">WAEMU CFA Rail</div>
              </button>
            </div>
          </div>

          {/* Saved Beneficiaries Quick Picker */}
          {beneficiaries.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-semibold uppercase font-mono text-[11px]">
                  {t("nav.beneficiaries")}
                </span>
                <Link href="/customer/beneficiaries" className="text-emerald-400 hover:underline">
                  {t("common.viewAll")}
                </Link>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {beneficiaries.map((ben) => (
                  <button
                    key={ben.id}
                    type="button"
                    onClick={() => handleSelectBeneficiary(ben)}
                    className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-white/[0.03] hover:bg-white/10 border border-white/10 shrink-0 transition-colors text-left"
                  >
                    <div className={`w-7 h-7 rounded-xl ${ben.avatarColor} text-white font-bold text-xs flex items-center justify-center`}>
                      {ben.name[0]}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white leading-tight truncate max-w-[110px]">
                        {ben.name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">{ben.currency}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Bank Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              {t("transfers.selectBank")}
            </label>
            <select
              value={selectedBankCode}
              onChange={(e) => setSelectedBankCode(e.target.value)}
              className="w-full p-3.5 rounded-2xl bg-slate-900 border border-white/10 text-white text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              {availableBanks.map((bank) => (
                <option key={bank.code} value={bank.code}>
                  {bank.name} ({bank.currency})
                </option>
              ))}
            </select>
          </div>

          {/* Account Number Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              {t("transfers.accountNumber")}
            </label>
            <div className="relative">
              <input
                type="text"
                required
                maxLength={10}
                placeholder="e.g. 0123456789"
                value={accountNumber}
                onChange={(e) => handleAccountNumberChange(e.target.value)}
                className="w-full p-3.5 rounded-2xl bg-slate-900 border border-white/10 text-white font-mono text-sm placeholder:text-slate-600 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              {isVerifyingAccount && (
                <span className="absolute right-3.5 top-3.5 text-xs text-emerald-400 font-mono animate-pulse">
                  Verifying...
                </span>
              )}
            </div>

            {/* Account Name Banner */}
            {recipientName && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center justify-between animate-in fade-in">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-bold">{recipientName}</span>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 uppercase">
                  {selectedBank?.name}
                </span>
              </div>
            )}
          </div>

          {/* Amount Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <label className="font-semibold">{t("transfers.amountToTransfer")}</label>
              <span className="text-slate-400 font-mono">
                {t("common.available")}: {formatMoney(activeWallet.availableBalance, activeWallet.currency)}
              </span>
            </div>
            <div className="relative">
              <span className="absolute left-4 top-3.5 text-lg font-bold text-slate-400 font-mono">
                {sourceCurrency === "NGN" ? "₦" : "CFA "}
              </span>
              <input
                type="number"
                min="100"
                required
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-slate-900 border border-white/10 text-white font-mono text-xl font-bold placeholder:text-slate-600 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            {/* Bilateral Conversion Live Notice */}
            {isCrossBorder && fxQuote && parsedAmount > 0 && (
              <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 text-xs text-emerald-300 space-y-1">
                <div className="flex items-center justify-between font-bold">
                  <span>Recipient Receives:</span>
                  <span className="text-sm font-mono text-white">
                    CFA {convertedDestinationAmount.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  {t("transfers.rateNotice", { rate: fxQuote.midRate })}
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              {t("transfers.descriptionPlaceholder")}
            </label>
            <input
              type="text"
              placeholder="e.g. Grain shipment payment"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3.5 rounded-2xl bg-slate-900 border border-white/10 text-white text-xs placeholder:text-slate-600 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {executionError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{executionError}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={!recipientName || parsedAmount <= 0}
            className="w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-extrabold text-sm transition-all shadow-xl shadow-emerald-500/20"
          >
            {t("transfers.reviewTransfer")}
          </button>
        </form>
      )}

      {/* STEP 2: REVIEW & CONFIRM */}
      {step === 2 && (
        <div className="space-y-6 animate-in fade-in">
          <div className="rounded-3xl bg-[#0b1324] border border-white/10 p-6 space-y-5 shadow-2xl">
            <div className="text-center space-y-1 py-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                {t("transfers.reviewTransfer")}
              </span>
              <div className="text-3xl sm:text-4xl font-extrabold text-white font-mono">
                {formatMoney(parsedAmount, sourceCurrency)}
              </div>
              {isCrossBorder && (
                <div className="text-xs font-mono text-emerald-400 font-bold">
                  ≈ CFA {convertedDestinationAmount.toLocaleString()} in Niger
                </div>
              )}
            </div>

            {/* Transfer Breakdown */}
            <div className="rounded-2xl bg-slate-950/60 border border-white/5 divide-y divide-white/5 text-xs">
              <div className="flex items-center justify-between p-3.5">
                <span className="text-slate-400">Recipient</span>
                <span className="font-bold text-white">{recipientName}</span>
              </div>
              <div className="flex items-center justify-between p-3.5">
                <span className="text-slate-400">Destination Bank</span>
                <span className="text-slate-200">{selectedBank?.name}</span>
              </div>
              <div className="flex items-center justify-between p-3.5">
                <span className="text-slate-400">Account Number</span>
                <span className="font-mono text-emerald-400 font-semibold">{accountNumber}</span>
              </div>
              <div className="flex items-center justify-between p-3.5">
                <span className="text-slate-400">{t("transfers.transferFee")}</span>
                <span className="font-mono text-slate-200">{formatMoney(fee, sourceCurrency)}</span>
              </div>
              <div className="flex items-center justify-between p-3.5 bg-white/[0.02]">
                <span className="text-white font-bold">{t("transfers.totalDebit")}</span>
                <span className="text-emerald-400 font-mono font-bold text-sm">
                  {formatMoney(totalDebit, sourceCurrency)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-1/2 py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 font-semibold text-xs transition-colors"
              >
                {t("common.back")}
              </button>
              <button
                type="button"
                onClick={() => setIsPinModalOpen(true)}
                className="w-1/2 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors shadow-lg shadow-emerald-500/20"
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
          <div className="rounded-3xl bg-[#091122] border border-emerald-500/30 p-8 space-y-5 shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-1">
              <h2 className="text-2xl font-extrabold text-white">
                {t("transfers.transferSuccessTitle")}
              </h2>
              <p className="text-xs text-slate-300 max-w-sm mx-auto">
                {t("transfers.transferSuccessDesc", {
                  amount: formatMoney(completedTx.amount, completedTx.currency),
                  recipient: completedTx.recipientName || recipientName,
                })}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-white/5 font-mono text-xs text-emerald-400 flex items-center justify-between">
              <span className="text-slate-400">Reference:</span>
              <span className="font-bold">{completedTx.reference}</span>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                onClick={() => openReceipt(completedTx)}
                className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors shadow-lg shadow-emerald-500/20"
              >
                {t("transfers.viewReceipt")}
              </button>
              <button
                onClick={() => {
                  setStep(1);
                  setAmount("");
                  setRecipientName("");
                  setAccountNumber("");
                  setCompletedTx(null);
                }}
                className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-semibold text-xs transition-colors"
              >
                {t("transfers.sendAnother")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PIN Modal Authentication */}
      <PinModal
        isOpen={isPinModalOpen}
        onClose={() => setIsPinModalOpen(false)}
        onSuccess={handleConfirmPin}
      />
    </div>
  );
}
