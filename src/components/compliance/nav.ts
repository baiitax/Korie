import type React from 'react';
import {
  Activity,
  BadgeCheck,
  CalendarDays,
  AlertTriangle,
  Building2,
  ClipboardCheck,
  Cpu,
  FileCheck2,
  FileText,
  Flag,
  Gauge,
  Globe,
  History,
  Inbox,
  KeyRound,
  Landmark,
  LayoutDashboard,
  ListChecks,
  Radio,
  Scale,
  ShieldAlert,
  SlidersHorizontal,
  UserCheck,
  Users,
  Wifi,
} from 'lucide-react';

/**
 * The compliance portal's information architecture.
 *
 * Order is the operating order of a financial-crime desk, not an alphabetical
 * list: critical risk first, then the queues that need hands, then
 * investigation, then analytics, reporting and governance. Every href here must
 * resolve to a real screen — the sweep asserts this, and a dead sidebar entry is
 * treated as a defect rather than a TODO.
 *
 * Icons are the project's single library (lucide) and are never the only signal:
 * each row carries a translated label and, where it exists, a live count.
 */

export interface ComplianceNavItem {
  key: string;
  /** Translation key under `compliance.nav.` */
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Which derived counter drives the badge, if any. */
  badge?: 'alerts' | 'cases' | 'tasks' | 'approvals' | 'escalations' | 'obligations' | 'sanctions';
  /** Escalation-worthy destinations keep the critical tone even when empty. */
  critical?: boolean;
  /** `demo` = the module has no live endpoint; the rail says so up front. */
  note?: 'demo' | 'planned';
}

export interface ComplianceNavGroup {
  key: string;
  items: ComplianceNavItem[];
}

export const COMPLIANCE_NAV: ComplianceNavGroup[] = [
  {
    key: 'overview',
    items: [
      { key: 'dashboard', label: 'dashboard', href: '/compliance', icon: LayoutDashboard },
      { key: 'work-queue', label: 'workQueue', href: '/compliance/work-queue', icon: SlidersHorizontal, badge: 'tasks' },
      { key: 'alerts', label: 'alerts', href: '/compliance/alerts', icon: AlertTriangle, badge: 'alerts', critical: true },
      { key: 'tasks', label: 'tasks', href: '/compliance/tasks', icon: ListChecks, badge: 'tasks' },
    ],
  },
  {
    key: 'dueDiligence',
    items: [
      { key: 'customers', label: 'customers', href: '/compliance/customers', icon: Users },
      { key: 'kyc', label: 'kyc', href: '/compliance/kyc', icon: UserCheck, badge: 'obligations' },
      { key: 'kyb', label: 'kyb', href: '/compliance/kyb', icon: Building2 },
      { key: 'edd', label: 'edd', href: '/compliance/edd', icon: FileCheck2 },
      { key: 'agents', label: 'agentKyc', href: '/compliance/agents', icon: BadgeCheck },
      { key: 'merchants', label: 'highRiskMerchants', href: '/compliance/merchants', icon: Scale },
    ],
  },
  {
    key: 'financialCrime',
    items: [
      { key: 'transactions', label: 'transactionMonitoring', href: '/compliance/transactions', icon: Radio },
      { key: 'aml', label: 'amlRules', href: '/compliance/aml', icon: Activity },
      { key: 'cases', label: 'cases', href: '/compliance/cases', icon: Inbox, badge: 'cases' },
      { key: 'investigations', label: 'investigations', href: '/compliance/investigations', icon: ClipboardCheck },
      { key: 'risk', label: 'riskFraud', href: '/compliance/risk', icon: Gauge },
    ],
  },
  {
    key: 'screening',
    items: [
      { key: 'sanctions', label: 'sanctions', href: '/compliance/sanctions', icon: ShieldAlert, critical: true },
      { key: 'pep', label: 'pep', href: '/compliance/pep', icon: Landmark },
      { key: 'watchlists', label: 'watchlists', href: '/compliance/watchlists', icon: Globe, note: 'demo' },
      { key: 'adverse-media', label: 'adverseMedia', href: '/compliance/adverse-media', icon: FileText },
    ],
  },
  {
    key: 'enforcement',
    items: [
      { key: 'restrictions', label: 'restrictions', href: '/compliance/restrictions', icon: KeyRound },
      { key: 'approvals', label: 'approvals', href: '/compliance/approvals', icon: ClipboardCheck, badge: 'approvals' },
      { key: 'escalations', label: 'escalations', href: '/compliance/escalations', icon: Flag, badge: 'escalations' },
    ],
  },
  {
    key: 'assurance',
    items: [
      { key: 'reports', label: 'reports', href: '/compliance/reports', icon: FileCheck2, badge: 'obligations' },
      { key: 'analytics', label: 'analytics', href: '/compliance/analytics', icon: Activity },
      { key: 'audit', label: 'audit', href: '/compliance/audit', icon: History },
      { key: 'calendar', label: 'calendar', href: '/compliance/calendar', icon: CalendarDays },
      { key: 'policies', label: 'policies', href: '/compliance/policies', icon: FileText },
    ],
  },
  {
    key: 'platform',
    items: [
      { key: 'integrations', label: 'integrations', href: '/compliance/integrations', icon: Wifi },
      { key: 'system-health', label: 'systemHealth', href: '/compliance/system-health', icon: Cpu },
      { key: 'team', label: 'team', href: '/compliance/team', icon: Users },
      { key: 'settings', label: 'settings', href: '/compliance/settings', icon: SlidersHorizontal },
    ],
  },
];

/** The five mobile destinations (§ mobile navigation is first-class, not a shrunk rail). */
export const COMPLIANCE_MOBILE_TABS: { key: string; label: string; href: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'home', label: 'mobileHome', href: '/compliance', icon: LayoutDashboard },
  { key: 'customers', label: 'customers', href: '/compliance/customers', icon: Users },
  { key: 'alerts', label: 'alerts', href: '/compliance/alerts', icon: AlertTriangle },
  { key: 'cases', label: 'cases', href: '/compliance/cases', icon: Inbox },
];

/** Every route the rail promises — the sweep walks this list. */
export const COMPLIANCE_ROUTES: string[] = [
  ...COMPLIANCE_NAV.flatMap((group) => group.items.map((item) => item.href)),
  '/compliance/dashboard',
];
