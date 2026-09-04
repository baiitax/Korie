'use client';

import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Search,
  Filter,
  ShieldAlert,
  CheckCircle,
  XCircle,
  Zap,
  Activity,
  Network,
  FolderLock,
  FileSpreadsheet,
  FileCheck2,
  Lock,
  Unlock,
  RefreshCw,
  Eye,
  Sliders,
  Send,
  UserCheck,
  Building,
  Smartphone,
  CreditCard,
  Layers,
  Clock,
  ArrowRight,
  ChevronRight,
  PlusCircle,
  ExternalLink
} from 'lucide-react';
import { AmlAlertRecord, AmlCaseRecord, AmlScenarioRecord, AmlGraphNode, AmlGraphEdge, AmlSeverity } from '@/types/amlEngine';

export default function AmlCommandCenterPage() {
  const [activeTab, setActiveTab] = useState<'ALERTS' | 'CASES' | 'GRAPH' | 'SCENARIOS' | 'REGULATORY'>('ALERTS');
  const [alerts, setAlerts] = useState<AmlAlertRecord[]>([]);
  const [cases, setCases] = useState<AmlCaseRecord[]>([]);
  const [scenarios, setScenarios] = useState<AmlScenarioRecord[]>([]);
  const [graphData, setGraphData] = useState<{ nodes: AmlGraphNode[]; edges: AmlGraphEdge[] }>({ nodes: [], edges: [] });
  const [loading, setLoading] = useState(false);

  // Filters
  const [jurisdictionFilter, setJurisdictionFilter] = useState<'ALL' | 'NG' | 'NE'>('ALL');
  const [severityFilter, setSeverityFilter] = useState<'ALL' | AmlSeverity>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Alert for Explainability Drawer
  const [selectedAlert, setSelectedAlert] = useState<AmlAlertRecord | null>(null);

  // Selected Case for Investigation Workbench
  const [selectedCase, setSelectedCase] = useState<AmlCaseRecord | null>(null);
  const [newNoteText, setNewNoteText] = useState('');
  const [newNoteType, setNewNoteType] = useState('OBSERVATION');

  // Maker-Checker Decision Modal
  const [isDecisionModalOpen, setIsDecisionModalOpen] = useState(false);
  const [decisionType, setDecisionType] = useState('ENHANCED_MONITORING');
  const [decisionNotes, setDecisionNotes] = useState('');
  const [checkerEmail, setCheckerEmail] = useState('mlro@koriepay.com');

  // Graph Entity Selector
  const [selectedGraphEntity, setSelectedGraphEntity] = useState('cust-ng-001-ibrahim');

  // Scenario Simulator
  const [simAmount, setSimAmount] = useState('4850000');
  const [simCurrency, setSimCurrency] = useState<'NGN' | 'XOF'>('NGN');
  const [simChannel, setSimChannel] = useState('NIP');
  const [simIncome, setSimIncome] = useState('1200000');
  const [simResult, setSimResult] = useState<any[]>([]);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/aml/alerts');
      const json = await res.json();
      if (json.success && json.data) {
        setAlerts(json.data.alerts);
      }
    } catch (e) {
      console.error('Failed to fetch AML alerts', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchCases = async () => {
    try {
      const res = await fetch('/api/aml/cases');
      const json = await res.json();
      if (json.success && json.data) {
        setCases(json.data.cases);
        if (selectedCase) {
          const updated = json.data.cases.find((c: AmlCaseRecord) => c.id === selectedCase.id);
          if (updated) setSelectedCase(updated);
        }
      }
    } catch (e) {
      console.error('Failed to fetch cases', e);
    }
  };

  const fetchScenarios = async () => {
    try {
      const res = await fetch('/api/aml/scenarios');
      const json = await res.json();
      if (json.success && json.data) {
        setScenarios(json.data.scenarios);
      }
    } catch (e) {
      console.error('Failed to fetch scenarios', e);
    }
  };

  const fetchGraph = async (entityId: string) => {
    try {
      const res = await fetch(`/api/aml/network?entityId=${encodeURIComponent(entityId)}`);
      const json = await res.json();
      if (json.success && json.data) {
        setGraphData(json.data);
      }
    } catch (e) {
      console.error('Failed to fetch graph data', e);
    }
  };

  useEffect(() => {
    fetchAlerts();
    fetchCases();
    fetchScenarios();
    fetchGraph(selectedGraphEntity);
  }, []);

  const handleConvertToCase = async (alert: AmlAlertRecord) => {
    try {
      const res = await fetch(`/api/aml/alerts/${alert.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CONVERT_TO_CASE',
          investigatorEmail: 'lead.investigator@koriepay.ng',
        }),
      });
      const json = await res.json();
      if (json.success) {
        fetchAlerts();
        fetchCases();
        setSelectedAlert(null);
        setActiveTab('CASES');
        if (json.case) setSelectedCase(json.case);
      }
    } catch (e) {
      console.error('Failed to convert alert to case', e);
    }
  };

  const handleAddCaseNote = async () => {
    if (!selectedCase || !newNoteText.trim()) return;
    try {
      const res = await fetch(`/api/aml/cases/${selectedCase.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ADD_NOTE',
          content: newNoteText,
          noteType: newNoteType,
          authorEmail: 'lead.investigator@koriepay.ng',
        }),
      });
      const json = await res.json();
      if (json.success) {
        setNewNoteText('');
        fetchCases();
      }
    } catch (e) {
      console.error('Failed to add note', e);
    }
  };

  const handleSubmitCaseDecision = async () => {
    if (!selectedCase) return;
    try {
      const res = await fetch(`/api/aml/cases/${selectedCase.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SUBMIT_DECISION',
          decision: decisionType,
          notes: decisionNotes,
          makerEmail: 'lead.investigator@koriepay.ng',
          checkerEmail: checkerEmail,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setIsDecisionModalOpen(false);
        setDecisionNotes('');
        fetchCases();
      }
    } catch (e) {
      console.error('Failed to submit decision', e);
    }
  };

  const handleSimulateRules = () => {
    const amt = parseFloat(simAmount) || 0;
    const inc = parseFloat(simIncome) || 0;
    const hits: any[] = [];

    if (amt >= 4500000 && amt < 5000000) {
      hits.push({
        code: 'AML_STRUC_01',
        name: 'Structuring / Smurfing Pattern',
        severity: 'P1_HIGH',
        reason: 'Amount is within 10% below statutory threshold (NGN 5M / XOF 10M).',
      });
    }

    if (amt >= 1000000 && simChannel === 'NIP') {
      hits.push({
        code: 'AML_RAPID_01',
        name: 'Rapid Movement of Funds / Pass-Through Account',
        severity: 'P0_CRITICAL',
        reason: 'Immediate high-velocity outflow across disparate counterparties.',
      });
    }

    if (inc > 0 && amt > inc * 3) {
      hits.push({
        code: 'AML_VELOC_01',
        name: 'Unusual Transaction Velocity Outlier',
        severity: 'P2_MEDIUM',
        reason: `Transaction amount exceeds customer declared baseline by ${(amt / inc).toFixed(1)}x.`,
      });
    }

    setSimResult(hits);
  };

  const filteredAlerts = alerts.filter((a) => {
    if (jurisdictionFilter === 'NG' && a.currency !== 'NGN') return false;
    if (jurisdictionFilter === 'NE' && a.currency !== 'XOF') return false;
    if (severityFilter !== 'ALL' && a.severity !== severityFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        a.alertReference.toLowerCase().includes(q) ||
        a.scenarioCode.toLowerCase().includes(q) ||
        (a.customerName && a.customerName.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5" />
              P0 AML SURVEILLANCE &amp; CASE PLATFORM
            </span>
            <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              ● NGN ↔ XOF CORRIDORS ACTIVE
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-white mt-1">Financial Crime Command Center &amp; Graph Intelligence</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Operational control plane consuming Ledger, Switch, and Identity streams with immutable evidence vault &amp; Maker-Checker sign-offs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              fetchAlerts();
              fetchCases();
              fetchScenarios();
            }}
            className="p-2.5 rounded-xl bg-slate-900 border border-white/10 text-slate-300 hover:text-white transition flex items-center gap-2 text-xs font-bold"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync Telemetry</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Header */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[#080D1A]/90 border border-white/10 space-y-1">
          <div className="flex justify-between items-center text-slate-400 text-xs">
            <span>Critical P0 Alerts</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">
            {alerts.filter((a) => a.severity === 'P0_CRITICAL' && a.status !== 'DISMISSED').length}
          </div>
          <div className="text-[10px] text-rose-400 font-mono">Response SLA &le; 2 Hours</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#080D1A]/90 border border-white/10 space-y-1">
          <div className="flex justify-between items-center text-slate-400 text-xs">
            <span>Active Investigations</span>
            <FolderLock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">
            {cases.filter((c) => c.status !== 'CLOSED').length}
          </div>
          <div className="text-[10px] text-amber-400 font-mono">Dual-Authorization Queue</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#080D1A]/90 border border-white/10 space-y-1">
          <div className="flex justify-between items-center text-slate-400 text-xs">
            <span>Corridor Monitored</span>
            <Layers className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">NGN / XOF</div>
          <div className="text-[10px] text-emerald-400 font-mono">Providus NG &amp; Koris Bank NE</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#080D1A]/90 border border-white/10 space-y-1">
          <div className="flex justify-between items-center text-slate-400 text-xs">
            <span>Detection Typologies</span>
            <Activity className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">{scenarios.length}</div>
          <div className="text-[10px] text-cyan-400 font-mono">8 Active Rule Automations</div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-3">
        {[
          { id: 'ALERTS', label: 'Explainable Alerts Desk', icon: AlertTriangle, count: alerts.length },
          { id: 'CASES', label: 'Investigation Workbench', icon: FolderLock, count: cases.length },
          { id: 'GRAPH', label: 'Network Graph Explorer', icon: Network },
          { id: 'SCENARIOS', label: 'Typology Simulator', icon: Sliders },
          { id: 'REGULATORY', label: 'Sovereign STR Work Queue', icon: FileSpreadsheet },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                isActive
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/20'
                  : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${isActive ? 'bg-slate-950 text-amber-400' : 'bg-slate-800 text-slate-300'}`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab 1: ALERTS DESK */}
      {activeTab === 'ALERTS' && (
        <div className="space-y-4">
          {/* Controls */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by alert ref, scenario code, or subject name..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex bg-slate-950 border border-slate-800 rounded-xl p-1 text-xs">
                {(['ALL', 'NG', 'NE'] as const).map((jur) => (
                  <button
                    key={jur}
                    onClick={() => setJurisdictionFilter(jur)}
                    className={`px-3 py-1 rounded-lg font-bold transition ${
                      jurisdictionFilter === jur ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {jur === 'ALL' ? 'All Corridors' : jur === 'NG' ? '🇳🇬 Nigeria' : '🇳🇪 Niger'}
                  </button>
                ))}
              </div>

              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value as any)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                <option value="ALL">All Severities</option>
                <option value="P0_CRITICAL">P0 Critical</option>
                <option value="P1_HIGH">P1 High</option>
                <option value="P2_MEDIUM">P2 Medium</option>
                <option value="P3_LOW">P3 Low</option>
              </select>
            </div>
          </div>

          {/* Alert Cards */}
          <div className="grid grid-cols-1 gap-4">
            {filteredAlerts.map((alt) => (
              <div
                key={alt.id}
                className="p-5 rounded-2xl bg-[#080D1A]/90 border border-white/10 hover:border-amber-500/40 transition space-y-3 shadow-xl"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-amber-400 bg-amber-950/60 px-2.5 py-0.5 rounded border border-amber-800/40">
                      {alt.alertReference}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase font-mono ${
                        alt.severity === 'P0_CRITICAL'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : alt.severity === 'P1_HIGH'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-blue-500/20 text-blue-300'
                      }`}
                    >
                      {alt.severity.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] font-mono bg-slate-800 px-2 py-0.5 rounded text-slate-300">
                      Rule: {alt.scenarioCode} (v{alt.scenarioVersion})
                    </span>
                    <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400 font-mono">
                      {alt.currency === 'NGN' ? '🇳🇬 NGN' : '🇳🇪 XOF'}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-slate-400">Triggered Exposure: </span>
                    <span className="text-sm font-extrabold text-emerald-400 font-mono">
                      {alt.currency} {alt.disputedOrTriggeredAmount.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* 7-Dimension Explainability Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-slate-950/60 p-3.5 rounded-xl border border-white/5">
                  <div>
                    <span className="text-slate-400 font-bold block mb-0.5">WHAT HAPPENED:</span>
                    <p className="text-slate-200">{alt.whatHappened}</p>
                  </div>
                  <div>
                    <span className="text-amber-400 font-bold block mb-0.5">WHY SUSPICIOUS:</span>
                    <p className="text-slate-300">{alt.whySuspicious}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block mb-0.5">WHO INVOLVED:</span>
                    <p className="text-slate-200 font-mono">{alt.whoInvolved}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block mb-0.5">DETECTION METHOD:</span>
                    <p className="text-slate-300 font-mono">{alt.howPatternDetected}</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
                    <span>Subject: <strong className="text-white">{alt.customerName || alt.customerId}</strong></span>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-rose-400 font-bold">
                      <Clock className="w-3.5 h-3.5" />
                      SLA: {new Date(alt.slaDueAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedAlert(alt)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Dossier Snapshot
                    </button>
                    {alt.status !== 'CONVERTED_TO_CASE' && (
                      <button
                        onClick={() => handleConvertToCase(alt)}
                        className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-xs transition shadow-lg flex items-center gap-1.5"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        Open Formal Case
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: INVESTIGATION WORKBENCH */}
      {activeTab === 'CASES' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Case Selector Column */}
          <div className="lg:col-span-1 space-y-3">
            <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
              Active Investigation Cases ({cases.length})
            </h3>
            <div className="space-y-2">
              {cases.map((c) => (
                <div
                  key={c.id}
                  onClick={() => setSelectedCase(c)}
                  className={`p-4 rounded-2xl border cursor-pointer transition ${
                    selectedCase?.id === c.id
                      ? 'bg-amber-500/10 border-amber-500/50 shadow-lg'
                      : 'bg-[#080D1A]/90 border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-mono font-bold text-amber-400">{c.caseReference}</span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                      c.status === 'CLOSED' ? 'bg-slate-800 text-slate-400' : 'bg-rose-500/20 text-rose-300'
                    }`}>
                      {c.status}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-white line-clamp-2">{c.title}</h4>
                  <div className="mt-2 flex justify-between items-center text-[11px] text-slate-400 font-mono">
                    <span>{c.primaryCustomerName}</span>
                    <span className="text-emerald-400 font-bold">{c.currency} {c.totalExposureAmount.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Case Dossier Main Desk */}
          <div className="lg:col-span-2">
            {selectedCase ? (
              <div className="p-6 rounded-3xl bg-[#080D1A]/90 border border-white/10 space-y-6 shadow-2xl">
                {/* Dossier Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-amber-400">{selectedCase.caseReference}</span>
                      <span className="text-[10px] font-mono bg-slate-800 px-2 py-0.5 rounded text-slate-300">
                        {selectedCase.jurisdiction === 'NG' ? '🇳🇬 Nigeria Desk' : '🇳🇪 Niger Desk'}
                      </span>
                    </div>
                    <h2 className="text-base font-extrabold text-white mt-1">{selectedCase.title}</h2>
                  </div>

                  <button
                    onClick={() => setIsDecisionModalOpen(true)}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-extrabold text-xs shadow-lg transition flex items-center gap-1.5"
                  >
                    <UserCheck className="w-4 h-4" />
                    Maker-Checker Decision
                  </button>
                </div>

                {/* Case Meta Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-950/60 p-4 rounded-2xl border border-white/5">
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Subject Customer</span>
                    <span className="text-white font-bold">{selectedCase.primaryCustomerName}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Total Exposure</span>
                    <span className="text-emerald-400 font-bold font-mono">
                      {selectedCase.currency} {selectedCase.totalExposureAmount.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Lead Investigator</span>
                    <span className="text-slate-300 font-mono text-[11px]">{selectedCase.leadInvestigator}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Assigned Unit</span>
                    <span className="text-slate-300">{selectedCase.assignedTeam}</span>
                  </div>
                </div>

                {/* Final Decision Stamp if Decided */}
                {selectedCase.finalDecision && (
                  <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                      <CheckCircle className="w-4 h-4" />
                      AUTHORIZED RESOLUTION: {selectedCase.finalDecision}
                    </div>
                    <p className="text-xs text-slate-300">{selectedCase.decisionNotes}</p>
                    <div className="flex gap-4 text-[10px] font-mono text-slate-400">
                      <span>Maker: {selectedCase.decisionMaker}</span>
                      <span>Checker: {selectedCase.decisionChecker}</span>
                      <span>Decided: {new Date(selectedCase.decidedAt || '').toLocaleString()}</span>
                    </div>
                  </div>
                )}

                {/* Immutable Investigation Notes Timeline */}
                <div className="space-y-3">
                  <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
                    Immutable Investigation Notes ({selectedCase.notes?.length || 0})
                  </h4>

                  <div className="space-y-2 max-h-56 overflow-y-auto">
                    {selectedCase.notes?.map((n) => (
                      <div key={n.id} className="p-3 rounded-xl bg-slate-950 border border-white/5 space-y-1">
                        <div className="flex justify-between items-center text-[10px] font-mono">
                          <span className="font-bold text-amber-400">{n.noteType}</span>
                          <span className="text-slate-500">{new Date(n.createdAt).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-xs text-slate-200">{n.content}</p>
                        <div className="text-[10px] text-slate-500 font-mono">Author: {n.authorEmail}</div>
                      </div>
                    ))}
                  </div>

                  {/* Add Note Input */}
                  <div className="flex gap-2 pt-2">
                    <select
                      value={newNoteType}
                      onChange={(e) => setNewNoteType(e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                    >
                      <option value="OBSERVATION">OBSERVATION</option>
                      <option value="HYPOTHESIS">HYPOTHESIS</option>
                      <option value="VERIFICATION">VERIFICATION</option>
                    </select>

                    <input
                      type="text"
                      value={newNoteText}
                      onChange={(e) => setNewNoteText(e.target.value)}
                      placeholder="Enter timestamped immutable finding..."
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                    />

                    <button
                      onClick={handleAddCaseNote}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
                    >
                      Record Note
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center p-8 rounded-3xl bg-[#080D1A]/90 border border-white/10 text-slate-500 text-xs">
                <FolderLock className="w-8 h-8 mb-2 opacity-50" />
                Select an investigation case on the left to view dossier and chain of custody.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: NETWORK GRAPH EXPLORER */}
      {activeTab === 'GRAPH' && (
        <div className="p-6 rounded-3xl bg-[#080D1A]/90 border border-white/10 space-y-6 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
            <div>
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <Network className="w-5 h-5 text-amber-400" />
                Multi-Hop Entity Relationship &amp; Mule Ring Explorer
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Multi-entity graph linking Customers, Accounts, POS Devices, Agents, and External Counterparties.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-mono">Root Entity:</span>
              <select
                value={selectedGraphEntity}
                onChange={(e) => {
                  setSelectedGraphEntity(e.target.value);
                  fetchGraph(e.target.value);
                }}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
              >
                <option value="cust-ng-001-ibrahim">Ibrahim Bello (Subject - NG)</option>
                <option value="cust-ne-001-amara">Amara Diallo (Niamey - NE)</option>
              </select>
            </div>
          </div>

          {/* Graph Visualization Canvas */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Graph Node Topology View */}
            <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-950/80 border border-white/5 space-y-4">
              <h4 className="text-xs font-mono font-bold text-slate-400 uppercase">
                Active Topology (Nodes: {graphData.nodes.length} | Edges: {graphData.edges.length})
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {graphData.nodes.map((node) => (
                  <div
                    key={node.nodeId}
                    className={`p-3.5 rounded-xl border space-y-1.5 transition ${
                      node.nodeId === selectedGraphEntity
                        ? 'bg-amber-500/20 border-amber-500'
                        : 'bg-slate-900/80 border-slate-800'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {node.nodeType}
                      </span>
                      <span className={`text-[10px] font-mono font-bold ${node.riskScore >= 70 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        Risk: {node.riskScore}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-white truncate">{node.label}</div>
                    <div className="text-[10px] text-slate-500 font-mono truncate">{node.nodeId}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Edge Relational Stream */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-white/5 space-y-3">
              <h4 className="text-xs font-mono font-bold text-slate-400 uppercase">Relational Edges</h4>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {graphData.edges.map((e) => (
                  <div key={e.id} className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1 text-xs">
                    <div className="flex justify-between items-center text-[10px] font-mono">
                      <span className="text-amber-400 font-bold">{e.edgeType}</span>
                      <span className="text-slate-500">{e.transactionCount} txns</span>
                    </div>
                    <div className="text-white font-mono text-[11px] truncate">{e.sourceNodeId} &rarr; {e.targetNodeId}</div>
                    <div className="text-emerald-400 font-mono font-bold text-[11px]">
                      Total: {e.totalVolume.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: SCENARIOS SIMULATOR */}
      {activeTab === 'SCENARIOS' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Simulator Form */}
          <div className="p-6 rounded-3xl bg-[#080D1A]/90 border border-white/10 space-y-4 shadow-2xl">
            <h3 className="text-base font-extrabold text-white flex items-center gap-2">
              <Sliders className="w-5 h-5 text-amber-400" />
              Scenario Typology Simulator
            </h3>
            <p className="text-xs text-slate-400">
              Inject synthetic transaction telemetry to verify detection rule boundaries.
            </p>

            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-slate-400 text-xs mb-1">Transaction Amount</label>
                <input
                  type="number"
                  value={simAmount}
                  onChange={(e) => setSimAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 text-xs mb-1">Currency Corridor</label>
                  <select
                    value={simCurrency}
                    onChange={(e) => setSimCurrency(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                  >
                    <option value="NGN">NGN (Nigeria)</option>
                    <option value="XOF">XOF (Niger Republic)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 text-xs mb-1">Settlement Channel</label>
                  <select
                    value={simChannel}
                    onChange={(e) => setSimChannel(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                  >
                    <option value="NIP">NIP (Instant Payment)</option>
                    <option value="POS">POS Terminal</option>
                    <option value="BDC_FX">BDC FX Desk</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 text-xs mb-1">Declared Monthly Baseline</label>
                <input
                  type="number"
                  value={simIncome}
                  onChange={(e) => setSimIncome(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                />
              </div>

              <button
                onClick={handleSimulateRules}
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs transition shadow-lg mt-2"
              >
                Execute Scenario Evaluation
              </button>
            </div>
          </div>

          {/* Simulation Output */}
          <div className="p-6 rounded-3xl bg-[#080D1A]/90 border border-white/10 space-y-4 shadow-2xl">
            <h3 className="text-base font-extrabold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-400" />
              Evaluation Result ({simResult.length} Typology Triggers)
            </h3>

            {simResult.length > 0 ? (
              <div className="space-y-3">
                {simResult.map((hit, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-mono font-bold text-rose-300">{hit.code}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold">
                        {hit.severity}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-white">{hit.name}</div>
                    <p className="text-xs text-slate-300">{hit.reason}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center p-8 rounded-2xl bg-slate-950/60 border border-white/5 text-slate-500 text-xs text-center">
                <Sliders className="w-8 h-8 mb-2 opacity-50" />
                Configure simulation parameters and click Evaluate to test rule boundaries.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 5: SOVEREIGN REGULATORY STR QUEUE */}
      {activeTab === 'REGULATORY' && (
        <div className="p-6 rounded-3xl bg-[#080D1A]/90 border border-white/10 space-y-6 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
            <div>
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-amber-400" />
                Sovereign Regulatory STR / SAR Work Queue
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Dual-jurisdiction suspicious transaction filings prepared for NFIU (Nigeria) and CENTIF (Niger Republic).
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-slate-950/80 border border-white/5 space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-amber-400">NFIU-STR-2026-0091</span>
                  <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-300 font-mono">🇳🇬 NFIU Nigeria</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                  READY FOR MLRO APPROVAL
                </span>
              </div>
              <div className="text-xs text-slate-200 font-bold">
                Typology: Structuring &amp; Rapid Mule Pass-Through (Lagos Clearing Corridor)
              </div>
              <p className="text-xs text-slate-400">
                Subject entity processed NGN 4,850,000 via rapid multi-party disbursement without commercial economic rationale.
              </p>
              <div className="flex justify-between items-center pt-2 text-[11px] font-mono text-slate-500 border-t border-slate-900">
                <span>Prepared by: lead.investigator@koriepay.ng</span>
                <span className="text-emerald-400 font-bold">NGN 4,850,000</span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-950/80 border border-white/5 space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-amber-400">CENTIF-DS-2026-0034</span>
                  <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-300 font-mono">🇳🇪 CENTIF Niger</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                  TRANSMITTED TO REGULATOR
                </span>
              </div>
              <div className="text-xs text-slate-200 font-bold">
                Typology: Near-Threshold Cash Structuring (Niamey Agency Kiosque)
              </div>
              <p className="text-xs text-slate-400">
                Repeated cash smurfing transactions totaling 4,750,000 CFA positioned below UEMOA 5M limit.
              </p>
              <div className="flex justify-between items-center pt-2 text-[11px] font-mono text-slate-500 border-t border-slate-900">
                <span>Receipt Hash: 0x8f72...a901</span>
                <span className="text-emerald-400 font-bold">XOF 4,750,000</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Maker-Checker Decision Modal */}
      {isDecisionModalOpen && selectedCase && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="p-6 rounded-3xl bg-[#0b1324] border border-white/10 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-white/10">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-amber-400" />
                Maker-Checker Case Resolution Sign-Off
              </h3>
              <button onClick={() => setIsDecisionModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-slate-400 text-xs mb-1">Authorized Decision Outcome</label>
                <select
                  value={decisionType}
                  onChange={(e) => setDecisionType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                >
                  <option value="ENHANCED_MONITORING">ENHANCED MONITORING (EDD)</option>
                  <option value="ACCOUNT_RESTRICTION_EXECUTED">RESTRICT ACCOUNT TRANSFERS</option>
                  <option value="STR_SUBMITTED_TO_REGULATOR">SUBMIT STR TO REGULATOR (NFIU/CENTIF)</option>
                  <option value="FALSE_POSITIVE">CLEAR AS FALSE POSITIVE</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 text-xs mb-1">Checker (MLRO) Sign-Off Email</label>
                <input
                  type="email"
                  value={checkerEmail}
                  onChange={(e) => setCheckerEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 text-xs mb-1">Decision Justification &amp; Audit Log</label>
                <textarea
                  value={decisionNotes}
                  onChange={(e) => setDecisionNotes(e.target.value)}
                  placeholder="Document grounds for action and verification of evidence..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white h-24"
                  required
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setIsDecisionModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitCaseDecision}
                disabled={!decisionNotes}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-extrabold text-xs shadow-lg"
              >
                Authorize Resolution
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
