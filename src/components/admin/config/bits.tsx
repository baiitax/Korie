"use client";

import React from "react";
import { RefreshCw, Wrench, Inbox } from "lucide-react";

/* Shared presentational bits for the admin Configuration & Automation hub
 * (dark console theme — mirrors the rest of /admin). */

export const HubCard: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className = "", ...props }) => (
  <div className={`rounded-2xl bg-[#0b1324] border border-white/10 ${className}`} {...props} />
);

export const HubSectionTitle: React.FC<{ title: string; aside?: React.ReactNode }> = ({ title, aside }) => (
  <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
    <h2 className="text-[13px] font-bold uppercase tracking-wide font-mono text-white">{title}</h2>
    {aside}
  </div>
);

export const HubLoading: React.FC<{ rows?: number }> = ({ rows = 4 }) => (
  <div className="space-y-3 p-4" role="status" aria-label="Loading">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex items-center gap-3 animate-pulse">
        <div className="h-8 w-8 rounded-lg bg-slate-800/80" />
        <div className="h-3.5 flex-1 rounded bg-slate-800/80" />
        <div className="h-3.5 w-24 rounded bg-slate-800/80" />
      </div>
    ))}
  </div>
);

export const HubError: React.FC<{ title: string; message?: string; onRetry: () => void }> = ({ title, message, onRetry }) => (
  <div className="flex flex-col items-center gap-2 rounded-2xl border border-rose-500/30 bg-rose-500/5 px-6 py-10 text-center" role="alert">
    <p className="text-sm font-bold text-rose-300">{title}</p>
    {message && <p className="max-w-md text-xs text-slate-400">{message}</p>}
    <button
      type="button"
      onClick={onRetry}
      className="mt-2 inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-slate-900 px-3 py-1.5 text-xs font-bold text-slate-200 hover:border-white/25"
    >
      <RefreshCw className="w-3.5 h-3.5" /> Retry
    </button>
  </div>
);

export const HubEmpty: React.FC<{ title: string; description: string; action?: React.ReactNode }> = ({
  title,
  description,
  action,
}) => (
  <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
    <span className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-800/70 text-slate-400">
      {action ? <Wrench className="w-5 h-5" /> : <Inbox className="w-5 h-5" />}
    </span>
    <p className="text-sm font-bold text-slate-200">{title}</p>
    <p className="max-w-sm text-xs text-slate-400">{description}</p>
    {action && <div className="mt-2">{action}</div>}
  </div>
);

export const StatusPill: React.FC<{ status: string; mono?: boolean }> = ({ status, mono = true }) => {
  const cls =
    status === "CONNECTED" || status === "ACTIVE" || status === "LIVE" || status === "PRIMARY"
      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
      : status === "DEGRADED" || status === "ROTATING" || status === "FAILOVER" || status === "PAUSED"
        ? "bg-amber-500/10 text-amber-400 border-amber-500/25"
        : status === "FAILED" || status === "REVOKED" || status === "OFF"
          ? "bg-rose-500/10 text-rose-400 border-rose-500/25"
          : "bg-slate-800/70 text-slate-300 border-white/10";
  return (
    <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${cls} ${mono ? "font-mono" : ""}`}>
      {status}
    </span>
  );
};

export const CategoryChip: React.FC<{ category: string }> = ({ category }) => (
  <span className="inline-flex items-center rounded-md bg-sky-500/10 text-sky-300 border border-sky-500/20 px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider">
    {category.replace(/_/g, " ")}
  </span>
);

export const ActionButton: React.FC<{
  children: React.ReactNode;
  onClick: () => void;
  variant?: "primary" | "ghost" | "danger" | "success";
  disabled?: boolean;
  title?: string;
}> = ({ children, onClick, variant = "ghost", disabled, title }) => {
  const v =
    variant === "primary"
      ? "bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400"
      : variant === "danger"
        ? "bg-rose-500/10 text-rose-300 border border-rose-500/30 hover:bg-rose-500/20"
        : variant === "success"
          ? "bg-sky-500/10 text-sky-300 border border-sky-500/30 hover:bg-sky-500/20"
          : "bg-slate-900 border border-white/10 text-slate-300 hover:border-white/25";
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${v}`}
    >
      {children}
    </button>
  );
};

export const TextField: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
  hint?: string;
  mono?: boolean;
}> = ({ label, value, onChange, placeholder, type = "text", disabled, hint, mono }) => (
  <label className="block">
    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">{label}</span>
    <input
      type={type}
      value={value}
      disabled={disabled}
      placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      className={`mt-1 w-full rounded-xl bg-slate-950 border border-white/10 px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed ${mono ? "font-mono" : ""}`}
    />
    {hint && <span className="mt-1 block text-[10px] text-slate-500">{hint}</span>}
  </label>
);

export const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }> = ({
  checked,
  onChange,
  label,
  disabled,
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={`flex items-center gap-2 disabled:opacity-40 ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}
  >
    <span className={`relative h-5 w-9 rounded-full transition-colors ${checked ? "bg-emerald-500" : "bg-slate-700"}`}>
      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${checked ? "left-[18px]" : "left-0.5"}`} />
    </span>
    <span className="text-[11px] font-semibold text-slate-300">{label}</span>
  </button>
);

export const ModalShell: React.FC<{ children: React.ReactNode; onClose: () => void; label: string; wide?: boolean }> = ({
  children,
  onClose,
  label,
  wide,
}) => (
  <div
    className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
    role="dialog"
    aria-modal="true"
    aria-label={label}
    onClick={e => { if (e.target === e.currentTarget) onClose(); }}
  >
    <div className={`w-full ${wide ? "max-w-3xl" : "max-w-lg"} max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 bg-[#0b1324] shadow-2xl`}>
      {children}
    </div>
  </div>
);
