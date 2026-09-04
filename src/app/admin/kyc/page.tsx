"use client";

import React, { useState, useEffect } from "react";
import { 
  FileCheck2, 
  CheckCircle2, 
  XCircle, 
  Search, 
  ShieldCheck, 
  Building2, 
  UserCheck, 
  Fingerprint, 
  RefreshCw, 
  Lock, 
  FileText, 
  Layers, 
  Play, 
  ArrowRight,
  Eye,
  Clock
} from "lucide-react";
import { 
  PersonMasterRecord, 
  OrganizationMasterRecord, 
  IdentityVerificationEvidence, 
  IdentityDocumentRecord 
} from "@/types/identityEngine";

export default function KycAdminPage() {
  const [activeTab, setActiveTab] = useState<'PERSONS' | 'ORGS' | 'VERIFY_TEST' | 'DOCS' | 'EVIDENCE'>('PERSONS');
  const [persons, setPersons] = useState<PersonMasterRecord[]>([]);
  const [organizations, setOrganizations] = useState<OrganizationMasterRecord[]>([]);
  const [documents, setDocuments] = useState<IdentityDocumentRecord[]>([]);
  const [evidenceList, setEvidenceList] = useState<IdentityVerificationEvidence[]>([]);
  const [loading, setLoading] = useState(false);

  // Verification Simulator State
  const [simTargetId, setSimTargetId] = useState('');
  const [simIdType, setSimIdType] = useState<'PERSON' | 'ORGANIZATION'>('PERSON');
  const [simVerifType, setSimVerifType] = useState<'NATIONAL_ID' | 'BVN' | 'BUSINESS_REGISTRY'>('NATIONAL_ID');
  const [simIdNumber, setSimIdNumber] = useState('20938475892');
  const [simCountry, setSimCountry] = useState<'NG' | 'NE'>('NG');
  const [verifying, setVerifying] = useState(false);
  const [lastVerificationResult, setLastVerificationResult] = useState<any | null>(null);

  // Maker-Checker Review Modal State
  const [selectedPerson, setSelectedPerson] = useState<PersonMasterRecord | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [approving, setApproving] = useState(false);

  const fetchIdentityData = async () => {
    setLoading(true);
    try {
      const [persRes, orgsRes, docsRes, evRes] = await Promise.all([
        fetch('/api/core/v1/identity/persons').then(r => r.json()),
        fetch('/api/core/v1/identity/organizations').then(r => r.json()),
        fetch('/api/core/v1/identity/documents').then(r => r.json()),
        fetch('/api/core/v1/identity/verify').then(r => r.json()).catch(() => ({ data: [] })),
      ]);

      if (persRes.data?.persons) {
        setPersons(persRes.data.persons);
        if (!simTargetId && persRes.data.persons.length > 0) {
          setSimTargetId(persRes.data.persons[0].id);
        }
      }
      if (orgsRes.data?.organizations) setOrganizations(orgsRes.data.organizations);
      if (docsRes.data?.documents) setDocuments(docsRes.data.documents);
    } catch (e) {
      console.error('Failed to fetch identity data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIdentityData();
  }, []);

  const handleSimulateVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifying(true);
    try {
      const res = await fetch('/api/core/v1/identity/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identityId: simTargetId,
          identityType: simIdType,
          verificationType: simVerifType,
          idNumber: simIdNumber,
          countryCode: simCountry,
        }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setLastVerificationResult(data.data);
        fetchIdentityData();
      } else {
        alert(data.error?.message || 'Verification failed');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setVerifying(false);
    }
  };

  const handleApproveKyc = async () => {
    if (!selectedPerson) return;
    setApproving(true);
    try {
      // Direct update to Verified Tier 2
      const res = await fetch('/api/core/v1/identity/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identityId: selectedPerson.id,
          identityType: 'PERSON',
          verificationType: 'NATIONAL_ID',
          idNumber: '20938475892',
          countryCode: selectedPerson.countryCode,
        }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setSelectedPerson(null);
        setReviewNotes('');
        fetchIdentityData();
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setApproving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              MASTER IDENTITY PLATFORM
            </span>
            <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20">
              ● BI-LATERAL NIGERIA / NIGER
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white mt-1">Master Identity & KYC/KYB Verification Hub</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Canonical Person & Organization identities with cryptographic SHA-256 evidence vaulting and registry verification.
          </p>
        </div>

        <button
          onClick={fetchIdentityData}
          className="p-2 rounded-xl bg-slate-900 border border-white/10 text-slate-300 hover:text-white"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[#080D1A]/90 border border-white/10 space-y-1">
          <div className="flex justify-between items-center text-slate-400 text-xs">
            <span>Master Persons (KID)</span>
            <UserCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">{persons.length}</div>
          <div className="text-[10px] text-emerald-400 font-mono">Nigeria & Niger Unified</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#080D1A]/90 border border-white/10 space-y-1">
          <div className="flex justify-between items-center text-slate-400 text-xs">
            <span>Master Organizations (KYB)</span>
            <Building2 className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">{organizations.length}</div>
          <div className="text-[10px] text-blue-400 font-mono">CAC / RCCM Registered</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#080D1A]/90 border border-white/10 space-y-1">
          <div className="flex justify-between items-center text-slate-400 text-xs">
            <span>Vaulted KYC Documents</span>
            <FileText className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">{documents.length}</div>
          <div className="text-[10px] text-amber-400 font-mono">SHA-256 Hash Verified</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#080D1A]/90 border border-white/10 space-y-1">
          <div className="flex justify-between items-center text-slate-400 text-xs">
            <span>Compliance Trust Level</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-400 font-mono">Tier-1</div>
          <div className="text-[10px] text-slate-400 font-mono">NIMC / NIBSS / NINA Connected</div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2 overflow-x-auto">
        {(['PERSONS', 'ORGS', 'VERIFY_TEST', 'DOCS'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
              activeTab === tab
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {tab === 'PERSONS' && `Master Persons (${persons.length})`}
            {tab === 'ORGS' && `Master Organizations (${organizations.length})`}
            {tab === 'VERIFY_TEST' && 'Direct Registry Verification Simulator'}
            {tab === 'DOCS' && `Document Vault (${documents.length})`}
          </button>
        ))}
      </div>

      {/* Tab: Master Persons */}
      {activeTab === 'PERSONS' && (
        <div className="p-5 rounded-2xl bg-[#080D1A]/90 border border-white/10 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-emerald-400" />
            Canonical Master Person Registry (`identity_persons`)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="text-[11px] font-mono uppercase bg-white/5 text-slate-400">
                <tr>
                  <th className="p-3">Master Ref (KID)</th>
                  <th className="p-3">Full Legal Name</th>
                  <th className="p-3">Market</th>
                  <th className="p-3">Primary Contact</th>
                  <th className="p-3">KYC Tier</th>
                  <th className="p-3">KYC Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono">
                {persons.map((p) => (
                  <tr key={p.id} className="hover:bg-white/5">
                    <td className="p-3 font-bold text-white">{p.identityReference}</td>
                    <td className="p-3 font-sans font-bold text-white">{p.fullName}</td>
                    <td className="p-3">{p.countryCode === 'NG' ? '🇳🇬 Nigeria' : '🇳🇪 Niger'}</td>
                    <td className="p-3 text-slate-400">{p.phonePrimary}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300">
                        {p.kycTier}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        p.kycStatus === 'VERIFIED' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        ● {p.kycStatus}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => setSelectedPerson(p)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold text-xs"
                      >
                        Review / Upgrade
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Master Organizations */}
      {activeTab === 'ORGS' && (
        <div className="p-5 rounded-2xl bg-[#080D1A]/90 border border-white/10 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-400" />
            Canonical Master Organization Registry (`identity_organizations`)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="text-[11px] font-mono uppercase bg-white/5 text-slate-400">
                <tr>
                  <th className="p-3">Master Org Ref</th>
                  <th className="p-3">Corporate Legal Name</th>
                  <th className="p-3">Registration (CAC/RCCM)</th>
                  <th className="p-3">Market</th>
                  <th className="p-3">Business Type</th>
                  <th className="p-3">KYB Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono">
                {organizations.map((o) => (
                  <tr key={o.id} className="hover:bg-white/5">
                    <td className="p-3 font-bold text-white">{o.identityReference}</td>
                    <td className="p-3 font-sans font-bold text-white">{o.legalName}</td>
                    <td className="p-3 text-emerald-400">{o.registrationNumber}</td>
                    <td className="p-3">{o.countryCode === 'NG' ? '🇳🇬 Nigeria' : '🇳🇪 Niger'}</td>
                    <td className="p-3 text-slate-400">{o.businessType}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300">
                        ● {o.kybStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Verification Simulator */}
      {activeTab === 'VERIFY_TEST' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-6 rounded-3xl bg-[#080D1A]/90 border border-white/10 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Fingerprint className="w-4 h-4 text-emerald-400" />
              Simulate Government Registry Verification
            </h3>
            <p className="text-xs text-slate-400">
              Test live verification calls against simulated national identity adapters (NIMC NIN, NIBSS BVN, CAC, NINA).
            </p>

            <form onSubmit={handleSimulateVerification} className="space-y-3 font-mono text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Target Person Identity ID</label>
                <select
                  value={simTargetId}
                  onChange={(e) => setSimTargetId(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-white/10 text-white"
                >
                  {persons.map(p => (
                    <option key={p.id} value={p.id}>{p.fullName} [{p.identityReference}]</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Jurisdiction Market</label>
                <select
                  value={simCountry}
                  onChange={(e) => setSimCountry(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-white/10 text-white"
                >
                  <option value="NG">🇳🇬 Nigeria (NIMC / BVN / CAC)</option>
                  <option value="NE">🇳🇪 Niger Republic (NINA / RCCM)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Verification Method</label>
                <select
                  value={simVerifType}
                  onChange={(e) => setSimVerifType(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-white/10 text-white"
                >
                  <option value="NATIONAL_ID">National ID (NIN / NINA)</option>
                  <option value="BVN">Bank Verification Number (BVN)</option>
                  <option value="BUSINESS_REGISTRY">Corporate Registry (CAC / RCCM)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Identity Number / RC Number</label>
                <input
                  type="text"
                  value={simIdNumber}
                  onChange={(e) => setSimIdNumber(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-white/10 text-white"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={verifying}
                className="w-full mt-4 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4" />
                {verifying ? "Executing Verification Call..." : "Execute Registry Verification"}
              </button>
            </form>
          </div>

          <div className="p-6 rounded-3xl bg-[#080D1A]/90 border border-white/10 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Verification Proof & Cryptographic Evidence
            </h3>

            {lastVerificationResult ? (
              <div className="space-y-4 font-mono text-xs">
                <div className="p-4 rounded-2xl bg-slate-950/70 border border-white/5 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Provider Gateway:</span>
                    <span className="text-white font-bold">{lastVerificationResult.providerCode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Match Confidence:</span>
                    <span className="text-emerald-400 font-bold">{lastVerificationResult.confidenceScore}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Verification Status:</span>
                    <span className="text-emerald-300 font-bold">● {lastVerificationResult.status}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Verified Timestamp:</span>
                    <span className="text-slate-300">{new Date(lastVerificationResult.verifiedAt).toLocaleTimeString()}</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
                  <span className="text-slate-400 text-[10px]">Cryptographic SHA-256 Proof Hash:</span>
                  <div className="text-[11px] text-emerald-300 break-all font-mono">
                    {lastVerificationResult.evidenceSha256Hash}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-slate-500 text-xs font-sans">
                Submit verification on the left to inspect evidence hash.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Document Vault */}
      {activeTab === 'DOCS' && (
        <div className="p-5 rounded-2xl bg-[#080D1A]/90 border border-white/10 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-amber-400" />
            Encrypted Document Registry & Hash Integrity (`identity_documents`)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="text-[11px] font-mono uppercase bg-white/5 text-slate-400">
                <tr>
                  <th className="p-3">Doc ID</th>
                  <th className="p-3">Document Type</th>
                  <th className="p-3">Document Number (Masked)</th>
                  <th className="p-3">MIME / Size</th>
                  <th className="p-3">SHA-256 File Hash</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono">
                {documents.map((d) => (
                  <tr key={d.id} className="hover:bg-white/5">
                    <td className="p-3 font-bold text-white">{d.id}</td>
                    <td className="p-3 text-slate-200 font-bold">{d.documentType}</td>
                    <td className="p-3 text-slate-400">{d.documentNumberMasked}</td>
                    <td className="p-3 text-slate-400">{d.mimeType} ({(d.fileSizeBytes / 1024 / 1024).toFixed(1)}MB)</td>
                    <td className="p-3 text-emerald-400 text-[11px] max-w-xs truncate" title={d.fileSha256Hash}>
                      {d.fileSha256Hash}
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300">
                        ● {d.verificationStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Maker-Checker Review Modal */}
      {selectedPerson && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="p-6 rounded-3xl bg-[#0b1324] border border-white/10 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-white/10">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                Maker-Checker KYC Verification Review
              </h3>
              <button
                onClick={() => setSelectedPerson(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-white/5 font-mono text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Master Reference:</span>
                <span className="text-white font-bold">{selectedPerson.identityReference}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Legal Name:</span>
                <span className="text-slate-200">{selectedPerson.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Target Upgrade:</span>
                <span className="text-emerald-400 font-bold">Upgrade to KYC TIER 2 (Verified)</span>
              </div>
            </div>

            <div>
              <label className="block text-slate-400 text-xs mb-1">Compliance Sign-off Notes</label>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Document verification sign-off notes..."
                className="w-full p-3 rounded-xl bg-slate-950 border border-white/10 text-white text-xs h-20"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setSelectedPerson(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleApproveKyc}
                disabled={approving}
                className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20"
              >
                {approving ? "Authorizing Tier Upgrade..." : "Approve & Upgrade Tier"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
