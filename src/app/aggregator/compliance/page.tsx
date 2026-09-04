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
        <h1 className="text-xl sm:text-2xl font-black text-white">Compliance & KYC / KYB Verification</h1>
        <p className="text-xs text-slate-400">
          Supervise regulatory document filings, NIN/BVN validations, CAC incorporation certificates, and compliance queues
        </p>
      </div>

      {/* Compliance Table */}
      <div className="rounded-3xl bg-[#091122] border border-white/10 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#060a16] text-slate-400 font-mono uppercase text-[10px] border-b border-white/5">
              <tr>
                <th className="px-4 py-3">Entity Name</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Territory</th>
                <th className="px-4 py-3">Document Type</th>
                <th className="px-4 py-3">Submitted Date</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-medium">
              {filteredCompliance.map((c) => (
                <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3.5 font-bold text-white">{c.entityName}</td>
                  <td className="px-4 py-3.5">
                    <span className="px-2 py-0.5 rounded bg-white/5 text-[10px] font-mono text-teal-300">
                      {c.entityType}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-slate-300">{c.territoryName}</td>
                  <td className="px-4 py-3.5 font-mono text-slate-300">{c.documentType}</td>
                  <td className="px-4 py-3.5 font-mono text-slate-400">{c.submittedAt.split("T")[0]}</td>
                  <td className="px-4 py-3.5 text-center">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                        c.status === "APPROVED"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
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
