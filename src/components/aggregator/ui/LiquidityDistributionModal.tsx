"use client";

import React, { useState } from "react";
import { useAggregator } from "../AggregatorContext";
import {
  X,
  Zap,
  Wallet,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Building2,
  Lock,
} from "lucide-react";

export const LiquidityDistributionModal: React.FC = () => {
  const {
    isLiquidityModalOpen,
    closeLiquidityModal,
    agents,
    selectedAgentForLiquidity,
    aggregator,
    executeFloatRebalance,
    formatCurrency,
  } = useAggregator();

  const [selectedAgentId, setSelectedAgentId] = useState<string>(
    selectedAgentForLiquidity ? selectedAgentForLiquidity.id : agents[0]?.id || ""
  );
  const [amount, setAmount] = useState<string>("500000");
  const [pin, setPin] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resultSuccess, setResultSuccess] = useState<{ reference: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isLiquidityModalOpen) return null;

  const currentAgent =
    agents.find((a) => a.id === selectedAgentId) || selectedAgentForLiquidity || agents[0];

  const handleRebalance = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      setErrorMessage("Please specify a valid injection amount.");
      return;
    }
    if (numAmount > aggregator.availableLiquidity) {
      setErrorMessage("Amount exceeds aggregator available liquidity float.");
      return;
    }
    if (pin.length < 4) {
      setErrorMessage("Please enter your 4-digit authorization security PIN.");
      return;
    }

    setIsSubmitting(true);
    const res = await executeFloatRebalance(currentAgent.id, numAmount, pin);
    setIsSubmitting(false);

    if (res.success && res.reference) {
      setResultSuccess({ reference: res.reference });
    } else {
      setErrorMessage(res.error || "Float rebalancing operation failed.");
    }
  };

  const handleClose = () => {
    setResultSuccess(null);
    setErrorMessage(null);
    setPin("");
    closeLiquidityModal();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-[#0b1222] border border-white/10 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl text-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-[#070b16]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Agency Float Rebalancing</h3>
              <p className="text-xs text-slate-400 font-mono">Real-time Liquidity Injection via Providus Node</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {resultSuccess ? (
          <div className="p-8 space-y-5 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400 mx-auto flex items-center justify-center animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h4 className="text-xl font-bold text-white">Float Dispatched Successfully!</h4>
              <p className="text-xs text-teal-300 font-mono font-bold mt-1">
                Ref: {resultSuccess.reference}
              </p>
              <p className="text-xs text-slate-400 mt-2">
                {formatCurrency(Number(amount))} has been credited to {currentAgent.fullName} ({currentAgent.agentCode}). Agent float status updated to ACTIVE.
              </p>
            </div>

            <button
              onClick={handleClose}
              className="w-full py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-teal-500/20 transition-all"
            >
              Done & Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleRebalance} className="p-5 space-y-4 overflow-y-auto">
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2 font-mono">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Source & Target mapping */}
            <div className="p-3.5 rounded-2xl bg-slate-900 border border-white/5 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-mono text-slate-400 uppercase">Source Float Pool</div>
                  <div className="font-bold text-white">Sahel Syndicate Main Wallet</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-mono text-slate-400 uppercase">Available</div>
                  <div className="font-mono font-bold text-teal-300">{formatCurrency(aggregator.availableLiquidity)}</div>
                </div>
              </div>

              <div className="flex justify-center text-slate-500">
                <ArrowRight className="w-4 h-4 rotate-90 sm:rotate-0" />
              </div>

              <div>
                <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1">Target Agency Node</label>
                <select
                  value={selectedAgentId}
                  onChange={(e) => setSelectedAgentId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-white text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-teal-500"
                >
                  {agents.map((agt) => (
                    <option key={agt.id} value={agt.id}>
                      {agt.fullName} ({agt.agentCode}) — Float: {formatCurrency(agt.walletBalance)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Injection Amount */}
            <div>
              <label className="text-[11px] font-mono text-slate-400 block mb-1">
                Injection Amount ({aggregator.currency})
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-400 font-bold">₦</span>
                <input
                  type="number"
                  required
                  placeholder="e.g. 500,000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-8 pr-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white font-mono font-bold text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              {/* Preset quick pills */}
              <div className="flex items-center gap-2 mt-2">
                {[100000, 250000, 500000, 1000000].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setAmount(String(val))}
                    className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] font-mono text-slate-300 border border-white/5 transition-colors"
                  >
                    +{formatCurrency(val)}
                  </button>
                ))}
              </div>
            </div>

            {/* Security PIN Confirmation */}
            <div>
              <label className="text-[11px] font-mono text-slate-400 block mb-1">
                Aggregator Maker Security PIN <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  required
                  maxLength={6}
                  placeholder="Enter 4-6 digit PIN"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white font-mono tracking-widest text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3 border-t border-white/10">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-teal-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <Zap className="w-4 h-4 fill-current" />
                <span>{isSubmitting ? "Dispatching..." : "Confirm & Transfer Float"}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default LiquidityDistributionModal;
