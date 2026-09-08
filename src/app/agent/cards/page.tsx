"use client";

// =============================================================================
// ATM & cards — applications with a full lifecycle driven ONLY by explicit
// events (verify → at issuer → issued → delivered / cancel). The issue fee is
// collected at the till and journaled (agent commission payable + fee revenue).
// =============================================================================

import React, { useCallback, useEffect, useState } from "react";
import { getPortalBearer } from "@/lib/customerPortalClient";
import {
  AgentCardApplication,
  AgentCardApplicationStatus,
  AgentCardProduct,
} from "@/types/agentProducts";
import {
  AgentPageHeader,
  AgentPageSkeleton,
  AgentErrorState,
  AgentChip,
  AgentFreshnessBar,
  AgentModal,
} from "@/components/agent/ui/AgentUi";
import { CreditCard, Loader2, ShieldCheck, CheckCircle2, AlertTriangle } from "lucide-react";

function naira(n: number): string {
  return `₦${n.toLocaleString("en-NG")}`;
}

function fmtDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

const STATUS_LABEL: Record<AgentCardApplicationStatus, string> = {
  APPLICATION_RECEIVED: "Application received",
  KYC_VERIFIED: "KYC verified",
  AT_ISSUER: "At issuer",
  ISSUED: "Issued",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

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

interface Applicant {
  customerId: string;
  fullName: string;
  phone: string;
  kycTier: string;
  accounts: { accountNumber: string; accountName: string; productCode: string }[];
}

interface CardsState {
  products: AgentCardProduct[];
  applications: AgentCardApplication[];
  applicants: Applicant[];
}

const NEXT_ACTION: Partial<Record<AgentCardApplicationStatus, { action: string; label: string; tone: "emerald" | "sky" | "amber" }>> = {
  APPLICATION_RECEIVED: { action: "verify", label: "Verify KYC & docs", tone: "emerald" },
  KYC_VERIFIED: { action: "atIssuer", label: "Send to issuer", tone: "sky" },
  AT_ISSUER: { action: "issued", label: "Mark issued", tone: "amber" },
  ISSUED: { action: "delivered", label: "Mark delivered", tone: "emerald" },
};

export default function AgentCardsPage() {
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [state, setState] = useState<CardsState | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; message: string } | null>(null);
  const [refreshedAt, setRefreshedAt] = useState<string | null>(null);

  const [applyOpen, setApplyOpen] = useState(false);
  const [applicantPhone, setApplicantPhone] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [productId, setProductId] = useState("");

  const load = useCallback(async (silent = false) => {
    if (!silent) setPhase("loading");
    const res = await api<CardsState>("/api/agent/cards");
    if (!res.ok || !res.data) {
      setError(res.message || "Could not load the card desk.");
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
    return <AgentErrorState title="We could not load the card desk" message={error} onRetry={() => void load()} />;
  }
  if (!state) return null;

  const applicant = state.applicants.find((a) => a.phone === applicantPhone);
  const products = state.products;

  const submitApplication = async () => {
    setNotice(null);
    if (!applicant || !accountNumber || !productId) {
      setNotice({ ok: false, message: "Pick the customer, their opened account and a card product." });
      return;
    }
    setBusy("apply");
    const idempotencyKey = `agent-card-${Date.now()}`;
    const res = await api("/api/agent/cards", {
      method: "POST",
      body: JSON.stringify({
        cardProductId: productId,
        customerPhone: applicant.phone,
        accountNumber,
        idempotencyKey,
      }),
    });
    setBusy(null);
    if (res.ok) {
      const app = (res.data as { application?: AgentCardApplication })?.application;
      setNotice({
        ok: true,
        message: app
          ? `${app.applicationReference} received — issue fee journaled; next step is KYC verification.`
          : "Application received.",
      });
      setApplyOpen(false);
      setApplicantPhone("");
      setAccountNumber("");
      await load(true);
    } else {
      setNotice({ ok: false, message: res.message || "The application failed." });
    }
  };

  const transition = async (id: string, action: string, okLabel: string) => {
    setBusy(`${id}:${action}`);
    const res = await api(`/api/agent/cards/${id}`, { method: "PATCH", body: JSON.stringify({ action }) });
    setBusy(null);
    if (res.ok) {
      setNotice({ ok: true, message: okLabel });
      await load(true);
    } else {
      setNotice({ ok: false, message: res.message || "Transition failed." });
    }
  };

  const grouped = state.applications.filter((a) => a.status !== "CANCELLED");

  return (
    <div className="space-y-5 p-4 sm:p-6 lg:p-8">
      <AgentPageHeader
        title="ATM & Card Applications"
        subtitle="Card products, applications and lifecycle events. Every transition is a deliberate engine event — nothing auto-approves; fees are journaled at the till."
        actions={
          <button
            type="button"
            onClick={() => setApplyOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700"
          >
            <CreditCard className="h-4 w-4" aria-hidden="true" /> New application
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
      <section aria-label="Card products" className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {products.map((p) => (
          <div key={p.productId} className="flex flex-col rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-bold text-stone-900">{p.name}</p>
              <AgentChip label={p.minKycTier.replace("_", " ")} tone={p.minKycTier === "TIER_2" ? "amber" : "sky"} />
            </div>
            <p className="mt-1 text-xs text-stone-500">{p.description}</p>
            <p className="mt-2 text-[11px] text-stone-500">
              Issue fee <span className="font-bold text-stone-800">{naira(p.issueFeeNgn)}</span> cash at till · delivery{" "}
              {p.deliveryEstimateDays}
            </p>
          </div>
        ))}
      </section>

      {/* Applications */}
      <section aria-labelledby="apps-title" className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 id="apps-title" className="text-sm font-bold text-stone-900">
            Applications
          </h2>
          <p className="text-[11px] text-stone-400">{grouped.length} active</p>
        </div>
        {grouped.length === 0 ? (
          <div className="mt-4 rounded-xl bg-stone-50 p-6 text-center ring-1 ring-stone-100">
            <CreditCard className="mx-auto h-8 w-8 text-stone-300" aria-hidden="true" />
            <p className="mt-2 text-xs font-semibold text-stone-500">No card applications yet</p>
            <p className="text-[11px] text-stone-400">
              Onboard the customer, open their KoriePay account, then submit an application here.
            </p>
          </div>
        ) : (
          <ul className="mt-3 space-y-2">
            {grouped.map((a) => {
              const next = NEXT_ACTION[a.status];
              return (
                <li key={a.id} className="rounded-xl border border-stone-200 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-bold text-stone-800">
                        {a.customerName} · <span className="font-mono">{a.applicationReference}</span>
                      </p>
                      <p className="mt-0.5 text-[11px] text-stone-400">
                        Account {a.accountNumber} · {a.kycTier.replace("_", " ")} · fee {naira(a.issueFeeNgn)} ·{" "}
                        {fmtDate(a.createdAt)}
                      </p>
                      {a.maskedCardRef ? (
                        <p className="mt-0.5 font-mono text-[11px] font-bold text-emerald-700">{a.maskedCardRef}</p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <AgentChip label={STATUS_LABEL[a.status]} tone={a.status === "CANCELLED" ? "red" : "green"} />
                      {next ? (
                        <button
                          type="button"
                          disabled={busy !== null}
                          onClick={() =>
                            void transition(a.id, next.action, `${a.applicationReference} → ${next.label} — recorded.`)
                          }
                          className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                        >
                          {busy === `${a.id}:${next.action}` ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                          {next.label}
                        </button>
                      ) : null}
                      {a.status !== "CANCELLED" && a.status !== "DELIVERED" ? (
                        <button
                          type="button"
                          disabled={busy !== null}
                          onClick={() => void transition(a.id, "cancel", `${a.applicationReference} cancelled.`)}
                          className="rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-stone-500 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      ) : null}
                    </div>
                  </div>
                  {a.statusHistory.length > 1 ? (
                    <p className="mt-2 text-[10px] text-stone-400">
                      {a.statusHistory.map((h) => `${STATUS_LABEL[h.status]} ${h.at.slice(0, 16).replace("T", " ")}`).join(" · ")}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Apply modal */}
      <AgentModal open={applyOpen} onClose={() => setApplyOpen(false)} labelledBy="apply-card-title" wide>
        <div>
          <h3 id="apply-card-title" className="text-base font-bold text-stone-900">
            New card application
          </h3>
          <p className="mt-1 text-xs text-stone-500">
            The customer must be onboarded and hold an opened KoriePay NGN account. The issue fee is collected at the till on submission.
          </p>
          <div className="mt-4 space-y-3">
            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-wide text-stone-500">Customer</span>
              <select
                value={applicantPhone}
                onChange={(e) => {
                  setApplicantPhone(e.target.value);
                  setAccountNumber("");
                }}
                className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-xs outline-none focus:border-emerald-400"
              >
                <option value="">Choose an onboarded customer…</option>
                {state.applicants.map((c) => (
                  <option key={c.customerId} value={c.phone}>
                    {c.fullName} · {c.phone} · {c.kycTier.replace("_", " ")}
                    {c.accounts.length === 0 ? " · no account" : ""}
                  </option>
                ))}
              </select>
            </label>
            {applicant ? (
              <label className="block">
                <span className="text-[11px] font-bold uppercase tracking-wide text-stone-500">Opened KoriePay NGN account</span>
                <select
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-xs outline-none focus:border-emerald-400"
                >
                  <option value="">Choose an account…</option>
                  {applicant.accounts.map((acc) => (
                    <option key={acc.accountNumber} value={acc.accountNumber}>
                      {acc.accountNumber} · {acc.accountName}
                    </option>
                  ))}
                </select>
                {applicant.accounts.length === 0 ? (
                  <p className="mt-1 text-[11px] text-rose-600">No open account — open one from the Accounts page first.</p>
                ) : null}
              </label>
            ) : null}
            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-wide text-stone-500">Card product</span>
              <select
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-xs outline-none focus:border-emerald-400"
              >
                <option value="">Choose a product…</option>
                {products.map((p) => (
                  <option key={p.productId} value={p.productId}>
                    {p.name} · {naira(p.issueFeeNgn)} · {p.minKycTier.replace("_", " ")}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-start gap-2 rounded-lg bg-stone-50 px-3 py-2 text-[10px] text-stone-500 ring-1 ring-stone-100">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden="true" />
              Application lifecycle is event-driven only — no fake auto-issuance. Card references stay masked on this console.
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setApplyOpen(false)}
                className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-xs font-bold text-stone-600 hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void submitApplication()}
                disabled={busy === "apply" || !applicant || !accountNumber || !productId}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {busy === "apply" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CreditCard className="h-3.5 w-3.5" />}
                Submit & collect fee
              </button>
            </div>
          </div>
        </div>
      </AgentModal>
    </div>
  );
}
