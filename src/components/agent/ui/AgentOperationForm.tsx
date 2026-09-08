"use client";

// =============================================================================
// Shared operation form (cash-in / cash-out / NIP transfer). Idempotent,
// engine-backed via the portal context; live fee/commission preview from the
// FeeAndCommission engine rule surfaced through the executed result.
// =============================================================================

import React, { useState } from "react";
import { useAgentPortal } from "../AgentContext";
import { AgentPageHeader, AgentChip, statusTone } from "./AgentUi";
import { formatMoney } from "@/lib/money";
import { getPortalBearer } from "@/lib/customerPortalClient";
import { ArrowLeft, CheckCircle2, AlertTriangle, Loader2, Landmark } from "lucide-react";

interface KorrieAccountOption {
  accountNumber: string;
  accountName: string;
  holderName: string;
  holderPhone: string;
}

async function fetchKorrieAccounts(): Promise<KorrieAccountOption[]> {
  try {
    const res = await fetch("/api/agent/accounts", {
      headers: { Authorization: getPortalBearer(), Accept: "application/json" },
    });
    const payload = await res.json().catch(() => null);
    const rows = (payload as any)?.data?.rows || [];
    const out: KorrieAccountOption[] = [];
    for (const row of rows) {
      for (const a of row.accounts || []) {
        out.push({
          accountNumber: a.accountNumber,
          accountName: a.accountName,
          holderName: row.customer?.fullName || a.accountName,
          holderPhone: row.customer?.phone || "",
        });
      }
    }
    return out;
  } catch {
    return [];
  }
}

const BANKS = [
  "Providus Bank",
  "Zenith Bank",
  "Guaranty Trust Bank (GTBank)",
  "First Bank of Nigeria",
  "Access Bank",
  "UBA",
  "Kuda Microfinance Bank",
  "OPay Digital Services",
];

export function AgentOperationForm({
  kind,
  title,
  subtitle,
  icon,
  accent,
  confirmLabel,
  requiresCashInHand,
  quickAmounts,
}: {
  kind: "CASH_IN" | "CASH_OUT" | "TRANSFER_NIP";
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  accent: string;
  confirmLabel: string;
  requiresCashInHand?: boolean;
  quickAmounts?: number[];
}) {
  const { executeOperation, phase, errorMessage, refresh, summary, isBalanceHidden } = useAgentPortal();
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAccount, setCustomerAccount] = useState("");
  const [customerBank, setCustomerBank] = useState(BANKS[0]);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; message: string } | null>(null);
  const [accountMode, setAccountMode] = useState(false);
  const [korrieAccounts, setKorrieAccounts] = useState<KorrieAccountOption[] | null>(null);

  const float = summary?.float.availableFloat ?? 0;
  const tillCash = summary?.till.availablePhysicalCash ?? 0;

  if (phase === "loading") {
    return <p role="status" className="p-6 text-sm text-stone-500">Loading…</p>;
  }
  if (phase === "error") {
    return (
      <p role="alert" className="p-6 text-sm text-rose-600">
        {errorMessage}{" "}
        <button type="button" onClick={() => void refresh()} className="font-bold underline">
          Retry
        </button>
      </p>
    );
  }

  const amountNum = Number(amount);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setNotice({ ok: false, message: "Enter a valid amount in naira." });
      return;
    }
    setBusy(true);
    setNotice(null);
    const res = await executeOperation({
      kind,
      amount: Math.round(amountNum),
      customerName: customerName || undefined,
      customerPhone: customerPhone || undefined,
      customerAccount: customerAccount || undefined,
      customerBank: customerBank || undefined,
      accountMode: accountMode || undefined,
    });
    setBusy(false);
    if (res.success) {
      setCustomerName("");
      setCustomerPhone("");
      setCustomerAccount("");
      setAmount("");
      setAccountMode(false);
      setNotice({
        ok: true,
        message: accountMode
          ? `${confirmLabel} successful — value moved on the customer's KoriePay account rail (ledger journal + wallet subledger).`
          : `${confirmLabel} successful — receipt recorded with a real ledger journal.`,
      });
    } else {
      setNotice({ ok: false, message: res.message || "Operation failed." });
    }
  };

  const canSubmit =
    customerName.trim().length > 0 &&
    amountNum > 0 &&
    (!accountMode ? kind === "CASH_IN" || kind === "TRANSFER_NIP" ? customerAccount.trim().length >= 10 : true : Boolean(customerAccount));

  const toggleAccountMode = async () => {
    const next = !accountMode;
    setAccountMode(next);
    if (next && korrieAccounts === null) {
      setKorrieAccounts(await fetchKorrieAccounts());
    }
  };

  const pickAccount = (accountNumber: string) => {
    const found = (korrieAccounts || []).find((a) => a.accountNumber === accountNumber);
    setCustomerAccount(accountNumber);
    setCustomerBank("Providus Bank");
    if (found) {
      setCustomerName(found.holderName);
      setCustomerPhone(found.holderPhone);
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <AgentPageHeader title={title} subtitle={subtitle} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <form onSubmit={(e) => void submit(e)} className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm lg:col-span-2">
          {notice ? (
            <div
              role="status"
              aria-live="polite"
              className={`flex items-start gap-2 rounded-xl px-3 py-2.5 text-xs ring-1 ${
                notice.ok ? "bg-emerald-50 text-emerald-800 ring-emerald-200" : "bg-rose-50 text-rose-700 ring-rose-200"
              }`}
            >
              {notice.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
              <span>{notice.message}</span>
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block text-xs">
              <span className="font-semibold text-stone-700">Customer name</span>
              <input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Aisha Mohammed"
                className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-300 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </label>
            <label className="block text-xs">
              <span className="font-semibold text-stone-700">Customer phone (optional)</span>
              <input
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="+234 803 123 4567"
                inputMode="tel"
                className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-300 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </label>
          </div>

          {kind === "CASH_IN" || kind === "TRANSFER_NIP" ? (
            <div className="space-y-3">
              {kind !== "TRANSFER_NIP" ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-stone-400">Rail</span>
                  <button
                    type="button"
                    onClick={() => {
                      setAccountMode(false);
                      setCustomerAccount("");
                    }}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                      !accountMode ? "bg-emerald-600 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                    }`}
                  >
                    Bank account (NIP)
                  </button>
                  <button
                    type="button"
                    onClick={() => void toggleAccountMode()}
                    className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                      accountMode ? "bg-emerald-600 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                    }`}
                  >
                    <Landmark className="h-3 w-3" aria-hidden="true" />
                    KoriePay account (account rail)
                  </button>
                </div>
              ) : null}

              {accountMode ? (
                <label className="block text-xs">
                  <span className="font-semibold text-stone-700">Opened KoriePay account</span>
                  <select
                    value={customerAccount}
                    onChange={(e) => pickAccount(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 font-mono text-sm text-stone-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Choose an account opened at this terminal…</option>
                    {(korrieAccounts || []).map((a) => (
                      <option key={a.accountNumber} value={a.accountNumber}>
                        {a.accountNumber} · {a.holderName}
                      </option>
                    ))}
                  </select>
                  {korrieAccounts !== null && korrieAccounts.length === 0 ? (
                    <p className="mt-1 text-[11px] text-stone-500">
                      No opened accounts yet — onboard the customer and open the account from the Products &gt; Open Accounts page first.
                    </p>
                  ) : null}
                </label>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="block text-xs">
                    <span className="font-semibold text-stone-700">Destination account number</span>
                    <input
                      value={customerAccount}
                      onChange={(e) => setCustomerAccount(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      placeholder="10-digit NUBAN"
                      inputMode="numeric"
                      className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2.5 font-mono text-sm text-stone-900 placeholder:text-stone-300 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </label>
                  <label className="block text-xs">
                    <span className="font-semibold text-stone-700">Destination bank</span>
                    <select
                      value={customerBank}
                      onChange={(e) => setCustomerBank(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      {BANKS.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              )}
            </div>
          ) : null}

          {kind === "CASH_OUT" ? (
            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-xs font-semibold text-stone-700">
              <span className="flex items-center gap-2">
                <Landmark className="h-4 w-4 text-stone-400" aria-hidden="true" />
                Withdraw from the customer's opened KoriePay account (account rail)
              </span>
              <input
                type="checkbox"
                checked={accountMode}
                onChange={(e) => {
                  if (e.target.checked) void toggleAccountMode();
                  else {
                    setAccountMode(false);
                    setCustomerAccount("");
                  }
                }}
                className="h-4 w-4 accent-emerald-600"
              />
            </label>
          ) : null}

          {accountMode && kind === "CASH_OUT" ? (
            <label className="block text-xs">
              <span className="font-semibold text-stone-700">Customer KoriePay account to debit</span>
              <select
                value={customerAccount}
                onChange={(e) => pickAccount(e.target.value)}
                className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 font-mono text-sm text-stone-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Choose an account opened at this terminal…</option>
                {(korrieAccounts || []).map((a) => (
                  <option key={a.accountNumber} value={a.accountNumber}>
                    {a.accountNumber} · {a.holderName}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <div>
            <label className="block text-xs">
              <span className="font-semibold text-stone-700">Amount (₦)</span>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
                placeholder="0"
                inputMode="numeric"
                className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-3 text-xl font-bold text-stone-900 placeholder:text-stone-200 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </label>
            {quickAmounts ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {quickAmounts.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setAmount(String(q))}
                    className="rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs font-semibold text-stone-600 transition hover:border-emerald-300 hover:text-emerald-700"
                  >
                    {formatMoney(q, "NGN")}
                  </button>
                ))}
              </div>
            ) : null}
            <div className="mt-2 space-y-1 text-[11px] text-stone-500">
              {kind !== "CASH_OUT" ? (
                <p>
                  Digital float available:{" "}
                  <span className={float >= amountNum ? "font-bold text-emerald-700" : "font-bold text-rose-600"}>
                    {isBalanceHidden ? "••••" : formatMoney(float, "NGN")}
                  </span>
                </p>
              ) : null}
              {requiresCashInHand ? (
                <p>
                  Cash in till:{" "}
                  <span className={tillCash >= amountNum ? "font-bold text-emerald-700" : "font-bold text-rose-600"}>
                    {isBalanceHidden ? "••••" : formatMoney(tillCash, "NGN")}
                  </span>
                </p>
              ) : null}
              <p>
                Single-operation engine limit:{" "}
                <span className="font-semibold text-stone-700">{formatMoney(200_000, "NGN")}</span>
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={busy || !canSubmit}
            className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${accent}`}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
            {busy ? "Processing on the ledger…" : confirmLabel}
          </button>
          <p className="text-center text-[10px] text-stone-400">
            Executed as a double-entry journal (float ↔ settlement pool) with an idempotency key · fee split per the agency commission engine.
          </p>
        </form>

        {/* Live posture card */}
        <aside aria-label="Availability" className="space-y-3">
          <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">Availability</p>
            <div className="mt-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-stone-600">Digital float</span>
                <AgentChip
                  label={float > 0 ? `${formatMoney(float, "NGN")}` : "Empty"}
                  tone={float > 500_000 ? "green" : float > 0 ? "amber" : "red"}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-stone-600">Cash in till</span>
                <AgentChip
                  label={tillCash > 0 ? formatMoney(tillCash, "NGN") : "Empty"}
                  tone={tillCash > 0 ? "green" : "red"}
                />
              </div>
              <div className="flex items-center justify-between border-t border-stone-100 pt-2">
                <span className="text-xs text-stone-600">Single-op limit</span>
                <AgentChip label={formatMoney(200_000, "NGN")} tone="neutral" />
              </div>
            </div>
            <p className="mt-3 text-[10px] leading-relaxed text-stone-400">
              When float or till cannot cover a request the operation is rejected honestly with the shortfall shown — nothing is
              silently faked.
            </p>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">Fee split (engine rule)</p>
            <p className="mt-2 text-xs text-stone-600">
              Agency banking fee is split 60/40: 60% agent commission, 40% platform — per{" "}
              <span className="font-mono text-[10px]">RULE_AGENCY_COMMISSION_60_40_SPLIT</span>. Customer fee is ₦100 flat, or 1%
              above ₦10,000.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
