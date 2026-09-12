"use client";

import React, { useState } from "react";
import { useAggregator } from "@/components/aggregator/AggregatorContext";
import {
  FileCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  Search,
  Filter,
} from "lucide-react";

export default function AggregatorCompliancePage() {
  const { complianceRecords, t } = useAggregator();
  const [searchTerm, setSearchTerm] = useState("");

  const filteredCompliance = complianceRecords.filter(
    (c) =>
      c.entityName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.documentType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-[var(--foreground)]">Compliance & KYC / KYB Verification</h1>
        <p className="text-xs text-[var(--foreground-muted)]">
          Supervise regulatory document filings, NIN/BVN validations, CAC incorporation certificates, and compliance queues
        </p>
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
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] font-medium">
              {filteredCompliance.map((c) => (
                <tr key={c.id} className="hover:bg-[var(--surface-2)] transition-colors">
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
                          : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                      }`}
                    >
                      {c.status === "APPROVED" ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                      <span>{c.status}</span>
                    </span>
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
