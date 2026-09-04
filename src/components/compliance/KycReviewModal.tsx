'use client';

import React, { useState } from 'react';
import { KycVerificationRecord, KybVerificationRecord, KycStatus } from '@/types/compliance';
import { useCompliance } from './ComplianceContext';
import {
  X,
  UserCheck,
  Building2,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  ShieldCheck,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Layers,
} from 'lucide-react';

interface KycModalProps {
  record: KycVerificationRecord | KybVerificationRecord | null;
  type: 'KYC' | 'KYB';
  onClose: () => void;
}

export const KycReviewModal: React.FC<KycModalProps> = ({ record, type, onClose }) => {
  const { updateKycStatus, updateKybStatus, formatDate } = useCompliance();
  const [decisionNotes, setDecisionNotes] = useState('');
  const [activeAction, setActiveAction] = useState<KycStatus | null>(null);

  if (!record) return null;

  const isCustomer = type === 'KYC';
  const kycRec = isCustomer ? (record as KycVerificationRecord) : null;
  const kybRec = !isCustomer ? (record as KybVerificationRecord) : null;

  const handleApplyStatus = (status: KycStatus) => {
    if (isCustomer) {
      updateKycStatus(record.id, status, decisionNotes);
    } else {
      updateKybStatus(record.id, status, decisionNotes);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#090E1A] border border-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-500/40 flex items-center justify-center">
              {isCustomer ? (
                <UserCheck className="w-5 h-5 text-emerald-400" />
              ) : (
                <Building2 className="w-5 h-5 text-teal-400" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-slate-400">{record.id}</span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                    record.status === 'VERIFIED'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : record.status === 'REJECTED'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  }`}
                >
                  {record.status.replace(/_/g, ' ')}
                </span>
                <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                  {record.jurisdiction === 'NG' ? '🇳🇬 NIGERIA' : '🇳🇪 NIGER'}
                </span>
              </div>
              <h2 className="text-base font-bold text-white">
                {isCustomer ? kycRec?.customerName : kybRec?.businessName}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Identity & Registry Verification Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {isCustomer && kycRec && (
              <>
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
                  <div className="text-xs font-bold text-slate-300 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    Identity Validation Details
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-800">
                      <span className="text-slate-400">KYC Tier Level:</span>
                      <span className="font-bold text-emerald-400">{kycRec.tier}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800">
                      <span className="text-slate-400">NIN Status (Masked):</span>
                      <span className="font-mono text-slate-200">
                        {kycRec.maskedNin} ({kycRec.ninVerificationStatus})
                      </span>
                    </div>
                    {kycRec.maskedBvn && (
                      <div className="flex justify-between py-1 border-b border-slate-800">
                        <span className="text-slate-400">BVN Match Status:</span>
                        <span className="font-mono text-slate-200">
                          {kycRec.maskedBvn} ({kycRec.bvnVerificationStatus})
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between py-1 border-b border-slate-800">
                      <span className="text-slate-400">Risk Assessment:</span>
                      <span className="font-bold text-amber-400">{kycRec.riskRating} RISK</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
                  <div className="text-xs font-bold text-slate-300 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-teal-400" />
                    Contact & Address Verification
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-2 text-slate-300">
                      <Phone className="w-3.5 h-3.5 text-slate-500" />
                      <span>{kycRec.phone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                      <Mail className="w-3.5 h-3.5 text-slate-500" />
                      <span>{kycRec.email}</span>
                    </div>
                    <div className="flex items-start gap-2 text-slate-300 pt-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-500 mt-0.5" />
                      <div>
                        <span>{kycRec.address}</span>
                        <div className="text-[10px] text-emerald-400 mt-0.5 font-semibold">
                          Address Proof: {kycRec.addressVerificationStatus}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {!isCustomer && kybRec && (
              <>
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
                  <div className="text-xs font-bold text-slate-300 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-emerald-400" />
                    Corporate Registry & Registration
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-800">
                      <span className="text-slate-400">Registration Number:</span>
                      <span className="font-mono text-emerald-400 font-bold">{kybRec.registrationNumber}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800">
                      <span className="text-slate-400">CAC / RCCM Registry:</span>
                      <span className="font-semibold text-slate-200">{kybRec.cacValidationStatus}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800">
                      <span className="text-slate-400">Tax ID (TIN):</span>
                      <span className="font-mono text-slate-300">{kybRec.taxIdentificationNumber}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800">
                      <span className="text-slate-400">Risk Assessment:</span>
                      <span className="font-bold text-amber-400">{kybRec.riskRating} RISK</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
                  <div className="text-xs font-bold text-slate-300 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-teal-400" />
                    Ultimate Beneficial Owners (UBOs)
                  </div>
                  <div className="space-y-2 text-xs">
                    {kybRec.beneficialOwners.map((ubo, idx) => (
                      <div key={idx} className="p-2 bg-slate-950/60 rounded border border-slate-800/80">
                        <div className="flex justify-between">
                          <span className="font-bold text-slate-200">{ubo.name}</span>
                          <span className="text-emerald-400 font-bold">{ubo.ownershipPercentage}% Equity</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {ubo.nationality} • BVN/NIN: {ubo.maskedIdNumber} • PEP: {ubo.pepStatus ? 'YES' : 'NO'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Submitted Documents Inspection Checklist */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="text-xs font-bold text-slate-300">Submitted Proof Documents & Biometric Match</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(isCustomer ? kycRec?.documents : kybRec?.documents)?.map((doc, index) => (
                <div
                  key={index}
                  className="p-3 bg-slate-950/80 rounded-lg border border-slate-800 flex flex-col justify-between space-y-2"
                >
                  <div>
                    <div className="text-xs font-bold text-slate-200">{doc.type.replace(/_/g, ' ')}</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">{doc.fileName}</div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                    <span className="text-[10px] text-emerald-400 font-bold">{doc.status}</span>
                    <span className="text-[10px] text-slate-500 font-mono">Hash Verified</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Decision Formulation Box */}
          <div className="space-y-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
            <label className="block text-xs font-bold text-slate-200">
              Compliance Officer Assessment & Notes
            </label>
            <textarea
              rows={3}
              value={decisionNotes}
              onChange={(e) => setDecisionNotes(e.target.value)}
              placeholder="Provide verification rationale, missing items, or reasons for approval/rejection..."
              className="w-full bg-slate-950 border border-slate-700 rounded p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleApplyStatus('VERIFIED')}
                className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-3 rounded-lg text-xs shadow-md transition"
              >
                <CheckCircle className="w-4 h-4" />
                Approve & Verify
              </button>
              <button
                type="button"
                onClick={() => handleApplyStatus('INFORMATION_REQUESTED')}
                className="flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-500 text-white font-bold py-2 px-3 rounded-lg text-xs shadow-md transition"
              >
                <AlertCircle className="w-4 h-4" />
                Request Additional Info
              </button>
              <button
                type="button"
                onClick={() => handleApplyStatus('REJECTED')}
                className="flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-500 text-white font-bold py-2 px-3 rounded-lg text-xs shadow-md transition"
              >
                <XCircle className="w-4 h-4" />
                Reject Application
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
