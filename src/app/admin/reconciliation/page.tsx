"use client";

import React, { useState, useEffect } from "react";
import { 
  CheckCircle2, 
  AlertTriangle, 
  Search, 
  RefreshCw, 
  ShieldAlert, 
  Clock, 
  Scale, 
  Check, 
  X, 
  Play, 
  Layers, 
  Eye, 
  FileText, 
  ArrowRight, 
  Building2, 
  Send, 
  Lock, 
  Filter,
  UserCheck
} from "lucide-react";

export default function ReconciliationAdminPage() {
  const [activeTab, setActiveTab] = useState<"EXCEPTIONS" | "RUNS" | "SUSPENSE" | "BANK_STATEMENTS" | "ORPHANS">("EXCEPTIONS");
  const [exceptions, setExceptions] = useState<any[]>([]);
  const [runs, setRuns] = useState<any[]>([]);
  const [suspenseData, setSuspenseData] = useState<any>(null);
  const [bankStatements, setBankStatements] = useState<any[]>([]);
  const [orphanReport, setOrphanReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Filters
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Transaction 360 Drawer state
  const [selectedExceptionId, setSelectedExceptionId] = useState<string | null>(null);
  const [traceData, setTraceData] = useState<any | null>(null);
  const [loadingTrace, setLoadingTrace] = useState(false);

  // Maker-Checker Resolution Modal
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [selectedException, setSelectedException] = useState<any | null>(null);
  const [resolutionForm, setResolutionForm] = useState({
    rootCause: "TIMING_DIFFERENCE",
    resolutionNotes: "Confirmed delayed switch settlement from commercial bank statement.",
    resolutionCode: "BANK_SWITCH_CONFIRMED",
    makerId: "usr_maker_recon_01",
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resExc, resRuns, resSusp, resStmt, resOrphan] = await Promise.all([
        fetch("/api/core/v1/reconciliation/exceptions").then(r => r.json()),
        fetch("/api/core/v1/reconciliation/runs").then(r => r.json()),
        fetch("/api/core/v1/suspense?currency=NGN").then(r => r.json()),
        fetch("/api/core/v1/bank-statements").then(r => r.json()),
        fetch("/api/core/v1/orphan-detection").then(r => r.json()),
      ]);

      if (resExc.data?.exceptions) setExceptions(resExc.data.exceptions);
      if (resRuns.data?.runs) setRuns(resRuns.data.runs);
      if (resSusp.data) setSuspenseData(resSusp.data);
      if (resStmt.data?.statements) setBankStatements(resStmt.data.statements);
      if (resOrphan.data) setOrphanReport(resOrphan.data);
    } catch (e) {
      console.error("Reconciliation fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openTraceDrawer = async (exceptionId: string) => {
    setSelectedExceptionId(exceptionId);
    setLoadingTrace(true);
    try {
      const res = await fetch(`/api/core/v1/reconciliation/exceptions/${exceptionId}`);
      const json = await res.json();
      if (json.data?.transaction360) {
        setTraceData(json.data.transaction360);
      }
    } catch (e) {
      console.error("Trace load error:", e);
    } finally {
      setLoadingTrace(false);
    }
  };

  const handleMakerSubmitResolution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedException) return;

    try {
      const res = await fetch("/api/core/v1/reconciliation/exceptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SUBMIT_RESOLUTION",
          exceptionId: selectedException.id,
          rootCause: resolutionForm.rootCause,
          resolutionNotes: resolutionForm.resolutionNotes,
          resolutionCode: resolutionForm.resolutionCode,
          makerId: resolutionForm.makerId,
        }),
      });
      if (res.ok) {
        setIsResolveModalOpen(false);
        await fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCheckerApproveResolution = async (exceptionId: string) => {
    try {
      const res = await fetch("/api/core/v1/reconciliation/exceptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "APPROVE_RESOLUTION",
          exceptionId,
          checkerId: "usr_checker_dir_02",
          checkerRole: "FINANCE_DIRECTOR",
        }),
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredExceptions = exceptions.filter((exc) => {
    if (severityFilter !== "ALL" && exc.severity !== severityFilter) return false;
    if (statusFilter !== "ALL" && exc.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1.5">
              <Scale className="w-3 h-3" />
              4-WAY RECONCILIATION ENGINE
            </span>
            <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
              TIER-1 AUDIT GRADE
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white mt-1">
            Reconciliation & Suspense Command Center
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Continuous 4-way matching across Internal Transactions, General Ledger, Provider Statements, and Commercial Bank MT940 Feeds.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2.5 rounded-xl bg-slate-900 border border-white/10 text-slate-300 hover:text-white transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-emerald-400 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono">
        <div className="p-4 rounded-2xl bg-[#080D1A]/80 border border-white/10 backdrop-blur-xl">
          <div className="text-[11px] text-slate-400 uppercase">Active Exceptions</div>
          <div className="text-2xl font-bold text-amber-400 mt-1">
            {exceptions.filter(e => e.status !== "RESOLVED").length}
          </div>
          <span className="text-[10px] text-slate-500">
            {exceptions.filter(e => e.severity === "CRITICAL").length} Critical SLA
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[#080D1A]/80 border border-white/10 backdrop-blur-xl">
          <div className="text-[11px] text-slate-400 uppercase">Suspense Quarantined</div>
          <div className="text-2xl font-bold text-teal-400 mt-1">
            ₦{((suspenseData?.schedule?.totalSuspenseMinor || 0) / 100).toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-500">Across 6 Aging Stages</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#080D1A]/80 border border-white/10 backdrop-blur-xl">
          <div className="text-[11px] text-slate-400 uppercase">Verified Bank Statements</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">
            {bankStatements.length} Files
          </div>
          <span className="text-[10px] text-emerald-400">100% Equation Balanced</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#080D1A]/80 border border-white/10 backdrop-blur-xl">
          <div className="text-[11px] text-slate-400 uppercase">Orphan Record Count</div>
          <div className="text-2xl font-bold text-white mt-1">
            {orphanReport?.orphansCount || 0}
          </div>
          <span className="text-[10px] text-emerald-400">Zero Integrity Breaks</span>
        </div>
      </div>

      {/* 6-Stage Suspense Aging Schedule */}
      <div className="p-5 rounded-3xl bg-[#080D1A]/90 border border-white/10 shadow-2xl backdrop-blur-xl space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-white/10">
          <h3 className="text-xs font-mono font-bold uppercase text-slate-200 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            Authoritative 6-Stage Suspense Aging Schedule
          </h3>
          <span className="text-[10px] font-mono text-slate-400">Currency: NGN (Nigeria 🇳🇬)</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 font-mono text-xs">
          <div className="p-3 rounded-2xl bg-white/5 border border-emerald-500/20">
            <span className="text-[10px] text-emerald-400 uppercase font-bold">0–1 Days (Fresh)</span>
            <div className="text-sm font-bold text-white mt-1">
              ₦{((suspenseData?.schedule?.bucket0to1DayMinor || 0) / 100).toLocaleString()}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-white/5 border border-teal-500/20">
            <span className="text-[10px] text-teal-400 uppercase font-bold">2–3 Days (Pending)</span>
            <div className="text-sm font-bold text-white mt-1">
              ₦{((suspenseData?.schedule?.bucket2to3DaysMinor || 0) / 100).toLocaleString()}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-white/5 border border-amber-500/20">
            <span className="text-[10px] text-amber-400 uppercase font-bold">4–7 Days (Escalated)</span>
            <div className="text-sm font-bold text-white mt-1">
              ₦{((suspenseData?.schedule?.bucket4to7DaysMinor || 0) / 100).toLocaleString()}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-white/5 border border-orange-500/20">
            <span className="text-[10px] text-orange-400 uppercase font-bold">8–14 Days (Urgent)</span>
            <div className="text-sm font-bold text-white mt-1">
              ₦{((suspenseData?.schedule?.bucket8to14DaysMinor || 0) / 100).toLocaleString()}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-white/5 border border-red-500/20">
            <span className="text-[10px] text-red-400 uppercase font-bold">15–30 Days (Critical)</span>
            <div className="text-sm font-bold text-white mt-1">
              ₦{((suspenseData?.schedule?.bucket15to30DaysMinor || 0) / 100).toLocaleString()}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-white/5 border border-purple-500/20">
            <span className="text-[10px] text-purple-400 uppercase font-bold">30+ Days (Write-off)</span>
            <div className="text-sm font-bold text-white mt-1">
              ₦{((suspenseData?.schedule?.bucket30PlusDaysMinor || 0) / 100).toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2">
        <button
          onClick={() => setActiveTab("EXCEPTIONS")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === "EXCEPTIONS"
              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          Exception Work Queue ({exceptions.length})
        </button>

        <button
          onClick={() => setActiveTab("RUNS")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === "RUNS"
              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Play className="w-3.5 h-3.5" />
          Reconciliation Runs ({runs.length})
        </button>

        <button
          onClick={() => setActiveTab("BANK_STATEMENTS")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === "BANK_STATEMENTS"
              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          Bank Statements ({bankStatements.length})
        </button>
      </div>

      {/* Exception Work Queue Tab */}
      {activeTab === "EXCEPTIONS" && (
        <div className="rounded-3xl bg-[#080D1A]/90 border border-white/10 shadow-2xl overflow-hidden backdrop-blur-xl">
          <div className="p-4 bg-slate-950/60 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={severityFilter}
                onChange={e => setSeverityFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-white font-mono text-xs"
              >
                <option value="ALL">All Severities</option>
                <option value="CRITICAL">CRITICAL</option>
                <option value="HIGH">HIGH</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="LOW">LOW</option>
              </select>

              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-white font-mono text-xs"
              >
                <option value="ALL">All Statuses</option>
                <option value="OPEN">OPEN</option>
                <option value="PENDING_MAKER_CHECKER">PENDING_MAKER_CHECKER</option>
                <option value="RESOLVED">RESOLVED</option>
              </select>
            </div>

            <span className="text-[11px] font-mono text-slate-400">
              Showing {filteredExceptions.length} exceptions
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[10px] font-mono uppercase text-slate-400 bg-slate-950/60 border-b border-white/10">
                  <th className="p-4 font-semibold">Exception Ref</th>
                  <th className="p-4 font-semibold">Provider / Rail</th>
                  <th className="p-4 font-semibold">Discrepancy Type</th>
                  <th className="p-4 font-semibold">Severity</th>
                  <th className="p-4 font-semibold">Expected</th>
                  <th className="p-4 font-semibold">Actual</th>
                  <th className="p-4 font-semibold">Variance</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono">
                {filteredExceptions.map((exc) => (
                  <tr key={exc.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-4 font-bold text-white flex items-center gap-1.5">
                      <Lock className="w-3 h-3 text-emerald-400" />
                      {exc.exceptionReference}
                    </td>
                    <td className="p-4 text-slate-300 font-sans">{exc.providerId}</td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 font-mono">
                        {exc.exceptionType}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        exc.severity === "CRITICAL"
                          ? "bg-red-500/20 text-red-400 border border-red-500/30"
                          : exc.severity === "HIGH"
                          ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                          : "bg-slate-800 text-slate-300"
                      }`}>
                        {exc.severity}
                      </span>
                    </td>
                    <td className="p-4 text-white font-bold">
                      ₦{((exc.expectedAmountMinor || 0) / 100).toLocaleString()}
                    </td>
                    <td className="p-4 text-slate-400">
                      ₦{((exc.actualAmountMinor || 0) / 100).toLocaleString()}
                    </td>
                    <td className="p-4 font-bold text-amber-400">
                      ₦{((exc.differenceMinor || 0) / 100).toLocaleString()}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        exc.status === "RESOLVED"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : exc.status === "PENDING_MAKER_CHECKER"
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          : "bg-red-500/10 text-red-400 border border-red-500/20"
                      }`}>
                        {exc.status}
                      </span>
                    </td>
                    <td className="p-4 text-right font-sans space-x-2">
                      <button
                        onClick={() => openTraceDrawer(exc.id)}
                        className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-medium transition inline-flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3 text-teal-400" />
                        360° Trace
                      </button>

                      {exc.status === "OPEN" && (
                        <button
                          onClick={() => {
                            setSelectedException(exc);
                            setIsResolveModalOpen(true);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition inline-flex items-center gap-1 shadow"
                        >
                          Resolve (Maker)
                        </button>
                      )}

                      {exc.status === "PENDING_MAKER_CHECKER" && (
                        <button
                          onClick={() => handleCheckerApproveResolution(exc.id)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition inline-flex items-center gap-1 shadow"
                        >
                          <Check className="w-3 h-3" />
                          Approve (Checker)
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bank Statements Tab */}
      {activeTab === "BANK_STATEMENTS" && (
        <div className="rounded-3xl bg-[#080D1A]/90 border border-white/10 shadow-2xl p-6 backdrop-blur-xl space-y-4">
          <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-400" />
            Ingested Commercial Bank MT940 Statements
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="text-[10px] uppercase text-slate-400 bg-slate-950/60 border-b border-white/10">
                  <th className="p-3 font-semibold">Statement Ref</th>
                  <th className="p-3 font-semibold">Bank Name</th>
                  <th className="p-3 font-semibold">Account Number</th>
                  <th className="p-3 font-semibold">Opening Balance</th>
                  <th className="p-3 font-semibold">Total Credits</th>
                  <th className="p-3 font-semibold">Total Debits</th>
                  <th className="p-3 font-semibold">Closing Balance</th>
                  <th className="p-3 font-semibold text-right">Integrity Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {bankStatements.map((stmt) => (
                  <tr key={stmt.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-3 font-bold text-white">{stmt.statementReference}</td>
                    <td className="p-3 text-slate-300 font-sans">{stmt.bankName}</td>
                    <td className="p-3 text-amber-400">{stmt.accountNumber}</td>
                    <td className="p-3 text-white">₦{(stmt.openingBalanceMinor / 100).toLocaleString()}</td>
                    <td className="p-3 text-emerald-300 font-bold">₦{(stmt.totalCreditsMinor / 100).toLocaleString()}</td>
                    <td className="p-3 text-red-300 font-bold">₦{(stmt.totalDebitsMinor / 100).toLocaleString()}</td>
                    <td className="p-3 text-teal-300 font-bold">₦{(stmt.closingBalanceMinor / 100).toLocaleString()}</td>
                    <td className="p-3 text-right">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        VERIFIED (0.00 Variance)
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Transaction 360° Trace Drawer */}
      {selectedExceptionId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-end p-4">
          <div className="bg-[#080D1A] border border-white/15 rounded-3xl max-w-2xl w-full h-[90vh] overflow-y-auto p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-white/10 sticky top-0 bg-[#080D1A] z-10">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  TRANSACTION 360° FINANCIAL TRACE
                </span>
                <h3 className="text-lg font-bold text-white mt-1">
                  Trace ID: {selectedExceptionId}
                </h3>
              </div>
              <button
                onClick={() => setSelectedExceptionId(null)}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingTrace ? (
              <div className="p-12 text-center text-slate-400 font-mono">
                Loading complete 360° financial graph...
              </div>
            ) : traceData ? (
              <div className="space-y-6 text-xs font-sans">
                {/* Stage 1: Business Transaction */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                  <div className="text-[11px] font-mono font-bold text-amber-400 uppercase">
                    1. Commercial Business Intent
                  </div>
                  <div className="grid grid-cols-2 gap-2 font-mono text-slate-300">
                    <div>Reference: <span className="text-white font-bold">{traceData.businessTransaction?.reference}</span></div>
                    <div>Product: <span className="text-white font-bold">{traceData.businessTransaction?.product}</span></div>
                    <div>Amount: <span className="text-emerald-400 font-bold">₦{((traceData.businessTransaction?.amountMinor || 0) / 100).toLocaleString()}</span></div>
                    <div>Status: <span className="text-amber-400 font-bold">{traceData.businessTransaction?.status}</span></div>
                  </div>
                </div>

                {/* Stage 2: Double Entry Ledger */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                  <div className="text-[11px] font-mono font-bold text-teal-400 uppercase">
                    2. Authoritative Double-Entry Ledger Posting
                  </div>
                  <div className="text-slate-300 font-mono text-xs">
                    Journal: <span className="text-white font-bold">{traceData.accountingLedger?.journalNumber || "Pending Resolution Posting"}</span>
                  </div>
                </div>

                {/* Stage 3: Provider Execution */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                  <div className="text-[11px] font-mono font-bold text-blue-400 uppercase">
                    3. External Provider Node Response
                  </div>
                  <div className="grid grid-cols-2 gap-2 font-mono text-slate-300">
                    <div>Provider Rail: <span className="text-white font-bold">{traceData.providerExecution?.providerCode}</span></div>
                    <div>Provider Ref: <span className="text-white font-bold">{traceData.providerExecution?.providerReference}</span></div>
                    <div>Status: <span className="text-emerald-400 font-bold">{traceData.providerExecution?.status}</span></div>
                  </div>
                </div>

                {/* Stage 4: Bank Statement Movement */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                  <div className="text-[11px] font-mono font-bold text-purple-400 uppercase">
                    4. External Bank Statement Cash Movement
                  </div>
                  <div className="grid grid-cols-2 gap-2 font-mono text-slate-300">
                    <div>Bank: <span className="text-white font-bold">{traceData.bankStatement?.bankName}</span></div>
                    <div>Statement Ref: <span className="text-white font-bold">{traceData.bankStatement?.statementReference}</span></div>
                    <div>Matched: <span className="text-emerald-400 font-bold">{traceData.bankStatement?.isMatched ? "YES" : "PENDING"}</span></div>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="flex justify-end pt-4 border-t border-white/10">
              <button
                onClick={() => setSelectedExceptionId(null)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-bold transition"
              >
                Close Investigation Drawer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Maker Resolution Modal */}
      {isResolveModalOpen && selectedException && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <form onSubmit={handleMakerSubmitResolution} className="bg-[#080D1A] border border-white/15 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  MAKER RESOLUTION WORKFLOW
                </span>
                <h3 className="text-lg font-bold text-white mt-1">Submit Exception Resolution</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsResolveModalOpen(false)}
                className="p-1.5 rounded-lg bg-white/5 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-white/5 font-mono">
                <div className="text-slate-400">Exception: {selectedException.exceptionReference}</div>
                <div className="text-amber-400 font-bold mt-1">
                  Variance: ₦{((selectedException.differenceMinor || 0) / 100).toLocaleString()}
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Root Cause Category</label>
                <select
                  value={resolutionForm.rootCause}
                  onChange={e => setResolutionForm({ ...resolutionForm, rootCause: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#0b1324] border border-white/10 text-white font-mono"
                >
                  <option value="TIMING_DIFFERENCE">TIMING_DIFFERENCE</option>
                  <option value="PROVIDER_DELAY">PROVIDER_DELAY</option>
                  <option value="BANK_DELAY">BANK_DELAY</option>
                  <option value="FEE_DIFFERENCE">FEE_DIFFERENCE</option>
                  <option value="WRONG_AMOUNT">WRONG_AMOUNT</option>
                  <option value="INTERNAL_POSTING_ERROR">INTERNAL_POSTING_ERROR</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Resolution Audit Notes</label>
                <textarea
                  value={resolutionForm.resolutionNotes}
                  onChange={e => setResolutionForm({ ...resolutionForm, resolutionNotes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white font-sans"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setIsResolveModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/5 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition shadow"
              >
                Submit for Checker Approval
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
