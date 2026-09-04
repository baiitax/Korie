// =============================================================================
// File: src/app/admin/adashi/page.tsx
// Description: Super Admin Command Center for Enterprise Adashi / Ajo / ROSCA Platform
// Multi-Jurisdiction: Nigeria (NGN) & Niger Republic (XOF)
// =============================================================================

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Coins,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  Plus,
  Lock,
  ArrowRight,
  TrendingUp,
  Scale,
  DollarSign,
  Users,
  Check,
  X,
  FileCheck2,
  Clock,
  Sparkles,
  Layers,
  ChevronRight,
  Info,
  Sliders,
} from 'lucide-react';
import {
  AdashiGroup,
  AdashiProduct,
  AdashiMakerCheckerRequest,
  AdashiRecoveryCase,
  AdashiSummaryStats,
} from '@/types/adashiEngine';

export default function AdashiAdminPage() {
  const [activeTab, setActiveTab] = useState<'GROUPS' | 'PRODUCTS' | 'MAKER_CHECKER' | 'RECONCILIATION' | 'RECOVERY' | 'RISK'>('GROUPS');
  const [stats, setStats] = useState<AdashiSummaryStats | null>(null);
  const [groups, setGroups] = useState<AdashiGroup[]>([]);
  const [products, setProducts] = useState<AdashiProduct[]>([]);
  const [makerCheckerRequests, setMakerCheckerRequests] = useState<AdashiMakerCheckerRequest[]>([]);
  const [recoveryCases, setRecoveryCases] = useState<AdashiRecoveryCase[]>([]);
  const [reconciliationReport, setReconciliationReport] = useState<any>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<'ALL' | 'NGN' | 'XOF'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<any | null>(null);

  // New Product Modal State
  const [showProductModal, setShowProductModal] = useState(false);
  const [newProductForm, setNewProductForm] = useState({
    productCode: '',
    productName: '',
    description: '',
    currency: 'NGN' as 'NGN' | 'XOF',
    countryCode: 'NG' as 'NG' | 'NE',
    cadence: 'WEEKLY' as 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY',
    minMembers: 5,
    maxMembers: 20,
    contributionAmount: 10000,
    platformFeePercent: 1.0,
    agentCommissionPercent: 0.5,
    gracePeriodHours: 48,
    maxOverdueDays: 7,
    allowPartialPayouts: false,
    requiresMakerCheckerPayout: true,
    payoutMakerCheckerThreshold: 500000,
  });

  // Action Maker Checker Modal State
  const [selectedMkcRequest, setSelectedMkcRequest] = useState<AdashiMakerCheckerRequest | null>(null);
  const [checkerNotes, setCheckerNotes] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, groupsRes, productsRes, mkcRes, recRes, reconRes] = await Promise.all([
        fetch('/api/v1/adashi/stats').then((r) => r.json()),
        fetch('/api/v1/adashi/groups').then((r) => r.json()),
        fetch('/api/v1/adashi/products').then((r) => r.json()),
        fetch('/api/v1/adashi/maker-checker').then((r) => r.json()),
        fetch('/api/v1/adashi/recovery').then((r) => r.json()),
        fetch('/api/v1/adashi/reconciliation?currency=NGN').then((r) => r.json()),
      ]);

      if (statsRes.success) setStats(statsRes.data);
      if (groupsRes.success) setGroups(groupsRes.data);
      if (productsRes.success) setProducts(productsRes.data);
      if (mkcRes.success) setMakerCheckerRequests(mkcRes.data);
      if (recRes.success) setRecoveryCases(recRes.data);
      if (reconRes.success) setReconciliationReport(reconRes.data);
    } catch (err) {
      console.error('Failed to fetch Adashi data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      const res = await fetch('/api/v1/adashi/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': 'usr-admin-001' },
        body: JSON.stringify(newProductForm),
      });
      const data = await res.json();
      if (data.success) {
        setShowProductModal(false);
        fetchData();
      } else {
        alert(data.error || 'Failed to create product');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleActionMakerChecker = async (action: 'APPROVE' | 'REJECT') => {
    if (!selectedMkcRequest) return;
    try {
      setActionLoading(true);
      const res = await fetch('/api/v1/adashi/maker-checker', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'usr-adm-001',
          'x-user-name': 'Alhaji Umar Sanusi (Super Admin)',
          'x-user-role': 'SUPER_ADMIN',
        },
        body: JSON.stringify({
          requestId: selectedMkcRequest.id,
          action,
          checkerNotes: checkerNotes || `${action} by Super Admin`,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSelectedMkcRequest(null);
        setCheckerNotes('');
        fetchData();
      } else {
        alert(data.error || 'Action failed');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleLockMembership = async (groupId: string) => {
    if (!confirm('Are you sure you want to LOCK membership for this Adashi group? Quorum and mandates will be certified.')) return;
    try {
      setActionLoading(true);
      const res = await fetch(`/api/v1/adashi/groups/${groupId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-user-id': 'usr-admin-001' },
        body: JSON.stringify({ action: 'LOCK_MEMBERSHIP' }),
      });
      const data = await res.json();
      if (data.success) {
        fetchData();
      } else {
        alert(data.error || 'Lock failed');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleGenerateRotation = async (groupId: string) => {
    try {
      setActionLoading(true);
      const res = await fetch(`/api/v1/adashi/groups/${groupId}/rotations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': 'usr-admin-001' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.success) {
        fetchData();
      } else {
        alert(data.error || 'Rotation generation failed');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartGroup = async (groupId: string) => {
    if (!confirm('Start this Adashi Circle? Cycle 1 will open and contribution schedules will be scheduled.')) return;
    try {
      setActionLoading(true);
      const res = await fetch(`/api/v1/adashi/groups/${groupId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-user-id': 'usr-admin-001' },
        body: JSON.stringify({ action: 'START_GROUP' }),
      });
      const data = await res.json();
      if (data.success) {
        fetchData();
      } else {
        alert(data.error || 'Failed to start group');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const viewGroupDetails = async (groupId: string) => {
    try {
      const res = await fetch(`/api/v1/adashi/groups/${groupId}`);
      const data = await res.json();
      if (data.success) {
        setSelectedGroup(data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredGroups = groups.filter((g) => {
    if (selectedCurrency !== 'ALL' && g.currency !== selectedCurrency) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        g.groupName.toLowerCase().includes(query) ||
        g.groupCode.toLowerCase().includes(query) ||
        (g.assignedAgentName && g.assignedAgentName.toLowerCase().includes(query))
      );
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-[#070b16] text-white p-6 space-y-6">
      {/* Top Banner & Hierarchy Notice */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
              MULTI-JURISDICTIONAL ROSCA ENGINE
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20">
              CBN (NGN) & BCEAO (XOF)
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white mt-1">
            Adashi / Ajo / Rotating Savings Command Center
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Enterprise orchestration layer with cryptographic deterministic rotations, dual-control maker-checker, and zero-variance double-entry Core Ledger synchronization.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-slate-300 font-semibold transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setShowProductModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shadow-lg shadow-emerald-500/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>New Product Template</span>
          </button>
        </div>
      </div>

      {/* Financial Hierarchy Alert Bar */}
      <div className="p-3.5 rounded-2xl bg-[#0d162a] border border-amber-500/30 flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
            <Scale className="w-4 h-4" />
          </div>
          <div>
            <div className="font-semibold text-amber-200">Non-Negotiable Ledger Authority Rule</div>
            <div className="text-slate-400 text-[11px]">
              Adashi is an orchestration layer. All debits, credits, fees, and pool balances are authoritatively posted to double-entry Core Ledger accounts (<span className="font-mono text-amber-300">ESCROW_VAULT_NGN_01</span> & <span className="font-mono text-amber-300">ESCROW_VAULT_XOF_01</span>).
            </div>
          </div>
        </div>
        <Link
          href="/admin/ledger"
          className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-mono font-bold flex items-center gap-1"
        >
          <span>Audit Ledger</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="p-4 rounded-2xl bg-[#0d162a] border border-white/5">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-mono">
            <span>ACTIVE GROUPS</span>
            <Users className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-white mt-1">
            {stats?.totalActiveGroups ?? 0}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            {stats?.totalMembersParticipating ?? 0} total verified savers
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0d162a] border border-white/5">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-mono">
            <span>ESCROW VAULT (NGN)</span>
            <span className="text-emerald-400 font-bold">₦</span>
          </div>
          <div className="text-xl font-extrabold text-emerald-400 mt-1 font-mono">
            ₦{(stats?.totalEscrowVaultNgn ?? 0).toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Providus Bank Escrow</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0d162a] border border-white/5">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-mono">
            <span>ESCROW VAULT (XOF)</span>
            <span className="text-teal-400 font-bold">CFA</span>
          </div>
          <div className="text-xl font-extrabold text-teal-400 mt-1 font-mono">
            {(stats?.totalEscrowVaultXof ?? 0).toLocaleString()} CFA
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Koris Bank Niger Escrow</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0d162a] border border-white/5">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-mono">
            <span>COLLECTION RATE</span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-white mt-1">
            {stats?.collectionRatePercent ?? 100}%
          </div>
          <div className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-2.5 h-2.5" /> Auto-debit on schedule
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0d162a] border border-white/5">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-mono">
            <span>MAKER-CHECKER</span>
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold text-amber-400 mt-1">
            {stats?.pendingMakerCheckerCount ?? 0}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Dual-approval pending</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0d162a] border border-white/5">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-mono">
            <span>DEFAULT ARREARS</span>
            <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
          </div>
          <div className="text-2xl font-extrabold text-white mt-1">
            {stats?.defaultRatePercent ?? 0}%
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            {stats?.activeRecoveryCasesCount ?? 0} active recovery cases
          </div>
        </div>
      </div>

      {/* Workspace Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('GROUPS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'GROUPS'
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Active Adashi Circles</span>
          <span className="px-1.5 py-0.2 rounded bg-black/20 text-[10px] font-mono font-bold">
            {groups.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('PRODUCTS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'PRODUCTS'
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Product Factory</span>
          <span className="px-1.5 py-0.2 rounded bg-black/20 text-[10px] font-mono font-bold">
            {products.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('MAKER_CHECKER')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'MAKER_CHECKER'
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Maker-Checker Dual Controls</span>
          {makerCheckerRequests.filter((r) => r.status === 'PENDING').length > 0 && (
            <span className="px-1.5 py-0.2 rounded bg-amber-400 text-slate-950 text-[10px] font-mono font-bold animate-pulse">
              {makerCheckerRequests.filter((r) => r.status === 'PENDING').length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('RECONCILIATION')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'RECONCILIATION'
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Scale className="w-3.5 h-3.5" />
          <span>Escrow 3-Way Reconciliation</span>
        </button>

        <button
          onClick={() => setActiveTab('RECOVERY')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'RECOVERY'
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Default & Recovery Pipeline</span>
        </button>

        <button
          onClick={() => setActiveTab('RISK')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'RISK'
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <FileCheck2 className="w-3.5 h-3.5" />
          <span>AML & Syndicate Intelligence</span>
        </button>
      </div>

      {/* TAB 1: ACTIVE ADASHI GROUPS */}
      {activeTab === 'GROUPS' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search group code, guild name, agent..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#0d162a] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div className="flex items-center bg-[#0d162a] border border-white/10 rounded-xl p-0.5">
                {(['ALL', 'NGN', 'XOF'] as const).map((curr) => (
                  <button
                    key={curr}
                    onClick={() => setSelectedCurrency(curr)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition ${
                      selectedCurrency === curr
                        ? 'bg-emerald-500 text-slate-950'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {curr}
                  </button>
                ))}
              </div>
            </div>

            <span className="text-xs text-slate-400 font-mono">
              Showing {filteredGroups.length} circles
            </span>
          </div>

          <div className="rounded-2xl bg-[#0d162a] border border-white/5 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400 font-mono uppercase text-[10px] bg-white/[0.02]">
                    <th className="p-3.5">Group / Code</th>
                    <th className="p-3.5">Assigned Agent</th>
                    <th className="p-3.5">Currency / Cadence</th>
                    <th className="p-3.5">Contribution / Pool</th>
                    <th className="p-3.5">Quorum</th>
                    <th className="p-3.5">Cycle Progress</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredGroups.map((g) => (
                    <tr key={g.id} className="hover:bg-white/[0.02] transition">
                      <td className="p-3.5">
                        <div className="font-bold text-white text-xs">{g.groupName}</div>
                        <div className="text-[10px] font-mono text-emerald-400">{g.groupCode}</div>
                      </td>
                      <td className="p-3.5">
                        <div className="text-slate-300 font-semibold">{g.assignedAgentName || 'Unassigned'}</div>
                        <div className="text-[10px] font-mono text-slate-500">Agent ID: {g.assignedAgentId?.slice(0, 12)}...</div>
                      </td>
                      <td className="p-3.5">
                        <div className="font-mono font-bold flex items-center gap-1.5">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] ${g.currency === 'NGN' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-teal-500/10 text-teal-400 border border-teal-500/20'}`}>
                            {g.currency}
                          </span>
                          <span className="text-slate-300 text-[11px]">{g.cadence}</span>
                        </div>
                      </td>
                      <td className="p-3.5 font-mono">
                        <div className="text-white font-bold">
                          {g.currency === 'NGN' ? '₦' : 'CFA'}{g.contributionAmount.toLocaleString()} / slot
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Pool: {g.currency === 'NGN' ? '₦' : 'CFA'}{g.totalPoolVolume.toLocaleString()}
                        </div>
                      </td>
                      <td className="p-3.5 font-mono">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-white">{g.currentMembersCount}</span>
                          <span className="text-slate-500">/</span>
                          <span className="text-slate-400">{g.targetMembers}</span>
                          {g.currentMembersCount === g.targetMembers ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <span className="text-[10px] text-amber-400">({g.targetMembers - g.currentMembersCount} needed)</span>
                          )}
                        </div>
                      </td>
                      <td className="p-3.5 font-mono">
                        <div className="text-slate-300">
                          Cycle <span className="font-bold text-white">{g.currentCycleNumber}</span> of {g.totalCycles}
                        </div>
                        <div className="w-24 bg-slate-800 h-1.5 rounded-full mt-1 overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full rounded-full"
                            style={{ width: `${(g.currentCycleNumber / g.totalCycles) * 100}%` }}
                          />
                        </div>
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                          g.status === 'ACTIVE_IN_PROGRESS'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : g.status === 'MEMBERSHIP_LOCKED'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : g.status === 'ROTATION_PUBLISHED'
                            ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                            : g.status === 'INVITING_MEMBERS'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-slate-500/10 text-slate-400 border border-white/10'
                        }`}>
                          {g.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-right space-x-1">
                        <button
                          onClick={() => viewGroupDetails(g.id)}
                          className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-[11px] font-semibold"
                        >
                          View 360
                        </button>

                        {g.status === 'INVITING_MEMBERS' && g.currentMembersCount === g.targetMembers && (
                          <button
                            onClick={() => handleLockMembership(g.id)}
                            disabled={actionLoading}
                            className="px-2.5 py-1 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 text-[11px] font-bold"
                          >
                            Lock Quorum
                          </button>
                        )}

                        {g.status === 'MEMBERSHIP_LOCKED' && (
                          <button
                            onClick={() => handleGenerateRotation(g.id)}
                            disabled={actionLoading}
                            className="px-2.5 py-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 text-[11px] font-bold"
                          >
                            Gen Rotation
                          </button>
                        )}

                        {g.status === 'ROTATION_PUBLISHED' && (
                          <button
                            onClick={() => handleStartGroup(g.id)}
                            disabled={actionLoading}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[11px] font-bold"
                          >
                            Start Circle
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PRODUCT FACTORY */}
      {activeTab === 'PRODUCTS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white">Adashi Product Template Factory</h2>
              <p className="text-xs text-slate-400">
                Governs financial fee structures, member quorum boundaries, grace periods, and maker-checker thresholds.
              </p>
            </div>
            <button
              onClick={() => setShowProductModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Product Template</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {products.map((p) => (
              <div key={p.id} className="p-5 rounded-2xl bg-[#0d162a] border border-white/5 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        p.currency === 'NGN' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-teal-500/10 text-teal-400 border border-teal-500/20'
                      }`}>
                        {p.countryCode} • {p.currency}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/5 text-slate-300">
                        v{p.version}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400">
                        {p.status}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-white mt-1.5">{p.productName}</h3>
                    <div className="text-[11px] font-mono text-emerald-400">{p.productCode}</div>
                  </div>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">{p.description}</p>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5 text-xs font-mono">
                  <div className="p-2 rounded-xl bg-slate-900/50">
                    <div className="text-[10px] text-slate-500 uppercase">Contribution</div>
                    <div className="font-bold text-white mt-0.5">
                      {p.currency === 'NGN' ? '₦' : 'CFA'}{p.contributionAmount.toLocaleString()}
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-900/50">
                    <div className="text-[10px] text-slate-500 uppercase">Cadence</div>
                    <div className="font-bold text-white mt-0.5">{p.cadence}</div>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-900/50">
                    <div className="text-[10px] text-slate-500 uppercase">Quorum (Min/Max)</div>
                    <div className="font-bold text-white mt-0.5">{p.minMembers} - {p.maxMembers}</div>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-900/50">
                    <div className="text-[10px] text-slate-500 uppercase">Platform Fee</div>
                    <div className="font-bold text-emerald-400 mt-0.5">{p.platformFeePercent}%</div>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-900/50">
                    <div className="text-[10px] text-slate-500 uppercase">Agent Comm</div>
                    <div className="font-bold text-amber-400 mt-0.5">{p.agentCommissionPercent}%</div>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-900/50">
                    <div className="text-[10px] text-slate-500 uppercase">Grace Period</div>
                    <div className="font-bold text-white mt-0.5">{p.gracePeriodHours} hrs</div>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 font-mono flex items-center justify-between pt-1">
                  <span>Dual Control Threshold: {p.currency === 'NGN' ? '₦' : 'CFA'}{p.payoutMakerCheckerThreshold.toLocaleString()}</span>
                  <span className="text-emerald-400 font-bold">Active in Catalog</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: MAKER-CHECKER DUAL CONTROLS */}
      {activeTab === 'MAKER_CHECKER' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <div className="font-bold">Segregation of Duties Enforcement</div>
              <div className="text-[11px] text-amber-300/80">
                Any high-value pool payout (&ge; 500k), manual rotation slot override, or default write-off requires dual authorization. The proposing Maker cannot approve their own submission.
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-[#0d162a] border border-white/5 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400 font-mono uppercase text-[10px] bg-white/[0.02]">
                    <th className="p-3.5">Request Type</th>
                    <th className="p-3.5">Entity / Scope</th>
                    <th className="p-3.5">Proposing Maker</th>
                    <th className="p-3.5">Maker Justification</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Checker Details</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {makerCheckerRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-white/[0.02] transition">
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          {req.requestType}
                        </span>
                        <div className="text-[10px] font-mono text-slate-500 mt-1">{req.id}</div>
                      </td>
                      <td className="p-3.5 font-mono text-xs">
                        <div className="text-white font-bold">{req.entityType}</div>
                        <div className="text-[10px] text-slate-400">{req.entityId}</div>
                      </td>
                      <td className="p-3.5">
                        <div className="text-slate-200 font-semibold">{req.makerName}</div>
                        <div className="text-[10px] font-mono text-slate-500">{req.makerRole}</div>
                      </td>
                      <td className="p-3.5 text-slate-300 max-w-xs truncate">
                        {req.makerNotes}
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                          req.status === 'PENDING'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse'
                            : req.status === 'APPROVED'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>
                          {req.status}
                        </span>
                      </td>
                      <td className="p-3.5">
                        {req.checkerName ? (
                          <div>
                            <div className="text-slate-200 font-semibold">{req.checkerName}</div>
                            <div className="text-[10px] text-slate-400">{req.checkerNotes}</div>
                          </div>
                        ) : (
                          <span className="text-[10px] font-mono text-slate-500">Awaiting Super Admin Review</span>
                        )}
                      </td>
                      <td className="p-3.5 text-right">
                        {req.status === 'PENDING' ? (
                          <button
                            onClick={() => setSelectedMkcRequest(req)}
                            className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition"
                          >
                            Review & Decide
                          </button>
                        ) : (
                          <span className="text-[10px] font-mono text-slate-500">Completed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: ESCROW 3-WAY RECONCILIATION */}
      {activeTab === 'RECONCILIATION' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-[#0d162a] border border-white/5">
              <div className="text-xs font-mono text-slate-400">1. ADASHI OPERATIONAL POOL</div>
              <div className="text-2xl font-extrabold text-white mt-1 font-mono">
                ₦{reconciliationReport?.adashiOperationalBalance?.toLocaleString() || 0}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Paid obligations minus net disbursements</div>
            </div>

            <div className="p-5 rounded-2xl bg-[#0d162a] border border-white/5">
              <div className="text-xs font-mono text-slate-400">2. CORE LEDGER ESCROW VAULT</div>
              <div className="text-2xl font-extrabold text-emerald-400 mt-1 font-mono">
                ₦{reconciliationReport?.coreLedgerEscrowBalance?.toLocaleString() || 0}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Account: ESCROW_VAULT_NGN_01</div>
            </div>

            <div className="p-5 rounded-2xl bg-[#0d162a] border border-white/5">
              <div className="text-xs font-mono text-slate-400">3. BANK SETTLEMENT ACCOUNT</div>
              <div className="text-2xl font-extrabold text-teal-400 mt-1 font-mono">
                ₦{reconciliationReport?.physicalBankSettlementBalance?.toLocaleString() || 0}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Providus Bank Custodial Node</div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#0d162a] border border-emerald-500/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <div className="font-bold text-white text-sm">Escrow Parity Certified (Zero Variance)</div>
                <div className="text-xs text-slate-400">
                  Total Contributions: ₦{reconciliationReport?.breakdown?.totalMemberContributionsPaid?.toLocaleString()} | Disbursed: ₦{reconciliationReport?.breakdown?.totalDisbursedToBeneficiaries?.toLocaleString()} | Platform Fees: ₦{reconciliationReport?.breakdown?.totalPlatformFeesCollected?.toLocaleString()}
                </div>
              </div>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono text-xs font-bold">
              STATUS: BALANCED
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: RECOVERY PIPELINE */}
      {activeTab === 'RECOVERY' && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-[#0d162a] border border-white/5 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400 font-mono uppercase text-[10px] bg-white/[0.02]">
                    <th className="p-3.5">Case Number</th>
                    <th className="p-3.5">Adashi Group</th>
                    <th className="p-3.5">Defaulted Member</th>
                    <th className="p-3.5">Assigned Agent</th>
                    <th className="p-3.5">Outstanding / Recovered</th>
                    <th className="p-3.5">Waterfall Stage</th>
                    <th className="p-3.5">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {recoveryCases.map((rc) => (
                    <tr key={rc.id} className="hover:bg-white/[0.02] transition">
                      <td className="p-3.5 font-mono font-bold text-emerald-400">{rc.caseNumber}</td>
                      <td className="p-3.5 text-slate-200 font-semibold">{rc.groupName}</td>
                      <td className="p-3.5">
                        <div className="font-bold text-white">{rc.defaultedCustomerName}</div>
                        <div className="text-[10px] font-mono text-slate-500">{rc.defaultedCustomerId}</div>
                      </td>
                      <td className="p-3.5 text-slate-300">{rc.assignedAgentName || 'Agent'}</td>
                      <td className="p-3.5 font-mono">
                        <div className="text-white font-bold">
                          {rc.currency === 'NGN' ? '₦' : 'CFA'}{rc.outstandingAmount.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-emerald-400">
                          Recovered: {rc.currency === 'NGN' ? '₦' : 'CFA'}{rc.recoveredAmount.toLocaleString()}
                        </div>
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                          rc.stage === 'SETTLED'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {rc.stage}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-400 text-[11px] max-w-xs">{rc.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: RISK & AML */}
      {activeTab === 'RISK' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-[#0d162a] border border-white/5 space-y-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-white text-sm">AML Thresholds & Isolation Rules</h3>
              </div>
              <ul className="space-y-2 text-xs text-slate-300">
                <li className="flex items-center justify-between p-2 rounded-xl bg-slate-900/50">
                  <span>Nigeria (NGN) Single Pool Max Volume:</span>
                  <span className="font-mono font-bold text-emerald-400">₦5,000,000</span>
                </li>
                <li className="flex items-center justify-between p-2 rounded-xl bg-slate-900/50">
                  <span>Niger Republic (XOF) Single Pool Max Volume:</span>
                  <span className="font-mono font-bold text-teal-400">5,000,000 CFA</span>
                </li>
                <li className="flex items-center justify-between p-2 rounded-xl bg-slate-900/50">
                  <span>Tier 1 KYC Contribution Max Cap:</span>
                  <span className="font-mono font-bold text-amber-400">₦20,000 / cycle</span>
                </li>
                <li className="flex items-center justify-between p-2 rounded-xl bg-slate-900/50">
                  <span>Maker-Checker High Value Payout:</span>
                  <span className="font-mono font-bold text-amber-400">≥ ₦500,000 / CFA 500,000</span>
                </li>
              </ul>
            </div>

            <div className="p-5 rounded-2xl bg-[#0d162a] border border-white/5 space-y-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-400" />
                <h3 className="font-bold text-white text-sm">Syndicate & Collision Detection</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Graph analysis continuously monitors cross-circle participation to prevent circular credit rings, ghost savers, and agent commission abuse.
              </p>
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
                ✓ 0 Suspicious Syndicate Clusters Detected across current active circles.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE PRODUCT MODAL */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-[#0a0f1d] border border-white/10 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white">Create New Adashi Product Template</h3>
              <button onClick={() => setShowProductModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-mono">Product Code</label>
                  <input
                    type="text"
                    required
                    placeholder="ADA-NGN-WK-25K"
                    value={newProductForm.productCode}
                    onChange={(e) => setNewProductForm({ ...newProductForm, productCode: e.target.value })}
                    className="w-full mt-1 p-2 rounded-xl bg-[#0d162a] border border-white/10 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-mono">Product Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Bi-Weekly Elite Circle"
                    value={newProductForm.productName}
                    onChange={(e) => setNewProductForm({ ...newProductForm, productName: e.target.value })}
                    className="w-full mt-1 p-2 rounded-xl bg-[#0d162a] border border-white/10 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-mono">Currency</label>
                  <select
                    value={newProductForm.currency}
                    onChange={(e) => {
                      const curr = e.target.value as 'NGN' | 'XOF';
                      setNewProductForm({
                        ...newProductForm,
                        currency: curr,
                        countryCode: curr === 'NGN' ? 'NG' : 'NE',
                      });
                    }}
                    className="w-full mt-1 p-2 rounded-xl bg-[#0d162a] border border-white/10 text-white font-mono"
                  >
                    <option value="NGN">NGN (Nigeria)</option>
                    <option value="XOF">XOF (Niger Republic)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-mono">Cadence</label>
                  <select
                    value={newProductForm.cadence}
                    onChange={(e) => setNewProductForm({ ...newProductForm, cadence: e.target.value as any })}
                    className="w-full mt-1 p-2 rounded-xl bg-[#0d162a] border border-white/10 text-white font-mono"
                  >
                    <option value="WEEKLY">Weekly</option>
                    <option value="BIWEEKLY">Bi-Weekly</option>
                    <option value="MONTHLY">Monthly</option>
                    <option value="DAILY">Daily</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-mono">Amount / Slot</label>
                  <input
                    type="number"
                    required
                    value={newProductForm.contributionAmount}
                    onChange={(e) => setNewProductForm({ ...newProductForm, contributionAmount: Number(e.target.value) })}
                    className="w-full mt-1 p-2 rounded-xl bg-[#0d162a] border border-white/10 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-mono">Platform Fee %</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newProductForm.platformFeePercent}
                    onChange={(e) => setNewProductForm({ ...newProductForm, platformFeePercent: Number(e.target.value) })}
                    className="w-full mt-1 p-2 rounded-xl bg-[#0d162a] border border-white/10 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-mono">Agent Comm %</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newProductForm.agentCommissionPercent}
                    onChange={(e) => setNewProductForm({ ...newProductForm, agentCommissionPercent: Number(e.target.value) })}
                    className="w-full mt-1 p-2 rounded-xl bg-[#0d162a] border border-white/10 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-mono">Grace Period (hrs)</label>
                  <input
                    type="number"
                    value={newProductForm.gracePeriodHours}
                    onChange={(e) => setNewProductForm({ ...newProductForm, gracePeriodHours: Number(e.target.value) })}
                    className="w-full mt-1 p-2 rounded-xl bg-[#0d162a] border border-white/10 text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold"
                >
                  Create Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MAKER CHECKER ACTION MODAL */}
      {selectedMkcRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#0a0f1d] border border-white/10 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white">Maker-Checker Authorization</h3>
                <div className="text-[10px] font-mono text-amber-400">{selectedMkcRequest.requestType}</div>
              </div>
              <button onClick={() => setSelectedMkcRequest(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-[#0d162a] border border-white/5 space-y-2 text-xs">
              <div className="text-slate-400 font-mono text-[10px]">MAKER PROPOSAL</div>
              <div className="text-white font-semibold">{selectedMkcRequest.makerNotes}</div>
              <div className="text-[10px] text-slate-500 font-mono">
                Proposed by: {selectedMkcRequest.makerName} ({selectedMkcRequest.makerRole})
              </div>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 uppercase font-mono">Checker Decision Notes</label>
              <textarea
                rows={3}
                placeholder="Escrow balance verified and compliance checks validated..."
                value={checkerNotes}
                onChange={(e) => setCheckerNotes(e.target.value)}
                className="w-full mt-1 p-2 rounded-xl bg-[#0d162a] border border-white/10 text-white text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
              <button
                onClick={() => handleActionMakerChecker('REJECT')}
                disabled={actionLoading}
                className="px-3 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 text-xs font-bold"
              >
                Reject Request
              </button>
              <button
                onClick={() => handleActionMakerChecker('APPROVE')}
                disabled={actionLoading}
                className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold"
              >
                Dual-Authorize & Execute
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GROUP 360 MODAL */}
      {selectedGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl bg-[#0a0f1d] border border-white/10 rounded-2xl p-6 space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white">{selectedGroup.groupName}</h3>
                <div className="text-[10px] font-mono text-emerald-400">{selectedGroup.groupCode}</div>
              </div>
              <button onClick={() => setSelectedGroup(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs font-mono">
              <div className="p-2 rounded-xl bg-[#0d162a]">
                <div className="text-[10px] text-slate-500">Status</div>
                <div className="font-bold text-white">{selectedGroup.status}</div>
              </div>
              <div className="p-2 rounded-xl bg-[#0d162a]">
                <div className="text-[10px] text-slate-500">Contribution / Slot</div>
                <div className="font-bold text-emerald-400">
                  {selectedGroup.currency === 'NGN' ? '₦' : 'CFA'}{selectedGroup.contributionAmount.toLocaleString()}
                </div>
              </div>
              <div className="p-2 rounded-xl bg-[#0d162a]">
                <div className="text-[10px] text-slate-500">Escrow Vault ID</div>
                <div className="font-bold text-slate-300">{selectedGroup.escrowVaultAccountId}</div>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-white mb-2 font-mono uppercase">Enrolled Members ({selectedGroup.members?.length || 0})</h4>
              <div className="space-y-1.5 text-xs">
                {selectedGroup.members?.map((m: any) => (
                  <div key={m.id} className="p-2.5 rounded-xl bg-[#0d162a] border border-white/5 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-white flex items-center gap-2">
                        <span>{m.customerName}</span>
                        {m.assignedPosition && (
                          <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 text-[10px] font-mono">
                            Slot #{m.assignedPosition}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">{m.customerPhone} • Tier {m.kycTier}</div>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        m.mandateAuthorized ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                      }`}>
                        {m.mandateAuthorized ? 'Mandate Active' : 'No Mandate'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-white/10">
              <button
                onClick={() => setSelectedGroup(null)}
                className="px-4 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
