"use client";

import React, { useState } from "react";
import { useMerchant } from "@/components/merchant/MerchantContext";
import { getMerchantAccessToken } from "@/lib/merchant/merchantSession";
import { FileSpreadsheet, Download } from "lucide-react";

const REPORTS_LIST = [
  {
    id: "DAILY_Z_REPORT",
    title: "Daily End-of-Day Z-Report",
    description: "Every transaction recorded today across all channels — reference, amount, fee, and status.",
    period: "Today",
    format: "CSV",
  },
  {
    id: "SETTLEMENT_STATEMENT",
    title: "Settlement Statement",
    description: "Every settlement batch generated for this business, gross/fees/net and destination bank.",
    period: "All Time",
    format: "CSV",
  },
  {
    id: "BRANCH_COMPARATIVE",
    title: "Multi-Branch Comparative Report",
    description: "Store-by-store sales totals across all your registered branches.",
    period: "All Time",
    format: "CSV",
  },
  {
    id: "TRANSACTION_LEDGER",
    title: "Full Transaction Ledger",
    description: "Complete list of your most recent payment transactions (up to 1,000 rows).",
    period: "Recent",
    format: "CSV",
  },
];

export default function MerchantReportsPage() {
  const { merchant, t } = useMerchant();
  const [downloadingReport, setDownloadingReport] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleDownload = async (id: string) => {
    setDownloadingReport(id);
    setErrorMessage(null);
    try {
      const token = await getMerchantAccessToken();
      const res = await fetch(`/api/v1/merchant/reports?type=${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setErrorMessage("Could not generate report.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const disposition = res.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename="(.+)"/);
      a.download = match ? match[1] : `${id.toLowerCase()}-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setErrorMessage("Network error generating report.");
    } finally {
      setDownloadingReport(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-white">Merchant Financial Reports</h1>
        <p className="text-xs text-slate-400">
          Real CSV exports computed live from your own transactions, settlements, and branches — no sample data.
        </p>
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono">
          {errorMessage}
        </div>
      )}

      {/* Reports List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {REPORTS_LIST.map((report) => (
          <div
            key={report.id}
            className="p-6 rounded-3xl bg-[#0a1122] border border-white/10 hover:border-teal-500/30 transition-all flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white/5 text-slate-300 border border-white/10">
                  {report.format}
                </span>
              </div>

              <h3 className="text-base font-bold text-white mt-3">{report.title}</h3>
              <p className="text-xs text-slate-400 mt-1">{report.description}</p>
            </div>

            <div className="pt-2 border-t border-white/5 flex items-center justify-between">
              <span className="text-[11px] font-mono text-slate-400">{report.period}</span>
              <button
                onClick={() => handleDownload(report.id)}
                disabled={downloadingReport === report.id}
                className="px-3.5 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{downloadingReport === report.id ? "Generating..." : "Download"}</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
