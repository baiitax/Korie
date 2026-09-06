"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useMerchant } from "@/components/merchant/MerchantContext";
import { merchantApiFetch } from "@/lib/merchant/merchantSession";
import {
  Building2,
  ArrowUpRight,
  ShieldCheck,
  Check,
  AlertTriangle,
  Loader2,
} from "lucide-react";

interface PayoutRequest {
  id: string;
  amount: number;
  currency: string;
  destination_bank: string;
  destination_account: string;
  status: string;
  created_at: string;
  completed_at: string | null;
}

const STATUS_STYLES: Record<string, string> = {
  PENDING_PROVIDER_INTEGRATION: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  PROCESSING: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
  COMPLETED: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  FAILED: "bg-red-500/10 text-red-400 border border-red-500/20",
  CANCELLED: "bg-slate-500/10 text-slate-400 border border-slate-500/20",
};

export default function MerchantWalletPage() {
  const { merchant, formatCurrency, formatDate, isBalanceHidden, refreshAll } = useMerchant();

  const [payoutAmount, setPayoutAmount] = useState<string>("");
  const [isPayoutProcessing, setIsPayoutProcessing] = useState(false);
  const [payoutSuccess, setPayoutSuccess] = useState<{ amount: number } | null>(null);
  const [payoutError, setPayoutError] = useState<string | null>(null);

  const [payoutHistory, setPayoutHistory] = useState<PayoutRequest[]>([]);

  const [autoSweepEnabled, setAutoSweepEnabled] = useState(true);
  const [sweepFrequency, setSweepFrequency] = useState("DAILY_EOD");
  const [isSweepSaving, setIsSweepSaving] = useState(false);
  const [isLoadingSweep, setIsLoadingSweep] = useState(true);

  const loadSweepSettings = useCallback(async () => {
    try {
      const res = await merchantApiFetch("/api/v1/merchant/settings/sweep");
      const json = await res.json();
      if (res.ok && json.status === "success") {
        setAutoSweepEnabled(json.data.autoSweepEnabled);
        setSweepFrequency(json.data.sweepFrequency);
      }
    } catch {
    } finally {
      setIsLoadingSweep(false);
    }
  }, []);

  const loadPayoutHistory = useCallback(async () => {
    try {
      const res = await merchantApiFetch("/api/v1/merchant/wallet/payout");
      const json = await res.json();
      if (res.ok && json.status === "success") setPayoutHistory(json.data.payouts);
    } catch {}
  }, []);

  useEffect(() => {
    loadSweepSettings();
    loadPayoutHistory();
  }, [loadSweepSettings, loadPayoutHistory]);

  const saveSweepSettings = async (nextEnabled: boolean, nextFrequency: string) => {
    setIsSweepSaving(true);
    try {
      await merchantApiFetch("/api/v1/merchant/settings/sweep", {
        method: "PUT",
        body: JSON.stringify({ autoSweepEnabled: nextEnabled, sweepFrequency: nextFrequency }),
      });
    } catch {
    } finally {
      setIsSweepSaving(false);
    }
  };

  const handleToggleSweep = () => {
    const next = !autoSweepEnabled;
    setAutoSweepEnabled(next);
    saveSweepSettings(next, sweepFrequency);
  };

  const handleFrequencyChange = (freq: string) => {
    setSweepFrequency(freq);
    saveSweepSettings(autoSweepEnabled, freq);
  };

  const handleManualPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payoutAmount || Number(payoutAmount) <= 0) return;

    setIsPayoutProcessing(true);
    setPayoutError(null);
    try {
      const res = await merchantApiFetch("/api/v1/merchant/wallet/payout", {
        method: "POST",
        body: JSON.stringify({ amount: Number(payoutAmount) }),
      });
      const json = await res.json();
      if (res.ok && json.status === "success") {
        setPayoutSuccess({ amount: Number(payoutAmount) });
        await Promise.all([refreshAll(), loadPayoutHistory()]);
        setTimeout(() => {
          setPayoutSuccess(null);
          setPayoutAmount("");
        }, 4000);
      } else {
        setPayoutError(json?.error?.message || "Could not create payout request.");
      }
    } catch {
      setPayoutError("Network error requesting payout.");
    } finally {
      setIsPayoutProcessing(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-white">Merchant Wallet & Settlements</h1>
        <p className="text-xs text-slate-400">
          Real ledger balance, on-demand payout requests, and auto-sweep preferences.
        </p>
      </div>

      {/* Grid: Wallet Cards & Manual Payout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Balances and Sweep Settings */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 rounded-3xl bg-[#0a1122] border border-white/10 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-mono uppercase text-teal-400 font-bold">
                  Available Payout Balance
                </div>
                <div className="text-3xl sm:text-4xl font-black text-white font-mono mt-1">
                  {isBalanceHidden ? "••••••••" : formatCurrency(merchant.availableBalance)}
                </div>
              </div>
              <div className="p-3 bg-slate-900 rounded-2xl border border-white/5 space-y-0.5 text-xs">
                <div className="text-slate-400 font-mono">Linked Settlement Account:</div>
                <div className="font-bold text-white flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-teal-400" />
                  <span>
                    {merchant.settlementBank || "Not yet configured"} • {merchant.settlementAccountMasked || "—"}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-white/5">
              <div className="p-3 bg-slate-900/60 rounded-2xl border border-white/5">
                <div className="text-[10px] font-mono text-slate-400 uppercase">Pending T+1 Batch</div>
                <div className="text-lg font-bold font-mono text-amber-400 mt-0.5">
                  {formatCurrency(merchant.pendingSettlement)}
                </div>
              </div>
              <div className="p-3 bg-slate-900/60 rounded-2xl border border-white/5">
                <div className="text-[10px] font-mono text-slate-400 uppercase">Collateral Reserve (0%)</div>
                <div className="text-lg font-bold font-mono text-slate-300 mt-0.5">{formatCurrency(0)}</div>
              </div>
              <div className="p-3 bg-slate-900/60 rounded-2xl border border-white/5">
                <div className="text-[10px] font-mono text-slate-400 uppercase">Settlement Tier</div>
                <div className="text-lg font-bold text-teal-400 mt-0.5">{merchant.tier}</div>
              </div>
            </div>
          </div>

          {/* Sweep Rules */}
          <div className="p-6 rounded-3xl bg-[#0a1122] border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white text-base">Automatic Bank Sweep Preference</h3>
                <p className="text-xs text-slate-400">
                  Controls how your settlement batches are scheduled — saved to your real account.
                </p>
              </div>
              <button
                onClick={handleToggleSweep}
                disabled={isLoadingSweep || isSweepSaving}
                className={`w-12 h-6 rounded-full transition-colors p-1 flex items-center disabled:opacity-50 ${
                  autoSweepEnabled ? "bg-teal-500 justify-end" : "bg-slate-700 justify-start"
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow-md" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div
                onClick={() => handleFrequencyChange("DAILY_EOD")}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  sweepFrequency === "DAILY_EOD"
                    ? "bg-teal-500/10 border-teal-500 text-white"
                    : "bg-slate-900 border-white/5 text-slate-400"
                }`}
              >
                <div className="font-bold text-xs text-white">End-of-Day Auto-Sweep (23:59 WAT)</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Net daily revenue included in the nightly settlement run.
                </div>
              </div>

              <div
                onClick={() => handleFrequencyChange("INSTANT_PER_TX")}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  sweepFrequency === "INSTANT_PER_TX"
                    ? "bg-teal-500/10 border-teal-500 text-white"
                    : "bg-slate-900 border-white/5 text-slate-400"
                }`}
              >
                <div className="font-bold text-xs text-white">Per-Transaction Forwarding</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Preference saved for when instant-forwarding rails are enabled for your tier.
                </div>
              </div>
            </div>
          </div>

          {/* Payout History */}
          <div className="rounded-3xl bg-[#091020] border border-white/10 overflow-hidden shadow-xl">
            <div className="p-4 sm:p-5 border-b border-white/10 bg-[#0c1426]">
              <h3 className="font-bold text-white text-sm">Payout Request History</h3>
            </div>
            <div className="overflow-x-auto">
              {payoutHistory.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">No payout requests yet.</div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#080d1a] text-slate-400 font-mono uppercase text-[10px] border-b border-white/5">
                    <tr>
                      <th className="px-4 py-3">Requested</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                      <th className="px-4 py-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-medium">
                    {payoutHistory.map((p) => (
                      <tr key={p.id}>
                        <td className="px-4 py-3.5 font-mono text-slate-400">{formatDate(p.created_at)}</td>
                        <td className="px-4 py-3.5 text-right font-mono font-bold text-white">
                          {formatCurrency(Number(p.amount))}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${STATUS_STYLES[p.status] || "bg-slate-500/10 text-slate-400"}`}>
                            {p.status.replace(/_/g, " ")}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Right Col: On-Demand Manual Payout */}
        <div className="p-6 rounded-3xl bg-[#0a1122] border border-white/10 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div>
              <h3 className="font-bold text-white text-base">On-Demand Payout Request</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Reserves funds from your available balance and queues a payout request pending our bank-rail integration.
              </p>
            </div>

            {payoutSuccess ? (
              <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-2">
                <Check className="w-10 h-10 text-emerald-400 mx-auto" />
                <div className="font-bold text-white text-sm">Payout Requested!</div>
                <div className="text-xs text-slate-300 font-mono">
                  {formatCurrency(payoutSuccess.amount)} reserved, pending settlement to {merchant.settlementBank}.
                </div>
              </div>
            ) : (
              <form onSubmit={handleManualPayout} className="space-y-4">
                <div>
                  <label className="text-[11px] font-mono text-slate-400 block mb-1">
                    Payout Amount ({merchant.currency})
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-teal-400 font-bold">₦</span>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 1,000,000"
                      max={merchant.availableBalance}
                      value={payoutAmount}
                      onChange={(e) => setPayoutAmount(e.target.value)}
                      className="w-full pl-8 pr-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white font-mono font-bold text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                </div>

                <div className="p-3 bg-slate-900/60 rounded-xl border border-white/5 space-y-1 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Transfer Fee:</span>
                    <span className="text-white font-mono">₦0.00 (Tier-1 Free)</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Status After Request:</span>
                    <span className="text-amber-400 font-bold">Pending Bank Rail</span>
                  </div>
                </div>

                {payoutError && (
                  <div className="text-[11px] text-red-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> {payoutError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isPayoutProcessing || !payoutAmount}
                  className="w-full py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-teal-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isPayoutProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUpRight className="w-4 h-4" />}
                  <span>{isPayoutProcessing ? "Submitting Request..." : "Request Payout"}</span>
                </button>
              </form>
            )}
          </div>

          <div className="p-3 rounded-xl bg-slate-900/40 border border-white/5 text-[11px] text-slate-500 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0" />
            <span>Requests are reserved against your real ledger balance immediately and settled once bank-rail dispatch is enabled.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
