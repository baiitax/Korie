'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useCompliance } from '@/components/compliance/ComplianceContext';
import { ComplianceCommandHero } from '@/components/compliance/ComplianceCommandHero';
import { CaseInvestigationDrawer } from '@/components/compliance/CaseInvestigationDrawer';
import { KycReviewModal } from '@/components/compliance/KycReviewModal';
import { RestrictionModal } from '@/components/compliance/RestrictionModal';
import { CreateCaseModal } from '@/components/compliance/CreateCaseModal';
import { ComplianceCase, KycVerificationRecord, KybVerificationRecord } from '@/types/compliance';
import {
  ShieldAlert,
  AlertTriangle,
  FileSearch,
  UserCheck,
  Building2,
  Calendar,
  Radio,
  ArrowRight,
  Clock,
  CheckCircle2,
  Lock,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Activity,
} from 'lucide-react';

export default function ComplianceDashboardPage() {
  const {
    cases,
    amlAlerts,
    sanctionsAlerts,
    kycRecords,
    kybRecords,
    calendarEvents,
    telemetry,
    selectedJurisdiction,
    formatCurrency,
    formatDate,
    convertAmlAlertToCase,
    updateSanctionsAlertStatus,
  } = useCompliance();

  const [selectedCase, setSelectedCase] = useState<ComplianceCase | null>(null);
  const [selectedKyc, setSelectedKyc] = useState<KycVerificationRecord | KybVerificationRecord | null>(null);
  const [kycType, setKycType] = useState<'KYC' | 'KYB'>('KYC');
  const [isRestrictionModalOpen, setIsRestrictionModalOpen] = useState(false);
  const [isCreateCaseOpen, setIsCreateCaseOpen] = useState(false);

  // Filter datasets by jurisdiction
  const filteredCases = selectedJurisdiction === 'ALL' ? cases : cases.filter((c) => c.jurisdiction === selectedJurisdiction);
  const filteredAml = selectedJurisdiction === 'ALL' ? amlAlerts : amlAlerts.filter((a) => a.jurisdiction === selectedJurisdiction);
  const filteredSanctions = selectedJurisdiction === 'ALL' ? sanctionsAlerts : sanctionsAlerts.filter((s) => s.jurisdiction === selectedJurisdiction);
  const filteredKyc = selectedJurisdiction === 'ALL' ? kycRecords : kycRecords.filter((k) => k.jurisdiction === selectedJurisdiction);
  const filteredKyb = selectedJurisdiction === 'ALL' ? kybRecords : kybRecords.filter((k) => k.jurisdiction === selectedJurisdiction);

  return (
    <div className="space-y-6">
      {/* Hero Command Banner */}
      <ComplianceCommandHero
        onOpenCreateCase={() => setIsCreateCaseOpen(true)}
        onOpenRestriction={() => setIsRestrictionModalOpen(true)}
      />

      {/* Top Priority Action Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Investigation Cases */}
        <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-950 text-emerald-400 rounded-lg border border-emerald-800/40">
                  <FileSearch className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Active Case Investigations</h2>
                  <p className="text-xs text-slate-400">Cases requiring officer inquiry, evidence analysis, and filing</p>
                </div>
              </div>
              <Link
                href="/compliance/cases"
                className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
              >
                View All Cases <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-2.5">
              {filteredCases.slice(0, 4).map((c) => (
                <div
                  key={c.id}
                  onClick={() => setSelectedCase(c)}
                  className="p-3.5 bg-slate-950/70 hover:bg-slate-800/60 border border-slate-800/80 rounded-xl cursor-pointer transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-emerald-400 group-hover:underline">
                        {c.caseNumber}
                      </span>
                      <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">
                        {c.jurisdiction === 'NG' ? '🇳🇬 NGN' : '🇳🇪 XOF'}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                          c.priority === 'URGENT'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        }`}
                      >
                        {c.priority} SLA
                      </span>
                    </div>
                    <div className="text-xs font-bold text-slate-200 line-clamp-1">{c.title}</div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2">
                      <span>Entity: <strong className="text-slate-300">{c.targetEntityName}</strong></span>
                      <span>•</span>
                      <span>Officer: <strong className="text-slate-300">{c.assignedOfficerName}</strong></span>
                    </div>
                  </div>

                  <div className="text-right flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800">
                    <div className="text-xs font-bold text-emerald-400 font-mono">
                      {formatCurrency(c.involvedAmount, c.currency)}
                    </div>
                    <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3 text-amber-400" />
                      {formatDate(c.deadlineSla).slice(0, 12)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Regulatory Calendar & Filing Obligations */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-950 text-amber-400 rounded-lg border border-amber-800/40">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Regulatory Deadlines</h2>
                  <p className="text-xs text-slate-400">NFIU, CBN & BCEAO statutory filings</p>
                </div>
              </div>
              <Link
                href="/compliance/calendar"
                className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1"
              >
                Full Calendar <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-3">
              {calendarEvents.map((ev) => (
                <div
                  key={ev.id}
                  className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                    ev.status === 'OVERDUE'
                      ? 'bg-rose-950/20 border-rose-900/60'
                      : 'bg-slate-950/60 border-slate-800/80'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200">{ev.title}</span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                        ev.status === 'OVERDUE'
                          ? 'bg-rose-500/20 text-rose-300 font-mono'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {ev.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">{ev.description}</div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/60">
                    <span className="font-mono text-emerald-400 font-semibold">{ev.regulator} • {ev.jurisdiction}</span>
                    <span className="font-mono text-amber-400">{formatDate(ev.dueDate).slice(0, 12)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* AML & Sanctions Real-Time Alert Desks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AML Suspicious Alerts */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-950 text-amber-400 rounded-lg border border-amber-800/40">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">AML Velocity & Pattern Alerts</h2>
                <p className="text-xs text-slate-400">Automated transaction monitoring triggers</p>
              </div>
            </div>
            <Link
              href="/compliance/aml"
              className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1"
            >
              AML Desk <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {filteredAml.slice(0, 3).map((alert) => (
              <div
                key={alert.id}
                className="p-3.5 bg-slate-950/70 border border-slate-800/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">
                      {alert.ruleCode}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                        alert.severity === 'CRITICAL'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      }`}
                    >
                      {alert.severity}
                    </span>
                    <span className="text-xs font-bold text-white">{alert.ruleName}</span>
                  </div>
                  <div className="text-xs text-slate-300">{alert.triggerReason}</div>
                  <div className="text-[11px] text-slate-400">
                    Target: <strong className="text-slate-200">{alert.entityName}</strong> • {alert.jurisdiction}
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2">
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    {formatCurrency(alert.transactionAmount, alert.currency)}
                  </span>
                  {alert.status === 'NEW' && (
                    <button
                      onClick={() => convertAmlAlertToCase(alert.id)}
                      className="px-2.5 py-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-[11px] rounded transition shadow"
                    >
                      Convert to Case
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sanctions & PEP Screenings */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-rose-950 text-rose-400 rounded-lg border border-rose-800/40">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Sanctions & Watchlist Matches</h2>
                <p className="text-xs text-slate-400">UN, OFAC, EU, CBN and CENTIF screenings</p>
              </div>
            </div>
            <Link
              href="/compliance/sanctions"
              className="text-xs font-semibold text-rose-400 hover:text-rose-300 flex items-center gap-1"
            >
              Sanctions Desk <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {filteredSanctions.map((s) => (
              <div
                key={s.id}
                className="p-3.5 bg-slate-950/70 border border-slate-800/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">{s.targetEntityName}</span>
                    <span className="text-[10px] font-mono bg-rose-950/80 text-rose-300 border border-rose-800/60 px-1.5 py-0.5 rounded font-bold">
                      {s.matchScore}% Match
                    </span>
                  </div>
                  <div className="text-xs text-slate-400">
                    List: <strong className="text-slate-300">{s.watchlistName}</strong> ({s.matchedNameOnList})
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Category: {s.category} • Match Basis: {s.matchType}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateSanctionsAlertStatus(s.id, 'FALSE_POSITIVE', 'Verified identity divergence')}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[11px] rounded transition"
                  >
                    False Positive
                  </button>
                  <button
                    onClick={() => {
                      updateSanctionsAlertStatus(s.id, 'CONFIRMED_MATCH', 'Confirmed match against designated list');
                      setIsRestrictionModalOpen(true);
                    }}
                    className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] rounded transition shadow"
                  >
                    Confirm & Freeze
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* KYC & KYB Due Diligence Quick Review Strip */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-teal-950 text-teal-400 rounded-lg border border-teal-800/40">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Pending Due Diligence Verifications</h2>
              <p className="text-xs text-slate-400">Customer KYC (Tier 1-3) & Merchant KYB corporate registrations</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/compliance/kyc"
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
            >
              Customer KYC <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <span className="text-slate-600">•</span>
            <Link
              href="/compliance/kyb"
              className="text-xs font-semibold text-teal-400 hover:text-teal-300 flex items-center gap-1"
            >
              Merchant KYB <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredKyc.slice(0, 3).map((k) => (
            <div
              key={k.id}
              onClick={() => {
                setSelectedKyc(k);
                setKycType('KYC');
              }}
              className="p-3.5 bg-slate-950/70 hover:bg-slate-800/60 border border-slate-800/80 rounded-xl cursor-pointer transition flex flex-col justify-between space-y-2 group"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono bg-slate-800 px-1.5 py-0.5 rounded text-slate-300 font-bold">
                    {k.tier}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                      k.status === 'VERIFIED'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-amber-500/20 text-amber-300'
                    }`}
                  >
                    {k.status}
                  </span>
                </div>
                <div className="text-xs font-bold text-slate-200 mt-2 group-hover:text-emerald-400 transition">
                  {k.customerName}
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  NIN: {k.maskedNin} • BVN: {k.maskedBvn || 'N/A'}
                </div>
              </div>
              <div className="text-[10px] text-slate-500 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                <span>{k.jurisdiction === 'NG' ? '🇳🇬 Nigeria' : '🇳🇪 Niger'}</span>
                <span className="text-emerald-400 font-semibold group-hover:underline flex items-center gap-1">
                  Inspect <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          ))}

          {filteredKyb.slice(0, 3).map((b) => (
            <div
              key={b.id}
              onClick={() => {
                setSelectedKyc(b);
                setKycType('KYB');
              }}
              className="p-3.5 bg-slate-950/70 hover:bg-slate-800/60 border border-slate-800/80 rounded-xl cursor-pointer transition flex flex-col justify-between space-y-2 group"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono bg-teal-950/60 text-teal-300 border border-teal-800/60 px-1.5 py-0.5 rounded font-bold">
                    {b.businessType}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                      b.status === 'VERIFIED'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-amber-500/20 text-amber-300'
                    }`}
                  >
                    {b.status}
                  </span>
                </div>
                <div className="text-xs font-bold text-slate-200 mt-2 group-hover:text-teal-400 transition">
                  {b.businessName}
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  RC: {b.registrationNumber} • TIN: {b.taxIdentificationNumber}
                </div>
              </div>
              <div className="text-[10px] text-slate-500 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                <span>{b.jurisdiction === 'NG' ? '🇳🇬 CAC Verified' : '🇳🇪 RCCM Verified'}</span>
                <span className="text-teal-400 font-semibold group-hover:underline flex items-center gap-1">
                  Inspect KYB <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Real-time Risk Telemetry Stream */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-950 text-emerald-400 rounded-lg border border-emerald-800/40">
              <Radio className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Live Transaction Risk Telemetry</h2>
              <p className="text-xs text-slate-400">Real-time risk scoring across banking nodes (Providus NG & Koris NE)</p>
            </div>
          </div>
          <Link
            href="/compliance/transaction-monitoring"
            className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
          >
            Live Monitor <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="pb-2 font-semibold">Transaction ID</th>
                <th className="pb-2 font-semibold">Origin Entity</th>
                <th className="pb-2 font-semibold">Beneficiary</th>
                <th className="pb-2 font-semibold">Amount</th>
                <th className="pb-2 font-semibold">Risk Score</th>
                <th className="pb-2 font-semibold">Decision</th>
                <th className="pb-2 font-semibold">Banking Node</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {telemetry.map((t) => (
                <tr key={t.id} className="hover:bg-slate-800/40">
                  <td className="py-2.5 text-slate-300">{t.transactionId}</td>
                  <td className="py-2.5 font-sans text-white font-medium">{t.originEntityName}</td>
                  <td className="py-2.5 font-sans text-slate-300">{t.destinationEntityName}</td>
                  <td className="py-2.5 font-bold text-emerald-400">
                    {formatCurrency(t.amount, t.currency)}
                  </td>
                  <td className="py-2.5">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        t.riskScore > 75
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : t.riskScore > 40
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-emerald-500/20 text-emerald-300'
                      }`}
                    >
                      Score {t.riskScore}/100
                    </span>
                  </td>
                  <td className="py-2.5 font-sans">
                    <span
                      className={`text-[11px] font-bold ${
                        t.ruleDecision === 'PASS'
                          ? 'text-emerald-400'
                          : t.ruleDecision === 'FLAG'
                          ? 'text-amber-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {t.ruleDecision}
                    </span>
                  </td>
                  <td className="py-2.5 text-slate-400 text-[11px]">{t.node}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals & Drawers */}
      <CaseInvestigationDrawer caseItem={selectedCase} onClose={() => setSelectedCase(null)} />
      <KycReviewModal record={selectedKyc} type={kycType} onClose={() => setSelectedKyc(null)} />
      <RestrictionModal isOpen={isRestrictionModalOpen} onClose={() => setIsRestrictionModalOpen(false)} />
      <CreateCaseModal isOpen={isCreateCaseOpen} onClose={() => setIsCreateCaseOpen(false)} />
    </div>
  );
}
