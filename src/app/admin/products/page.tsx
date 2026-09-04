"use client";

import React, { useState, useEffect } from "react";
import {
  Layers,
  PlusCircle,
  Search,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Sliders,
  DollarSign,
  ShieldCheck,
  Power,
  X,
  Send,
  Eye,
  Lock,
  Play,
  FileCode2,
  BookOpen,
} from "lucide-react";
import { BankingProductRecord, ProductStatus, ProductType, CustomerSegment } from "@/types/customerProductFactory";

export default function ProductsAdminPage() {
  const [activeTab, setActiveTab] = useState<"CATALOG" | "BUILDER" | "SIMULATOR" | "EMERGENCY_KILL_SWITCH">("CATALOG");
  const [products, setProducts] = useState<BankingProductRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [jurisdictionFilter, setJurisdictionFilter] = useState("GLOBAL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Modal / Selected Product
  const [selectedProduct, setSelectedProduct] = useState<BankingProductRecord | null>(null);

  // New Product Builder Form State
  const [builderForm, setBuilderForm] = useState({
    productCode: "KORIE_SAVINGS_NGN_01",
    name: "KoriePay High-Yield Savings (NGN)",
    description: "Automated daily interest accrual savings product with flexible withdrawal windows.",
    productType: "SAVINGS" as ProductType,
    customerType: "PERSONAL" as CustomerSegment,
    jurisdiction: "NG" as "NG" | "NE" | "CROSS_BORDER",
    currency: "NGN" as "NGN" | "XOF" | "USD",
    minKycTier: "TIER_2" as "TIER_1" | "TIER_2" | "TIER_3",
    maxRiskScore: 60,
    allowedChannels: ["NIP", "CARD", "VIRTUAL_ACCOUNT"],
    glAssetPoolCode: "1010",
    glLiabilityWalletCode: "2010",
    glFeeRevenueCode: "4010",
    singleTransactionLimit: 100000,
    dailyTransactionLimit: 500000,
    maxBalanceCap: 5000000,
    effectiveFrom: new Date().toISOString(),
    createdBy: "product.architect@koriepay.com",
  });

  // Simulator Form State
  const [simForm, setSimForm] = useState({
    productCode: "KORIE_WALLET_NGN_BASIC",
    amount: "25000",
    channel: "NIP",
  });
  const [simResult, setSimResult] = useState<any>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/products?jurisdiction=${jurisdictionFilter}&status=${statusFilter}`);
      const json = await res.json();
      if (json.success && json.data) {
        setProducts(json.data.products || []);
      }
    } catch (e) {
      console.error("Failed to fetch products", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [jurisdictionFilter, statusFilter]);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(builderForm),
      });
      const json = await res.json();
      if (json.success) {
        setActionSuccess(`Banking product created: ${json.product?.productCode}`);
        fetchData();
        setActiveTab("CATALOG");
      } else {
        alert(`Error: ${json.error}`);
      }
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/products/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(simForm),
      });
      const json = await res.json();
      if (json.success) {
        setSimResult(json.data);
      } else {
        alert(`Simulation failed: ${json.error}`);
      }
    } catch (e: any) {
      alert(`Simulation error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleKillSwitch = async (productCode: string, killAction: "SUSPEND" | "DISABLE_TRANSFERS") => {
    if (!confirm(`Are you sure you want to trigger emergency kill switch (${killAction}) for ${productCode}?`)) return;
    try {
      const res = await fetch(`/api/products/${productCode}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "KILL_SWITCH",
          killAction,
          reason: "Emergency operator intervention",
        }),
      });
      const json = await res.json();
      if (json.success) {
        setActionSuccess(`Kill switch activated for ${productCode}!`);
        fetchData();
      } else {
        alert(`Kill switch failed: ${json.error}`);
      }
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
              BANKING PRODUCT FACTORY
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              ZERO-CODE PROPOSITION ENGINE
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white mt-1">Banking Product Factory Command Center</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure, version, simulate, and launch multi-currency banking propositions across Nigeria & Niger without touching the Core Ledger.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={jurisdictionFilter}
            onChange={(e) => setJurisdictionFilter(e.target.value)}
            className="bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white"
          >
            <option value="GLOBAL">All Jurisdictions (NGN & XOF)</option>
            <option value="NG">Nigeria 🇳🇬 (NGN)</option>
            <option value="NE">Niger Republic 🇳🇪 (XOF)</option>
          </select>

          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-xs font-semibold text-slate-200 border border-white/10 transition-colors shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-emerald-400" : ""}`} />
            Sync Factory
          </button>

          <button
            onClick={() => setActiveTab("BUILDER")}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow-lg shadow-emerald-900/30 transition-all"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Build Product
          </button>
        </div>
      </div>

      {/* Notification Banner */}
      {actionSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between gap-3 text-xs text-emerald-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[#0b1324]/80 border border-white/10 shadow-lg">
          <div className="text-[10px] font-mono text-slate-400 uppercase">Active Propositions</div>
          <div className="text-xl font-bold font-mono text-white mt-1">
            {products.filter((p) => p.status === "ACTIVE").length} / {products.length} Products
          </div>
          <div className="text-[10px] text-emerald-400 font-medium mt-1">100% Ledger Mapped</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0b1324]/80 border border-white/10 shadow-lg">
          <div className="text-[10px] font-mono text-slate-400 uppercase">Multi-Currency Rails</div>
          <div className="text-xl font-bold font-mono text-emerald-400 mt-1">NGN & XOF Active</div>
          <div className="text-[10px] text-slate-400 mt-1">USD Nostro Ready</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0b1324]/80 border border-white/10 shadow-lg">
          <div className="text-[10px] font-mono text-slate-400 uppercase">Supported Segments</div>
          <div className="text-xl font-bold font-mono text-amber-400 mt-1">5 Customer Segments</div>
          <div className="text-[10px] text-slate-400 mt-1">Personal, Agent, Merchant, SME</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0b1324]/80 border border-white/10 shadow-lg">
          <div className="text-[10px] font-mono text-slate-400 uppercase">Emergency Controls</div>
          <div className="text-xl font-bold font-mono text-blue-400 mt-1">0 Kill Switches Active</div>
          <div className="text-[10px] text-slate-400 mt-1">All Channels Healthy</div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 overflow-x-auto pb-2 scrollbar-none">
        {[
          { id: "CATALOG", label: "Product Catalog", icon: BookOpen },
          { id: "BUILDER", label: "Product Builder (Guided)", icon: Sliders },
          { id: "SIMULATOR", label: "Sandbox Simulator", icon: Play },
          { id: "EMERGENCY_KILL_SWITCH", label: "Emergency Kill Switch", icon: Power },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: PRODUCT CATALOG */}
      {activeTab === "CATALOG" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {products.map((p) => (
              <div
                key={p.id}
                className="p-5 rounded-3xl bg-[#0b1324] border border-white/10 shadow-xl space-y-4"
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-white">{p.name}</h4>
                      <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-slate-800 text-slate-300">
                        {p.jurisdiction} ({p.currency})
                      </span>
                    </div>
                    <p className="text-[11px] font-mono text-emerald-400 mt-0.5">{p.productCode}</p>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold ${
                      p.status === "ACTIVE"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                        : "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                    }`}
                  >
                    ● {p.status} (v{p.version})
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">{p.description}</p>

                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 rounded-xl bg-slate-900/80 border border-white/5">
                    <div className="text-[9px] font-mono text-slate-400 uppercase">Single Cap</div>
                    <div className="font-mono font-bold text-white mt-0.5">
                      {p.currency} {p.singleTransactionLimit.toLocaleString()}
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-900/80 border border-white/5">
                    <div className="text-[9px] font-mono text-slate-400 uppercase">Daily Cap</div>
                    <div className="font-mono font-bold text-emerald-400 mt-0.5">
                      {p.currency} {p.dailyTransactionLimit.toLocaleString()}
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-900/80 border border-white/5">
                    <div className="text-[9px] font-mono text-slate-400 uppercase">Min KYC</div>
                    <div className="font-mono font-bold text-amber-400 mt-0.5">{p.minKycTier}</div>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-950/60 border border-white/5 text-[10px] font-mono text-slate-400 space-y-1">
                  <div className="flex justify-between">
                    <span>GL Liability Wallet Account:</span>
                    <span className="text-slate-200">{p.glLiabilityWalletCode} (Customer Wallet)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>GL Bank Pool Account:</span>
                    <span className="text-slate-200">{p.glAssetPoolCode} (Operational Reserve)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Allowed Rail Channels:</span>
                    <span className="text-emerald-400">{p.allowedChannels.join(", ")}</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => {
                      setSimForm({
                        productCode: p.productCode,
                        amount: "25000",
                        channel: p.allowedChannels[0] || "NIP",
                      });
                      setActiveTab("SIMULATOR");
                    }}
                    className="flex-1 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors"
                  >
                    Simulate ↗
                  </button>
                  <button
                    onClick={() => setSelectedProduct(p)}
                    className="flex-1 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 text-xs font-semibold border border-emerald-500/30 transition-colors"
                  >
                    Inspect Mappings
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: PRODUCT BUILDER */}
      {activeTab === "BUILDER" && (
        <div className="max-w-3xl mx-auto rounded-3xl bg-[#0b1324] border border-white/10 p-6 shadow-2xl space-y-5">
          <div>
            <h3 className="text-base font-bold text-white">Guided Banking Product Builder</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Define product code, customer segment, limits, eligibility rules, and Core Ledger accounting mappings.
            </p>
          </div>

          <form onSubmit={handleCreateProduct} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">Product Code</label>
                <input
                  type="text"
                  required
                  value={builderForm.productCode}
                  onChange={(e) => setBuilderForm({ ...builderForm, productCode: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">Product Name</label>
                <input
                  type="text"
                  required
                  value={builderForm.name}
                  onChange={(e) => setBuilderForm({ ...builderForm, name: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">Description</label>
              <textarea
                rows={2}
                required
                value={builderForm.description}
                onChange={(e) => setBuilderForm({ ...builderForm, description: e.target.value })}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">Product Type</label>
                <select
                  value={builderForm.productType}
                  onChange={(e) => setBuilderForm({ ...builderForm, productType: e.target.value as ProductType })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="CONSUMER_WALLET">Consumer Wallet</option>
                  <option value="SAVINGS">Savings Account</option>
                  <option value="CURRENT">Current Account</option>
                  <option value="AGENCY_FLOAT">Agency Float Vault</option>
                  <option value="MERCHANT_SETTLEMENT">Merchant Settlement</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">Customer Segment</label>
                <select
                  value={builderForm.customerType}
                  onChange={(e) => setBuilderForm({ ...builderForm, customerType: e.target.value as CustomerSegment })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="PERSONAL">Personal</option>
                  <option value="PREMIUM">Premium</option>
                  <option value="AGENT">Agent</option>
                  <option value="MERCHANT">Merchant</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">Jurisdiction</label>
                <select
                  value={builderForm.jurisdiction}
                  onChange={(e) => {
                    const j = e.target.value as "NG" | "NE" | "CROSS_BORDER";
                    setBuilderForm({
                      ...builderForm,
                      jurisdiction: j,
                      currency: j === "NE" ? "XOF" : "NGN",
                      glAssetPoolCode: j === "NE" ? "1020" : "1010",
                      glLiabilityWalletCode: j === "NE" ? "2020" : "2010",
                    });
                  }}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="NG">Nigeria 🇳🇬 (NGN)</option>
                  <option value="NE">Niger Republic 🇳🇪 (XOF)</option>
                  <option value="CROSS_BORDER">Cross-Border</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">
                  Single Limit ({builderForm.currency})
                </label>
                <input
                  type="number"
                  required
                  value={builderForm.singleTransactionLimit}
                  onChange={(e) => setBuilderForm({ ...builderForm, singleTransactionLimit: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">
                  Daily Limit ({builderForm.currency})
                </label>
                <input
                  type="number"
                  required
                  value={builderForm.dailyTransactionLimit}
                  onChange={(e) => setBuilderForm({ ...builderForm, dailyTransactionLimit: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">Minimum KYC</label>
                <select
                  value={builderForm.minKycTier}
                  onChange={(e) => setBuilderForm({ ...builderForm, minKycTier: e.target.value as any })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="TIER_1">Tier 1 (Basic)</option>
                  <option value="TIER_2">Tier 2 (Verified BVN/NINA)</option>
                  <option value="TIER_3">Tier 3 (Full KYB/Address)</option>
                </select>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/5 space-y-2 text-xs font-mono">
              <span className="text-slate-400 uppercase text-[10px] font-bold">General Ledger Mapping Preview</span>
              <div className="flex justify-between text-slate-300">
                <span>Dr Wallet Liability Account:</span>
                <span className="text-emerald-400">{builderForm.glLiabilityWalletCode}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Cr Bank Pool Asset Account:</span>
                <span className="text-blue-400">{builderForm.glAssetPoolCode}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Cr Fee Revenue Account:</span>
                <span className="text-amber-400">{builderForm.glFeeRevenueCode}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-semibold text-xs text-white transition-all shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              Commit Product Proposition
            </button>
          </form>
        </div>
      )}

      {/* TAB 3: SANDBOX SIMULATOR */}
      {activeTab === "SIMULATOR" && (
        <div className="max-w-2xl mx-auto rounded-3xl bg-[#0b1324] border border-white/10 p-6 shadow-2xl space-y-5">
          <div>
            <h3 className="text-base font-bold text-white">Pre-Flight Product Transaction Simulator</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Simulate fee calculations, channel validations, and double-entry General Ledger previews without posting real money.
            </p>
          </div>

          <form onSubmit={handleSimulate} className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">Target Product</label>
                <select
                  value={simForm.productCode}
                  onChange={(e) => setSimForm({ ...simForm, productCode: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                >
                  {products.map((p) => (
                    <option key={p.productCode} value={p.productCode}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">Amount</label>
                <input
                  type="number"
                  required
                  value={simForm.amount}
                  onChange={(e) => setSimForm({ ...simForm, amount: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 uppercase mb-1">Channel</label>
                <select
                  value={simForm.channel}
                  onChange={(e) => setSimForm({ ...simForm, channel: e.target.value })}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="NIP">NIP Direct Credit</option>
                  <option value="CARD">Card WebPAY</option>
                  <option value="VIRTUAL_ACCOUNT">Virtual Account</option>
                  <option value="SAHEL_SWITCH">Sahel Switch (XOF)</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 font-semibold text-xs text-white transition-all shadow-lg shadow-blue-900/30 flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4" />
              Execute Pre-Flight Sandbox Simulation
            </button>
          </form>

          {simResult && (
            <div className="p-4 rounded-2xl bg-slate-950 border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold font-mono text-emerald-400">SIMULATION RESULT</span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    simResult.decision === "ALLOW" ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
                  }`}
                >
                  {simResult.decision}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
                <div className="p-2 rounded-xl bg-slate-900">
                  <div className="text-[9px] text-slate-400">Calculated Fee</div>
                  <div className="text-white font-bold">{simResult.calculatedFee}</div>
                </div>
                <div className="p-2 rounded-xl bg-slate-900">
                  <div className="text-[9px] text-slate-400">VAT (7.5%)</div>
                  <div className="text-white font-bold">{simResult.vatAmount}</div>
                </div>
                <div className="p-2 rounded-xl bg-slate-900">
                  <div className="text-[9px] text-slate-400">Net Debit</div>
                  <div className="text-emerald-400 font-bold">{simResult.netDebitAmount}</div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 text-xs font-mono space-y-1">
                <div className="text-slate-400 text-[10px] uppercase font-bold">Ledger Journal Preview:</div>
                <div className="text-slate-200">Dr {simResult.ledgerJournalPreview.debitAccount} (Customer Wallet)</div>
                <div className="text-slate-200">Cr {simResult.ledgerJournalPreview.creditAccount} (Bank Pool)</div>
                <div className="text-slate-200">Cr {simResult.ledgerJournalPreview.feeAccount} (Fee Revenue)</div>
                <div className="text-emerald-400 text-[10px] pt-1">
                  ● Double-Entry Balance Verified ({simResult.ledgerJournalPreview.isBalanced ? "BALANCED" : "ERROR"})
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: EMERGENCY KILL SWITCH */}
      {activeTab === "EMERGENCY_KILL_SWITCH" && (
        <div className="rounded-3xl bg-[#0b1324] border border-white/10 p-6 shadow-2xl space-y-4">
          <h3 className="text-base font-bold text-white">Emergency Product Kill Switches</h3>
          <p className="text-xs text-slate-400">
            Instantly suspend products or disable outward transfer channels in the event of upstream partner breaches. Balances and ledger histories remain completely safe and intact.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[10px] font-mono uppercase text-slate-400 bg-slate-950/60 border-b border-white/10">
                  <th className="p-3 font-semibold">Product</th>
                  <th className="p-3 font-semibold">Status</th>
                  <th className="p-3 font-semibold">Active Channels</th>
                  <th className="p-3 font-semibold text-right">Emergency Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-3">
                      <div className="font-bold text-white">{p.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{p.productCode}</div>
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400">
                        {p.status}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-slate-300">{p.allowedChannels.join(", ")}</td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleKillSwitch(p.productCode, "DISABLE_TRANSFERS")}
                          className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[11px] font-semibold"
                        >
                          Disable Transfers
                        </button>
                        <button
                          onClick={() => handleKillSwitch(p.productCode, "SUSPEND")}
                          className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[11px] font-semibold"
                        >
                          Suspend Product
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
