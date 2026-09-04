'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCompliance } from '@/components/compliance/ComplianceContext';
import {
  ArrowLeft,
  ShieldAlert,
  Clock,
  User,
  Paperclip,
  CheckCircle2,
  FileCheck2,
  AlertTriangle,
  Building2,
  Plus,
  Send,
  Lock,
} from 'lucide-react';
import { CaseStatus } from '@/types/compliance';

export default function CaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const caseId = params?.id as string;
  const {
    cases,
    currentOfficer,
    updateCaseStatus,
    addCaseEvidence,
    addCaseNote,
    formatCurrency,
    formatDate,
    submitRegulatoryReport,
  } = useCompliance();

  const currentCase = cases.find((c) => c.id === caseId || c.caseNumber === caseId);

  const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'evidence' | 'notes' | 'decision'>('overview');
  const [newNote, setNewNote] = useState('');
  const [isConfidential, setIsConfidential] = useState(false);
  const [evidenceTitle, setEvidenceTitle] = useState('');
  const [evidenceType, setEvidenceType] = useState('BANK_STATEMENT');
  const [decisionNotes, setDecisionNotes] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<CaseStatus>('RESOLVED');

  if (!currentCase) {
    return (
      <div className="text-center py-20 space-y-4">
        <ShieldAlert className="w-12 h-12 text-slate-600 mx-auto" />
        <h2 className="text-xl font-bold text-white">Case Not Found</h2>
        <p className="text-xs text-slate-400">The investigation case file &quot;{caseId}&quot; could not be retrieved from the compliance register.</p>
        <Link
          href="/compliance/cases"
          className="inline-block px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg"
        >
          Back to Case Register
        </Link>
      </div>
    );
  }

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    addCaseNote(currentCase.id, newNote, isConfidential);
    setNewNote('');
  };

  const handleAddEvidence = (e: React.FormEvent) => {
    e.preventDefault();
    if (!evidenceTitle.trim()) return;
    addCaseEvidence(currentCase.id, {
      title: evidenceTitle,
      fileType: evidenceType,
      fileUrl: `/vault/${currentCase.id}/${evidenceTitle.toLowerCase().replace(/\s+/g, '_')}.pdf`,
      uploadedByOfficer: currentOfficer.fullName,
      notes: 'Investigator case exhibit',
    });
    setEvidenceTitle('');
  };

  const handleApplyDecision = (e: React.FormEvent) => {
    e.preventDefault();
    if (!decisionNotes.trim()) return;
    updateCaseStatus(currentCase.id, selectedStatus, decisionNotes);
  };

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl border border-slate-800 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-emerald-400">{currentCase.caseNumber}</span>
              <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-300 font-bold uppercase">
                {currentCase.jurisdiction === 'NG' ? '🇳🇬 NIGERIA' : '🇳🇪 NIGER'}
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                  currentCase.status === 'RESOLVED' || currentCase.status === 'CLOSED'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : currentCase.status === 'ESCALATED'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                }`}
              >
                {currentCase.status.replace(/_/g, ' ')}
              </span>
            </div>
            <h1 className="text-xl font-extrabold text-white mt-0.5">{currentCase.title}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('decision')}
            className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg transition"
          >
            Record Formal Ruling
          </button>
        </div>
      </div>

      {/* Case Overview Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5 bg-slate-900/60 border border-slate-800/80 rounded-2xl">
        <div>
          <div className="text-slate-500 text-xs uppercase font-bold">Target Entity</div>
          <div className="text-base font-bold text-white mt-0.5">{currentCase.targetEntityName}</div>
          <div className="text-[11px] text-slate-400 font-mono">ID: {currentCase.targetEntityId}</div>
        </div>
        <div>
          <div className="text-slate-500 text-xs uppercase font-bold">Total Involved Value</div>
          <div className="text-base font-bold text-emerald-400 font-mono mt-0.5">
            {formatCurrency(currentCase.involvedAmount, currentCase.currency)}
          </div>
          <div className="text-[11px] text-slate-400">Ledger Currency: {currentCase.currency}</div>
        </div>
        <div>
          <div className="text-slate-500 text-xs uppercase font-bold">Assigned Officer</div>
          <div className="text-base font-bold text-slate-200 mt-0.5">{currentCase.assignedOfficerName}</div>
          <div className="text-[11px] text-emerald-400 font-mono">MLRO Clearance Active</div>
        </div>
        <div>
          <div className="text-slate-500 text-xs uppercase font-bold">Resolution SLA</div>
          <div className="text-base font-bold text-amber-400 font-mono mt-0.5 flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            {formatDate(currentCase.deadlineSla).slice(0, 12)}
          </div>
          <div className="text-[11px] text-slate-400">Created: {formatDate(currentCase.createdAt).slice(0, 10)}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 bg-slate-900/40 rounded-t-xl px-4">
        {(['overview', 'timeline', 'evidence', 'notes', 'decision'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition uppercase tracking-wider ${
              activeTab === tab
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab}
            {tab === 'timeline' && ` (${currentCase.timeline.length})`}
            {tab === 'evidence' && ` (${currentCase.evidence.length})`}
            {tab === 'notes' && ` (${currentCase.internalNotes.length})`}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-b-2xl p-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-5 space-y-3">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Executive Investigation Summary</h3>
              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{currentCase.summary}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2">
                <h4 className="text-xs font-bold text-slate-300">Target Profile & Risk Matrix</h4>
                <div className="text-xs space-y-1.5">
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <span className="text-slate-400">Entity Type:</span>
                    <span className="font-semibold text-slate-200">{currentCase.targetEntityType}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <span className="text-slate-400">Assessed Risk Tier:</span>
                    <span className="font-bold text-rose-400">{currentCase.riskLevel}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <span className="text-slate-400">Jurisdiction Authority:</span>
                    <span className="font-semibold text-slate-200">
                      {currentCase.jurisdiction === 'NG' ? 'Central Bank of Nigeria / NFIU' : 'BCEAO / CENTIF Niger'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2">
                <h4 className="text-xs font-bold text-slate-300">Case Decision State</h4>
                <div className="text-xs space-y-1.5">
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <span className="text-slate-400">Resolution Status:</span>
                    <span className="font-semibold text-slate-200">
                      {currentCase.decision.isResolved ? 'RESOLVED' : 'INQUIRY IN PROGRESS'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <span className="text-slate-400">NFIU / CENTIF Filing Flag:</span>
                    <span className="font-bold text-amber-400">
                      {currentCase.decision.requiresNfiuCentifFiling ? 'MANDATORY STR REQUIRED' : 'NOT APPLICABLE'}
                    </span>
                  </div>
                  {currentCase.decision.rulingSummary && (
                    <div className="pt-2 text-slate-300">
                      <strong className="text-emerald-400">Ruling: </strong>
                      {currentCase.decision.rulingSummary}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'timeline' && (
          <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
            {currentCase.timeline.map((event) => (
              <div key={event.id} className="relative group">
                <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-4 border-[#090E1A]" />
                <div className="text-xs text-slate-400 flex items-center gap-2">
                  <span className="font-mono text-emerald-400">{formatDate(event.timestamp)}</span>
                  <span>•</span>
                  <span className="font-semibold text-slate-300">{event.officerName}</span>
                </div>
                <div className="text-sm font-bold text-white mt-0.5">{event.action.replace(/_/g, ' ')}</div>
                <div className="text-xs text-slate-300 mt-1 bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                  {event.description}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'evidence' && (
          <div className="space-y-6">
            <form onSubmit={handleAddEvidence} className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="text-xs font-bold text-slate-200">Upload New Exhibit / Statement to Vault</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={evidenceTitle}
                  onChange={(e) => setEvidenceTitle(e.target.value)}
                  placeholder="Document or Statement Title..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  required
                />
                <select
                  value={evidenceType}
                  onChange={(e) => setEvidenceType(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="BANK_STATEMENT">Bank Statement</option>
                  <option value="IDENTITY_DOCUMENT">Passport / NIN Slip</option>
                  <option value="CAC_CERTIFICATE">CAC / RCCM Certificate</option>
                  <option value="TRANSACTION_LOG">Ledger Node Transaction Log</option>
                  <option value="COMMUNICATION_RECORD">Email / SMS Communication</option>
                </select>
              </div>
              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-4 rounded-lg text-xs transition"
              >
                Deposit in Evidence Repository
              </button>
            </form>

            <div className="space-y-3">
              {currentCase.evidence.map((ev) => (
                <div
                  key={ev.id}
                  className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <Paperclip className="w-5 h-5 text-emerald-400" />
                    <div>
                      <div className="font-bold text-white text-sm">{ev.title}</div>
                      <div className="text-slate-400 mt-0.5">
                        {ev.fileType} • Uploaded by {ev.uploadedByOfficer} • {formatDate(ev.uploadedAt)}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded border border-emerald-800/40 font-bold">
                    SECURE SHA-256 VAULT
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="space-y-6">
            <form onSubmit={handleAddNote} className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="text-xs font-bold text-slate-200">Add Confidential Investigator Note</div>
              <textarea
                rows={3}
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Record investigation findings, counterparty checks, or interview notes..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                required
              />
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isConfidential}
                    onChange={(e) => setIsConfidential(e.target.checked)}
                    className="rounded border-slate-700 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Mark as Confidential MLRO-Only Note</span>
                </label>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-5 rounded-lg text-xs transition"
                >
                  Save Note
                </button>
              </div>
            </form>

            <div className="space-y-3">
              {currentCase.internalNotes.map((n, idx) => {
                const noteObj = typeof n === 'string'
                  ? { id: `nt-${idx}`, officerName: 'Investigator', content: n, timestamp: currentCase.createdAt, isConfidential: false }
                  : n;
                return (
                  <div
                    key={noteObj.id || idx}
                    className={`p-4 rounded-xl border text-xs space-y-1.5 ${
                      noteObj.isConfidential ? 'bg-rose-950/20 border-rose-900/40' : 'bg-slate-950/60 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200 flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-emerald-400" />
                        {noteObj.officerName}
                        {noteObj.isConfidential && (
                          <span className="text-[10px] bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded font-mono">
                            CONFIDENTIAL
                          </span>
                        )}
                      </span>
                      <span className="text-slate-500 font-mono text-[10px]">{formatDate(noteObj.timestamp)}</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{noteObj.content}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'decision' && (
          <form onSubmit={handleApplyDecision} className="space-y-5 bg-slate-950/80 p-5 rounded-xl border border-slate-800 max-w-2xl">
            <div>
              <h3 className="text-sm font-bold text-white">Record Formal Case Ruling</h3>
              <p className="text-xs text-slate-400 mt-1">
                Finalizing the ruling records an immutable decision onto the audit log and updates the entity risk state across all KoriePay banking nodes.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Target Case Status</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as CaseStatus)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="UNDER_REVIEW">UNDER REVIEW</option>
                <option value="ESCALATED">ESCALATE TO HEAD OF COMPLIANCE</option>
                <option value="RESOLVED">RESOLVED - Clear & Close With Justification</option>
                <option value="CLOSED">CLOSED - File Suspicious Activity Report (STR) & Close</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Official Ruling Rationale</label>
              <textarea
                rows={4}
                value={decisionNotes}
                onChange={(e) => setDecisionNotes(e.target.value)}
                placeholder="State the comprehensive finding, source of funds evaluation, and regulatory outcome..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-2.5 rounded-lg text-xs shadow-lg transition"
            >
              Sign & Apply Formal Investigation Ruling
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
