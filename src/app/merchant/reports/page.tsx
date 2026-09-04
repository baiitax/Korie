"use client";

import React, { useState } from "react";
import { useMerchant } from "@/components/merchant/MerchantContext";
import {
  FileSpreadsheet,
  Download,
  Calendar,
  FileText,
  Printer,
  CheckCircle2,
  Building2,
} from "lucide-react";

export default function MerchantReportsPage() {
  const { merchant, branches, formatCurrency, t } = useMerchant();
  const [downloadingReport, setDownloadingReport] = useState<string | null>(null);

  const reportsList = [
    {
      id: "z-report-daily",
      title: "Daily End-of-Day Z-Report",
      description: "Complete register cash, POS card slips, and dynamic NUBAN bank transfer reconciliation.",
      period: "Today (Daily EOD)",
      format: "PDF / CSV",
    },
    {
      id: "providus-settlement-monthly",
      title: "Providus Bank Settlement Audit Statement",
      description: "Official NIBSS batch settlement receipts, transaction count, interchange fees, and net payouts.",
      period: "August 2026",
      format: "PDF",
    },
    {
      id: "vat-tax-summary",
      title: "FIRS / Tax VAT Summary Report",
      description: "7.5% Value Added Tax deductions collected on commercial invoices for statutory filings.",
      period: "Q3 2026",
      format: "Excel / PDF",
    },
    {
      id: "branch-comparative",
      title: "Multi-Branch Profit & Loss Distribution",
      description: "Store-by-store sales matrix comparing Victoria Island, Kano Central, and Niamey cross-border depot.",
      period: "Trailing 90 Days",
      format: "CSV",
    },
  ];

  const handleDownload = (id: string, title: string) => {
    setDownloadingReport(id);
    setTimeout(() => {
      setDownloadingReport(null);
      // create simulated download
      const content = `KORIEPAY MERCHANT REPORT: ${title}\nMerchant: ${merchant.businessName}\nGenerated: ${new Date().toISOString()}\nStatus: Verified\n`;
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
        <h1 className="text-xl sm:text-2xl font-black text-white">Merchant Financial & Tax Reports</h1>
        <p className="text-xs text-slate-400">
          Statutory financial statements, End-of-Day POS Z-Reports, VAT returns, and settlement proofs.
        </p>
      </div>

      {/* Reports List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reportsList.map((report) => (
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
                onClick={() => handleDownload(report.id, report.title)}
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
