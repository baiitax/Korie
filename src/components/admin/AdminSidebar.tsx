"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import KorieLogo from "@/components/brand/KorieLogo";
import {
  LayoutDashboard,
  Building2,
  Users,
  Repeat2,
  CreditCard,
  Briefcase,
  Layers,
  ArrowRightLeft,
  Wallet,
  FileSpreadsheet,
  CheckCircle2,
  Coins,
  ShieldCheck,
  AlertTriangle,
  FileCheck2,
  Server,
  Code2,
  Radio,
  Activity,
  BarChart3,
  FileText,
  LifeBuoy,
  Lock,
  History,
  Settings,
  BrainCircuit,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

function SendIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" />
    </svg>
  );
}

function ZapIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

export const AdminSidebar: React.FC = () => {
  const pathname = usePathname();

  const navGroups: NavGroup[] = [
    {
      title: "COMMAND CENTER",
      items: [
        { label: "Executive Overview", href: "/admin", icon: LayoutDashboard },
      ],
    },
    {
      title: "OPERATIONS",
      items: [
        { label: "Customers", href: "/admin/customers", icon: Users },
        { label: "Adashi / Ajo (ROSCA)", href: "/admin/adashi", icon: Coins, badge: "P0" },
        { label: "Agents & POS", href: "/admin/agents", icon: Building2 },
        { label: "Cash & Vaults (CIT)", href: "/admin/cash-operations", icon: Coins, badge: "P0" },
        { label: "Merchants", href: "/admin/merchants", icon: CreditCard },
        { label: "BDC / FX Desks", href: "/admin/bdc", icon: Repeat2 },
        { label: "Corporate Business", href: "/admin/businesses", icon: Briefcase },
        { label: "Transactions", href: "/admin/transactions", icon: ArrowRightLeft },
        { label: "Transfers (NIP/CFA)", href: "/admin/transfers", icon: SendIcon },
        { label: "Bill Payments", href: "/admin/bill-payments", icon: ZapIcon },
      ],
    },
    {
      title: "FINANCIAL & TREASURY",
      items: [
        { label: "Wallets Control", href: "/admin/wallets", icon: Wallet },
        { label: "Immutable Ledger", href: "/admin/ledger", icon: Layers },
        { label: "Settlements", href: "/admin/settlements", icon: FileSpreadsheet },
        { label: "Reconciliation", href: "/admin/reconciliation", icon: CheckCircle2, badge: "2 Exp" },
        { label: "Treasury & Liquidity", href: "/admin/treasury", icon: Coins },
        { label: "FX Rates Engine", href: "/admin/fx", icon: BarChart3 },
      ],
    },
    {
      title: "RISK & COMPLIANCE",
      items: [
        { label: "KYC / KYB Review", href: "/admin/kyc", icon: FileCheck2 },
        { label: "Risk & Fraud Monitor", href: "/admin/risk", icon: AlertTriangle, badge: "Alert" },
        { label: "Disputes & Claims", href: "/admin/disputes", icon: ShieldCheck },
      ],
    },
    {
      title: "INFRASTRUCTURE & NODES",
      items: [
        { label: "Banking Nodes", href: "/admin/banking-nodes", icon: Server, badge: "Live" },
        { label: "APIs & Logs", href: "/admin/apis", icon: Code2 },
        { label: "Webhooks Dispatcher", href: "/admin/webhooks", icon: Radio },
        { label: "System Health", href: "/admin/system-health", icon: Activity },
      ],
    },
    {
      title: "INTELLIGENCE & GOVERNANCE",
      items: [
        { label: "AI & Decision Intel", href: "/admin/intelligence", icon: BrainCircuit, badge: "AI" },
        { label: "Reports Builder", href: "/admin/reports", icon: FileText },
        { label: "Support Tickets", href: "/admin/support", icon: LifeBuoy },
        { label: "Security & Sessions", href: "/admin/security", icon: Lock },
        { label: "Immutable Audit Log", href: "/admin/audit", icon: History },
        { label: "Platform Settings", href: "/admin/settings", icon: Settings },
      ],
    },
  ];

  return (
    <aside className="w-64 bg-[#070b16] border-r border-white/10 flex flex-col justify-between shrink-0 h-screen sticky top-0 overflow-y-auto z-30">
      <div>
        {/* Brand Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <Link href="/admin" className="flex items-center gap-2">
            <KorieLogo variant="compact" theme="dark" height={28} />
          </Link>
          <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            SUPER ADMIN
          </span>
        </div>

        {/* Banking Node Strip */}
        <div className="p-3 mx-3 my-3 rounded-2xl bg-[#0d162a] border border-white/5 space-y-2">
          <div className="flex items-center justify-between text-[10px] font-mono uppercase text-slate-400">
            <span>CORE BANKING RAILS</span>
            <span className="text-emerald-400 font-bold">ONLINE</span>
          </div>
          <div className="space-y-1 text-xs">
            <Link
              href="/admin/banking-nodes"
              className="flex items-center justify-between p-1.5 rounded-lg hover:bg-white/5 text-slate-300 hover:text-white transition-colors"
            >
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[11px] font-semibold">🇳🇬 Providus Bank</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400">142ms</span>
            </Link>
            <Link
              href="/admin/banking-nodes"
              className="flex items-center justify-between p-1.5 rounded-lg hover:bg-white/5 text-slate-300 hover:text-white transition-colors"
            >
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[11px] font-semibold">🇳🇪 Koris Bank</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400">188ms</span>
            </Link>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-6">
          {navGroups.map((group, idx) => (
            <div key={idx} className="space-y-1">
              <div className="px-3 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-1">
                {group.title}
              </div>
              {group.items.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? "bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20"
                        : "text-slate-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${isActive ? "text-slate-950" : "text-slate-400"}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold ${
                          isActive
                            ? "bg-slate-950/30 text-slate-950"
                            : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
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
        </nav>
      </div>

      {/* Footer Profile & Live Uptime */}
      <div className="p-3 border-t border-white/10 bg-[#060912]">
        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold font-mono">
              SA
            </div>
            <div>
              <div className="text-xs font-bold text-white leading-tight">Super Admin</div>
              <div className="text-[10px] text-slate-400 font-mono">Abuja Core Desk</div>
            </div>
          </div>
          <Link href="/" className="text-[10px] text-emerald-400 hover:underline font-mono">
            Public Site ↗
          </Link>
        </div>
      </div>
    </aside>
  );
};

export default AdminSidebar;
