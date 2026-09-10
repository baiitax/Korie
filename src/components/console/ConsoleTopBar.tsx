'use client';

/**
 * KoriePay — shared console top bar (admin design language, master spec v1).
 *
 * This is the ONE top bar used by the Super Admin, Compliance, Support and
 * Merchant consoles: 64px glass bar with the workspace search trigger, market
 * switcher, status/realtime controls, portal-specific extras, notification
 * tray, day/night toggle and the signed-in operator + logout.
 *
 * Portal shells pass slots; the chrome never invents data — notifications and
 * identity come from the calling portal's own context/engine.
 */
import React, { useState } from 'react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Search, Bell, Radio, LogOut } from 'lucide-react';

export interface ConsoleNotifItem {
  id: string;
  title: string;
  body?: string;
  tone?: 'amber' | 'emerald' | 'rose' | 'sky';
}

export interface ConsoleMarketOption {
  id: string;
  label: string;
  /** colour family for the active state (admin spec: global=teal, ng=emerald, ne=amber) */
  tone?: 'global' | 'ng' | 'ne';
}

export interface ConsoleTopBarProps {
  searchPlaceholder: string;
  onSearch?: () => void;
  /** extra content rendered left of the search trigger (portal identity) */
  left?: React.ReactNode;
  markets?: { value: string; onChange: (v: string) => void; options: ConsoleMarketOption[] };
  /** portal status chip (e.g. environment toggle, offline chip) */
  statusChip?: React.ReactNode;
  realtime?: { active: boolean; onToggle: () => void; labelOn?: string; labelOff?: string };
  /** portal extras placed before the notification tray (language, RBAC, …) */
  extras?: React.ReactNode;
  notifications?: {
    count: number;
    items: ConsoleNotifItem[];
    title?: string;
    emptyText?: string;
    href?: string;
  };
  user?: { name: string; role: string };
  onLogout: () => void;
}

const marketBtn = (active: boolean, tone: ConsoleMarketOption['tone'] = 'global') => {
  if (!active) return 'text-slate-400 hover:text-white';
  if (tone === 'ng') return 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
  if (tone === 'ne') return 'bg-amber-500/20 text-amber-300 border border-amber-500/30';
  return 'bg-teal-500/20 text-teal-300 border border-teal-500/30';
};

const notifTone = (tone: ConsoleNotifItem['tone'] = 'sky') => {
  switch (tone) {
    case 'amber': return 'text-amber-400';
    case 'emerald': return 'text-emerald-400';
    case 'rose': return 'text-rose-400';
    default: return 'text-sky-400';
  }
};

export const ConsoleTopBar: React.FC<ConsoleTopBarProps> = ({
  searchPlaceholder,
  onSearch,
  left,
  markets,
  statusChip,
  realtime,
  extras,
  notifications,
  user,
  onLogout,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <header className="h-16 glass-nav px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Left: identity + quick search trigger */}
      <div className="flex items-center gap-4 flex-1 max-w-md min-w-0">
        {left}
        <button
          onClick={onSearch}
          className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl bg-slate-900/90 border border-white/10 text-slate-400 hover:text-white hover:border-white/20 transition-all text-xs"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Search className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate">{searchPlaceholder}</span>
          </div>
          <kbd className="px-1.5 py-0.5 text-[9px] font-mono bg-slate-800 text-slate-300 rounded border border-white/10 shrink-0">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right action bar */}
      <div className="flex items-center gap-3">
        {markets && markets.options.length > 0 && (
          <div className="hidden md:flex items-center p-1 rounded-xl bg-slate-900 border border-white/10 text-xs font-semibold">
            {markets.options.map((o) => (
              <button
                key={o.id}
                onClick={() => markets.onChange(o.id)}
                className={`px-3 py-1.5 rounded-lg transition-all ${marketBtn(markets.value === o.id, o.tone)}`}
              >
                {o.label}
              </button>
            ))}
          </div>
        )}

        {statusChip}

        {realtime && (
          <button
            onClick={realtime.onToggle}
            className={`p-2 rounded-xl border transition-colors ${
              realtime.active
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-slate-900 text-slate-500 border-white/5'
            }`}
            title={(realtime.active ? realtime.labelOn : realtime.labelOff) || (realtime.active ? 'Realtime active' : 'Realtime paused')}
          >
            <Radio className="w-4 h-4" />
          </button>
        )}

        {extras}

        {notifications && (
          <div className="relative">
            <button
              onClick={() => setShowNotifications((v) => !v)}
              className="relative p-2 rounded-xl bg-slate-900 border border-white/10 text-slate-300 hover:text-white transition-colors"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              {notifications.count > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-slate-950 font-bold text-[9px] flex items-center justify-center font-mono">
                  {notifications.count}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 top-full mt-2 w-80 p-3 bg-[#0d1527] border border-white/10 rounded-2xl shadow-2xl backdrop-blur-2xl z-50 text-xs animate-fadeIn">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
                  <span className="font-bold text-white">{notifications.title || 'Alerts'}</span>
                  <span className="text-[10px] font-mono text-emerald-400">{notifications.count} Active</span>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto divide-y divide-white/5">
                  {notifications.items.length === 0 && (
                    <div className="p-2 text-slate-400 text-[11px]">{notifications.emptyText || 'No new notifications.'}</div>
                  )}
                  {notifications.items.slice(0, 6).map((n) => (
                    <div key={n.id} className="p-2 rounded-lg bg-slate-900/80 pt-2 first:pt-2">
                      <div className={`font-bold text-[11px] ${notifTone(n.tone)}`}>{n.title}</div>
                      {n.body && <div className="text-slate-300 text-[11px] mt-0.5">{n.body}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <ThemeToggle className="items-center justify-center p-2 bg-slate-900 border border-white/10 text-slate-300 hover:text-white" />

        <div className="flex items-center gap-2">
          {user && (
            <div className="hidden md:flex flex-col items-end leading-tight">
              <span className="text-xs font-bold text-white">{user.name}</span>
              <span className="text-[10px] font-mono text-emerald-400 capitalize">{user.role}</span>
            </div>
          )}
          <button
            onClick={onLogout}
            className="inline-flex items-center gap-1.5 p-2 rounded-xl bg-slate-900 border border-white/10 text-slate-300 hover:text-red-400 hover:border-red-500/40 transition-colors"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden xl:inline text-xs font-semibold">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default ConsoleTopBar;
