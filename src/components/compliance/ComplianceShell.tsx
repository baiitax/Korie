'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCompliance } from './ComplianceContext';
import {
  ShieldAlert,
  SlidersHorizontal,
  FileSearch,
  UserCheck,
  Building2,
  AlertTriangle,
  Eye,
  Lock,
  FileCheck2,
  BookOpen,
  Calendar,
  Users,
  History,
  BarChart3,
  Globe,
  Bell,
  Search,
  ChevronDown,
  Menu,
  X,
  Plus,
  Radio,
  FileText,
  Clock,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { ComplianceLocale } from '@/locales/compliance';
import ShellAccount from '@/components/ui/ShellAccount';

export const ComplianceShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const {
    locale,
    setLocale,
    t,
    selectedJurisdiction,
    setSelectedJurisdiction,
    currentOfficer,
    setCurrentOfficer,
    officers,
    stats,
  } = useCompliance();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [officerDropdownOpen, setOfficerDropdownOpen] = useState(false);

  interface NavSubItem {
    name: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    badge: number | string | null;
    alert?: boolean;
  }

  interface NavGroup {
    group: string;
    items: NavSubItem[];
  }

  const navItems: NavGroup[] = [
    {
      group: 'COMMAND & TRIAGE',
      items: [
        { name: 'Dashboard', href: '/compliance', icon: BarChart3, badge: null, alert: false },
        { name: 'Work Queue', href: '/compliance/work-queue', icon: SlidersHorizontal, badge: stats.pendingKycKyb + stats.totalAmlAlerts, alert: false },
        { name: 'Investigation Cases', href: '/compliance/cases', icon: FileSearch, badge: stats.totalOpenCases, alert: false },
      ],
    },
    {
      group: 'DUE DILIGENCE (KYC/KYB)',
      items: [
        { name: 'Customer KYC', href: '/compliance/kyc', icon: UserCheck, badge: null, alert: false },
        { name: 'Merchant KYB', href: '/compliance/kyb', icon: Building2, badge: null, alert: false },
        { name: 'Agent Network KYC', href: '/compliance/agents', icon: Users, badge: null, alert: false },
        { name: 'High-Risk Merchants', href: '/compliance/merchants', icon: Building2, badge: null, alert: false },
        { name: 'Enhanced Diligence (EDD)', href: '/compliance/edd', icon: FileText, badge: stats.highRiskEntitiesCount, alert: false },
      ],
    },
    {
      group: 'AML & SCREENING',
      items: [
        { name: 'AML Alerts', href: '/compliance/aml', icon: AlertTriangle, badge: stats.totalAmlAlerts, alert: true },
        { name: 'Transaction Monitoring', href: '/compliance/transaction-monitoring', icon: Radio, badge: null, alert: false },
        { name: 'Sanctions Screening', href: '/compliance/sanctions', icon: ShieldAlert, badge: stats.totalSanctionsAlerts, alert: true },
        { name: 'PEP Watchlist', href: '/compliance/pep', icon: Eye, badge: null, alert: false },
        { name: 'Adverse Media', href: '/compliance/adverse-media', icon: Globe, badge: null, alert: false },
      ],
    },
    {
      group: 'CONTROLS & ENFORCEMENT',
      items: [
        { name: 'Account Restrictions', href: '/compliance/restrictions', icon: Lock, badge: stats.activeRestrictions, alert: false },
        { name: 'Regulatory Reporting', href: '/compliance/regulatory-reporting', icon: FileCheck2, badge: null, alert: false },
        { name: 'Compliance Policies', href: '/compliance/policies', icon: BookOpen, badge: null, alert: false },
        { name: 'Obligation Calendar', href: '/compliance/calendar', icon: Calendar, badge: stats.overdueDeadlines ? '!' : null, alert: Boolean(stats.overdueDeadlines) },
        { name: 'Team & RBAC', href: '/compliance/team', icon: Users, badge: null, alert: false },
        { name: 'Immutable Audit Log', href: '/compliance/audit', icon: History, badge: null, alert: false },
        { name: 'Risk Analytics', href: '/compliance/analytics', icon: BarChart3, badge: null, alert: false },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-[#060913] text-slate-100 flex flex-col font-sans antialiased selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Top Banner for Compliance Officer Environment */}
      <header className="sticky top-0 z-40 bg-[#0A101D]/90 backdrop-blur-md border-b border-slate-800/80 px-4 lg:px-8 py-2.5 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            aria-label="Toggle navigation"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

          <Link href="/compliance" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-900/30 ring-1 ring-emerald-400/40">
              <ShieldAlert className="w-5 h-5 text-slate-950 font-bold" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-white group-hover:text-emerald-400 transition-colors">
                  KORIEPAY
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  COMPLIANCE OPS
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Financial Crime & Regulatory Defense System
              </p>
            </div>
          </Link>
        </div>

        {/* Global Jurisdiction & Role Selector Bar */}
        <div className="flex items-center gap-3">
          {/* Jurisdiction Switcher */}
          <div className="hidden sm:flex items-center bg-slate-900/90 rounded-lg p-0.5 border border-slate-800">
            <button
              onClick={() => setSelectedJurisdiction('ALL')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                selectedJurisdiction === 'ALL'
                  ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              🌍 All Regions
            </button>
            <button
              onClick={() => setSelectedJurisdiction('NG')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                selectedJurisdiction === 'NG'
                  ? 'bg-emerald-950/80 text-emerald-300 shadow-sm border border-emerald-700/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>🇳🇬</span> Nigeria (CBN/NFIU)
            </button>
            <button
              onClick={() => setSelectedJurisdiction('NE')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                selectedJurisdiction === 'NE'
                  ? 'bg-amber-950/80 text-amber-300 shadow-sm border border-amber-700/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>🇳🇪</span> Niger (BCEAO/CENTIF)
            </button>
          </div>

          {/* Language Switcher */}
          <div className="flex items-center bg-slate-900/90 rounded-lg p-0.5 border border-slate-800">
            {(['en', 'ha', 'fr'] as ComplianceLocale[]).map((lang) => (
              <button
                key={lang}
                onClick={() => setLocale(lang)}
                className={`px-2 py-1 text-xs font-bold uppercase rounded-md transition-colors ${
                  locale === lang
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {lang}
              </button>
            ))}
          </div>

          {/* Active Officer Profile Selector (RBAC Simulation) */}
          <div className="relative">
            <button
              onClick={() => setOfficerDropdownOpen(!officerDropdownOpen)}
              className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 hover:border-slate-700 transition"
            >
              <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs border border-emerald-500/30">
                {currentOfficer.fullName.slice(0, 2).toUpperCase()}
              </div>
              <div className="text-left hidden md:block">
                <div className="text-xs font-bold text-slate-200 leading-tight">
                  {currentOfficer.fullName}
                </div>
                <div className="text-[10px] text-emerald-400 font-mono">
                  {currentOfficer.role.replace(/_/g, ' ')}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {officerDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-2 z-50">
                <div className="text-[11px] font-bold text-slate-400 px-2 py-1 uppercase tracking-wider">
                  Switch Active Compliance Officer
                </div>
                <div className="space-y-1 mt-1">
                  {officers.map((off) => (
                    <button
                      key={off.id}
                      onClick={() => {
                        setCurrentOfficer(off);
                        setOfficerDropdownOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-2 rounded-lg text-xs transition flex items-center justify-between ${
                        currentOfficer.id === off.id
                          ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60'
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <div>
                        <div className="font-semibold">{off.fullName}</div>
                        <div className="text-[10px] text-slate-400">{off.role.replace(/_/g, ' ')} • {off.jurisdiction}</div>
                      </div>
                      {currentOfficer.id === off.id && (
                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Day / Night + Sign out */}
            <ShellAccount className="hidden md:flex" />
          </div>
        </div>
      </header>

      {/* Main Layout Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar Navigation */}
        <aside
          className={`${
            mobileMenuOpen ? 'fixed inset-0 z-50 bg-[#060913]/95' : 'hidden'
          } lg:block lg:static w-72 flex-shrink-0 bg-[#0A0F1D]/60 border-r border-slate-800/80 overflow-y-auto`}
        >
          {mobileMenuOpen && (
            <div className="p-4 flex items-center justify-between border-b border-slate-800 lg:hidden">
              <span className="font-bold text-slate-200">Compliance Menu</span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          )}

          <div className="p-4 space-y-6">
            {navItems.map((grp) => (
              <div key={grp.group} className="space-y-1">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-2">
                  {grp.group}
                </div>
                {grp.items.map((item) => {
                  const isActive = pathname === item.href || (item.href !== '/compliance' && pathname.startsWith(item.href));
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-gradient-to-r from-emerald-600/20 to-teal-600/10 text-emerald-300 border border-emerald-500/30 shadow-inner'
                          : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                        <span>{item.name}</span>
                      </div>
                      {item.badge !== null && item.badge !== undefined && (
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            item.alert
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            ))}

            {/* Quick Links / External Portals */}
            <div className="pt-4 border-t border-slate-800/80 space-y-2">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3">
                REGULATORY NODES
              </div>
              <div className="px-3 py-2 bg-slate-900/60 border border-slate-800 rounded-lg text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">NFIU GoAML:</span>
                  <span className="text-emerald-400 font-mono text-[11px] font-semibold">CONNECTED</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">CENTIF Niger:</span>
                  <span className="text-emerald-400 font-mono text-[11px] font-semibold">ONLINE</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Providus Bank API:</span>
                  <span className="text-amber-400 font-mono text-[11px] font-semibold">CONFIGURED</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Koris Bank NE:</span>
                  <span className="text-amber-400 font-mono text-[11px] font-semibold">CONFIGURED</span>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Center Main Workspace */}
        <main className="flex-1 overflow-y-auto bg-gradient-to-b from-[#080D1A] to-[#04060C] p-4 lg:p-8 space-y-6">
          {children}
        </main>
      </div>
    </div>
  );
};
