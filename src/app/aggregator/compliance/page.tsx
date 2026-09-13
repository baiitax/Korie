"use client";

import React, { useState } from "react";
import { useAggregator } from "@/components/aggregator/AggregatorContext";
import {
  FileCheck,
  CheckCircle2,
  Clock,
  XCircle,
  Search,
} from "lucide-react";

export default function AggregatorCompliancePage() {
  const { complianceRecords, decideComplianceRecord, t } = useAggregator();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [feedback, setFeedback] = useState<{ id: string; message: string; ok: boolean } | null>(null);

  const filteredCompliance = complianceRecords.filter((c) => {
    const matchesSearch =
      c.entityName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.documentType.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleApprove = async (id: string, entityType: "AGENT" | "MERCHANT") => {
    setBusyId(id);
    setFeedback(null);
    const result = await decideComplianceRecord(id, entityType, "APPROVED");
    setBusyId(null);
    setFeedback({ id, message: result.success ? "Document approved." : result.message || "Failed to approve.", ok: result.success });
  };

  const handleRejectSubmit = async (id: string, entityType: "AGENT" | "MERCHANT") => {
    if (!rejectionReason.trim()) return;
    setBusyId(id);
    setFeedback(null);
    const result = await decideComplianceRecord(id, entityType, "REJECTED", rejectionReason.trim());
    setBusyId(null);
    setRejectingId(null);
    setFeedback({ id, message: result.success ? "Document rejected." : result.message || "Failed to reject.", ok: result.success });
    setRejectionReason("");
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-[var(--foreground)]">Compliance & KYC / KYB Verification</h1>
        <p className="text-xs text-[var(--foreground-muted)]">
          Review and decide agent KYC / merchant KYB documents for your network. Approve or reject with a recorded audit trail.
        </p>
      </div>

      {/* Filters Bar */}
      <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)]" />
            <input
              type="text"
              placeholder="Search entity name or document type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-xs text-[var(--foreground)] placeholder-[var(--foreground-muted)] focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-xs text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING_REVIEW">PENDING_REVIEW</option>
              <option value="APPROVED">APPROVED</option>
              <option value="REJECTED">REJECTED</option>
            </select>
          </div>
        </div>
      </div>

      {/* Compliance Table */}
      <div className="rounded-3xl bg-[var(--surface)] border border-[var(--border)] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--surface-2)] text-[var(--foreground-muted)] font-mono uppercase text-[10px] border-b border-[var(--border)]">
              <tr>
                <th className="px-4 py-3">Entity Name</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Territory</th>
                <th className="px-4 py-3">Document Type</th>
                <th className="px-4 py-3">Submitted Date</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Decision</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] font-medium">
              {filteredCompliance.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-[var(--foreground-muted)]">
                    No compliance records match your filters.
                  </td>
                </tr>
              )}
              {filteredCompliance.map((c) => (
                <tr key={c.id} className="hover:bg-[var(--surface-2)] transition-colors align-top">
                  <td className="px-4 py-3.5 font-bold text-[var(--foreground)]">{c.entityName}</td>
                  <td className="px-4 py-3.5">
                    <span className="px-2 py-0.5 rounded bg-[var(--surface-2)] text-[10px] font-mono text-teal-600 dark:text-teal-300">
                      {c.entityType}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-[var(--foreground)]">{c.territoryName}</td>
                  <td className="px-4 py-3.5 font-mono text-[var(--foreground)]">{c.documentType}</td>
                  <td className="px-4 py-3.5 font-mono text-[var(--foreground-muted)]">{c.submittedAt.split("T")[0]}</td>
                  <td className="px-4 py-3.5 text-center">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                        c.status === "APPROVED"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                          : c.status === "REJECTED"
                          ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                          : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                      }`}
                    >
                      {c.status === "APPROVED" ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : c.status === "REJECTED" ? (
                        <XCircle className="w-3 h-3" />
                      ) : (
                        <Clock className="w-3 h-3" />
                      )}
                      <span>{c.status}</span>
                    </span>
                    {c.reviewNotes && c.status === "REJECTED" && (
                      <div className="mt-1 text-[10px] text-[var(--foreground-muted)] max-w-[160px] mx-auto">{c.reviewNotes}</div>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    {c.status === "PENDING_REVIEW" || c.status === "NEEDS_MORE_INFO" ? (
                      rejectingId === c.id ? (
                        <div className="flex flex-col items-end gap-1.5 min-w-[220px]">
                          <textarea
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="Rejection reason (required)"
                            rows={2}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-[11px] text-[var(--foreground)] placeholder-[var(--foreground-muted)] focus:outline-none focus:ring-1 focus:ring-rose-500"
                          />
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => {
                                setRejectingId(null);
                                setRejectionReason("");
                              }}
                              className="px-2.5 py-1 rounded-lg bg-[var(--surface-3)] text-[var(--foreground-muted)] text-[11px] font-bold"
                            >
                              Cancel
                            </button>
                            <button
                              disabled={busyId === c.id || !rejectionReason.trim()}
                              onClick={() => handleRejectSubmit(c.id, c.entityType)}
                              className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold disabled:opacity-50"
                            >
                              {busyId === c.id ? "Submitting…" : "Confirm Reject"}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-1.5">
                          <button
                            disabled={busyId === c.id}
                            onClick={() => handleApprove(c.id, c.entityType)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 text-[11px] font-bold border border-emerald-500/20 disabled:opacity-50"
                          >
                            {busyId === c.id ? "Saving…" : "Approve"}
                          </button>
                          <button
                            disabled={busyId === c.id}
                            onClick={() => {
                              setRejectingId(c.id);
                              setRejectionReason("");
                            }}
                            className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-300 text-[11px] font-bold border border-rose-500/20 disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      )
                    ) : (
                      <span className="text-[10px] text-[var(--foreground-muted)]">Decided</span>
                    )}
                    {feedback?.id === c.id && (
                      <div className={`mt-1.5 text-[10px] font-semibold ${feedback.ok ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                        {feedback.message}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
