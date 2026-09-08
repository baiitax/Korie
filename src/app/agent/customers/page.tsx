"use client";

// =============================================================================
// Customers — served walk-ins (engine operation history), bookmarked
// frequent customers and real onboarded customers (CustomerLifecycleEngine).
// The old page's "Onboard" button was an alert(); now it registers a customer
// in the master registry through the BFF.
// =============================================================================

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useAgentPortal } from "@/components/agent/AgentContext";
import {
  AgentPageHeader,
  AgentPageSkeleton,
  AgentErrorState,
  AgentChip,
  AgentFreshnessBar,
  AgentModal,
} from "@/components/agent/ui/AgentUi";
import { Search, UserPlus, Star, Check, X, AlertTriangle, CheckCircle2, Users } from "lucide-react";
import { formatMoney } from "@/lib/money";

export default function AgentCustomersPage() {
  const { phase, errorMessage, summary, refresh, refreshedAt, onboardCustomer, toggleBookmark, isBalanceHidden } =
    useAgentPortal();
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ fullName: "", phone: "", email: "" });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; message: string } | null>(null);

  const customers = summary?.customers || [];

  const filtered = useMemo(
    () =>
      customers.filter((c) => {
        const hay = `${c.fullName} ${c.phone}`.toLowerCase();
        return hay.includes(search.toLowerCase());
      }),
    [customers, search],
  );

  if (phase === "loading") return <AgentPageSkeleton rows={4} />;
  if (phase === "error" || !summary) {
    return <AgentErrorState title="We could not load your customers" message={errorMessage} onRetry={() => void refresh()} />;
  }

  const openModal = () => {
    setForm({ fullName: "", phone: "", email: "" });
    setNotice(null);
    setModalOpen(true);
  };

  const submitOnboard = async () => {
    setBusy(true);
    setNotice(null);
    const res = await onboardCustomer(form);
    setBusy(false);
    if (res.success) {
      setNotice({ ok: true, message: `Registered ${form.fullName} in the customer master registry.` });
      setModalOpen(false);
    } else {
      setNotice({ ok: false, message: res.message || "Onboarding failed." });
    }
  };

  const handleBookmark = async (customerId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await toggleBookmark(customerId);
    await refresh({ silent: true });
  };

  return (
    <div className="space-y-5 p-4 sm:p-6 lg:p-8">
      <AgentPageHeader
        title="Customers"
        subtitle="Frequent customers you serve, and walk-ins you have onboarded into the master registry."
        actions={
          <button
            type="button"
            onClick={openModal}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
          >
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            Onboard customer
          </button>
        }
      />

      <AgentFreshnessBar refreshedAt={refreshedAt} refreshing={false} onRefresh={() => void refresh({ silent: true })} />

      {notice && !notice.ok ? (
        <p role="alert" className="flex items-start gap-2 rounded-xl bg-rose-50 px-4 py-3 text-xs text-rose-700 ring-1 ring-rose-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {notice.message}
        </p>
      ) : null}

      <label className="relative block">
        <span className="sr-only">Search customers</span>
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or phone…"
          className="w-full rounded-xl border border-stone-300 bg-white py-2.5 pl-9 pr-3 text-sm text-stone-900 placeholder:text-stone-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </label>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-10 text-center">
          <Users aria-hidden="true" className="mx-auto h-8 w-8 text-stone-300" />
          <p className="mt-3 text-sm font-semibold text-stone-700">
            {customers.length === 0 ? "No customers yet" : "No customers match your search"}
          </p>
          <p className="mt-1 text-xs text-stone-500">
            {customers.length === 0
              ? "Customers you serve in cash operations and walk-ins you onboard will appear here automatically."
              : "Try a different name or phone number."}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((c) => (
            <li
              key={c.id}
              className="flex flex-wrap items-center gap-3 rounded-2xl border border-stone-200 bg-white p-3.5 shadow-sm"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
                {c.fullName.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-stone-900">
                  {c.fullName}
                  {c.source === "BOOKMARKED" ? <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-label="Bookmarked" /> : null}
                </p>
                <p className="text-[11px] text-stone-500">
                  {c.phone}
                  {c.maskedAccount ? ` · ${c.maskedAccount}` : ""}
                  {c.bankName ? ` · ${c.bankName}` : ""}
                </p>
                {c.source === "ONBOARDED" ? (
                  <p className="text-[10px] font-semibold text-emerald-700">
                    Tier {c.kycTier || "1"} · {c.onboardedCustomerCode || c.onboardedCustomerId}
                  </p>
                ) : (
                  <p className="text-[10px] text-stone-400">
                    {c.transactionCount} op{c.transactionCount === 1 ? "" : "s"} ·{" "}
                    {isBalanceHidden ? "••••" : formatMoney(c.totalVolume, "NGN")} · last{" "}
                    {c.lastServedAt ? new Date(c.lastServedAt).toLocaleDateString("en-GB") : "never"}
                  </p>
                )}
              </div>
              {c.source !== "ONBOARDED" ? (
                <button
                  type="button"
                  onClick={(e) => void handleBookmark(c.id, e)}
                  aria-label={c.source === "BOOKMARKED" ? "Remove bookmark" : "Bookmark customer"}
                  className="rounded-lg border border-stone-200 bg-white p-2 text-stone-400 shadow-sm transition hover:bg-amber-50 hover:text-amber-500"
                >
                  {c.source === "BOOKMARKED" ? (
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ) : (
                    <Star className="h-4 w-4" />
                  )}
                </button>
              ) : null}
              <Link
                href="/agent/cash-out"
                className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-600 shadow-sm transition hover:bg-stone-50"
              >
                Serve
              </Link>
            </li>
          ))}
        </ul>
      )}

      <AgentModal open={modalOpen} onClose={() => setModalOpen(false)} labelledBy="onboard-title">
        <div className="flex items-start justify-between">
          <div>
            <h2 id="onboard-title" className="text-base font-bold text-stone-900">
              Onboard a walk-in customer
            </h2>
            <p className="mt-0.5 text-xs text-stone-500">
              Registers a Tier-1 personal record in the customer master registry (real lifecycle engine).
            </p>
          </div>
          <button type="button" onClick={() => setModalOpen(false)} aria-label="Close" className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-4 space-y-3">
          {["fullName", "phone", "email"].map((field) => (
            <label key={field} className="block text-xs">
              <span className="font-semibold text-stone-700">
                {field === "fullName" ? "Full name" : field === "phone" ? "Phone number" : "Email (optional)"}
              </span>
              <input
                value={form[field as keyof typeof form]}
                onChange={(e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))}
                placeholder={field === "fullName" ? "e.g. Hauwa Bello" : field === "phone" ? "+234 803 000 0000" : "name@example.com"}
                className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-300 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </label>
          ))}
        </div>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => setModalOpen(false)}
            className="flex-1 rounded-xl border border-stone-300 px-4 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void submitOnboard()}
            disabled={busy || form.fullName.trim().length < 3 || form.phone.trim().length < 7}
            className="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
          >
            {busy ? "Registering…" : "Register customer"}
          </button>
        </div>
        {notice && notice.ok ? (
          <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> {notice.message}
          </p>
        ) : null}
      </AgentModal>
    </div>
  );
}
