"use client";

import React from "react";
import { useAuth } from "./AuthContext";
import { UserRole } from "@/lib/auth/authService";
import { Shield, Sparkles, ChevronRight } from "lucide-react";

export const RoleSwitcherDevBar: React.FC = () => {
  const { activeRole, setActiveRole, biometricLogin, isLoading } = useAuth();

  const roles: { role: UserRole; label: string; badge: string; color: string }[] = [
    { role: "CUSTOMER", label: "Retail / SME Customer", badge: "KoriePay Wallet", color: "text-emerald-400" },
    { role: "AGENT", label: "Field Banking Agent", badge: "Cash In/Out", color: "text-teal-400" },
    { role: "AGGREGATOR", label: "Super Aggregator", badge: "Agent Network", color: "text-cyan-400" },
    { role: "MERCHANT", label: "Enterprise Merchant", badge: "Payment Gateway", color: "text-indigo-400" },
    { role: "ADMIN", label: "System Administrator", badge: "Command Center", color: "text-amber-400" },
    { role: "COMPLIANCE", label: "AML / Compliance Desk", badge: "Risk Oversight", color: "text-rose-400" },
    { role: "SUPPORT", label: "Customer Care Lead", badge: "Support Helpdesk", color: "text-blue-400" },
    { role: "DEVELOPER", label: "API Developer", badge: "Sandbox Portal", color: "text-purple-400" },
  ];

  return (
    <div className="w-full max-w-md mx-auto pt-4 border-t border-white/[0.08] space-y-2">
      <div className="flex items-center justify-between text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5 font-semibold text-slate-300">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Role Gateway & Persona Preview</span>
        </div>
        <span className="text-[10px] text-slate-400 font-mono">Simulated RBAC</span>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        {roles.map((item) => {
          const isActive = activeRole === item.role;
          return (
            <button
              key={item.role}
              type="button"
              disabled={isLoading}
              onClick={() => {
                setActiveRole(item.role);
                biometricLogin(item.role);
              }}
              className={`p-2 rounded-xl text-left border text-xs transition-all flex flex-col justify-between ${
                isActive
                  ? "bg-emerald-500/15 border-emerald-500 text-white font-bold shadow-sm"
                  : "bg-white/[0.02] border-white/[0.06] text-slate-400 hover:text-white hover:bg-white/[0.05]"
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className={`text-[11px] font-bold ${item.color}`}>{item.role}</span>
                {isActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
              </div>
              <div className="text-[10px] text-slate-400 truncate mt-0.5">{item.badge}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default RoleSwitcherDevBar;
