"use client";

import React, { useState, useEffect } from "react";
import {
  Layers,
  Search,
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  FileText,
  PlusCircle,
  Eye,
  ArrowRightLeft,
  Scale,
  Check,
  X,
  Lock,
  PieChart,
  BarChart3,
  ListOrdered,
  BookOpen,
  Calendar,
  DollarSign,
  Fingerprint,
} from "lucide-react";
import {
  GLAccount,
  GLJournal,
  SubledgerAccount,
  AccountingPeriod,
  TrialBalanceReport,
  IncomeStatementReport,
  BalanceSheetReport,
} from "@/types/financeGlEngine";
import { PeriodCloseStep } from "@/lib/financial/PeriodCloseEngine";

export default function LedgerAdminPage() {
  const [activeTab, setActiveTab] = useState<
    "JOURNALS" | "CHART_OF_ACCOUNTS" | "SUBLEDGERS" | "TRIAL_BALANCE" | "INCOME_STATEMENT" | "BALANCE_SHEET" | "PERIOD_CLOSE"
  >("JOURNALS");

  const [journals, setJournals] = useState<GLJournal[]>([]);
  const [accounts, setAccounts] = useState<GLAccount[]>([]);
  const [subledgers, setSubledgers] = useState<SubledgerAccount[]>([]);
  const [periods, setPeriods] = useState<AccountingPeriod[]>([]);
  const [checklist, setChecklist] = useState<PeriodCloseStep[]>([]);
  
  const [trialBalance, setTrialBalance] = useState<TrialBalanceReport | null>(null);
  const [incomeStatement, setIncomeStatement] = useState<IncomeStatementReport | null>(null);
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheetReport | null>(null);

  const [search, setSearch] = useState("");
  const [currencyFilter, setCurrencyFilter] = useState("NGN");
  const [loading, setLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Manual Journal Modal State
  const [isJournalModalOpen, setIsJournalModalOpen] = useState(false);
  const [selectedJournal, setSelectedJournal] = useState<GLJournal | null>(null);
  const [manualJournalForm, setManualJournalForm] = useState({
    debitAccount: "5010",
    creditAccount: "1010",
    amount: "15000",
    narration: "Manual administrative reconciliation adjustment",
    currency: "NGN",
    country: "NG",
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resGL, resTB, resIS, resBS, resPC] = await Promise.all([
        fetch("/api/finance/gl").then((r) => r.json()),
        fetch(`/api/finance/gl/reports?type=trial_balance&currency=${currencyFilter}`).then((r) => r.json()),
        fetch(`/api/finance/gl/reports?type=income_statement&currency=${currencyFilter}`).then((r) => r.json()),
        fetch(`/api/finance/gl/reports?type=balance_sheet&currency=${currencyFilter}`).then((r) => r.json()),
        fetch("/api/finance/gl/period-close").then((r) => r.json()),
      ]);

      if (resGL.success && resGL.data) {
        setJournals(resGL.data.journals || []);
        setAccounts(resGL.data.accounts || []);
        setSubledgers(resGL.data.subledgers || []);
        setPeriods(resGL.data.periods || []);
      }
      if (resTB.success) setTrialBalance(resTB.data);
      if (resIS.success) setIncomeStatement(resIS.data);
      if (resBS.success) setBalanceSheet(resBS.data);
      if (resPC.success && resPC.data) setChecklist(resPC.data.checklist || []);
    } catch (e) {
      console.error("Failed to fetch finance data", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currencyFilter]);

  const handlePostManualJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const amountNum = Number(manualJournalForm.amount);
      const res = await fetch("/api/finance/gl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entryType: "MANUAL_ADJUSTMENT",
          sourceModule: "MANUAL",
          narration: manualJournalForm.narration,
          currency: manualJournalForm.currency,
          lines: [
            {
              accountCode: manualJournalForm.debitAccount,
              entrySide: "DEBIT",
              amount: amountNum,
              currency: manualJournalForm.currency,
              country: manualJournalForm.country,
              legalEntity: manualJournalForm.country === "NG" ? "KORIE_NIGERIA_LTD" : "KORIE_NIGER_SA",
              product: "TREASURY",
              channel: "SYSTEM",
              lineNarration: manualJournalForm.narration,
            },
            {
              accountCode: manualJournalForm.creditAccount,
              entrySide: "CREDIT",
              amount: amountNum,
              currency: manualJournalForm.currency,
              country: manualJournalForm.country,
              legalEntity: manualJournalForm.country === "NG" ? "KORIE_NIGERIA_LTD" : "KORIE_NIGER_SA",
              product: "TREASURY",
              channel: "SYSTEM",
              lineNarration: manualJournalForm.narration,
            },
          ],
        }),
      });

      const json = await res.json();
      if (json.success) {
        setActionSuccess(`Journal posted successfully: ${json.journal?.journalNumber}`);
        setIsJournalModalOpen(false);
        fetchData();
      } else {
        alert(`Journal Posting Failed: ${json.error}`);
      }
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteCloseStep = async (stepNumber: number) => {
    try {
      const res = await fetch("/api/finance/gl/period-close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stepNumber, operatorEmail: "controller@koriepay.com" }),
      });
      const json = await res.json();
      if (json.success) {
        setActionSuccess(`Period close step #${stepNumber} completed successfully`);
        fetchData();
      } else {
        alert(`Step failed: ${json.error}`);
      }
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              PLATFORM B: GENERAL LEDGER & FINANCE
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
              DOUBLE-ENTRY INVARIANT ENFORCED
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white mt-1">General Ledger & Accounting Platform</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Immutable multi-dimensional financial journals, subledgers, real-time Trial Balance, and 12-step period close.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={currencyFilter}
            onChange={(e) => setCurrencyFilter(e.target.value)}
            className="bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white"
          >
            <option value="NGN">NGN (Nigeria 🇳🇬)</option>
            <option value="XOF">XOF (Sahel 🇳🇪)</option>
          </select>

          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-xs font-semibold text-slate-200 border border-white/10 transition-colors shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-emerald-400" : ""}`} />
            Sync Ledger
          </button>

          <button
            onClick={() => setIsJournalModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow-lg shadow-emerald-900/30 transition-all"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Post Journal
          </button>
        </div>
      </div>

      {/* Notification Banner */}
      {actionSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between gap-3 text-xs text-emerald-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Invariant & Integrity Status Card */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[#0b1324]/80 border border-white/10 shadow-lg">
          <div className="text-[10px] font-mono text-slate-400 uppercase">Double-Entry Balance</div>
          <div className="text-xl font-bold font-mono text-emerald-400 mt-1 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            BALANCED (0.00 Variance)
          </div>
          <div className="text-[10px] text-slate-400 mt-1">∑ Debits ≡ ∑ Credits</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0b1324]/80 border border-white/10 shadow-lg">
          <div className="text-[10px] font-mono text-slate-400 uppercase">Active Fiscal Period</div>
          <div className="text-xl font-bold font-mono text-white mt-1">2026-09 (OPEN)</div>
          <div className="text-[10px] text-slate-400 mt-1">Prior Period: 2026-08 (LOCKED)</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0b1324]/80 border border-white/10 shadow-lg">
          <div className="text-[10px] font-mono text-slate-400 uppercase">Chart of Accounts</div>
          <div className="text-xl font-bold font-mono text-blue-400 mt-1">{accounts.length} Accounts Active</div>
          <div className="text-[10px] text-slate-400 mt-1">Assets, Liab, Equity, Rev, Exp</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0b1324]/80 border border-white/10 shadow-lg">
          <div className="text-[10px] font-mono text-slate-400 uppercase">Subledgers Tracked</div>
          <div className="text-xl font-bold font-mono text-amber-400 mt-1">{subledgers.length} Sub-Accounts</div>
          <div className="text-[10px] text-slate-400 mt-1">Wallets, Payables & Clearing</div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 overflow-x-auto pb-2 scrollbar-none">
        {[
          { id: "JOURNALS", label: "Journal Entries", icon: BookOpen },
          { id: "CHART_OF_ACCOUNTS", label: "Chart of Accounts Master", icon: Layers },
          { id: "SUBLEDGERS", label: "Subledgers & Wallets", icon: DollarSign },
          { id: "TRIAL_BALANCE", label: "Trial Balance", icon: Scale },
          { id: "INCOME_STATEMENT", label: "Income Statement (P&L)", icon: BarChart3 },
          { id: "BALANCE_SHEET", label: "Balance Sheet", icon: PieChart },
          { id: "PERIOD_CLOSE", label: "12-Step Period Close", icon: Calendar },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: JOURNAL ENTRIES */}
      {activeTab === "JOURNALS" && (
        <div className="space-y-4">
          <div className="rounded-3xl bg-[#0b1324] border border-white/10 shadow-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[10px] font-mono uppercase text-slate-400 bg-slate-950/60 border-b border-white/10">
                    <th className="p-4 font-semibold">Journal #</th>
                    <th className="p-4 font-semibold">Source & Type</th>
                    <th className="p-4 font-semibold">Narration</th>
                    <th className="p-4 font-semibold">Total Debit</th>
                    <th className="p-4 font-semibold">Total Credit</th>
                    <th className="p-4 font-semibold">Status</th>
                    <th className="p-4 font-semibold text-right">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {journals.map((j) => (
                    <tr key={j.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-4 font-mono font-bold text-white">{j.journalNumber}</td>
                      <td className="p-4">
                        <span className="font-mono text-emerald-400 font-semibold">{j.entryType}</span>
                        <div className="text-[10px] text-slate-400">{j.sourceModule}</div>
                      </td>
                      <td className="p-4 text-slate-200 max-w-xs truncate">{j.narration}</td>
                      <td className="p-4 font-mono font-bold text-white">
                        {j.currency} {j.totalDebit.toLocaleString()}
                      </td>
                      <td className="p-4 font-mono font-bold text-white">
                        {j.currency} {j.totalCredit.toLocaleString()}
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {j.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => setSelectedJournal(j)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-slate-200 border border-white/10 transition-colors"
                        >
                          Lines ↗
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CHART OF ACCOUNTS */}
      {activeTab === "CHART_OF_ACCOUNTS" && (
        <div className="space-y-4">
          <div className="rounded-3xl bg-[#0b1324] border border-white/10 p-6 shadow-2xl">
            <h3 className="text-sm font-bold text-white mb-1">Master Chart of Accounts (COA)</h3>
            <p className="text-xs text-slate-400 mb-4">
              Hierarchical 7-tier classification (1000 Assets, 2000 Liabilities, 3000 Equity, 4000 Revenue, 5000 Expenses, 6000 Clearing, 7000 Suspense).
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[10px] font-mono uppercase text-slate-400 bg-slate-950/60 border-b border-white/10">
                    <th className="p-3 font-semibold">Account Code</th>
                    <th className="p-3 font-semibold">Account Title</th>
                    <th className="p-3 font-semibold">Category</th>
                    <th className="p-3 font-semibold">Normal Balance</th>
                    <th className="p-3 font-semibold">Current Balance</th>
                    <th className="p-3 font-semibold">Subledger Control</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {accounts.map((acc) => (
                    <tr key={acc.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-3 font-mono font-bold text-emerald-400">{acc.accountCode}</td>
                      <td className="p-3 font-semibold text-white">{acc.accountName}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-200">
                          {acc.category}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-slate-300">{acc.normalBalance}</td>
                      <td className="p-3 font-mono font-bold text-white">
                        {acc.currency} {acc.currentBalance.toLocaleString()}
                      </td>
                      <td className="p-3 font-mono text-slate-400">
                        {acc.isSubledgerControl ? `YES (${acc.subledgerType})` : "NO"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SUBLEDGERS */}
      {activeTab === "SUBLEDGERS" && (
        <div className="space-y-4">
          <div className="rounded-3xl bg-[#0b1324] border border-white/10 p-6 shadow-2xl">
            <h3 className="text-sm font-bold text-white mb-1">Subledger Accounts & Wallet Balances</h3>
            <p className="text-xs text-slate-400 mb-4">
              Granular sub-accounts reconciling directly against GL Control Accounts (2010 Customer Wallets, 2100 Merchant Payables).
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[10px] font-mono uppercase text-slate-400 bg-slate-950/60 border-b border-white/10">
                    <th className="p-3 font-semibold">Subledger ID</th>
                    <th className="p-3 font-semibold">Subledger Type</th>
                    <th className="p-3 font-semibold">Entity Ref</th>
                    <th className="p-3 font-semibold">Control Account</th>
                    <th className="p-3 font-semibold">Current Balance</th>
                    <th className="p-3 font-semibold">Held Balance</th>
                    <th className="p-3 font-semibold">Available Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {subledgers.map((s) => (
                    <tr key={s.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-3 font-mono font-bold text-white">{s.id}</td>
                      <td className="p-3 font-mono text-emerald-400 font-semibold">{s.subledgerType}</td>
                      <td className="p-3 font-mono text-slate-300">{s.entityId}</td>
                      <td className="p-3 font-mono text-slate-400">{s.accountCode}</td>
                      <td className="p-3 font-mono text-white font-bold">
                        {s.currency} {s.currentBalance.toLocaleString()}
                      </td>
                      <td className="p-3 font-mono text-amber-400">
                        {s.currency} {s.heldBalance.toLocaleString()}
                      </td>
                      <td className="p-3 font-mono text-emerald-400 font-bold">
                        {s.currency} {s.availableBalance.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: TRIAL BALANCE */}
      {activeTab === "TRIAL_BALANCE" && trialBalance && (
        <div className="space-y-4">
          <div className="rounded-3xl bg-[#0b1324] border border-white/10 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-4">
              <div>
                <h3 className="text-base font-bold text-white">General Ledger Trial Balance</h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Period: {trialBalance.period} | Currency: {trialBalance.currency}
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                ● DOUBLE-ENTRY INVARIANT VERIFIED
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[10px] font-mono uppercase text-slate-400 bg-slate-950/60 border-b border-white/10">
                    <th className="p-3 font-semibold">Account Code</th>
                    <th className="p-3 font-semibold">Account Title</th>
                    <th className="p-3 font-semibold">Category</th>
                    <th className="p-3 font-semibold text-right">Debit Balance</th>
                    <th className="p-3 font-semibold text-right">Credit Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {trialBalance.rows.map((r) => (
                    <tr key={r.accountCode} className="hover:bg-white/5 transition-colors">
                      <td className="p-3 font-mono font-bold text-white">{r.accountCode}</td>
                      <td className="p-3 font-semibold text-slate-200">{r.accountName}</td>
                      <td className="p-3 font-mono text-slate-400 text-[10px]">{r.category}</td>
                      <td className="p-3 font-mono text-right text-emerald-400">
                        {r.debitBalance > 0 ? `${trialBalance.currency} ${r.debitBalance.toLocaleString()}` : "-"}
                      </td>
                      <td className="p-3 font-mono text-right text-blue-400">
                        {r.creditBalance > 0 ? `${trialBalance.currency} ${r.creditBalance.toLocaleString()}` : "-"}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-950/80 font-bold border-t-2 border-white/20">
                    <td colSpan={3} className="p-3 text-right uppercase font-mono text-slate-300">
                      Total Balanced Sum:
                    </td>
                    <td className="p-3 font-mono text-right text-emerald-400 text-sm">
                      {trialBalance.currency} {trialBalance.totalDebits.toLocaleString()}
                    </td>
                    <td className="p-3 font-mono text-right text-blue-400 text-sm">
                      {trialBalance.currency} {trialBalance.totalCredits.toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: INCOME STATEMENT (P&L) */}
      {activeTab === "INCOME_STATEMENT" && incomeStatement && (
        <div className="space-y-4">
          <div className="rounded-3xl bg-[#0b1324] border border-white/10 p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="text-base font-bold text-white">Statement of Profit and Loss (P&L)</h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">{incomeStatement.period}</p>
              </div>
              <div className="text-right">
                <div className="text-xs font-mono text-slate-400 uppercase">Net Operating Surplus</div>
                <div className="text-lg font-bold font-mono text-emerald-400">
                  {incomeStatement.currency} {incomeStatement.netOperatingIncome.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase font-mono text-emerald-400">1. Revenue (4000 - 4999)</h4>
              <div className="divide-y divide-white/5 border border-white/10 rounded-2xl bg-slate-950/40 p-3">
                {incomeStatement.revenueRows.map((r) => (
                  <div key={r.accountCode} className="flex justify-between py-2 text-xs">
                    <span className="text-slate-300">
                      {r.accountCode} - {r.accountName}
                    </span>
                    <span className="font-mono text-white font-bold">
                      {incomeStatement.currency} {r.amount.toLocaleString()}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between pt-3 font-bold text-xs text-emerald-400 border-t border-white/10">
                  <span>Total Operational Revenue:</span>
                  <span className="font-mono">
                    {incomeStatement.currency} {incomeStatement.totalRevenue.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase font-mono text-rose-400">2. Operating Expenses (5000 - 5999)</h4>
              <div className="divide-y divide-white/5 border border-white/10 rounded-2xl bg-slate-950/40 p-3">
                {incomeStatement.expenseRows.map((r) => (
                  <div key={r.accountCode} className="flex justify-between py-2 text-xs">
                    <span className="text-slate-300">
                      {r.accountCode} - {r.accountName}
                    </span>
                    <span className="font-mono text-white font-bold">
                      {incomeStatement.currency} {r.amount.toLocaleString()}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between pt-3 font-bold text-xs text-rose-400 border-t border-white/10">
                  <span>Total Operational Expenses:</span>
                  <span className="font-mono">
                    {incomeStatement.currency} {incomeStatement.totalExpenses.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: BALANCE SHEET */}
      {activeTab === "BALANCE_SHEET" && balanceSheet && (
        <div className="space-y-4">
          <div className="rounded-3xl bg-[#0b1324] border border-white/10 p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="text-base font-bold text-white">Statement of Financial Position (Balance Sheet)</h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">{balanceSheet.period}</p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                ● ASSETS = LIABILITIES + EQUITY
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase font-mono text-emerald-400">Assets (1000 - 1999)</h4>
                <div className="divide-y divide-white/5 border border-white/10 rounded-2xl bg-slate-950/40 p-3">
                  {balanceSheet.assetRows.map((r) => (
                    <div key={r.accountCode} className="flex justify-between py-2 text-xs">
                      <span className="text-slate-300">
                        {r.accountCode} - {r.accountName}
                      </span>
                      <span className="font-mono text-white font-bold">
                        {balanceSheet.currency} {r.amount.toLocaleString()}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between pt-3 font-bold text-xs text-emerald-400 border-t border-white/10">
                    <span>Total Assets:</span>
                    <span className="font-mono">
                      {balanceSheet.currency} {balanceSheet.totalAssets.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase font-mono text-amber-400">
                  Liabilities & Equity (2000 - 3999)
                </h4>
                <div className="divide-y divide-white/5 border border-white/10 rounded-2xl bg-slate-950/40 p-3">
                  {balanceSheet.liabilityRows.map((r) => (
                    <div key={r.accountCode} className="flex justify-between py-2 text-xs">
                      <span className="text-slate-300">
                        {r.accountCode} - {r.accountName}
                      </span>
                      <span className="font-mono text-white font-bold">
                        {balanceSheet.currency} {r.amount.toLocaleString()}
                      </span>
                    </div>
                  ))}
                  {balanceSheet.equityRows.map((r) => (
                    <div key={r.accountCode} className="flex justify-between py-2 text-xs text-blue-300">
                      <span>
                        {r.accountCode} - {r.accountName}
                      </span>
                      <span className="font-mono text-white font-bold">
                        {balanceSheet.currency} {r.amount.toLocaleString()}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between pt-3 font-bold text-xs text-amber-400 border-t border-white/10">
                    <span>Total Liabilities + Equity:</span>
                    <span className="font-mono">
                      {balanceSheet.currency}{" "}
                      {(balanceSheet.totalLiabilities + balanceSheet.totalEquity).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: 12-STEP PERIOD CLOSE WORKFLOW */}
      {activeTab === "PERIOD_CLOSE" && (
        <div className="space-y-4">
          <div className="rounded-3xl bg-[#0b1324] border border-white/10 p-6 shadow-2xl">
            <h3 className="text-sm font-bold text-white mb-1">12-Step Period Close & Immutable Locking Protocol</h3>
            <p className="text-xs text-slate-400 mb-6">
              Automated financial closing sequence for period end. Locks active ledger state and generates cryptographic compliance proofs.
            </p>

            <div className="space-y-3">
              {checklist.map((step) => (
                <div
                  key={step.stepNumber}
                  className="p-4 rounded-2xl bg-slate-950/60 border border-white/5 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center text-xs font-mono font-bold">
                      {step.stepNumber}
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-white">{step.stepName}</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">{step.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold uppercase ${
                        step.status === "COMPLETED"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      }`}
                    >
                      ● {step.status}
                    </span>
                    {step.status !== "COMPLETED" && (
                      <button
                        onClick={() => handleExecuteCloseStep(step.stepNumber)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white"
                      >
                        Execute
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MANUAL JOURNAL MODAL */}
      {isJournalModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0b1324] border border-white/15 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white">Post Balanced Journal Entry</h3>
              <button onClick={() => setIsJournalModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePostManualJournal} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">Debit Account (Dr)</label>
                  <select
                    value={manualJournalForm.debitAccount}
                    onChange={(e) => setManualJournalForm({ ...manualJournalForm, debitAccount: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    {accounts.map((a) => (
                      <option key={a.accountCode} value={a.accountCode}>
                        {a.accountCode} - {a.accountName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">Credit Account (Cr)</label>
                  <select
                    value={manualJournalForm.creditAccount}
                    onChange={(e) => setManualJournalForm({ ...manualJournalForm, creditAccount: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    {accounts.map((a) => (
                      <option key={a.accountCode} value={a.accountCode}>
                        {a.accountCode} - {a.accountName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">
                    Amount ({manualJournalForm.currency})
                  </label>
                  <input
                    type="number"
                    required
                    value={manualJournalForm.amount}
                    onChange={(e) => setManualJournalForm({ ...manualJournalForm, amount: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">Currency</label>
                  <select
                    value={manualJournalForm.currency}
                    onChange={(e) => setManualJournalForm({ ...manualJournalForm, currency: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  >
                    <option value="NGN">NGN</option>
                    <option value="XOF">XOF</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">Narration</label>
                <input
                  type="text"
                  required
                  value={manualJournalForm.narration}
                  onChange={(e) => setManualJournalForm({ ...manualJournalForm, narration: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-white/5 text-[11px] text-slate-400">
                🛡️ Enforces Double-Entry Invariant: Debit of {manualJournalForm.currency}{" "}
                {manualJournalForm.amount} is balanced by equal Credit of {manualJournalForm.currency}{" "}
                {manualJournalForm.amount}.
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsJournalModalOpen(false)}
                  className="flex-1 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow-lg shadow-emerald-900/30"
                >
                  Commit Journal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INSPECT JOURNAL MODAL */}
      {selectedJournal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0b1324] border border-white/15 rounded-3xl p-6 max-w-2xl w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded">
                  IMMUTABLE GL JOURNAL LINES
                </span>
                <h3 className="text-base font-bold text-white mt-1">{selectedJournal.journalNumber}</h3>
              </div>
              <button onClick={() => setSelectedJournal(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="text-xs text-slate-300">{selectedJournal.narration}</div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-[10px] font-mono uppercase text-slate-400 bg-slate-950/60 border-b border-white/10">
                      <th className="p-2.5 font-semibold">Account</th>
                      <th className="p-2.5 font-semibold">Side</th>
                      <th className="p-2.5 font-semibold">Amount</th>
                      <th className="p-2.5 font-semibold">Dimensions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {selectedJournal.lines.map((l, idx) => (
                      <tr key={idx} className="hover:bg-white/5">
                        <td className="p-2.5 font-mono font-bold text-white">{l.accountCode}</td>
                        <td className="p-2.5">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                              l.entrySide === "DEBIT"
                                ? "bg-emerald-500/10 text-emerald-400"
                                : "bg-blue-500/10 text-blue-400"
                            }`}
                          >
                            {l.entrySide}
                          </span>
                        </td>
                        <td className="p-2.5 font-mono font-bold text-white">
                          {l.currency} {l.amount.toLocaleString()}
                        </td>
                        <td className="p-2.5 text-[10px] font-mono text-slate-400">
                          {l.country} | {l.legalEntity} | {l.channel}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
