"use client";

import React, { useState } from "react";
import { useAggregator } from "@/components/aggregator/AggregatorContext";
import {
  FileText,
  Download,
  Calendar,
  FileSpreadsheet,
} from "lucide-react";

export default function AggregatorReportsPage() {
  const { aggregator, formatCurrency, t } = useAggregator();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const reports = [
    {
      id: "network-summary-daily",
      title: "Daily Consolidated Network Performance Statement",
      description: "Complete agency cash-in/out, POS card transactions, and dynamic NUBAN bank transfer volumes.",
      period: "Today (Daily EOD)",
      format: "PDF / CSV",
    },
    {
      id: "commission-settlement-monthly",
      title: "Providus Bank Commission Settlement Statement",
      description: "Official NIBSS batch settlement receipts, interchange splits, and net payouts.",
      period: "August 2026",
      format: "PDF",
    },
    {
      id: "agent-productivity-quarterly",
      title: "Territory & Agent Node Productivity Audit",
      description: "Store-by-store sales matrix comparing Kano, Kaduna, Abuja, and Niamey cross-border depot.",
      period: "Q3 2026",
      format: "Excel / CSV",
    },
    {
      id: "regulatory-kyc-compliance",
      title: "CBN / BCEAO Regulatory KYC Compliance Audit",
      description: "NIN, BVN, and CAC validation ledger for all enrolled network agents and merchants.",
      period: "Trailing 90 Days",
      format: "PDF",
    },
  ];

  const handleDownload = (id: string, title: string) => {
    setDownloadingId(id);
    setTimeout(() => {
      setDownloadingId(null);
      const content = `KORIEPAY AGGREGATOR REPORT: ${title}\nAggregator: ${aggregator.name}\nGenerated: ${new Date().toISOString()}\nStatus: Verified\n`;
      const blob = new Blob([content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${id}-${Date.now()}.txt`;
      a.click();
    }, 1200);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-white">Aggregator Financial & Network Reports</h1>
        <p className="text-xs text-slate-400">
          Official statutory statements, commission settlement journals, and regulatory compliance audits
        </p>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reports.map((r) => (
          <div
            key={r.id}
            className="p-6 rounded-3xl bg-[#091122] border border-white/10 hover:border-teal-500/30 transition-all flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white/5 text-slate-300 border border-white/10">
                  {r.format}
                </span>
              </div>

              <h3 className="text-base font-bold text-white mt-3">{r.title}</h3>
              <p className="text-xs text-slate-400 mt-1">{r.description}</p>
            </div>

            <div className="pt-2 border-t border-white/5 flex items-center justify-between">
              <span className="text-[11px] font-mono text-slate-400">{r.period}</span>
              <button
                onClick={() => handleDownload(r.id, r.title)}
                disabled={downloadingId === r.id}
                className="px-3.5 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{downloadingId === r.id ? "Generating..." : "Download"}</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
