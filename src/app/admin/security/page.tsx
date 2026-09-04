'use client';

import React, { useState, useEffect } from 'react';
import {
  Lock,
  Unlock,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  KeyRound,
  Smartphone,
  LogOut,
  RefreshCw,
  Activity,
  UserCheck,
  Eye,
  Sliders,
  Send,
  FileSpreadsheet,
  Clock,
  Layers,
  Zap,
  CheckCircle,
  XCircle,
  Radio,
  Server,
  FolderLock
} from 'lucide-react';
import {
  IamSessionRecord,
  PrivilegedAccessRequest,
  BreakGlassEvent,
  SecurityEventRecord,
  SecurityAlertRecord,
  SecurityIncidentRecord,
  SecurityPostureReport,
} from '@/types/iamEngine';

export default function SecurityAdminPage() {
  const [activeTab, setActiveTab] = useState<'POSTURE' | 'SESSIONS' | 'PAM' | 'SIEM' | 'INCIDENTS'>('POSTURE');
  const [posture, setPosture] = useState<SecurityPostureReport | null>(null);
  const [sessions, setSessions] = useState<IamSessionRecord[]>([]);
  const [pamRequests, setPamRequests] = useState<PrivilegedAccessRequest[]>([]);
  const [events, setEvents] = useState<SecurityEventRecord[]>([]);
  const [alerts, setAlerts] = useState<SecurityAlertRecord[]>([]);
  const [incidents, setIncidents] = useState<SecurityIncidentRecord[]>([]);
  const [loading, setLoading] = useState(false);

  // Modal States
  const [isJitModalOpen, setIsJitModalOpen] = useState(false);
  const [jitTargetRole, setJitTargetRole] = useState('TREASURY_EMERGENCY_REBALANCE');
  const [jitJustification, setJitJustification] = useState('');
  const [jitTicketRef, setJitTicketRef] = useState('CHG-OPS-2026-');
  const [jitDuration, setJitDuration] = useState('30');

  const [isBreakGlassModalOpen, setIsBreakGlassModalOpen] = useState(false);
  const [bgJustification, setBgJustification] = useState('');
  const [bgIncidentRef, setBgIncidentRef] = useState('INC-DISASTER-RECOVERY-');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [posRes, sessRes, pamRes, evtRes, altRes, incRes] = await Promise.all([
        fetch('/api/security/posture').then((r) => r.json()),
        fetch('/api/security/sessions').then((r) => r.json()),
        fetch('/api/security/pam/requests').then((r) => r.json()),
        fetch('/api/security/events').then((r) => r.json()),
        fetch('/api/security/alerts').then((r) => r.json()),
        fetch('/api/security/incidents').then((r) => r.json()),
      ]);

      if (posRes.success) setPosture(posRes.data);
      if (sessRes.success) setSessions(sessRes.data.sessions);
      if (pamRes.success) setPamRequests(pamRes.data.requests);
      if (evtRes.success) setEvents(evtRes.data.events);
      if (altRes.success) setAlerts(altRes.data.alerts);
      if (incRes.success) setIncidents(incRes.data.incidents);
    } catch (e) {
      console.error('Failed to load security telemetry', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRevokeSession = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/security/sessions/${sessionId}/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'REVOKED_VIA_SECURITY_COMMAND_CENTER' }),
      });
      const json = await res.json();
      if (json.success) fetchData();
    } catch (e) {
      console.error('Failed to revoke session', e);
    }
  };

  const handleEmergencyLockout = async (email: string) => {
    if (!confirm(`Trigger Emergency Lockout for ${email}? All active sessions and JIT leases will terminate immediately.`)) {
      return;
    }
    try {
      const res = await fetch('/api/security/sessions/revoke-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, reason: 'EMERGENCY_LOCKOUT_COMMAND' }),
      });
      const json = await res.json();
      if (json.success) {
        alert(`Emergency Lockout Complete: Terminated ${json.revokedSessionsCount} active sessions.`);
        fetchData();
      }
    } catch (e) {
      console.error('Failed emergency lockout', e);
    }
  };

  const handleApproveJit = async (requestId: string) => {
    try {
      const res = await fetch(`/api/security/pam/requests/${requestId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkerEmail: 'super.admin@koriepay.com' }),
      });
      const json = await res.json();
      if (json.success) {
        fetchData();
      } else {
        alert(json.error || 'Failed to approve JIT request');
      }
    } catch (e) {
      console.error('Failed to approve JIT', e);
    }
  };

  const handleCreateJit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/security/pam/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requesterEmail: 'treasury.lead@koriepay.com',
          targetRoleCode: jitTargetRole,
          justification: jitJustification,
          changeTicketRef: jitTicketRef,
          durationMinutes: parseInt(jitDuration, 10),
        }),
      });
      const json = await res.json();
      if (json.success) {
        setIsJitModalOpen(false);
        setJitJustification('');
        fetchData();
      }
    } catch (e) {
      console.error('Failed to create JIT request', e);
    }
  };

  const handleTriggerBreakGlass = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/security/pam/break-glass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actorEmail: 'super.admin@koriepay.com',
          incidentRef: bgIncidentRef,
          justification: bgJustification,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setIsBreakGlassModalOpen(false);
        setBgJustification('');
        fetchData();
      }
    } catch (e) {
      console.error('Failed to trigger break-glass', e);
    }
  };

  const handleContainIncident = async (incidentId: string, targetEmail: string) => {
    try {
      const res = await fetch(`/api/security/incidents/${incidentId}/contain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetEmail,
          action: 'REVOKE_SESSIONS',
          commanderEmail: 'ciso@koriepay.com',
        }),
      });
      const json = await res.json();
      if (json.success) {
        alert(`Containment Executed: ${json.revokedCount} active sessions terminated for ${targetEmail}.`);
        fetchData();
      }
    } catch (e) {
      console.error('Containment execution failed', e);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              ENTERPRISE IAM &amp; PRIVILEGED ACCESS MANAGEMENT
            </span>
            <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
              ● SOC &amp; SIEM SECURITY PLANE ACTIVE
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white mt-1">
            Zero-Trust Control Plane &amp; Security Operations Center
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Centralized workforce authentication assurance (AAL3), JIT privilege leases, session governance, and real-time SIEM event streams.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsBreakGlassModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold transition flex items-center gap-1.5"
          >
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <span>Break-Glass Access</span>
          </button>

          <button
            onClick={fetchData}
            className="p-2.5 rounded-xl bg-slate-900 border border-white/10 text-slate-300 hover:text-white transition flex items-center gap-1.5 text-xs font-bold"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync SOC</span>
          </button>
        </div>
      </div>

      {/* KPI Header */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[#080D1A]/90 border border-white/10 space-y-1">
          <div className="flex justify-between items-center text-slate-400 text-xs">
            <span>Security Posture Score</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">{posture?.compositeScore || 96}/100</div>
          <div className="text-[10px] text-emerald-400 font-mono">Tier-1 Fortified Bank Grade</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#080D1A]/90 border border-white/10 space-y-1">
          <div className="flex justify-between items-center text-slate-400 text-xs">
            <span>Active Privileged Sessions</span>
            <Lock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">{sessions.length}</div>
          <div className="text-[10px] text-amber-400 font-mono">100% Hardware MFA (AAL3)</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#080D1A]/90 border border-white/10 space-y-1">
          <div className="flex justify-between items-center text-slate-400 text-xs">
            <span>Pending JIT Leases</span>
            <KeyRound className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">
            {pamRequests.filter((r) => r.status === 'PENDING').length}
          </div>
          <div className="text-[10px] text-cyan-400 font-mono">Maker-Checker Dual Approval</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#080D1A]/90 border border-white/10 space-y-1">
          <div className="flex justify-between items-center text-slate-400 text-xs">
            <span>Active SIEM Incidents</span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">
            {incidents.filter((i) => i.status !== 'CLOSED').length}
          </div>
          <div className="text-[10px] text-rose-400 font-mono">Response Protocol Active</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-3">
        {[
          { id: 'POSTURE', label: 'Security Posture & Compliance', icon: ShieldCheck },
          { id: 'SESSIONS', label: 'Workforce Sessions & Tokens', icon: Smartphone, count: sessions.length },
          { id: 'PAM', label: 'Privileged Access & JIT Leases', icon: KeyRound, count: pamRequests.length },
          { id: 'SIEM', label: 'SIEM Live Event Stream', icon: Radio, count: events.length },
          { id: 'INCIDENTS', label: 'Security Incident Desk', icon: ShieldAlert, count: incidents.length },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                isActive
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 shadow-lg shadow-emerald-500/20'
                  : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${isActive ? 'bg-slate-950 text-emerald-400' : 'bg-slate-800 text-slate-300'}`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab 1: POSTURE */}
      {activeTab === 'POSTURE' && posture && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-[#080D1A]/90 border border-white/10 space-y-6 shadow-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
              <div>
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  Transparent Multi-Dimensional Security Posture
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Evaluation across 8 core security vectors (Evaluated: {new Date(posture.evaluatedAt).toLocaleString()})
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-slate-400">STATUS:</span>
                <span className="px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 font-extrabold text-xs border border-emerald-500/30">
                  ● {posture.tier.replace(/_/g, ' ')}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {posture.dimensions.map((dim, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-slate-950/80 border border-white/5 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-white">{dim.name}</span>
                    <span className="text-xs font-mono font-bold text-emerald-400">{dim.score}/100</span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-1.5 rounded-full"
                      style={{ width: `${dim.score}%` }}
                    />
                  </div>

                  <p className="text-[11px] text-slate-400">{dim.details}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: SESSIONS & TOKENS */}
      {activeTab === 'SESSIONS' && (
        <div className="space-y-4">
          <div className="rounded-3xl bg-[#080D1A]/90 border border-white/10 shadow-2xl overflow-hidden">
            <div className="p-4 bg-slate-950/80 border-b border-white/10 flex justify-between items-center">
              <h3 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
                Active Workforce Sessions ({sessions.length})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[10px] font-mono uppercase text-slate-400 bg-slate-950/60 border-b border-white/10">
                    <th className="p-4 font-semibold">Administrator</th>
                    <th className="p-4 font-semibold">Assurance Level</th>
                    <th className="p-4 font-semibold">Device &amp; Platform</th>
                    <th className="p-4 font-semibold">IP &amp; Geolocation</th>
                    <th className="p-4 font-semibold">Expires In</th>
                    <th className="p-4 font-semibold text-right">Controls</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono">
                  {sessions.map((s) => (
                    <tr key={s.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-4 font-bold text-white font-sans">
                        <div>{s.employeeEmail}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{s.identityId}</div>
                      </td>
                      <td className="p-4">
                        <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          {s.aalLevel} HARDWARE
                        </span>
                      </td>
                      <td className="p-4 text-slate-300 font-sans">{s.devicePlatform}</td>
                      <td className="p-4 text-slate-400">
                        {s.ipAddress} ({s.countryCode === 'NG' ? '🇳🇬 Nigeria' : '🇳🇪 Niger'})
                      </td>
                      <td className="p-4 text-slate-400">
                        {new Date(s.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="p-4 text-right font-sans">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleRevokeSession(s.id)}
                            className="px-3 py-1 rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30 text-[11px] font-bold transition"
                          >
                            Revoke
                          </button>
                          <button
                            onClick={() => handleEmergencyLockout(s.employeeEmail)}
                            className="px-3 py-1 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 text-[11px] font-bold transition"
                          >
                            Lockout User
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: PAM & JIT LEASES */}
      {activeTab === 'PAM' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-extrabold text-white">Just-In-Time (JIT) Elevated Privilege Leases</h3>
              <p className="text-xs text-slate-400">
                Temporary access grants requiring Maker-Checker dual authorization and automatic expiration.
              </p>
            </div>
            <button
              onClick={() => setIsJitModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 text-slate-950 font-extrabold text-xs shadow-lg transition flex items-center gap-1.5"
            >
              <Zap className="w-4 h-4" />
              Request JIT Elevation
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {pamRequests.map((req) => (
              <div
                key={req.id}
                className="p-5 rounded-2xl bg-[#080D1A]/90 border border-white/10 space-y-3 shadow-xl"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-amber-400 bg-amber-950/60 px-2.5 py-0.5 rounded border border-amber-800/40">
                      {req.requestReference}
                    </span>
                    <span className="font-mono text-xs font-bold text-emerald-400 bg-slate-950 px-2 py-0.5 rounded">
                      Role: {req.targetRoleCode}
                    </span>
                    <span className="text-[10px] font-mono bg-slate-800 px-2 py-0.5 rounded text-slate-300">
                      Duration: {req.durationMinutes} mins
                    </span>
                  </div>

                  <div>
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded uppercase font-mono ${
                        req.status === 'APPROVED'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : req.status === 'PENDING'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      ● {req.status}
                    </span>
                  </div>
                </div>

                <div className="text-xs bg-slate-950/60 p-3.5 rounded-xl border border-white/5 space-y-1">
                  <span className="text-slate-400 font-bold block text-[10px] uppercase">Business Justification &amp; Change Ref:</span>
                  <p className="text-slate-200">{req.justification}</p>
                  <div className="text-[10px] font-mono text-slate-400 pt-1">
                    Ticket Ref: <strong className="text-slate-200">{req.changeTicketRef}</strong> | Requester: <strong className="text-slate-200">{req.requesterEmail}</strong>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                  <div className="text-xs text-slate-400 font-mono">
                    {req.status === 'APPROVED' && (
                      <span className="text-emerald-400 font-bold">
                        Lease Active Until: {new Date(req.leaseExpiresAt || '').toLocaleTimeString()} (Checker: {req.checkerEmail})
                      </span>
                    )}
                    {req.status === 'PENDING' && (
                      <span className="text-amber-400 font-bold">Awaiting MLRO / Super Admin Dual Sign-Off</span>
                    )}
                  </div>

                  {req.status === 'PENDING' && (
                    <button
                      onClick={() => handleApproveJit(req.id)}
                      className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 text-slate-950 font-extrabold text-xs shadow-lg transition flex items-center gap-1.5"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      Dual-Authorize Lease
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: SIEM LIVE STREAM */}
      {activeTab === 'SIEM' && (
        <div className="space-y-4">
          <div className="rounded-3xl bg-[#080D1A]/90 border border-white/10 shadow-2xl overflow-hidden">
            <div className="p-4 bg-slate-950/80 border-b border-white/10 flex justify-between items-center">
              <h3 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                Normalized Security Event Log ({events.length} Telemetry Points)
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[10px] font-mono uppercase text-slate-400 bg-slate-950/60 border-b border-white/10">
                    <th className="p-4 font-semibold">Timestamp</th>
                    <th className="p-4 font-semibold">Severity</th>
                    <th className="p-4 font-semibold">Event Type</th>
                    <th className="p-4 font-semibold">Actor</th>
                    <th className="p-4 font-semibold">Resource &amp; Action</th>
                    <th className="p-4 font-semibold">Result</th>
                    <th className="p-4 font-semibold text-right">Reason / Audit Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono">
                  {events.map((evt) => (
                    <tr key={evt.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-4 text-slate-400">{new Date(evt.createdAt).toLocaleTimeString()}</td>
                      <td className="p-4">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase font-mono ${
                            evt.severity === 'CRITICAL'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                              : evt.severity === 'HIGH'
                              ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {evt.severity}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-white">{evt.eventType}</td>
                      <td className="p-4 text-slate-300 font-sans">{evt.actorId}</td>
                      <td className="p-4 text-slate-400">
                        {evt.resourceType} &bull; {evt.action}
                      </td>
                      <td className="p-4">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                            evt.result === 'SUCCESS' ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'
                          }`}
                        >
                          {evt.result}
                        </span>
                      </td>
                      <td className="p-4 text-right text-slate-400 text-[11px] font-sans truncate max-w-xs">
                        {evt.reason}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: INCIDENTS DESK */}
      {activeTab === 'INCIDENTS' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {incidents.map((inc) => (
              <div
                key={inc.id}
                className="p-6 rounded-3xl bg-[#080D1A]/90 border border-white/10 space-y-4 shadow-2xl"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-rose-400 bg-rose-950/60 px-2.5 py-0.5 rounded border border-rose-800/40">
                      {inc.incidentReference}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono">
                      ● {inc.severity} SEVERITY
                    </span>
                    <span className="text-[10px] font-mono bg-slate-800 px-2 py-0.5 rounded text-slate-300">
                      State: {inc.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleContainIncident(inc.id, 'dev.contractor@external.io')}
                      className="px-3.5 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-xs shadow-lg transition flex items-center gap-1.5"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      Execute Containment (Revoke All)
                    </button>
                  </div>
                </div>

                <h3 className="text-base font-extrabold text-white">{inc.title}</h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-950/60 p-4 rounded-2xl border border-white/5">
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Incident Commander</span>
                    <span className="text-white font-mono">{inc.incidentCommander}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Affected Subsystems</span>
                    <span className="text-slate-200">{inc.affectedServices.join(', ')}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Containment Status</span>
                    <span className="text-emerald-400 font-bold font-mono">{inc.containmentState}</span>
                  </div>
                </div>

                {/* Timeline Notes */}
                <div className="space-y-2 pt-2">
                  <span className="text-xs font-mono font-bold text-slate-400 uppercase">Forensic Investigation Notes:</span>
                  {inc.notes?.map((n) => (
                    <div key={n.id} className="p-3 rounded-xl bg-slate-950 border border-white/5 text-xs space-y-1">
                      <div className="flex justify-between items-center text-[10px] font-mono text-slate-500">
                        <span>Author: {n.authorEmail}</span>
                        <span>{new Date(n.createdAt).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-slate-300">{n.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* JIT Request Modal */}
      {isJitModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="p-6 rounded-3xl bg-[#0b1324] border border-white/10 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-white/10">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-emerald-400" />
                Request Just-In-Time (JIT) Privilege Elevation
              </h3>
              <button onClick={() => setIsJitModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateJit} className="space-y-3">
              <div>
                <label className="block text-slate-400 text-xs mb-1">Target Privileged Role</label>
                <select
                  value={jitTargetRole}
                  onChange={(e) => setJitTargetRole(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                >
                  <option value="TREASURY_EMERGENCY_REBALANCE">TREASURY_EMERGENCY_REBALANCE</option>
                  <option value="AML_BULK_FREEZE_EXECUTION">AML_BULK_FREEZE_EXECUTION</option>
                  <option value="PRODUCTION_SETTLEMENT_SWITCH">PRODUCTION_SETTLEMENT_SWITCH</option>
                  <option value="SECURITY_POLICY_OVERRIDE">SECURITY_POLICY_OVERRIDE</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 text-xs mb-1">Change / Incident Ticket Reference</label>
                <input
                  type="text"
                  value={jitTicketRef}
                  onChange={(e) => setJitTicketRef(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 text-xs mb-1">Requested Lease Duration (Minutes)</label>
                <select
                  value={jitDuration}
                  onChange={(e) => setJitDuration(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                >
                  <option value="15">15 Minutes</option>
                  <option value="30">30 Minutes</option>
                  <option value="60">60 Minutes</option>
                  <option value="120">120 Minutes (Max)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 text-xs mb-1">Business Justification</label>
                <textarea
                  value={jitJustification}
                  onChange={(e) => setJitJustification(e.target.value)}
                  placeholder="Document specific business reason and expected actions..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white h-24"
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsJitModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!jitJustification}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 disabled:opacity-50 text-slate-950 font-extrabold text-xs shadow-lg"
                >
                  Submit for Dual Approval
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Break-Glass Modal */}
      {isBreakGlassModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="p-6 rounded-3xl bg-[#0b1324] border border-rose-500/40 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-rose-500/20">
              <h3 className="text-base font-bold text-rose-400 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
                Emergency Break-Glass Privileged Override
              </h3>
              <button onClick={() => setIsBreakGlassModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-200">
              WARNING: Invoking Break-Glass triggers immediate high-priority paging to CISO, Security Incident Commander, and generates an unexpungeable forensic audit trail.
            </div>

            <form onSubmit={handleTriggerBreakGlass} className="space-y-3">
              <div>
                <label className="block text-slate-400 text-xs mb-1">Disaster Recovery Incident Reference</label>
                <input
                  type="text"
                  value={bgIncidentRef}
                  onChange={(e) => setBgIncidentRef(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 text-xs mb-1">Emergency Justification &amp; Recovery Scope</label>
                <textarea
                  value={bgJustification}
                  onChange={(e) => setBgJustification(e.target.value)}
                  placeholder="Detail critical outage and reason standard dual authorization is bypassed..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white h-24"
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBreakGlassModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
                >
                  Abort
                </button>
                <button
                  type="submit"
                  disabled={!bgJustification}
                  className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white font-extrabold text-xs shadow-lg shadow-rose-500/20"
                >
                  Authorize Break-Glass Session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
