'use client';

import React, { useState } from 'react';
import { ComplianceCase, CaseStatus } from '@/types/compliance';
import { useCompliance } from './ComplianceContext';
import {
  X,
  ShieldAlert,
  Clock,
  FileText,
  Paperclip,
  Send,
  Lock,
  CheckCircle2,
  AlertOctagon,
  Calendar,
  User,
  DollarSign,
  Share2,
} from 'lucide-react';

interface CaseDrawerProps {
  caseItem: ComplianceCase | null;
  onClose: () => void;
}

export const CaseInvestigationDrawer: React.FC<CaseDrawerProps> = ({ caseItem, onClose }) => {
  const {
    currentOfficer,
    updateCaseStatus,
    addCaseTimelineEntry,
    addCaseEvidence,
    addCaseNote,
    formatCurrency,
    formatDate,
  } = useCompliance();

  const [activeTab, setActiveTab] = useState<'timeline' | 'evidence' | 'notes' | 'decision'>('timeline');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [isConfidential, setIsConfidential] = useState(false);
  const [evidenceTitle, setEvidenceTitle] = useState('');
  const [evidenceType, setEvidenceType] = useState('TRANSACTION_LOG');
  const [decisionNotes, setDecisionNotes] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<CaseStatus>('UNDER_REVIEW');

  if (!caseItem) return null;

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteContent.trim()) return;
    addCaseNote(caseItem.id, newNoteContent, isConfidential);
    setNewNoteContent('');
  };

  const handleAddEvidence = (e: React.FormEvent) => {
    e.preventDefault();
    if (!evidenceTitle.trim()) return;
    addCaseEvidence(caseItem.id, {
      title: evidenceTitle,
      fileType: evidenceType,
      fileUrl: `/vault/cases/${caseItem.id}/${evidenceTitle.toLowerCase().replace(/\s+/g, '-')}.pdf`,
      uploadedByOfficer: currentOfficer.fullName,
      notes: 'Investigator upload',
    });
    setEvidenceTitle('');
  };

  const handleDecisionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!decisionNotes.trim()) return;
    updateCaseStatus(caseItem.id, selectedStatus, decisionNotes);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-2xl bg-[#090E1A] border-l border-slate-800 h-full flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-500/40 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-emerald-400">{caseItem.caseNumber}</span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                    caseItem.status === 'RESOLVED' || caseItem.status === 'CLOSED'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : caseItem.status === 'ESCALATED'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  }`}
                >
                  {caseItem.status.replace(/_/g, ' ')}
                </span>
              </div>
              <h2 className="text-base font-bold text-white line-clamp-1">{caseItem.title}</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Case Quick Overview Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-4 bg-slate-950/80 border-b border-slate-800/80 text-xs">
          <div>
            <div className="text-slate-500 text-[10px] uppercase font-bold">Target Entity</div>
            <div className="text-slate-200 font-semibold">{caseItem.targetEntityName}</div>
            <div className="text-slate-500 font-mono text-[10px]">{caseItem.targetEntityType}</div>
          </div>
          <div>
            <div className="text-slate-500 text-[10px] uppercase font-bold">Involved Value</div>
            <div className="text-emerald-400 font-mono font-bold">
              {formatCurrency(caseItem.involvedAmount, caseItem.currency)}
            </div>
          </div>
          <div>
            <div className="text-slate-500 text-[10px] uppercase font-bold">Jurisdiction</div>
            <div className="text-slate-200 font-semibold flex items-center gap-1">
              <span>{caseItem.jurisdiction === 'NG' ? '🇳🇬 Nigeria' : '🇳🇪 Niger'}</span>
            </div>
          </div>
          <div>
            <div className="text-slate-500 text-[10px] uppercase font-bold">Resolution SLA</div>
            <div className="text-amber-400 font-mono text-[11px] flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDate(caseItem.deadlineSla).slice(0, 12)}
            </div>
          </div>
        </div>

        {/* Tabs Bar */}
        <div className="flex border-b border-slate-800 bg-slate-900/40 px-4">
          <button
            onClick={() => setActiveTab('timeline')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition ${
              activeTab === 'timeline'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Activity Timeline ({caseItem.timeline.length})
          </button>
          <button
            onClick={() => setActiveTab('evidence')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition ${
              activeTab === 'evidence'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Evidence Vault ({caseItem.evidence.length})
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition ${
              activeTab === 'notes'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Investigator Notes ({caseItem.internalNotes.length})
          </button>
          <button
            onClick={() => setActiveTab('decision')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition ${
              activeTab === 'decision'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Ruling & STR Action
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {activeTab === 'timeline' && (
            <div className="space-y-4">
              <div className="text-xs text-slate-400 bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                <span className="font-bold text-slate-200">Investigation Summary: </span>
                {caseItem.summary}
              </div>

              <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
                {caseItem.timeline.map((event) => (
                  <div key={event.id} className="relative group">
                    <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-4 border-[#090E1A]" />
                    <div className="text-[11px] text-slate-400 flex items-center gap-2">
                      <span className="font-mono text-emerald-400">{formatDate(event.timestamp)}</span>
                      <span>•</span>
                      <span className="font-semibold text-slate-300">{event.officerName}</span>
                    </div>
                    <div className="text-xs font-bold text-white mt-0.5">{event.action.replace(/_/g, ' ')}</div>
                    <div className="text-xs text-slate-300 mt-1 bg-slate-900/40 p-2.5 rounded border border-slate-800/60">
                      {event.description}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'evidence' && (
            <div className="space-y-4">
              <form onSubmit={handleAddEvidence} className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 space-y-2">
                <div className="text-xs font-bold text-slate-300">Attach New Evidence to Vault</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={evidenceTitle}
                    onChange={(e) => setEvidenceTitle(e.target.value)}
                    placeholder="Document / Statement Title..."
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                  <select
                    value={evidenceType}
                    onChange={(e) => setEvidenceType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="TRANSACTION_LOG">Bank Transaction Log</option>
                    <option value="IDENTITY_DOCUMENT">Identity Document / Passport</option>
                    <option value="BANK_STATEMENT">Bank Statement</option>
                    <option value="ADVERSE_MEDIA_REPORT">Adverse Media Clipping</option>
                    <option value="COMMUNICATION_RECORD">WhatsApp/Email Communications</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-1.5 px-3 rounded text-xs transition"
                >
                  Deposit into Secure Evidence Vault
                </button>
              </form>

              {caseItem.evidence.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">No evidence documents attached yet.</div>
              ) : (
                <div className="space-y-2">
                  {caseItem.evidence.map((ev) => (
                    <div
                      key={ev.id}
                      className="flex items-center justify-between p-3 bg-slate-900/60 border border-slate-800 rounded-lg text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <Paperclip className="w-4 h-4 text-emerald-400" />
                        <div>
                          <div className="font-bold text-slate-200">{ev.title}</div>
                          <div className="text-[11px] text-slate-400">
                            {ev.fileType.replace(/_/g, ' ')} • Uploaded by {ev.uploadedByOfficer} • {formatDate(ev.uploadedAt).slice(0, 10)}
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-1 rounded border border-emerald-800/40">
                        VERIFIED VAULT HASH
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="space-y-4">
              <form onSubmit={handleAddNote} className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 space-y-2">
                <div className="text-xs font-bold text-slate-300">Add Confidential Investigator Note</div>
                <textarea
                  rows={3}
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                  placeholder="Record findings, interview remarks, or regulatory concerns..."
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isConfidential}
                      onChange={(e) => setIsConfidential(e.target.checked)}
                      className="rounded border-slate-700 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Flag as Restricted MLRO-Only Note</span>
                  </label>
                  <button
                    type="submit"
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-1.5 px-4 rounded text-xs transition"
                  >
                    Save Note
                  </button>
                </div>
              </form>

              <div className="space-y-2">
                {caseItem.internalNotes.map((note, idx) => {
                  const noteObj = typeof note === 'string'
                    ? { id: `nt-${idx}`, officerName: 'Investigator', content: note, timestamp: caseItem.createdAt, isConfidential: false }
                    : note;
                  return (
                    <div
                      key={noteObj.id || idx}
                      className={`p-3 rounded-lg border text-xs space-y-1 ${
                        noteObj.isConfidential
                          ? 'bg-rose-950/20 border-rose-900/40'
                          : 'bg-slate-900/60 border-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-200 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-emerald-400" />
                          {noteObj.officerName}
                          {noteObj.isConfidential && (
                            <span className="text-[10px] bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded uppercase font-mono">
                              Confidential
                            </span>
                          )}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">{formatDate(noteObj.timestamp)}</span>
                      </div>
                      <p className="text-slate-300 whitespace-pre-wrap">{noteObj.content}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'decision' && (
            <form onSubmit={handleDecisionSubmit} className="space-y-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
              <div className="text-xs font-bold text-slate-200">Final Ruling & Case Disposition</div>
              <p className="text-xs text-slate-400">
                Recording a formal ruling will update the case state across the ledger and trigger regulatory reporting tasks if suspicious activity is affirmed.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Target Case Status</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as CaseStatus)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="UNDER_REVIEW">UNDER REVIEW - Keep Active</option>
                  <option value="ESCALATED">ESCALATED - Escalate to Head of Compliance</option>
                  <option value="RESOLVED">RESOLVED - Clear & Close With Justification</option>
                  <option value="CLOSED">CLOSED - File Suspicious Activity Report (STR) & Close</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Investigator Ruling Rationale</label>
                <textarea
                  rows={4}
                  value={decisionNotes}
                  onChange={(e) => setDecisionNotes(e.target.value)}
                  placeholder="State the detailed compliance finding, risk assessment, and legal justification..."
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-2.5 rounded-lg text-xs shadow-lg transition"
                >
                  Confirm & Apply Case Ruling
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
