"use client";

// =============================================================================
// Open Accounts — product truth from AccountServiceEngine (factory-filtered
// openable products); opening calls AccountLifecycleEngine so every account is
// a real KoriePay NGN account with number + wallet subledger. The opened
// account is then usable as the account rail for cash-in/out, card fees and
// the card rail (ledger of record).
// =============================================================================

import React, { useCallback, useEffect, useState } from "react";
import { getPortalBearer } from "@/lib/customerPortalClient";
import {
  AgentPageHeader,
  AgentPageSkeleton,
  AgentErrorState,
  AgentChip,
  AgentFreshnessBar,
  AgentModal,
} from "@/components/agent/ui/AgentUi";
import { useAgentPortal } from "@/components/agent/AgentContext";
import { Wallet, UserPlus, Loader2, ShieldCheck, CheckCircle2, AlertTriangle, Landmark } from "lucide-react";

function naira(n: number): string {
  return `₦${n.toLocaleString("en-NG")}`;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso.slice(0, 10) : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

async function api<T>(path: string, init?: RequestInit): Promise<{ ok: boolean; data?: T; message?: string }> {
  try {
    const res = await fetch(path, {
      ...init,
      headers: { Authorization: getPortalBearer(), "Content-Type": "application/json", ...(init?.headers || {}) },
    });
    const payload = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, message: (payload as any)?.error?.message || `Request failed (${res.status})` };
    return { ok: true, data: (payload as any)?.data as T };
  } catch (err: any) {
    return { ok: false, message: err?.message || "Network error" };
  }
}

interface AccountProduct {
  productCode: string;
  name: string;
  description: string;
  minKycTier: string;
  singleTransactionLimit: number;
  dailyTransactionLimit: number;
  maxBalanceCap: number;
}

interface OpenedAccount {
  accountNumber: string;
  accountName: string;
  productCode: string;
  currency: string;
  assignedBankName: string;
  openedAt: string;
  /** Live wallet available balance (whole ₦) — projected by the BFF. */
  availableBalance?: number;
}

interface CustomerRow {
  customer: {
    customerId: string;
    customerCode: string;
    fullName: string;
    phone: string;
    kycTier: string;
    registeredAt: string;
  };
  accounts: OpenedAccount[];
}

interface AccountsState {
  products: AccountProduct[];
  rows: CustomerRow[];
}

export default function AgentAccountsPage() {
  const { isBalanceHidden } = useAgentPortal();
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [state, setState] = useState<AccountsState | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; message: string } | null>(null);
  const [refreshedAt, setRefreshedAt] = useState<string | null>(null);

  const [openModal, setOpenModal] = useState(false);
  const [modalMode, setModalMode] = useState<"existing" | "new">("existing");
  const [customerPhone, setCustomerPhone] = useState("");
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [productCode, setProductCode] = useState("");

  const openModalAs = (mode: "existing" | "new") => {
    setModalMode(mode);
    setCustomerPhone("");
    setNewName("");
    setNewPhone("");
    setNewEmail("");
    setProductCode("");
    setNotice(null);
    setOpenModal(true);
  };

  const load = useCallback(async (silent = false) => {
    if (!silent) setPhase("loading");
    const res = await api<AccountsState>("/api/agent/accounts");
    if (!res.ok || !res.data) {
      setError(res.message || "Could not load the accounts desk.");
      setPhase("error");
      return;
    }
    setState(res.data);
    setRefreshedAt(new Date().toISOString());
    setPhase("ready");
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (phase === "loading" && !state) return <AgentPageSkeleton rows={3} />;
  if (phase === "error" && !state) {
    return <AgentErrorState title="We could not load the accounts desk" message={error} onRetry={() => void load()} />;
  }
  if (!state) return null;

  const chosenCustomer = state.rows.find((r) => r.customer.phone === customerPhone)?.customer ?? null;
  const chosenHoldsProduct =
    customerPhone && productCode
      ? (state.rows.find((r) => r.customer.phone === customerPhone)?.accounts ?? []).some((a) => a.productCode === productCode)
      : false;
  const product = state.products.find((p) => p.productCode === productCode);

  const openAccount = async () => {
    setNotice(null);
    const isNew = modalMode === "new";
    if (!product) {
      setNotice({ ok: false, message: "Choose the account product." });
      return;
    }
    if (isNew) {
      const name = newName.trim();
      const phone = newPhone.replace(/\s/g, "");
      if (name.length < 3 || !/^\+?\d{10,15}$/.test(phone)) {
        setNotice({ ok: false, message: "Enter the walk-in customer's full name and a valid phone number." });
        return;
      }
    } else if (!chosenCustomer) {
      setNotice({ ok: false, message: "Choose the onboarded customer and the account product." });
      return;
    } else if (chosenHoldsProduct) {
      setNotice({ ok: false, message: `${chosenCustomer.fullName} already holds ${product.name} — one account per customer per product.` });
      return;
    }
    setBusy(true);
    const idempotencyKey = `agent-open-${Date.now()}`;
    const res = await api("/api/agent/accounts", {
      method: "POST",
      body: JSON.stringify(
        isNew
          ? {
              customerPhone: newPhone.replace(/\s/g, ""),
              productCode: product.productCode,
              idempotencyKey,
              fullName: newName.trim(),
              email: newEmail.trim() || undefined,
            }
          : {
              customerPhone: chosenCustomer!.phone,
              productCode: product.productCode,
              idempotencyKey,
            },
      ),
    });
    setBusy(false);
    if (res.ok) {
      const data = res.data as { account?: OpenedAccount; onboarded?: boolean; customer?: { fullName?: string } };
      const acct = data.account;
      setNotice({
        ok: true,
        message: acct
          ? data.onboarded
            ? `${(data.customer?.fullName || "New customer")} onboarded & account opened — ${acct.accountNumber} (${acct.assignedBankName}). One tap, one journal.`
            : `${acct.accountName} opened — ${acct.accountNumber} (${acct.assignedBankName}). Account rail is live on the ledger.`
          : "Account opened.",
      });
      setOpenModal(false);
      setCustomerPhone("");
      setNewName("");
      setNewPhone("");
      setNewEmail("");
      setProductCode("");
      await load(true);
    } else {
      setNotice({ ok: false, message: res.message || "The account could not be opened." });
    }
  };

  const totalOpened = state.rows.reduce((acc, r) => acc + r.accounts.length, 0);

  return (
    <div className="space-y-5 p-4 sm:p-6 lg:p-8">
      <AgentPageHeader
        title="Open Accounts (KoriePay)"
        subtitle="Open real KoriePay NGN accounts — for customers already at this terminal or a walk-in in one tap (onboard + open). These accounts are the account rail: deposits, withdrawals, card rails and fees settle on them."
        actions={
          <button
            type="button"
            onClick={() => openModalAs(state.rows.length === 0 ? "new" : "existing")}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700"
          >
            <Wallet className="h-4 w-4" aria-hidden="true" /> Open account
          </button>
        }
      />

      <AgentFreshnessBar refreshedAt={refreshedAt} refreshing={false} onRefresh={() => void load(true)} />

      {notice ? (
        <div
          role="status"
          aria-live="polite"
          className={`flex items-start gap-2 rounded-xl px-4 py-3 text-xs font-semibold ${
            notice.ok ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200" : "bg-rose-50 text-rose-700 ring-1 ring-rose-200"
          }`}
        >
          {notice.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
          <span>{notice.message}</span>
        </div>
      ) : null}

      {/* Products */}
      <section aria-label="Account products" className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {state.products.map((p) => (
          <div key={p.productCode} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-bold text-stone-900">{p.name}</p>
              <AgentChip label={p.minKycTier.replace("_", " ")} tone={p.minKycTier === "TIER_2" ? "amber" : "sky"} />
            </div>
            <p className="mt-1 text-xs text-stone-500">{p.description}</p>
            <p className="mt-2 text-[11px] text-stone-500">
              Requires KYC <span className="font-bold text-stone-800">{p.minKycTier.replace("_", " ")}</span> · single-op{" "}
              {naira(p.singleTransactionLimit)} · daily {naira(p.dailyTransactionLimit)} · balance cap {naira(p.maxBalanceCap)}
            </p>
          </div>
        ))}
      </section>

      {/* Opened accounts */}
      <section aria-labelledby="opened-title" className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 id="opened-title" className="text-sm font-bold text-stone-900">
            Opened at this terminal
          </h2>
          <p className="text-[11px] text-stone-400">
            {totalOpened} live account{totalOpened === 1 ? "" : "s"} · ledger of record
          </p>
        </div>
        {state.rows.every((r) => r.accounts.length === 0) ? (
          <div className="mt-4 rounded-xl bg-stone-50 p-6 text-center ring-1 ring-stone-100">
            <Wallet className="mx-auto h-8 w-8 text-stone-300" aria-hidden="true" />
            <p className="mt-2 text-xs font-semibold text-stone-500">No accounts opened yet</p>
            <p className="text-[11px] text-stone-400">
              {state.rows.length === 0
                ? "This terminal has no onboarded customers yet — use the one-tap flow to onboard a walk-in and open their account in a single step."
                : "Onboard the customer (Customers) or use the one-tap flow for a new walk-in, then open their KoriePay account."}
            </p>
            <button
              type="button"
              onClick={() => openModalAs(state.rows.length === 0 ? "new" : "existing")}
              className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700"
            >
              <UserPlus className="h-3.5 w-3.5" aria-hidden="true" /> Onboard &amp; open — one tap
            </button>
          </div>
        ) : (
          <ul className="mt-3 space-y-2">
            {state.rows
              .flatMap((row) => row.accounts.map((a) => ({ customer: row.customer, a })))
              .map(({ customer, a }) => (
                <li
                  key={`${customer.customerId}:${a.accountNumber}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-stone-200 bg-stone-50/40 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-xs font-bold text-stone-800">
                      <Landmark className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden="true" />
                      <span className="font-mono">{a.accountNumber}</span>
                      <span className="font-normal text-stone-500">
                        · {a.accountName} · {a.assignedBankName}
                      </span>
                    </p>
                    <p className="mt-0.5 text-[11px] text-stone-400">
                      {customer.fullName} · {customer.kycTier.replace("_", " ")} · opened {fmtDate(a.openedAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">Available</p>
                      <p className="font-mono text-sm font-bold text-stone-900">
                        {isBalanceHidden ? "••••••" : naira(a.availableBalance ?? 0)}
                      </p>
                    </div>
                    <AgentChip label="ACTIVE · live rail" tone="green" />
                  </div>
                </li>
              ))}
          </ul>
        )}
      </section>

      {/* Open modal */}
      <AgentModal open={openModal} onClose={() => setOpenModal(false)} labelledBy="open-account-title">
        <div>
          <h3 id="open-account-title" className="text-base font-bold text-stone-900">
            Open a KoriePay account
          </h3>
          <p className="mt-1 text-xs text-stone-500">
            Serve a customer already onboarded at this terminal, or onboard a new walk-in and open their
            account in one step. One account per customer per product (account policy).
          </p>
          <div className="mt-4 space-y-3">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Customer type">
              <button
                type="button"
                onClick={() => setModalMode("existing")}
                aria-pressed={modalMode === "existing"}
                className={`rounded-lg px-3 py-1.5 text-[11px] font-bold transition ${
                  modalMode === "existing" ? "bg-emerald-600 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                }`}
              >
                Already onboarded
              </button>
              <button
                type="button"
                onClick={() => setModalMode("new")}
                aria-pressed={modalMode === "new"}
                className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-[11px] font-bold transition ${
                  modalMode === "new" ? "bg-emerald-600 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                }`}
              >
                <UserPlus className="h-3 w-3" aria-hidden="true" />
                New walk-in (onboard &amp; open)
              </button>
            </div>

            {modalMode === "existing" ? (
              <label className="block">
                <span className="text-[11px] font-bold uppercase tracking-wide text-stone-500">Onboarded customer</span>
                <select
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-xs outline-none focus:border-emerald-400"
                >
                  <option value="">Choose a customer…</option>
                  {state.rows.map((r) => (
                    <option key={r.customer.customerId} value={r.customer.phone}>
                      {r.customer.fullName} · {r.customer.phone} · {r.customer.kycTier.replace("_", " ")}
                      {r.accounts.length > 0 ? " · has account" : ""}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <div className="space-y-3">
                <label className="block">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-stone-500">Full name</span>
                  <input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Ngozi Eze"
                    className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-xs outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  />
                </label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-[11px] font-bold uppercase tracking-wide text-stone-500">Phone</span>
                    <input
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      placeholder="+234 801 234 5678"
                      inputMode="tel"
                      className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-xs outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[11px] font-bold uppercase tracking-wide text-stone-500">Email (optional)</span>
                    <input
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="name@example.com"
                      inputMode="email"
                      className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-xs outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                    />
                  </label>
                </div>
                <p className="rounded-lg bg-teal-50 px-3 py-2 text-[10px] leading-relaxed text-teal-800 ring-1 ring-teal-100">
                  One engine intent: customer master + terminal registry + wallet account with number and subledger.
                  A single idempotency key covers the whole flow — no duplicate onboarding or double journals.
                </p>
              </div>
            )}

            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-wide text-stone-500">Account product</span>
              <select
                value={productCode}
                onChange={(e) => setProductCode(e.target.value)}
                className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-xs outline-none focus:border-emerald-400"
              >
                <option value="">Choose a product…</option>
                {state.products.map((p) => (
                  <option key={p.productCode} value={p.productCode}>
                    {p.name} · {p.minKycTier.replace("_", " ")} · {p.productCode}
                  </option>
                ))}
              </select>
            </label>
            {modalMode === "existing" && chosenHoldsProduct ? (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-800 ring-1 ring-amber-200">
                This customer already holds {product?.name} — the engine will reject a duplicate.
              </p>
            ) : null}
            {modalMode === "existing" && chosenCustomer && product && !chosenHoldsProduct ? (
              <p className="rounded-lg bg-stone-50 px-3 py-2 text-[11px] text-stone-600 ring-1 ring-stone-100">
                Eligibility: customer is {chosenCustomer.kycTier.replace("_", " ")} · product floor {product.minKycTier.replace("_", " ")} —
                the engine checks this again before opening.
              </p>
            ) : null}
            {modalMode === "new" && product ? (
              <p className="rounded-lg bg-stone-50 px-3 py-2 text-[11px] text-stone-600 ring-1 ring-stone-100">
                Walk-ins onboard at {product.minKycTier.replace("_", " ")} — the floor for {product.name}. After opening, fund the
                account with a deposit on the account rail (cash-in with this number).
              </p>
            ) : null}
            <div className="flex items-start gap-2 rounded-lg bg-stone-50 px-3 py-2 text-[10px] text-stone-500 ring-1 ring-stone-100">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden="true" />
              Account numbers are minted by the account lifecycle engine; the wallet subledger is provisioned with each account.
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setOpenModal(false)}
                className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-xs font-bold text-stone-600 hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void openAccount()}
                disabled={
                  busy ||
                  !product ||
                  (modalMode === "existing" ? !chosenCustomer || chosenHoldsProduct : newName.trim().length < 3 || !/^\+?\d{10,15}$/.test(newPhone.replace(/\s/g, "")))
                }
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : modalMode === "new" ? <UserPlus className="h-3.5 w-3.5" /> : <Wallet className="h-3.5 w-3.5" />}
                {busy ? "Opening…" : modalMode === "new" ? "Onboard & open account" : "Open account"}
              </button>
            </div>
          </div>
        </div>
      </AgentModal>
    </div>
  );
}
