"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useAdmin } from "@/components/admin/AdminContext";
import { Wallet, Search, RefreshCw, Lock, LockOpen, AlertTriangle } from "lucide-react";

interface WalletAccount {
  id: string;
  accountNumber: string;
  accountName: string;
  customerId: string;
  customerName: string | null;
  customerNameUnresolved: boolean;
  currency: string;
  country: string;
  status: string;
  restrictions: string[];
  subledger: { current: number; held: number; available: number; unit: string; isActive: boolean } | null;
  assignedBankName: string;
  openedAt: string;
  lastActivityAt: string | null;
}

interface AgentFloat {
  id: string;
  agentCode: string;
  tradingName: string;
  country: string;
  currency: string;
  status: string;
  float: { current: number; held: number; available: number; unit: string } | null;
}

interface HoldRow {
  id: string;
  walletId: string;
  accountId: string;
  amountMinor: number;
  currency: string;
  reason: string;
  reference: string;
  expiresAt: string;
  createdAt: string;
}

interface Overview {
  generatedAt: string;
  accounts: WalletAccount[];
  agents: AgentFloat[];
  holds: HoldRow[];
  notes: string[];
}

function major(amount: number, currency: string): string {
  const symbol = currency === "NGN" ? "₦" : currency === "XOF" ? "CFA " : `${currency} `;
  return `${symbol}${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export default function WalletsAdminPage() {
  const { countryFilter, openMakerChecker } = useAdmin();
  const [search, setSearch] = useState("");
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/admin/wallets/overview?country=${countryFilter}`, { cache: "no-store" });
      const json = await r.json();
      if (!r.ok || !json?.success) throw new Error(json?.error?.message || `HTTP ${r.status}`);
      setData(json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load wallet truth");
    } finally {
      setLoading(false);
    }
  }, [countryFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const q = search.trim().toLowerCase();
  const accounts = (data?.accounts || []).filter(
    (w) =>
      !q ||
      w.accountNumber.toLowerCase().includes(q) ||
      w.accountName.toLowerCase().includes(q) ||
      (w.customerName || "").toLowerCase().includes(q),
  );

  const dualControl = (account: WalletAccount, freeze: boolean) =>
    openMakerChecker({
      id: `mc-wallet-${freeze ? "freeze" : "lift"}-${account.id}-${Date.now()}`,
      actionType: freeze ? "WALLET_FREEZE" : "WALLET_UNFREEZE",
      resourceType: "ACCOUNT",
      resourceId: account.id,
      resourceName: `${account.accountName} (${account.accountNumber})`,
      countryCode: (account.country === "NE" ? "NE" : "NG") as "NG" | "NE",
      requestedBy: "supervisor.finance@koriepay.com",
      requestedAt: new Date().toISOString(),
      reason: freeze
        ? "Administrative temporary compliance lock pending review"
        : "Compliance review complete — restore normal operation",
      payload: { accountId: account.id, accountNumber: account.accountNumber },
      status: "PENDING",
    });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            TREASURY & WALLET CONTROL · LIVE SUBLEDGER
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white mt-1">Multi-Currency Wallet Control</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Account lifecycle records joined to live subledger positions. Freeze executes through dual control and is enforced by the bank core.
          </p>
        </div>
        <button
          onClick={() => void load()}
          className="px-3.5 py-2 rounded-xl bg-slate-900 border border-white/10 hover:border-white/20 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {data && (
        <p className="text-[11px] font-mono text-slate-500">
          Read from AccountLifecycleEngine + SubledgerEngine · synced {new Date(data.generatedAt).toLocaleString()} · {data.accounts.length} account(s) · {data.agents.length} agent(s) · {data.holds.length} active hold(s)
        </p>
      )}
      {loading && !data && <p className="text-xs text-slate-400 font-mono">Loading wallet positions…</p>}
      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-300 flex items-center justify-between gap-3">
          <span>{error} — showing nothing rather than stale balances.</span>
          <button onClick={() => void load()} className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 font-bold">Retry</button>
        </div>
      )}

      <div className="p-4 rounded-2xl bg-[#0b1324] border border-white/10">
        <div className="relative max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by account number, name, owner..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      <div className="rounded-3xl bg-[#0b1324] border border-white/10 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-[10px] font-mono uppercase text-slate-400 bg-slate-950/60 border-b border-white/10">
                <th className="p-4 font-semibold">Account</th>
                <th className="p-4 font-semibold">Owner</th>
                <th className="p-4 font-semibold">Market</th>
                <th className="p-4 font-semibold">Available</th>
                <th className="p-4 font-semibold">Held</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold text-right">Dual Control</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {accounts.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    {q ? "No account matches this search." : "No accounts in the lifecycle registry for this market filter."}
                  </td>
                </tr>
              )}
              {accounts.map((w) => {
                const frozen = w.status === "FROZEN" || w.restrictions.includes("FULL_FREEZE");
                return (
                  <tr key={w.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-4">
                      <div className="font-mono font-bold text-white">{w.accountNumber}</div>
                      <div className="text-[10px] text-slate-400">{w.accountName}</div>
                    </td>
                    <td className="p-4">
                      {w.customerName ? (
                        <span className="font-semibold text-white">{w.customerName}</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-300 font-mono text-[11px]" title={`customerId ${w.customerId} has no record in CustomerLifecycleEngine`}>
                          <AlertTriangle className="w-3 h-3" /> owner unresolved
                        </span>
                      )}
                      <div className="text-[10px] text-slate-500 font-mono">{w.assignedBankName}</div>
                    </td>
                    <td className="p-4 font-mono">{w.country === "NG" ? "🇳🇬 NG" : "🇳🇪 NE"}</td>
                    <td className="p-4 font-mono font-bold text-emerald-400">
                      {w.subledger ? major(w.subledger.available, w.currency) : <span className="text-slate-500 font-normal">no subledger</span>}
                    </td>
                    <td className="p-4 font-mono text-slate-300">
                      {w.subledger ? major(w.subledger.held, w.currency) : <span className="text-slate-500">—</span>}
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1 items-start">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${frozen ? "bg-red-500/10 text-red-400 border border-red-500/20" : w.status === "OPEN" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"}`}>
                          ● {w.status}
                        </span>
                        {w.restrictions.length > 0 && (
                          <span className="text-[10px] font-mono text-slate-400">{w.restrictions.join(" · ")}</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      {frozen ? (
                        <button
                          onClick={() => dualControl(w, false)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 font-bold text-[11px] transition-colors"
                        >
                          <LockOpen className="w-3.5 h-3.5" /> Lift Freeze
                        </button>
                      ) : (
                        <button
                          onClick={() => dualControl(w, true)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 font-bold text-[11px] transition-colors"
                        >
                          <Lock className="w-3.5 h-3.5" /> Freeze
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {data && data.agents.length > 0 && (
        <div className="rounded-3xl bg-[#0b1324] border border-white/10 shadow-2xl overflow-hidden">
          <div className="px-5 pt-4 pb-1 text-[10px] font-mono uppercase text-slate-400">Agent float positions</div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[10px] font-mono uppercase text-slate-500 bg-slate-950/60 border-b border-white/10">
                  <th className="p-4 font-semibold">Agent</th>
                  <th className="p-4 font-semibold">Market</th>
                  <th className="p-4 font-semibold">Float Available</th>
                  <th className="p-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {data.agents.map((a) => (
                  <tr key={a.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-white">{a.tradingName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{a.agentCode}</div>
                    </td>
                    <td className="p-4 font-mono">{a.country === "NG" ? "🇳🇬 NG" : "🇳🇪 NE"}</td>
                    <td className="p-4 font-mono font-bold text-emerald-400">
                      {a.float ? major(a.float.available, a.currency) : <span className="text-slate-500 font-normal">no float subledger</span>}
                    </td>
                    <td className="p-4 font-mono text-slate-300">{a.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data && data.holds.length > 0 && (
        <div className="rounded-3xl bg-[#0b1324] border border-white/10 shadow-2xl overflow-hidden">
          <div className="px-5 pt-4 pb-1 text-[10px] font-mono uppercase text-slate-400">Active escrow holds (ledger)</div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[10px] font-mono uppercase text-slate-500 bg-slate-950/60 border-b border-white/10">
                  <th className="p-4 font-semibold">Reference</th>
                  <th className="p-4 font-semibold">Account</th>
                  <th className="p-4 font-semibold">Amount</th>
                  <th className="p-4 font-semibold">Reason</th>
                  <th className="p-4 font-semibold">Expires</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {data.holds.map((h) => (
                  <tr key={h.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-4 font-mono font-bold text-white">{h.reference}</td>
                    <td className="p-4 font-mono text-slate-300">{h.accountId}</td>
                    <td className="p-4 font-mono text-amber-300">{major(h.amountMinor / 100, h.currency)}</td>
                    <td className="p-4 text-slate-300">{h.reason}</td>
                    <td className="p-4 font-mono text-slate-500 text-[11px]">{new Date(h.expiresAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data && (
        <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 space-y-1">
          {data.notes.map((n, i) => (
            <p key={i} className="text-[11px] text-slate-400 leading-relaxed">· {n}</p>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 text-[11px] text-slate-500">
        <Wallet className="w-3.5 h-3.5" />
        <span>Freeze / lift run through dual control and land in the audit trail (Configuration hub → Audit).</span>
      </div>
    </div>
  );
}
