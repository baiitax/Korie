'use client';

import React, { useState } from 'react';
import { useCompliance } from './ComplianceContext';
import { CaseType, RiskLevel, CasePriority, Jurisdiction } from '@/types/compliance';
import { X, FilePlus2, ShieldAlert } from 'lucide-react';

interface CreateCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateCaseModal: React.FC<CreateCaseModalProps> = ({ isOpen, onClose }) => {
  const { createCase, officers, currentOfficer } = useCompliance();

  const [title, setTitle] = useState('');
  const [caseType, setCaseType] = useState<CaseType>('MANUAL_INVESTIGATION');
  const [targetEntityType, setTargetEntityType] = useState<'CUSTOMER' | 'MERCHANT' | 'AGENT'>('CUSTOMER');
  const [targetEntityName, setTargetEntityName] = useState('');
  const [targetEntityId, setTargetEntityId] = useState('');
  const [jurisdiction, setJurisdiction] = useState<Jurisdiction>('NG');
  const [riskLevel, setRiskLevel] = useState<RiskLevel>('MEDIUM');
  const [priority, setPriority] = useState<CasePriority>('MEDIUM');
  const [assignedOfficerId, setAssignedOfficerId] = useState(currentOfficer.id);
  const [involvedAmount, setInvolvedAmount] = useState('');
  const [currency, setCurrency] = useState('NGN');
  const [summary, setSummary] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !targetEntityName || !summary) return;

    createCase({
      title,
      caseType,
      targetEntityType,
      targetEntityName,
      targetEntityId: targetEntityId || `ENT-${Date.now().toString().slice(-4)}`,
      jurisdiction,
      riskLevel,
      priority,
      assignedOfficerId,
      assignedOfficerName: officers.find((o) => o.id === assignedOfficerId)?.fullName || currentOfficer.fullName,
      involvedAmount: involvedAmount ? Number(involvedAmount) : 0,
      currency,
      summary,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#090E1A] border border-slate-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-500/40 flex items-center justify-center">
              <FilePlus2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                CASE INITIATION
              </span>
              <h2 className="text-base font-bold text-white">Open New Compliance Investigation Case</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Case Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Investigation of Structuring Pattern across FX Settlement Nodes"
              className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Case Category</label>
              <select
                value={caseType}
                onChange={(e) => setCaseType(e.target.value as CaseType)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="SUSPICIOUS_ACTIVITY">Suspicious Activity (AML/CFT)</option>
                <option value="SANCTIONS_MATCH">Sanctions / Watchlist Positive</option>
                <option value="FRAUD_INVESTIGATION">Payment Fraud & Chargeback</option>
                <option value="KYC_ANOMALY">KYC/KYB Document Forgery</option>
                <option value="ENHANCED_DILIGENCE">Enhanced Due Diligence (EDD)</option>
                <option value="REGULATORY_INQUIRY">Regulator (CBN/BCEAO) Inquiry</option>
                <option value="MANUAL_INVESTIGATION">General Investigator Audit</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Jurisdiction</label>
              <select
                value={jurisdiction}
                onChange={(e) => {
                  setJurisdiction(e.target.value as Jurisdiction);
                  setCurrency(e.target.value === 'NG' ? 'NGN' : 'XOF');
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="NG">Nigeria (CBN / NFIU)</option>
                <option value="NE">Niger (BCEAO / CENTIF)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Target Type</label>
              <select
                value={targetEntityType}
                onChange={(e) => setTargetEntityType(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="CUSTOMER">Customer Account</option>
                <option value="MERCHANT">Merchant / Business</option>
                <option value="AGENT">Agent Terminal</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">Target Name</label>
              <input
                type="text"
                value={targetEntityName}
                onChange={(e) => setTargetEntityName(e.target.value)}
                placeholder="e.g. Ibrahim Danladi / Sahel Global Ltd"
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Risk Severity</label>
              <select
                value={riskLevel}
                onChange={(e) => setRiskLevel(e.target.value as RiskLevel)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="LOW">Low Risk</option>
                <option value="MEDIUM">Medium Risk</option>
                <option value="HIGH">High Risk</option>
                <option value="CRITICAL">Critical Risk</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Priority SLA</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as CasePriority)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="LOW">Standard (7 Days)</option>
                <option value="MEDIUM">Medium (72 Hours)</option>
                <option value="HIGH">High (48 Hours)</option>
                <option value="URGENT">Urgent (24 Hours)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Assigned Officer</label>
              <select
                value={assignedOfficerId}
                onChange={(e) => setAssignedOfficerId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                {officers.map((off) => (
                  <option key={off.id} value={off.id}>
                    {off.fullName} ({off.jurisdiction})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">Involved Value</label>
              <input
                type="number"
                value={involvedAmount}
                onChange={(e) => setInvolvedAmount(e.target.value)}
                placeholder="e.g. 15000000"
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="NGN">NGN (₦)</option>
                <option value="XOF">XOF (CFA)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Initial Investigation Summary</label>
            <textarea
              rows={3}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="State the rationale for opening this case, background information, and initial findings..."
              className="w-full bg-slate-950 border border-slate-700 rounded p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-lg text-xs transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-lg text-xs shadow-lg transition"
            >
              Create Investigation Case
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
