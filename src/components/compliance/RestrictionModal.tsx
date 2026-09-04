'use client';

import React, { useState } from 'react';
import { useCompliance } from './ComplianceContext';
import { RestrictionType, Jurisdiction } from '@/types/compliance';
import { X, Lock, AlertTriangle, ShieldCheck } from 'lucide-react';

interface RestrictionModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultEntity?: {
    id: string;
    type: 'CUSTOMER' | 'MERCHANT' | 'AGENT';
    name: string;
    jurisdiction: Jurisdiction;
  };
}

export const RestrictionModal: React.FC<RestrictionModalProps> = ({
  isOpen,
  onClose,
  defaultEntity,
}) => {
  const { applyAccountRestriction, currentOfficer } = useCompliance();

  const [entityType, setEntityType] = useState<'CUSTOMER' | 'MERCHANT' | 'AGENT'>(
    defaultEntity?.type || 'CUSTOMER'
  );
  const [entityId, setEntityId] = useState(defaultEntity?.id || '');
  const [entityName, setEntityName] = useState(defaultEntity?.name || '');
  const [jurisdiction, setJurisdiction] = useState<Jurisdiction>(
    defaultEntity?.jurisdiction || 'NG'
  );
  const [restrictionType, setRestrictionType] = useState<RestrictionType>('TOTAL_FREEZE');
  const [reason, setReason] = useState('COURT_ORDER_FREEZE');
  const [rationale, setRationale] = useState('');
  const [limitAmount, setLimitAmount] = useState('');
  const [courtOrderRef, setCourtOrderRef] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!entityName || !rationale) return;

    applyAccountRestriction({
      targetEntityType: entityType,
      targetEntityId: entityId || `ENT-${Date.now().toString().slice(-4)}`,
      targetEntityName: entityName,
      jurisdiction,
      restrictionType,
      reason,
      rationale,
      limitAmount: limitAmount ? Number(limitAmount) : undefined,
      courtOrderReference: courtOrderRef || undefined,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#090E1A] border border-slate-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-rose-950/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-950 border border-rose-500/40 flex items-center justify-center">
              <Lock className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase bg-rose-500/20 text-rose-300 border border-rose-500/40">
                  DUAL-CONTROL ENFORCEMENT
                </span>
              </div>
              <h2 className="text-base font-bold text-white">Apply Account Restriction / Freeze</h2>
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
          <div className="bg-amber-950/20 border border-amber-900/40 rounded-lg p-3 text-xs text-amber-300 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <span>
              <strong>Maker-Checker Rule:</strong> Account freezes and limits initiated by Compliance Analysts require secondary verification by the Head of Compliance (MLRO) before hard execution on ledger nodes.
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Entity Type</label>
              <select
                value={entityType}
                onChange={(e) => setEntityType(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
              >
                <option value="CUSTOMER">Customer Account</option>
                <option value="MERCHANT">Merchant / Business</option>
                <option value="AGENT">Agent Terminal Account</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Jurisdiction</label>
              <select
                value={jurisdiction}
                onChange={(e) => setJurisdiction(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
              >
                <option value="NG">Nigeria (CBN / NFIU)</option>
                <option value="NE">Niger (BCEAO / CENTIF)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Entity Name</label>
              <input
                type="text"
                value={entityName}
                onChange={(e) => setEntityName(e.target.value)}
                placeholder="e.g. Al-Amin Logistics Ltd"
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Entity / Account ID</label>
              <input
                type="text"
                value={entityId}
                onChange={(e) => setEntityId(e.target.value)}
                placeholder="e.g. CUST-NG-88912"
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Restriction Type</label>
              <select
                value={restrictionType}
                onChange={(e) => setRestrictionType(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
              >
                <option value="TOTAL_FREEZE">TOTAL FREEZE (Debits & Credits Blocked)</option>
                <option value="DEBIT_SUSPENSION">DEBIT SUSPENSION (Post-No-Debit)</option>
                <option value="SETTLEMENT_HOLD">SETTLEMENT HOLD (Merchant Payouts Paused)</option>
                <option value="TRANSACTION_LIMIT">TRANSACTION VELOCITY CAP</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Legal / Policy Rationale</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
              >
                <option value="COURT_ORDER_FREEZE">Court Order / Law Enforcement Directive</option>
                <option value="SANCTIONS_LISTING">UN/OFAC/EU Sanctions Match</option>
                <option value="AML_ANOMALY">Severe AML Velocity Anomaly</option>
                <option value="FAILED_EDD">Unverified High-Risk Source of Funds</option>
                <option value="FRAUD_INVESTIGATION">Chargeback & Fraud Threshold Exceeded</option>
              </select>
            </div>
          </div>

          {restrictionType === 'TRANSACTION_LIMIT' && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Max Daily Transaction Limit</label>
              <input
                type="number"
                value={limitAmount}
                onChange={(e) => setLimitAmount(e.target.value)}
                placeholder="e.g. 50000"
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Court Order / Directive Ref (Optional)</label>
            <input
              type="text"
              value={courtOrderRef}
              onChange={(e) => setCourtOrderRef(e.target.value)}
              placeholder="e.g. FHC/ABJ/CR/2026/842 or BCEAO/CENTIF/ORD/889"
              className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Investigator Rationale & Audit Justification</label>
            <textarea
              rows={3}
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
              placeholder="Detail reasons for applying this restriction on the ledger node..."
              className="w-full bg-slate-950 border border-slate-700 rounded p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
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
              className="px-5 py-2 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-bold rounded-lg text-xs shadow-lg transition"
            >
              Submit Restriction Request
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
