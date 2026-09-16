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

type MonthEndItem = {
  id: string;
  item_key: string;
  status: string;
  result: Record<string, unknown> | null;
  performed_by: string | null;
  notes: string | null;
};

type MonthEndChecklist = {
  id: string;
  period_year: number;
  period_month: number;
  is_drill: boolean;
  status: string;
  prepared_by: string | null;
  reviewed_by: string | null;
  review_notes: string | null;
  prepare_summary: Record<string, unknown> | null;
  items?: MonthEndItem[];
};

export default function LedgerPage() {
  const { openDrawer } = useAdmin();
  const [tab, setTab] = useState<"accounts" | "journals" | "lines" | "trial" | "closes" | "month-end">("accounts");

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
    { id: "month-end", label: "Month-end close" },
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
      {tab === "month-end" && <MonthEndCloseView />}
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

/** Month-end close checklist: the five reconciliations, four-eyes prepare/review. */
function MonthEndCloseView() {
  const [checklists, setChecklists] = useState<MonthEndChecklist[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [drill, setDrill] = useState(true);
  const [notes, setNotes] = useState("");

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await adminApiFetch("/api/admin/accounting?view=month-end-close");
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? "The month-end close list failed to load.");
      setChecklists(json.checklists ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The month-end close list failed to load.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const act = async (step: "run-item" | "prepare" | "review", extra: Record<string, unknown> = {}) => {
    setBusy(true);
    setError(null);
    setFlash(null);
    try {
      const res = await adminApiFetch("/api/admin/accounting", {
        method: "POST",
        body: JSON.stringify({ action: "month-end-close", step, year, month, drill, notes: notes || null, ...extra }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? "The action did not complete.");
      const r = json.result ?? {};
      setFlash(
        step === "run-item"
          ? `${r.item_key}: ${r.status}`
          : step === "prepare"
            ? `Checklist ${r.status} — prepared by ${r.summary ? "maker" : "maker"}`
            : `Checklist ${r.status} (${r.decision})`,
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "The action did not complete.");
    } finally {
      setBusy(false);
    }
  };

  const current = (checklists ?? []).find((c) => c.period_year === year && c.period_month === month && c.is_drill === drill);
  const ITEM_KEYS = ["BANK_REC", "LIABILITY_REC", "REVENUE_REC", "COMMISSION_REC", "SUSPENSE_REVIEW"] as const;

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl border bg-[var(--surface)] flex flex-wrap items-end gap-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">Period</div>
          <div className="flex gap-2 mt-1">
            <input
              type="number"
              value={year}
              min={2020}
              max={2100}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-24 px-3 py-2 rounded-lg border bg-transparent text-sm"
            />
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="px-3 py-2 rounded-lg border bg-transparent text-sm"
              aria-label="Month"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {new Date(year, m - 1, 1).toLocaleString("en", { month: "long" })}
                </option>
              ))}
            </select>
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={drill} onChange={(e) => setDrill(e.target.checked)} />
          Drill (mid-month exercise — a real close refuses before the month ends)
        </label>
        <input
          type="text"
          placeholder="Notes (required for prepare/review — min 20 chars)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="flex-1 min-w-64 px-3 py-2 rounded-lg border bg-transparent text-sm"
        />
      </div>

      <div className="p-4 rounded-xl border bg-[var(--surface)] flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-[var(--foreground-muted)] mr-2">Reconciliations:</span>
        {ITEM_KEYS.map((k) => (
          <button
            key={k}
            onClick={() => void act("run-item", { item_key: k })}
            disabled={busy || current?.status === "CLOSED"}
            className="px-3 py-2 rounded-xl bg-[var(--brand-soft)] text-[var(--brand-primary)] border border-[var(--brand-primary)]/20 text-xs font-bold disabled:opacity-50"
          >
            {k.replaceAll("_", " ")}
            {current?.items?.find((i) => i.item_key === k)?.status === "PERFORMED" ? " ✓" : ""}
          </button>
        ))}
        <span className="flex-1" />
        <button
          onClick={() => void act("prepare")}
          disabled={busy || !current || current.status !== "OPEN" || notes.trim().length < 20}
          className="px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-bold disabled:opacity-50"
        >
          {busy ? "Working…" : "Prepare (maker)"}
        </button>
        <button
          onClick={() => void act("review", { decision: "APPROVE" })}
          disabled={busy || !current || current.status !== "PREPARED" || notes.trim().length < 20}
          className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold disabled:opacity-50"
        >
          Approve close (checker)
        </button>
        <button
          onClick={() => void act("review", { decision: "REJECT" })}
          disabled={busy || !current || current.status !== "PREPARED" || notes.trim().length < 20}
          className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold disabled:opacity-50"
        >
          Reject
        </button>
      </div>

      <p className="text-xs text-[var(--foreground-muted)] max-w-3xl">
        Each reconciliation is computed from the production ledger (never hand-entered). Prepare requires all five performed,
        a daily close for every day with journal activity, and a consistent trial balance. Review is four-eyes: a DIFFERENT
        person than the preparer must approve — self-review is refused by the database. Bank rec prepares the internal side;
        external statements are B4-blocked and the result says so.
      </p>

      {flash && <div className="p-3 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 text-sm">{flash}</div>}
      {error && <div className="p-3 rounded-xl border border-red-300 bg-red-50 text-red-700 text-sm">{error}</div>}
      {checklists === null && !error && <div className="p-4 text-sm text-[var(--foreground-muted)]">Loading month-end closes…</div>}
      {checklists !== null && checklists.length === 0 && (
        <div className="p-4 rounded-xl border text-sm text-[var(--foreground-muted)]">
          No month-end checklist exists yet — run the five reconciliations above to open one for the selected period.
        </div>
      )}

      {checklists?.map((c) => (
        <details key={c.id} className="rounded-xl border overflow-hidden">
          <summary className="px-4 py-3 cursor-pointer flex flex-wrap items-center gap-3 bg-[var(--surface)]">
            <span className="font-bold">
              {c.period_year}-{String(c.period_month).padStart(2, "0")}
            </span>
            {c.is_drill && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-800">DRILL</span>
            )}
            <StatusChip value={c.status} />
            <span className="text-xs text-[var(--foreground-muted)]">
              prepared by {c.prepared_by ?? "—"}
              {c.reviewed_by ? ` · reviewed by ${c.reviewed_by}` : ""}
            </span>
            <span className="ml-auto text-xs text-[var(--foreground-muted)]">{c.items?.filter((i) => i.status === "PERFORMED").length ?? 0}/5 performed</span>
          </summary>
          <div className="px-4 py-3 space-y-2 text-xs">
            {(c.items ?? []).map((i) => (
              <details key={i.id} className="rounded-lg border">
                <summary className="px-3 py-2 cursor-pointer flex flex-wrap items-center gap-2">
                  <span className="font-bold">{i.item_key}</span>
                  <StatusChip value={i.status} />
                  <span className="text-[var(--foreground-muted)]">
                    {i.performed_by ? `by ${i.performed_by}` : "not run yet"}
                  </span>
                </summary>
                <pre className="overflow-x-auto rounded-lg bg-[var(--surface)] p-3 font-mono text-[11px] leading-relaxed">
                  {JSON.stringify(i.result, null, 2)}
                </pre>
              </details>
            ))}
            {c.prepare_summary && (
              <div>
                <div className="font-bold mt-2">Prepare summary</div>
                <pre className="overflow-x-auto rounded-lg bg-[var(--surface)] p-3 font-mono text-[11px] leading-relaxed">
                  {JSON.stringify(c.prepare_summary, null, 2)}
                </pre>
              </div>
            )}
            {c.review_notes && <div className="text-[var(--foreground-muted)]">Review notes: {c.review_notes}</div>}
          </div>
        </details>
      ))}
    </div>
  );
}
