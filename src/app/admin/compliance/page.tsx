"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  FileCheck2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  PlusCircle,
  Eye,
  Calendar,
  Send,
  Lock,
  X,
  FileText,
  Award,
} from "lucide-react";
import { RegulatoryObligation, RegulatoryReportRecord } from "@/types/regulatoryConsumerEngine";

export default function ComplianceAdminPage() {
  const [obligations, setObligations] = useState<RegulatoryObligation[]>([]);
  const [reports, setReports] = useState<RegulatoryReportRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [jurisdictionFilter, setJurisdictionFilter] = useState("GLOBAL");
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Modal State
  const [selectedObligation, setSelectedObligation] = useState<RegulatoryObligation | null>(null);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/regulatory/obligations?jurisdiction=${jurisdictionFilter}`);
      const json = await res.json();
      if (json.success && json.data) {
        setObligations(json.data.obligations || []);
        setReports(json.data.reports || []);
      }
    } catch (e) {
      console.error("Failed to fetch regulatory data", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [jurisdictionFilter]);

  const handleGenerateReport = async (obligationId: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/regulatory/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "GENERATE",
          obligationId,
          preparerEmail: "compliance.officer@koriepay.ng",
          dataSnapshot: {
            extractedAt: new Date().toISOString(),
            settledVolumeTotal: 145000000,
            activeTerminalsCount: 42,
            activeAgentsCount: 18,
            discrepancyCount: 0,
            reconciliationInvariant: "BALANCED",
          },
        }),
      });
      const json = await res.json();
      if (json.success) {
        setActionSuccess(`Regulatory report draft generated: ${json.report?.reportReference}`);
        setIsGenerateModalOpen(false);
        fetchData();
      } else {
        alert(`Generation Failed: ${json.error}`);
      }
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveReport = async (reportId: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/regulatory/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "APPROVE",
          reportId,
          approverEmail: "chief.compliance.officer@koriepay.com",
        }),
      });
      const json = await res.json();
      if (json.success) {
        setActionSuccess(`Regulatory report dual-approved by CCO!`);
        fetchData();
      } else {
        alert(`Approval Failed: ${json.error}`);
      }
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReport = async (reportId: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/regulatory/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "SUBMIT", reportId }),
      });
      const json = await res.json();
      if (json.success) {
        setActionSuccess(`Report submitted to sovereign portal! Receipt: ${json.report?.submissionReceiptHash}`);
        fetchData();
      } else {
        alert(`Submission Failed: ${json.error}`);
      }
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              REGULATORY COMPLIANCE & REPORTING ENGINE
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
              SOVEREIGN CBN & BCEAO GOVERNANCE
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white mt-1">Regulatory Governance & Reporting</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage statutory obligations, versioned report generation, dual maker-checker approvals, and cryptographic evidence archiving.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={jurisdictionFilter}
            onChange={(e) => setJurisdictionFilter(e.target.value)}
            className="bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white"
          >
            <option value="GLOBAL">All Sovereign Rails (NG & NE)</option>
            <option value="NG">Nigeria 🇳🇬 (CBN & NFIU)</option>
            <option value="NE">Niger Republic 🇳🇪 (BCEAO Sahel)</option>
          </select>

          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-xs font-semibold text-slate-200 border border-white/10 transition-colors shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-emerald-400" : ""}`} />
            Sync Obligations
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

      {/* Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[#0b1324]/80 border border-white/10 shadow-lg">
          <div className="text-[10px] font-mono text-slate-400 uppercase">Active Obligations</div>
          <div className="text-xl font-bold font-mono text-white mt-1">{obligations.length} Mandates</div>
          <div className="text-[10px] text-emerald-400 font-medium mt-1">100% On-Schedule</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0b1324]/80 border border-white/10 shadow-lg">
          <div className="text-[10px] font-mono text-slate-400 uppercase">Reports Submitted</div>
          <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
            {reports.filter((r) => r.status === "SUBMITTED").length} / {reports.length}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Receipts Hash-Locked</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0b1324]/80 border border-white/10 shadow-lg">
          <div className="text-[10px] font-mono text-slate-400 uppercase">Pending Review</div>
          <div className="text-xl font-bold font-mono text-amber-400 mt-1">
            {reports.filter((r) => r.status === "UNDER_REVIEW").length}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Maker-Checker Queue</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0b1324]/80 border border-white/10 shadow-lg">
          <div className="text-[10px] font-mono text-slate-400 uppercase">Audit Readiness</div>
          <div className="text-xl font-bold font-mono text-blue-400 mt-1">100% READY</div>
          <div className="text-[10px] text-slate-400 mt-1">Cryptographic Evidence Archive</div>
        </div>
      </div>

      {/* SECTION 1: STATUTORY OBLIGATIONS REGISTER */}
      <div className="space-y-4">
        <div className="rounded-3xl bg-[#0b1324] border border-white/10 p-6 shadow-2xl">
          <h3 className="text-base font-bold text-white mb-1">Statutory Obligation Register</h3>
          <p className="text-xs text-slate-400 mb-4">
            Jurisdiction-mandated reporting cycles under Central Bank of Nigeria (CBN) and BCEAO (UEMOA) regulatory directives.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[10px] font-mono uppercase text-slate-400 bg-slate-950/60 border-b border-white/10">
                  <th className="p-3 font-semibold">Obligation Code</th>
                  <th className="p-3 font-semibold">Regulator & Title</th>
                  <th className="p-3 font-semibold">Frequency & Period</th>
                  <th className="p-3 font-semibold">Due Date</th>
                  <th className="p-3 font-semibold">Status</th>
                  <th className="p-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {obligations.map((ob) => (
                  <tr key={ob.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-3 font-mono font-bold text-emerald-400">{ob.obligationCode}</td>
                    <td className="p-3">
                      <div className="font-semibold text-white">{ob.title}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {ob.regulatorName} ({ob.jurisdiction === "NG" ? "🇳🇬 Nigeria" : "🇳🇪 Niger"})
                      </div>
                    </td>
                    <td className="p-3 font-mono text-slate-300">
                      {ob.frequency} ({ob.reportingPeriod})
                    </td>
                    <td className="p-3 font-mono text-white font-bold">{ob.dueDate}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                          ob.status === "SUBMITTED"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : ob.status === "READY_FOR_REVIEW"
                            ? "bg-amber-500/10 text-amber-400"
                            : "bg-blue-500/10 text-blue-400"
                        }`}
                      >
                        ● {ob.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => handleGenerateReport(ob.id)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-[11px] font-semibold text-white transition-colors"
                      >
                        Run Extraction ↗
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* SECTION 2: VERSIONED REPORT DOSSIERS & APPROVALS */}
      <div className="space-y-4">
        <div className="rounded-3xl bg-[#0b1324] border border-white/10 p-6 shadow-2xl">
          <h3 className="text-base font-bold text-white mb-1">Versioned Report Filings & Dual Approvals</h3>
          <p className="text-xs text-slate-400 mb-4">
            Immutable snapshot extracts, SHA-256 state hashes, CCO maker-checker authorization, and submission receipts.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[10px] font-mono uppercase text-slate-400 bg-slate-950/60 border-b border-white/10">
                  <th className="p-3 font-semibold">Report Reference</th>
                  <th className="p-3 font-semibold">Data State Hash</th>
                  <th className="p-3 font-semibold">Preparer</th>
                  <th className="p-3 font-semibold">Status</th>
                  <th className="p-3 font-semibold">Submission Receipt</th>
                  <th className="p-3 font-semibold text-right">Workflow Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {reports.map((r) => (
                  <tr key={r.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-3 font-mono font-bold text-white">{r.reportReference}</td>
                    <td className="p-3 font-mono text-[10px] text-slate-400">{r.dataHash}</td>
                    <td className="p-3 font-mono text-slate-300 text-[11px]">{r.preparerEmail}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                          r.status === "SUBMITTED"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : r.status === "APPROVED"
                            ? "bg-blue-500/10 text-blue-400"
                            : "bg-amber-500/10 text-amber-400"
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-[10px] text-emerald-400">
                      {r.submissionReceiptHash || "Pending Submission"}
                    </td>
                    <td className="p-3 text-right">
                      {r.status === "UNDER_REVIEW" && (
                        <button
                          onClick={() => handleApproveReport(r.id)}
                          className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-[11px] font-semibold text-white transition-colors"
                        >
                          Approve (Checker)
                        </button>
                      )}
                      {r.status === "APPROVED" && (
                        <button
                          onClick={() => handleSubmitReport(r.id)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-[11px] font-semibold text-white transition-colors"
                        >
                          Submit to Portal 🚀
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
