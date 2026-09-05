"use client";

import React from "react";
import { ShieldCheck, Lock, Landmark } from "lucide-react";
import { useAuth } from "./AuthContext";

export const SecurityNotice: React.FC = () => {
  const { jurisdiction } = useAuth();

  return (
    <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-3.5 flex items-center justify-between text-[11px] text-slate-400">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
          <Lock className="w-3.5 h-3.5" />
        </div>
        <div>
          <span className="font-semibold text-slate-300">Protected Gateway</span>
          <p className="text-[10px] text-slate-500">
            {jurisdiction === "NG" ? "Providus Bank Core Integration" : "Coris Bank Core Integration"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1 font-mono text-[10px] text-emerald-400">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span>TLS 1.3 Active</span>
      </div>
    </div>
  );
};

export default SecurityNotice;
