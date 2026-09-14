"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader, fmtMoney, fmtDate } from "@/components/admin/AdminPageUI";
import ResourceTable, { StatusChip, ResourceColumn } from "@/components/admin/ResourceTable";
import { useAdmin } from "@/components/admin/AdminContext";
import { adminApiFetch } from "@/lib/admin/adminSession";

/**
 * Ledger & GL — the REAL double-entry ledger: accounts, posted journals
 * (ledger_transactions), journal lines (ledger_entries), the live trial
 * balance (generate_trial_balance) and the daily financial close history
 * (daily_financial_closes). The old page rendered an in-memory GL engine and
 * mock journal/GL-chart tables; every number here is ledger-backed and
 * enforced by the database integrity controls (migration 20260914000050).
 */

type TrialRow = {
  account_number: string;
  account_name: string;
  account_type: string;
  currency: string;
  stored_balance: string | number;
  derived_balance: string | number;
  debit_volume: string | number;
  credit_volume: string | number;
  is_consistent: boolean;
};

type CloseRow = {
  id: string;
  close_date: string;
  status: string;
  total_journals_posted: number;
  total_debit_volume: string | number;
  total_credit_volume: string | number;
  is_equation_balanced: boolean;
  unresolved_exceptions_count: number;
  closed_by: string;
  metrics: Record<string, unknown> | null;
  created_at: string;
};

export default function LedgerPage() {
  const { openDrawer } = useAdmin();
  const [tab, setTab] = useState<"accounts" | "journals" | "lines" | "trial" | "closes">("accounts");

  const accountCols: ResourceColumn[] = [
    { key: "account_number", label: "Account", render: (r) => <span className="font-bold text-[var(--foreground)]">{r.account_number}</span> },
    { key: "name", label: "Name" },
    { key: "type", label: "Type", render: (r) => <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[var(--brand-soft)] text-[var(--brand-primary)] border border-[var(--brand-primary)]/20">{String(r.type ?? "—").replaceAll("_", " ")}</span> },
    { key: "currency", label: "Ccy" },
    { key: "country", label: "Country", hideOnMobile: true },
    { key: "balance", label: "Balance", className: "text-right", render: (r) => <span className="font-bold">{fmtMoney(r.balance, r.currency)}</span> },
  ];

  const journalCols: ResourceColumn[] = [
    { key: "created_at", label: "Posted", render: (r) => <span className="text-[var(--foreground-muted)]">{fmtDate(r.created_at)}</span> },
    { key: "transaction_reference", label: "Reference", render: (r) => <span className="font-bold text-[var(--foreground)]">{r.transaction_reference}</span> },
    { key: "description", label: "Description", hideOnMobile: true },
    { key: "total_amount", label: "Amount", className: "text-right", render: (r) => <span className="font-bold">{fmtMoney(r.total_amount, r.currency)}</span> },
    { key: "currency", label: "Ccy" },
    { key: "status", label: "Status", render: (r) => <StatusChip value={r.status} /> },
  ];

  const lineCols: ResourceColumn[] = [
    { key: "created_at", label: "Posted", render: (r) => <span className="text-[var(--foreground-muted)]">{fmtDate(r.created_at)}</span> },
    {
      key: "entry_type",
      label: "Side",
      render: (r) => (
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${r.entry_type === "DEBIT" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
          {r.entry_type}
        </span>
      ),
    },
    { key: "amount", label: "Amount", className: "text-right", render: (r) => <span className="font-bold">{fmtMoney(r.amount, r.currency)}</span> },
    { key: "currency", label: "Ccy" },
    { key: "narration", label: "Narration", hideOnMobile: true },
    { key: "transaction_id", label: "Journal", render: (r) => <span className="font-mono text-[var(--foreground-muted)]">{String(r.transaction_id ?? "").slice(0, 8)}…</span> },
  ];

  const tabs: Array<{ id: typeof tab; label: string }> = [
    { id: "accounts", label: "Ledger accounts" },
    { id: "journals", label: "Journals (posted)" },
    { id: "lines", label: "Journal lines" },
    { id: "trial", label: "Trial balance" },
    { id: "closes", label: "Daily close" },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <PageHeader
        eyebrow="Finance"
        title="Ledger, Trial Balance & Daily Close"
        subtitle="The enforced double-entry ledger: accounts, posted journals, journal lines, the live trial balance and the automated daily close — all real, all database-backed."
      />

      <div className="flex flex-wrap gap-2 text-xs font-bold">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-xl border transition-colors ${tab === t.id ? "bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]" : "bg-[var(--surface)] text-[var(--foreground-muted)] border-[var(--border)] hover:border-[var(--brand-primary)]"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "accounts" && (
        <ResourceTable
          resource="ledger-accounts"
          columns={accountCols}
          exportName="ledger-accounts"
          searchPlaceholder="Search account number, name…"
          filters={[
            { key: "type", label: "Type" },
            { key: "currency", label: "Ccy" },
          ]}
          onRowClick={(row) => openDrawer("LEDGER", row)}
        />
      )}
      {tab === "journals" && (
        <ResourceTable
          resource="ledger-transactions"
          columns={journalCols}
          exportName="ledger-transactions"
          searchPlaceholder="Search reference, description…"
          filters={[
            { key: "status", label: "Status" },
            { key: "currency", label: "Ccy" },
          ]}
          onRowClick={(row) => openDrawer("LEDGER_TRANSACTION", row)}
        />
      )}
      {tab === "lines" && (
        <ResourceTable
          resource="ledger-entries"
          columns={lineCols}
          exportName="ledger-entries"
          searchPlaceholder="Search narration…"
          filters={[
            { key: "entry_type", label: "Side" },
            { key: "currency", label: "Ccy" },
          ]}
          onRowClick={(row) => openDrawer("LEDGER_ENTRY", row)}
        />
      )}
      {tab === "trial" && <TrialBalanceView />}
      {tab === "closes" && <CloseView />}
    </div>
  );
}

/** Live trial balance from generate_trial_balance(), grouped per currency. */
function TrialBalanceView() {
  const [rows, setRows] = useState<TrialRow[] | null>(null);
  const [currencies, setCurrencies] = useState<Record<string, { accounts: number; consistent: number; debitVolume: number; creditVolume: number; balanced: boolean }>>({});
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await adminApiFetch("/api/admin/accounting?view=trial-balance");
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? "Trial balance failed to load.");
      setRows(json.rows ?? []);
      setCurrencies(json.currencies ?? {});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Trial balance failed to load.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const grouped = useMemo(() => {
    const g: Record<string, TrialRow[]> = {};
    for (const r of rows ?? []) ((g[r.currency] ??= []).push(r));
    return g;
  }, [rows]);

  if (error) return <div className="p-4 rounded-xl border border-red-300 bg-red-50 text-red-700 text-sm">{error}</div>;
  if (!rows) return <div className="p-4 text-sm text-[var(--foreground-muted)]">Loading trial balance…</div>;

  return (
    <div className="space-y-6">
      {Object.entries(currencies).map(([ccy, s]) => (
        <div key={ccy} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-xl border bg-[var(--surface)]">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">{ccy} · accounts</div>
            <div className="text-xl font-bold">{s.accounts}</div>
          </div>
          <div className="p-4 rounded-xl border bg-[var(--surface)]">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">Debits = Credits</div>
            <div className={`text-xl font-bold ${s.balanced ? "text-emerald-600" : "text-red-600"}`}>{s.balanced ? "BALANCED" : "OUT OF BALANCE"}</div>
          </div>
          <div className="p-4 rounded-xl border bg-[var(--surface)]">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">Debit volume</div>
            <div className="text-xl font-bold">{fmtMoney(s.debitVolume, ccy)}</div>
          </div>
          <div className="p-4 rounded-xl border bg-[var(--surface)]">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">Stored = derived</div>
            <div className={`text-xl font-bold ${s.consistent === s.accounts ? "text-emerald-600" : "text-red-600"}`}>{s.consistent}/{s.accounts}</div>
          </div>
        </div>
      ))}

      {Object.entries(grouped).map(([ccy, list]) => (
        <div key={ccy} className="rounded-xl border overflow-hidden">
          <div className="px-4 py-2 bg-[var(--surface)] text-xs font-bold uppercase tracking-wider text-[var(--foreground-muted)]">{ccy} accounts</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-[var(--foreground-muted)] border-b">
                  <th className="px-4 py-2">Account</th>
                  <th className="px-4 py-2">Name</th>
                  <th className="px-4 py-2">Type</th>
                  <th className="px-4 py-2 text-right">Stored</th>
                  <th className="px-4 py-2 text-right">Derived</th>
                  <th className="px-4 py-2 text-right">Debits</th>
                  <th className="px-4 py-2 text-right">Credits</th>
                  <th className="px-4 py-2">Integrity</th>
                </tr>
              </thead>
              <tbody>
                {list.map((r) => (
                  <tr key={r.account_number} className="border-b last:border-0">
                    <td className="px-4 py-2 font-mono font-bold">{r.account_number}</td>
                    <td className="px-4 py-2">{r.account_name}</td>
                    <td className="px-4 py-2 text-[10px] font-bold uppercase">{r.account_type}</td>
                    <td className="px-4 py-2 text-right font-bold">{fmtMoney(r.stored_balance, r.currency)}</td>
                    <td className="px-4 py-2 text-right">{fmtMoney(r.derived_balance, r.currency)}</td>
                    <td className="px-4 py-2 text-right">{fmtMoney(r.debit_volume, r.currency)}</td>
                    <td className="px-4 py-2 text-right">{fmtMoney(r.credit_volume, r.currency)}</td>
                    <td className="px-4 py-2">
                      {r.is_consistent ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">OK</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-red-100 text-red-800">DRIFT</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Daily close history + the sanctioned operator "run close" action. */
function CloseView() {
  const [closes, setCloses] = useState<CloseRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [date, setDate] = useState("");

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await adminApiFetch("/api/admin/accounting?view=closes");
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? "Close history failed to load.");
      setCloses(json.closes ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Close history failed to load.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const runClose = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await adminApiFetch("/api/admin/accounting", {
        method: "POST",
        body: JSON.stringify(date ? { date } : {}),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? "The close did not complete.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "The close did not complete.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl border bg-[var(--surface)] flex flex-wrap items-end gap-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">Close date (default: today)</div>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 px-3 py-2 rounded-lg border bg-transparent text-sm"
          />
        </div>
        <button
          onClick={() => void runClose()}
          disabled={busy}
          className="px-4 py-2 rounded-xl bg-[var(--brand-primary)] text-white text-xs font-bold disabled:opacity-50"
        >
          {busy ? "Running close…" : "Run financial close"}
        </button>
        <p className="text-xs text-[var(--foreground-muted)] max-w-md">
          Runs the same verified close as the nightly cron (23:00 WAT): per-currency equation, balance drift, wallet sync,
          custodial floors, clearing ageing, commission ageing and orphan journals. Idempotent per date — re-running a day
          replaces that day&apos;s close. Every run is audited.
        </p>
      </div>

      {error && <div className="p-4 rounded-xl border border-red-300 bg-red-50 text-red-700 text-sm">{error}</div>}
      {closes === null && !error && <div className="p-4 text-sm text-[var(--foreground-muted)]">Loading close history…</div>}
      {closes !== null && closes.length === 0 && (
        <div className="p-4 rounded-xl border text-sm text-[var(--foreground-muted)]">No closes recorded yet.</div>
      )}

      {closes?.map((c) => (
        <details key={c.id} className="rounded-xl border overflow-hidden">
          <summary className="px-4 py-3 cursor-pointer flex flex-wrap items-center gap-3 bg-[var(--surface)]">
            <span className="font-bold">{String(c.close_date).slice(0, 10)}</span>
            <StatusChip value={c.status} />
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${c.is_equation_balanced ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>
              {c.is_equation_balanced ? "EQUATION OK" : "EQUATION BROKEN"}
            </span>
            <span className="text-xs text-[var(--foreground-muted)]">
              {c.total_journals_posted} journals · {fmtMoney(c.total_debit_volume)} / {fmtMoney(c.total_credit_volume)}
            </span>
            <span className={`text-xs font-bold ${c.unresolved_exceptions_count > 0 ? "text-amber-600" : "text-emerald-600"}`}>
              {c.unresolved_exceptions_count} exception{c.unresolved_exceptions_count === 1 ? "" : "s"}
            </span>
            <span className="ml-auto text-xs text-[var(--foreground-muted)]">by {c.closed_by}</span>
          </summary>
          <div className="px-4 py-3 text-xs">
            <pre className="overflow-x-auto rounded-lg bg-[var(--surface)] p-3 font-mono text-[11px] leading-relaxed">
              {JSON.stringify(c.metrics, null, 2)}
            </pre>
          </div>
        </details>
      ))}
    </div>
  );
}
