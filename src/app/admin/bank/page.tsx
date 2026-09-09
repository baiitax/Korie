"use client";

// =============================================================================
// Admin — Bank Core & Liquidity. Engine truth from BankCoreEngine via the
// Bank API (/api/bank/v1/*): nostro positions at partner banks, the resolved
// gateway adapter mode (read from Configuration → Connections BANK_NODE
// connectors), account opening (real NGN NUBANs), inbound funding, internal
// transfers and NIP outbound. Every movement is a double-entry ledger journal.
// =============================================================================

import React, { useCallback, useEffect, useState } from "react";
import {
  Landmark,
  RefreshCw,
  Wallet,
  ArrowRightLeft,
  ArrowUpRight,
  Download,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Server,
  Radio,
  Plus,
} from "lucide-react";
import { getPortalBearer } from "@/lib/customerPortalClient";

function naira(n: number): string {
  return `₦${(n || 0).toLocaleString("en-NG")}`;
}

function xof(n: number): string {
  return `${(n || 0).toLocaleString("en-NG")} XOF`;
}

function fmtMoney(n: number, ccy: string): string {
  return ccy === "XOF" ? xof(n) : naira(n);
}

async function api<T>(path: string, init?: RequestInit): Promise<{ ok: boolean; data?: T; message?: string }> {
  try {
    const res = await fetch(path, {
      ...init,
      headers: { Authorization: getPortalBearer(), "Content-Type": "application/json", ...(init?.headers || {}) },
    });
    const payload = await res.json().catch(() => null);
    if (!res.ok) {
      const code = (payload as any)?.error?.code || `HTTP ${res.status}`;
      const msg = (payload as any)?.error?.message || "Request failed";
      return { ok: false, message: `${code} — ${msg}` };
    }
    return { ok: true, data: (payload as any)?.data as T };
  } catch (err: any) {
    return { ok: false, message: err?.message || "Network error" };
  }
}

interface LiquidityNode {
  nodeId: string;
  bankName: string;
  country: string;
  currency: "NGN" | "XOF";
  settlementAccount: string;
  balance: number;
  updatedAt: string;
}

interface GatewayMode {
  mode: "SIMULATED" | "LIVE";
  provider: string;
  note: string;
}

interface BankTxn {
  id: string;
  reference: string;
  type: string;
  currency: string;
  amount: number;
  fee?: number;
  fromAccount?: string;
  toAccount?: string;
  toBank?: string;
  accountHolder?: string;
  status: string;
  ledgerJournalId?: string;
  gatewayMode: string;
  narration?: string;
  createdAt: string;
}

interface LiquidityPayload {
  gateway: GatewayMode;
  positions: LiquidityNode[];
  recentTransactions: BankTxn[];
}

const TYPE_LABEL: Record<string, string> = {
  ACCOUNT_OPEN: "Account opened",
  INBOUND_CREDIT: "Inbound credit",
  INTERNAL_TRANSFER: "Internal transfer",
  NIP_OUT: "NIP outbound",
  FLOAT_TOP_UP: "Float top-up",
};

export default function AdminBankPage() {
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [payload, setPayload] = useState<LiquidityPayload | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<{ ok: boolean; message: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [refreshedAt, setRefreshedAt] = useState<string | null>(null);

  // action forms
  const [openName, setOpenName] = useState("");
  const [openPhone, setOpenPhone] = useState("");
  const [fundNuban, setFundNuban] = useState("");
  const [fundAmount, setFundAmount] = useState("");
  const [p2pFrom, setP2pFrom] = useState("");
  const [p2pTo, setP2pTo] = useState("");
  const [p2pAmount, setP2pAmount] = useState("");
  const [nipFrom, setNipFrom] = useState("");
  const [nipAmount, setNipAmount] = useState("");
  const [nipBank, setNipBank] = useState("Zenith Bank");
  const [nipDest, setNipDest] = useState("");

  const load = useCallback(async (silent = false) => {
    if (!silent) setPhase("loading");
    const res = await api<LiquidityPayload>("/api/bank/v1/liquidity");
    if (!res.ok || !res.data) {
      setError(res.message || "Bank core unreachable.");
      setPhase("error");
      return;
    }
    setPayload(res.data);
    setRefreshedAt(new Date().toISOString());
    setPhase("ready");
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const run = async (fn: () => Promise<{ ok: boolean; message: string }>) => {
    setBusy(true);
    setNotice(null);
    const res = await fn();
    setBusy(false);
    setNotice({ ok: res.ok, message: res.message });
    if (res.ok) await load(true);
  };

  const openAccount = () =>
    run(async () => {
      const name = openName.trim();
      const phone = openPhone.trim();
      if (name.length < 3 || !/^\+?\d{10,15}$/.test(phone.replace(/\s/g, ""))) {
        return { ok: false, message: "Enter a full name and a valid phone number." };
      }
      const res = await api<{ account: { accountNumber: string; accountName: string } }>("/api/bank/v1/accounts", {
        method: "POST",
        body: JSON.stringify({ fullName: name, phone }),
      });
      if (!res.ok || !res.data) return { ok: false, message: res.message || "Open failed." };
      setOpenName("");
      setOpenPhone("");
      return {
        ok: true,
        message: `${res.data.account.accountName} opened — ${res.data.account.accountNumber} (Providus NUBAN). Fund it via inbound credit.`,
      };
    });

  const fundAccount = () =>
    run(async () => {
      const amount = Number(fundAmount);
      if (fundNuban.length !== 10 || !Number.isInteger(amount) || amount <= 0) {
        return { ok: false, message: "Enter the 10-digit NUBAN and a positive amount." };
      }
      const res = await api<{ transaction: BankTxn; journalId: string }>("/api/bank/v1/funding", {
        method: "POST",
        body: JSON.stringify({ accountNumber: fundNuban, amount, narration: "Admin funding — inbound bank credit" }),
      });
      if (!res.ok || !res.data) return { ok: false, message: res.message || "Credit failed." };
      setFundNuban("");
      setFundAmount("");
      return {
        ok: true,
        message: `₦${amount.toLocaleString()} credited to ${fundNuban} — journal ${res.data.journalId}.`,
      };
    });

  const internalTransfer = () =>
    run(async () => {
      const amount = Number(p2pAmount);
      if (p2pFrom.length !== 10 || p2pTo.length !== 10 || !Number.isInteger(amount) || amount <= 0) {
        return { ok: false, message: "Enter two 10-digit NUBANs and a positive amount." };
      }
      const res = await api<{ transaction: BankTxn; journalId: string }>("/api/bank/v1/transfers", {
        method: "POST",
        body: JSON.stringify({ type: "INTERNAL", fromAccount: p2pFrom, toAccount: p2pTo, amount }),
      });
      if (!res.ok || !res.data) return { ok: false, message: res.message || "Transfer failed." };
      setP2pFrom("");
      setP2pTo("");
      setP2pAmount("");
      return {
        ok: true,
        message: `₦${amount.toLocaleString()} moved ${p2pFrom} → ${p2pTo} — journal ${res.data.journalId}.`,
      };
    });

  const nipOut = () =>
    run(async () => {
      const amount = Number(nipAmount);
      const dest = nipDest.replace(/\D/g, "");
      if (nipFrom.length !== 10 || !Number.isInteger(amount) || amount <= 0 || dest.length !== 10 || !nipBank.trim()) {
        return { ok: false, message: "Fill NUBAN, amount and a 10-digit destination account + bank." };
      }
      const res = await api<{ transaction: BankTxn; journalId: string }>("/api/bank/v1/transfers", {
        method: "POST",
        body: JSON.stringify({
          type: "NIP_OUT",
          fromAccount: nipFrom,
          amount,
          destinationBank: nipBank,
          destinationAccount: dest,
          destinationName: "External customer",
        }),
      });
      if (!res.ok || !res.data) return { ok: false, message: res.message || "NIP failed." };
      setNipFrom("");
      setNipAmount("");
      setNipDest("");
      return {
        ok: true,
        message: `₦${amount.toLocaleString()} NIP'd to ${nipBank} ${dest} — journal ${res.data.journalId} (+₦10 fee).`,
      };
    });

  if (phase === "loading" && !payload) {
    return (
      <div className="p-14 text-center">
        <Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-400" />
        <p className="text-xs text-slate-400 mt-2">Connecting to the bank core…</p>
      </div>
    );
  }
  if (phase === "error" && !payload) {
    return (
      <div className="p-10">
        <p className="text-sm font-bold text-rose-300">Bank core unreachable</p>
        <p className="text-xs text-slate-400 mt-1">{error}</p>
        <button type="button" onClick={() => void load()} className="mt-4 px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 text-xs font-bold">
          Retry
        </button>
      </div>
    );
  }
  if (!payload) return null;

  const ngn = payload.positions.find((p) => p.currency === "NGN");
  const xofPos = payload.positions.find((p) => p.currency === "XOF");

  const inputCls =
    "w-full rounded-xl bg-slate-950/70 border border-white/10 px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/40 placeholder:text-slate-500";
  const labelCls = "text-[10px] font-mono uppercase text-slate-500";

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            CORE BANKING · LIQUIDITY RAIL
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white mt-1">Bank Core &amp; Liquidity</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            The transactable bank core: partner nostros hold the float; every credit, transfer and payout is a double-entry journal served by the Bank API.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500 font-mono">{refreshedAt ? `Synced ${new Date(refreshedAt).toLocaleTimeString()}` : ""}</span>
          <button
            type="button"
            onClick={() => void load(true)}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-white/5 transition-colors inline-flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </div>

      {notice ? (
        <div
          role="status"
          className={`flex items-start gap-2 rounded-2xl px-4 py-3 text-xs font-semibold border ${
            notice.ok ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/25" : "bg-rose-500/10 text-rose-300 border-rose-500/25"
          }`}
        >
          {notice.ok ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />}
          <span>{notice.message}</span>
        </div>
      ) : null}

      {/* Gateway adapter mode */}
      <div className="rounded-3xl bg-[#0d162a] border border-white/10 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Radio className="w-5 h-5" />
          </span>
          <div>
            <p className="text-xs font-bold text-white flex items-center gap-2">
              Liquidity gateway adapter
              <span
                className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase border ${
                  payload.gateway.mode === "LIVE"
                    ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                    : "bg-amber-500/15 text-amber-300 border-amber-500/30"
                }`}
              >
                {payload.gateway.mode}
              </span>
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5 max-w-2xl">{payload.gateway.note}</p>
          </div>
        </div>
        <a
          href="/admin/settings"
          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-white/5 transition-colors inline-flex items-center gap-1.5"
        >
          <Server className="w-3.5 h-3.5" /> Configure nodes
        </a>
      </div>

      {/* Liquidity positions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[ngn, xofPos]
          .filter(Boolean)
          .map((p) => p as LiquidityNode)
          .map((node) => (
            <div key={node.nodeId} className="rounded-3xl bg-[#0b1324] border border-white/10 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-2 text-xs font-bold text-white">
                  <Landmark className="w-4 h-4 text-emerald-400" />
                  {node.bankName}
                </p>
                <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  nostro
                </span>
              </div>
              <div>
                <p className="text-[10px] font-mono uppercase text-slate-500">Available float</p>
                <p className="text-2xl font-bold font-mono text-white">{fmtMoney(node.balance, node.currency)}</p>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <span>Settlement account</span>
                <span className="text-slate-200 font-bold">{node.settlementAccount}</span>
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                <span>Last movement</span>
                <span>{new Date(node.updatedAt).toLocaleTimeString()}</span>
              </div>
            </div>
          ))}
      </div>

      {/* Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-3xl bg-[#0b1324] border border-white/10 p-5 space-y-3">
          <p className="flex items-center gap-2 text-xs font-bold text-white">
            <Plus className="w-4 h-4 text-emerald-400" /> Open account (provision NUBAN)
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className={labelCls}>Full name</span>
              <input value={openName} onChange={(e) => setOpenName(e.target.value)} placeholder="e.g. Halima Abubakar" className={`mt-1 ${inputCls}`} />
            </label>
            <label className="block">
              <span className={labelCls}>Phone</span>
              <input value={openPhone} onChange={(e) => setOpenPhone(e.target.value)} placeholder="+234 801 000 0000" className={`mt-1 ${inputCls}`} />
            </label>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => void openAccount()}
            className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 text-xs font-bold hover:bg-emerald-400 disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wallet className="w-3.5 h-3.5" />} Open &amp; issue NUBAN
          </button>
        </div>

        <div className="rounded-3xl bg-[#0b1324] border border-white/10 p-5 space-y-3">
          <p className="flex items-center gap-2 text-xs font-bold text-white">
            <ArrowUpRight className="w-4 h-4 text-emerald-400" /> Inbound credit (fund a NUBAN)
          </p>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className={labelCls}>NUBAN (10)</span>
              <input value={fundNuban} onChange={(e) => setFundNuban(e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="0123456789" className={`mt-1 ${inputCls} font-mono`} />
            </label>
            <label className="block">
              <span className={labelCls}>Amount (₦)</span>
              <input value={fundAmount} onChange={(e) => setFundAmount(e.target.value.replace(/\D/g, ""))} placeholder="50000" className={`mt-1 ${inputCls}`} />
            </label>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => void fundAccount()}
            className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 text-xs font-bold hover:bg-emerald-400 disabled:opacity-50"
          >
            Credit account
          </button>
        </div>

        <div className="rounded-3xl bg-[#0b1324] border border-white/10 p-5 space-y-3">
          <p className="flex items-center gap-2 text-xs font-bold text-white">
            <ArrowRightLeft className="w-4 h-4 text-emerald-400" /> Internal transfer (wallet-to-wallet)
          </p>
          <div className="grid grid-cols-3 gap-3">
            <label className="block">
              <span className={labelCls}>From NUBAN</span>
              <input value={p2pFrom} onChange={(e) => setP2pFrom(e.target.value.replace(/\D/g, "").slice(0, 10))} className={`mt-1 ${inputCls} font-mono`} />
            </label>
            <label className="block">
              <span className={labelCls}>To NUBAN</span>
              <input value={p2pTo} onChange={(e) => setP2pTo(e.target.value.replace(/\D/g, "").slice(0, 10))} className={`mt-1 ${inputCls} font-mono`} />
            </label>
            <label className="block">
              <span className={labelCls}>Amount (₦)</span>
              <input value={p2pAmount} onChange={(e) => setP2pAmount(e.target.value.replace(/\D/g, ""))} className={`mt-1 ${inputCls}`} />
            </label>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => void internalTransfer()}
            className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 text-xs font-bold hover:bg-emerald-400 disabled:opacity-50"
          >
            Move funds
          </button>
        </div>

        <div className="rounded-3xl bg-[#0b1324] border border-white/10 p-5 space-y-3">
          <p className="flex items-center gap-2 text-xs font-bold text-white">
            <Download className="w-4 h-4 text-emerald-400" /> NIP outbound (to any bank)
          </p>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className={labelCls}>From NUBAN</span>
              <input value={nipFrom} onChange={(e) => setNipFrom(e.target.value.replace(/\D/g, "").slice(0, 10))} className={`mt-1 ${inputCls} font-mono`} />
            </label>
            <label className="block">
              <span className={labelCls}>Amount (₦)</span>
              <input value={nipAmount} onChange={(e) => setNipAmount(e.target.value.replace(/\D/g, ""))} className={`mt-1 ${inputCls}`} />
            </label>
            <label className="block">
              <span className={labelCls}>Destination bank</span>
              <select value={nipBank} onChange={(e) => setNipBank(e.target.value)} className={`mt-1 ${inputCls}`}>
                {["Zenith Bank", "GTBank", "First Bank of Nigeria", "Access Bank", "UBA", "Kuda MFB"].map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className={labelCls}>Destination account (10)</span>
              <input value={nipDest} onChange={(e) => setNipDest(e.target.value.replace(/\D/g, "").slice(0, 10))} className={`mt-1 ${inputCls} font-mono`} />
            </label>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => void nipOut()}
            className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 text-xs font-bold hover:bg-emerald-400 disabled:opacity-50"
          >
            Send (NIP, ₦10 fee)
          </button>
        </div>
      </div>

      {/* Bank transaction log */}
      <div className="rounded-3xl bg-[#0b1324] border border-white/10 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <p className="text-xs font-bold text-white">Bank transaction log (engine)</p>
          <span className="text-[10px] font-mono text-slate-500">{payload.recentTransactions.length} recent</span>
        </div>
        {payload.recentTransactions.length === 0 ? (
          <p className="p-8 text-center text-xs text-slate-500">No bank transactions yet — open an account and run a credit.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[10px] font-mono uppercase text-slate-400 bg-slate-950/60 border-b border-white/10">
                  <th className="p-3 font-semibold">Reference</th>
                  <th className="p-3 font-semibold">Type</th>
                  <th className="p-3 font-semibold">Amount</th>
                  <th className="p-3 font-semibold">From → To</th>
                  <th className="p-3 font-semibold">Journal</th>
                  <th className="p-3 font-semibold">Rail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {payload.recentTransactions.map((t) => (
                  <tr key={t.id} className="hover:bg-white/[0.03]">
                    <td className="p-3 font-mono font-bold text-white">{t.reference}</td>
                    <td className="p-3 text-slate-300">{TYPE_LABEL[t.type] || t.type.replace(/_/g, " ")}</td>
                    <td className="p-3 font-mono font-bold text-white">{fmtMoney(t.amount, t.currency)}</td>
                    <td className="p-3 font-mono text-slate-400">
                      {t.fromAccount ? `${t.fromAccount} → ` : ""}
                      {t.toAccount || (t.toBank ? `${t.toBank} ${t.toAccount}` : "")}
                    </td>
                    <td className="p-3 font-mono text-[10px] text-emerald-400">{t.ledgerJournalId || "—"}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase border ${
                          t.gatewayMode === "LIVE"
                            ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                            : "bg-amber-500/15 text-amber-300 border-amber-500/30"
                        }`}
                      >
                        {t.gatewayMode}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
