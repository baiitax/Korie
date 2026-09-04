"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useDeveloper } from './DeveloperContext';
import {
  Code2,
  Terminal,
  Layers,
  Key,
  Radio,
  Activity,
  FileCode2,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Zap,
  BookOpen,
  Send,
  Lock,
  Cpu,
  BarChart3,
  Users,
  LifeBuoy,
  Settings,
  ChevronDown,
  Menu,
  X,
  Search,
  Sparkles,
  ArrowUpRight,
  ExternalLink,
  Globe,
  Database,
  RefreshCw,
  GitPullRequest,
  Check,
} from 'lucide-react';
import KorieLogo from '@/components/brand/KorieLogo';
import ShellAccount from '@/components/ui/ShellAccount';

export const DeveloperShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const {
    environment,
    setEnvironment,
    locale,
    setLocale,
    t,
    organization,
    activeApplication,
    applications,
    setActiveApplicationId,
    activeMember,
    isSearchOpen,
    setIsSearchOpen,
    statusNodes,
    incidents,
  } = useDeveloper();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [appDropdownOpen, setAppDropdownOpen] = useState(false);
  const [envWarningModal, setEnvWarningModal] = useState(false);
  const [pendingEnv, setPendingEnv] = useState<'SANDBOX' | 'PRODUCTION' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const activeIncident = incidents.find(i => i.status !== 'RESOLVED');

  const navGroups = [
    {
      group: 'Overview',
      items: [
        { href: '/developers/dashboard', label: t.nav.dashboard, icon: Activity, badge: 'LIVE' },
      ],
    },
    {
      group: 'Discover & Build',
      items: [
        { href: '/developers/apis', label: t.nav.apis, icon: Database },
        { href: '/developers/docs', label: t.nav.docs, icon: BookOpen },
        { href: '/developers/explorer', label: t.nav.explorer, icon: Terminal, badge: 'TRY' },
        { href: '/developers/sdks', label: t.nav.sdks, icon: FileCode2 },
      ],
    },
    {
      group: 'Sandbox & Testing',
      items: [
        { href: '/developers/sandbox', label: t.nav.sandbox, icon: Cpu, badge: 'TEST' },
        { href: '/developers/testing', label: t.nav.testing, icon: CheckCircle2 },
      ],
    },
    {
      group: 'Integration & Security',
      items: [
        { href: '/developers/applications', label: t.nav.applications, icon: Layers },
        { href: '/developers/credentials', label: t.nav.credentials, icon: Key },
        { href: '/developers/webhooks', label: t.nav.webhooks, icon: Radio },
        { href: '/developers/events', label: t.nav.events, icon: Zap },
      ],
    },
    {
      group: 'Telemetry & Health',
      items: [
        { href: '/developers/logs', label: t.nav.logs, icon: FileCode2 },
        { href: '/developers/errors', label: t.nav.errors, icon: AlertTriangle },
        { href: '/developers/usage', label: t.nav.usage, icon: BarChart3 },
        { href: '/developers/status', label: t.nav.status, icon: Activity, badge: activeIncident ? 'ALERT' : '99.9%' },
        { href: '/developers/changelog', label: t.nav.changelog, icon: GitPullRequest },
      ],
    },
    {
      group: 'Organization & Support',
      items: [
        { href: '/developers/team', label: t.nav.team, icon: Users },
        { href: '/developers/support', label: t.nav.support, icon: LifeBuoy },
        { href: '/developers/settings', label: t.nav.settings, icon: Settings },
      ],
    },
  ];

  const handleEnvSwitchClick = (target: 'SANDBOX' | 'PRODUCTION') => {
    if (target === environment) return;
    if (target === 'PRODUCTION') {
      setPendingEnv('PRODUCTION');
      setEnvWarningModal(true);
    } else {
      setEnvironment('SANDBOX');
    }
  };

  const confirmProductionSwitch = () => {
    setEnvironment('PRODUCTION');
    setEnvWarningModal(false);
    setPendingEnv(null);
  };

  return (
    <div className="min-h-screen bg-[#060a14] text-slate-100 flex flex-col font-sans">
      {/* Top Banner Alert if Incident Active */}
      {activeIncident && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-xs text-amber-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="font-semibold">Service Notice:</span>
            <span>{activeIncident.title}</span>
          </div>
          <Link href="/developers/status" className="font-bold underline text-amber-400 hover:text-amber-300">
            View Live Status →
          </Link>
        </div>
      )}

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-[#080d1a]/90 backdrop-blur-md border-b border-white/10">
        <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo & Portal Identity */}
          <div className="flex items-center gap-3 sm:gap-6">
            <Link href="/developers" className="flex items-center gap-2.5 group">
              <KorieLogo variant="icon" height={30} />
              <div className="flex flex-col">
                <span className="font-black tracking-tight text-white text-sm sm:text-base flex items-center gap-1.5">
                  KoriePay <span className="text-emerald-400 font-mono font-bold text-xs px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">DEV</span>
                </span>
                <span className="text-[10px] font-mono text-slate-400 hidden sm:inline">Platform & API Hub</span>
              </div>
            </Link>

            {/* Application Selector */}
            <div className="relative hidden md:block">
              <button
                onClick={() => setAppDropdownOpen(!appDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-white/10 hover:border-emerald-500/30 text-xs text-slate-200 transition-colors"
              >
                <Layers className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-semibold truncate max-w-[140px]">{activeApplication.name}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {appDropdownOpen && (
                <div className="absolute left-0 mt-2 w-72 rounded-2xl bg-[#0d162a] border border-white/10 shadow-2xl p-2 z-50 animate-fadeIn">
                  <div className="text-[10px] font-mono text-slate-400 uppercase px-3 py-1">Select Application</div>
                  {applications.map(app => (
                    <button
                      key={app.id}
                      onClick={() => {
                        setActiveApplicationId(app.id);
                        setAppDropdownOpen(false);
                      }}
                      className={`w-full text-left p-2.5 rounded-xl text-xs flex items-center justify-between transition-colors ${
                        app.id === activeApplication.id ? 'bg-emerald-500/10 text-emerald-300 font-bold' : 'text-slate-300 hover:bg-white/5'
                      }`}
                    >
                      <div className="truncate">
                        <div className="truncate">{app.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{app.id}</div>
                      </div>
                      <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold uppercase ${
                        app.environment === 'PRODUCTION' ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'
                      }`}>
                        {app.environment}
                      </span>
                    </button>
                  ))}
                  <div className="border-t border-white/10 mt-1 pt-1">
                    <Link
                      href="/developers/applications"
                      onClick={() => setAppDropdownOpen(false)}
                      className="block text-center py-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
                    >
                      + Manage Applications
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Center / Right Toolbar */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Environment Switcher Pill */}
            <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-white/10 shadow-inner">
              <button
                onClick={() => handleEnvSwitchClick('SANDBOX')}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all ${
                  environment === 'SANDBOX'
                    ? 'bg-emerald-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className={`w-1.5 h-1.5 rounded-full ${environment === 'SANDBOX' ? 'bg-slate-950' : 'bg-emerald-400'}`} />
                <span>SANDBOX</span>
              </button>
              <button
                onClick={() => handleEnvSwitchClick('PRODUCTION')}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all ${
                  environment === 'PRODUCTION'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className={`w-1.5 h-1.5 rounded-full ${environment === 'PRODUCTION' ? 'bg-slate-950' : 'bg-amber-400'}`} />
                <span>PRODUCTION</span>
              </button>
            </div>

            {/* Quick Search */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-white/10 hover:border-emerald-500/30 text-xs text-slate-400 hover:text-slate-200 transition-colors"
            >
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <span>Search APIs & Docs...</span>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-slate-400 border border-white/5">⌘K</kbd>
            </button>

            {/* Language Switcher */}
            <div className="flex items-center rounded-lg bg-slate-900 border border-white/10 p-0.5 text-xs font-mono">
              {(['en', 'ha', 'fr'] as const).map(lang => (
                <button
                  key={lang}
                  onClick={() => setLocale(lang)}
                  className={`px-2 py-0.5 rounded uppercase font-bold transition-colors ${
                    locale === lang ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>

            {/* Organization / Role Chip */}
            <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-900/60 border border-white/10">
              <div className="w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-xs">
                {activeMember.name.slice(0, 1)}
              </div>
              <div className="text-left hidden xl:block">
                <div className="text-xs font-bold text-white truncate max-w-[120px]">{activeMember.name.split(',')[0]}</div>
                <div className="text-[9px] font-mono text-emerald-400 font-semibold">{activeMember.role}</div>
              </div>
            </div>

            {/* Day / Night + Sign out */}
            <ShellAccount className="hidden sm:flex" />

            {/* Mobile Menu Trigger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl bg-slate-900 border border-white/10 text-slate-300 hover:text-white"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main App Layout */}
      <div className="flex-1 flex max-w-[1600px] w-full mx-auto">
        {/* Desktop Sidebar Navigation */}
        <aside className="hidden lg:block w-64 shrink-0 border-r border-white/10 bg-[#070b16] py-6 px-4 space-y-6 overflow-y-auto max-h-[calc(100vh-4rem)] sticky top-16 custom-scrollbar">
          {/* Organization Badge */}
          <div className="p-3.5 rounded-2xl bg-[#0b1325] border border-white/10 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase text-slate-400">Workspace</span>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 font-bold uppercase">
                {organization.tier}
              </span>
            </div>
            <div className="font-bold text-xs text-white truncate">{organization.name}</div>
            <div className="text-[10px] text-slate-400 font-mono">{organization.jurisdiction}</div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-6">
            {navGroups.map((grp, gIdx) => (
              <div key={gIdx} className="space-y-1">
                <div className="px-3 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
                  {grp.group}
                </div>
                {grp.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href || (item.href !== '/developers' && pathname.startsWith(item.href));
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold'
                          : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold uppercase ${
                          item.badge === 'LIVE' ? 'bg-emerald-500/20 text-emerald-300' :
                          item.badge === 'TRY' ? 'bg-indigo-500/20 text-indigo-300' :
                          item.badge === 'TEST' ? 'bg-amber-500/20 text-amber-300' :
                          item.badge === 'ALERT' ? 'bg-rose-500/20 text-rose-300' :
                          'bg-white/10 text-slate-300'
                        }`}>
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>

          {/* Banking Node Status Footer */}
          <div className="pt-4 border-t border-white/10">
            <Link
              href="/developers/status"
              className="p-3 rounded-2xl bg-slate-900/60 border border-white/5 hover:border-emerald-500/20 flex items-center justify-between text-xs group transition-all"
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-slate-300 font-mono text-[11px] group-hover:text-emerald-400">All Nodes Live</span>
              </div>
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400" />
            </Link>
          </div>
        </aside>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-md">
            <div className="w-4/5 max-w-sm h-full bg-[#070b16] border-r border-white/10 p-6 space-y-6 overflow-y-auto">
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <span className="font-bold text-white text-sm">Developer Navigation</span>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg bg-white/5 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {navGroups.map((grp, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="text-[10px] font-mono text-slate-500 uppercase">{grp.group}</div>
                    {grp.items.map(item => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold ${
                          pathname === item.href ? 'bg-emerald-500/10 text-emerald-400 font-bold' : 'text-slate-300'
                        }`}
                      >
                        <span>{item.label}</span>
                        {item.badge && (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-slate-300">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>

      {/* Production Switch Warning Modal */}
      {envWarningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md bg-[#0b1222] border border-amber-500/30 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Switch to Production Mode</h3>
                <p className="text-xs text-slate-400">Live Financial Settlement Environment</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              You are switching to <strong className="text-amber-400">LIVE PRODUCTION</strong>. API calls will move real funds through Providus Bank Nigeria and Koris Bank Niger Republic settlement accounts. Never use test cards or dummy references in this mode.
            </p>

            <div className="p-3.5 rounded-2xl bg-amber-500/5 border border-amber-500/20 text-[11px] font-mono text-amber-300">
              Enforcing live HMAC-SHA256 signatures & dual-control financial authorization.
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setEnvWarningModal(false);
                  setPendingEnv(null);
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300 hover:text-white"
              >
                Stay in Sandbox
              </button>
              <button
                onClick={confirmProductionSwitch}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20"
              >
                Confirm Production Access
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Search Modal (⌘K) */}
      {isSearchOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
          onClick={() => setIsSearchOpen(false)}
        >
          <div
            className="w-full max-w-2xl bg-[#0b1222] border border-white/15 rounded-3xl p-4 shadow-2xl space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-3 py-2 rounded-2xl bg-slate-900 border border-white/10">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search APIs, endpoints, error codes, guides..."
                className="w-full bg-transparent text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none"
              />
              <button
                onClick={() => setIsSearchOpen(false)}
                className="p-1 rounded-lg bg-white/5 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-2 text-xs">
              <div className="text-[10px] font-mono uppercase text-slate-400 px-2 font-bold">Quick Navigation</div>
              <Link
                href="/developers/apis"
                onClick={() => setIsSearchOpen(false)}
                className="block p-2.5 rounded-xl bg-slate-900/60 hover:bg-emerald-500/10 border border-white/5 text-white"
              >
                <div className="font-bold flex items-center gap-2">
                  <Database className="w-3.5 h-3.5 text-emerald-400" />
                  <span>API Marketplace & Catalog</span>
                </div>
                <div className="text-[11px] text-slate-400">Payments, Wallets, Agency, Merchant, KYC, FX corridor</div>
              </Link>
              <Link
                href="/developers/explorer"
                onClick={() => setIsSearchOpen(false)}
                className="block p-2.5 rounded-xl bg-slate-900/60 hover:bg-emerald-500/10 border border-white/5 text-white"
              >
                <div className="font-bold flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Interactive API Explorer</span>
                </div>
                <div className="text-[11px] text-slate-400">Send live sandbox requests with instant JSON response preview</div>
              </Link>
              <Link
                href="/developers/webhooks"
                onClick={() => setIsSearchOpen(false)}
                className="block p-2.5 rounded-xl bg-slate-900/60 hover:bg-emerald-500/10 border border-white/5 text-white"
              >
                <div className="font-bold flex items-center gap-2">
                  <Radio className="w-3.5 h-3.5 text-teal-400" />
                  <span>Webhook Manager & Replay</span>
                </div>
                <div className="text-[11px] text-slate-400">HMAC-SHA256 signature verifier and payload history</div>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeveloperShell;
