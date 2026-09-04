"use client";

import React, { useState, useEffect } from "react";
import { 
  Building2, 
  Send, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  PlusCircle, 
  RefreshCw, 
  ShieldCheck, 
  DollarSign, 
  FileCheck2,
  X,
  Check,
  Lock,
  ArrowRight
} from "lucide-react";

export default function SettlementsAdminPage() {
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [newBatchForm, setNewBatchForm] = useState({
    partnerId: "merch_shoprite_ng",
    partnerName: "Shoprite Supermarkets Nigeria",
    currency: "NGN",
    grossAmount: "35000000",
    feeDeductions: "525000",
    reserveRateBps: "500", // 5%
    transactionCount: "580",
    payoutBankCode: "058",
    payoutAccountNumber: "0192837465",
    payoutAccountName: "Shoprite Retail NG Ltd",
    settlementWindow: "T+1",
  });

  const fetchBatches = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/core/v1/settlements");
      const json = await res.json();
      if (json.data?.batches) {
        setBatches(json.data.batches);
      }
    } catch (e) {
      console.error("Failed to load settlements:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/core/v1/settlements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settlementType: "MERCHANT_SETTLEMENT",
          partnerId: newBatchForm.partnerId,
          partnerName: newBatchForm.partnerName,
          partnerType: "MERCHANT",
          countryCode: "NG",
          currency: newBatchForm.currency,
          grossAmountMinor: Math.round(parseFloat(newBatchForm.grossAmount) * 100),
          feeDeductionsMinor: Math.round(parseFloat(newBatchForm.feeDeductions) * 100),
          reserveRateBps: parseInt(newBatchForm.reserveRateBps, 10),
          transactionCount: parseInt(newBatchForm.transactionCount, 10),
          payoutBankCode: newBatchForm.payoutBankCode,
          payoutAccountNumber: newBatchForm.payoutAccountNumber,
          payoutAccountName: newBatchForm.payoutAccountName,
          settlementWindow: newBatchForm.settlementWindow,
          makerId: "usr_settle_maker_01",
          makerEmail: "settlement.maker@koriepay.internal",
        }),
      });
      if (res.ok) {
        setIsModalOpen(false);
        await fetchBatches();
      }
    } catch (e) {
      console.error("Create batch error:", e);
    }
  };

  const handleApproveBatch = async (batchId: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/core/v1/settlements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "APPROVE_BATCH",
          batchId,
          checkerId: "usr_checker_dir_02",
          checkerEmail: "finance.director@koriepay.internal",
        }),
      });
      if (res.ok) {
        await fetchBatches();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleExecutePayout = async (batchId: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/core/v1/settlements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "EXECUTE_PAYOUT",
          batchId,
          operator: "SETTLEMENT_OFFICER",
        }),
      });
      if (res.ok) {
        await fetchBatches();
      }
    } catch (e) {
      console.error(e);
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
            <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1.5">
              <Building2 className="w-3 h-3" />
              SETTLEMENT & CLEARING ENGINE
            </span>
            <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              FORMULA: GROSS - FEES - RESERVES = NET
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white mt-1">Merchant & Partner Settlements</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Automated batch settlement calculations, rolling reserve withholdings, and Maker-Checker commercial bank payouts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchBatches}
            disabled={loading}
            className="p-2.5 rounded-xl bg-slate-900 border border-white/10 text-slate-300 hover:text-white transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-emerald-400 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-emerald-500/20"
          >
            <PlusCircle className="w-4 h-4" />
            Create Settlement Batch (Maker)
          </button>
        </div>
      </div>

      {/* Settlement Batches Table */}
      <div className="rounded-3xl bg-[#080D1A]/90 border border-white/10 shadow-2xl overflow-hidden backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-[10px] font-mono uppercase text-slate-400 bg-slate-950/60 border-b border-white/10">
                <th className="p-4 font-semibold">Batch Number</th>
                <th className="p-4 font-semibold">Merchant / Partner</th>
                <th className="p-4 font-semibold">Destination Bank</th>
                <th className="p-4 font-semibold">Gross Volume</th>
                <th className="p-4 font-semibold">MDR & Deductions</th>
                <th className="p-4 font-semibold">Rolling Reserve (5%)</th>
                <th className="p-4 font-semibold">Net Payout</th>
                <th className="p-4 font-semibold">State</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono">
              {batches.map((b) => (
                <tr key={b.id} className="hover:bg-white/5 transition-colors">
                  <td className="p-4 font-bold text-white flex items-center gap-1.5">
                    <Lock className="w-3 h-3 text-emerald-400" />
                    {b.batchReference || b.batchNumber}
                  </td>
                  <td className="p-4 text-slate-200 font-sans font-semibold">{b.partnerName}</td>
                  <td className="p-4 text-slate-400 font-sans text-[11px]">
                    {b.payoutAccountName} ({b.payoutAccountNumber})
                  </td>
                  <td className="p-4 font-bold text-white">
                    ₦{((b.grossAmountMinor || b.grossAmount || 0) / 100).toLocaleString()}
                  </td>
                  <td className="p-4 text-red-300">
                    -₦{((b.feesMinor || b.feeDeductions || 0) / 100).toLocaleString()}
                  </td>
                  <td className="p-4 text-amber-400">
                    -₦{((b.reservesHeldMinor || b.reserveDeductions || 0) / 100).toLocaleString()}
                  </td>
                  <td className="p-4 font-bold text-emerald-400">
                    ₦{((b.netAmountMinor || b.netPayable || 0) / 100).toLocaleString()}
                  </td>
                  <td className="p-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        b.status === "SETTLED"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : b.status === "APPROVED"
                          ? "bg-teal-500/10 text-teal-400 border border-teal-500/20"
                          : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      }`}
                    >
                      ● {b.status}
                    </span>
                  </td>
                  <td className="p-4 text-right font-sans space-x-2">
                    {b.status === "PENDING_REVIEW" && (
                      <button
                        onClick={() => handleApproveBatch(b.id)}
                        disabled={loading}
                        className="px-3 py-1 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition inline-flex items-center gap-1 shadow"
                      >
                        <Check className="w-3 h-3" />
                        Approve (Checker)
                      </button>
                    )}

                    {b.status === "APPROVED" && (
                      <button
                        onClick={() => handleExecutePayout(b.id)}
                        disabled={loading}
                        className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition inline-flex items-center gap-1 shadow"
                      >
                        <Send className="w-3 h-3" />
                        Disburse Payout
                      </button>
                    )}

                    {b.status === "SETTLED" && (
                      <span className="text-emerald-400 text-xs font-mono">
                        Disbursed ({b.journalEntryId ? b.journalEntryId.slice(0, 8) : "JE-POSTED"})
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Batch Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <form onSubmit={handleCreateBatch} className="bg-[#080D1A] border border-white/15 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  MAKER STEP 1 OF 2
                </span>
                <h3 className="text-lg font-bold text-white mt-1">Create Settlement Batch</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg bg-white/5 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Partner Name</label>
                <input
                  type="text"
                  value={newBatchForm.partnerName}
                  onChange={e => setNewBatchForm({ ...newBatchForm, partnerName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white font-sans"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Gross Amount (₦)</label>
                  <input
                    type="number"
                    value={newBatchForm.grossAmount}
                    onChange={e => setNewBatchForm({ ...newBatchForm, grossAmount: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Fee Deductions (₦)</label>
                  <input
                    type="number"
                    value={newBatchForm.feeDeductions}
                    onChange={e => setNewBatchForm({ ...newBatchForm, feeDeductions: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Bank Account #</label>
                  <input
                    type="text"
                    value={newBatchForm.payoutAccountNumber}
                    onChange={e => setNewBatchForm({ ...newBatchForm, payoutAccountNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Bank Name</label>
                  <input
                    type="text"
                    value={newBatchForm.payoutAccountName}
                    onChange={e => setNewBatchForm({ ...newBatchForm, payoutAccountName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white font-sans"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/5 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition shadow"
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
