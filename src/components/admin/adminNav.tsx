"use client";

import type React from "react";
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

export interface AdminNavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

export interface AdminNavGroup {
  title: string;
  items: AdminNavItem[];
}

export function SendIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </svg>
  );
}

export function ZapIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

/** Badges that mean "needs attention" (shown as rail badges/dots). Static
 *  labels like "Live" or "AI" are dropped — the section names carry that
 *  meaning already. */
export const ADMIN_ATTENTION_BADGES = new Set(["P0", "Alert", "2 Exp"]);

export const adminNavGroups: AdminNavGroup[] = [
  {
    title: "COMMAND CENTER",
    items: [{ label: "Executive Overview", href: "/admin", icon: LayoutDashboard }],
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
