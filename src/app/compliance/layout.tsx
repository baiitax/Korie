import React from 'react';
import { CompliancePortalProvider } from '@/components/compliance/CompliancePortal';
import { CompliancePortalShell } from '@/components/compliance/PortalShell';
import { ComplianceSessionGate } from '@/components/compliance/ComplianceSessionGate';

export const metadata = {
  title: 'Compliance & Financial Crime Portal | KoriePay',
  description:
    'AML monitoring, KYC/KYB due diligence, sanctions screening and regulatory control for Nigeria and Niger Republic.',
};

/**
 * `CompliancePortalProvider` is the portal state (jurisdiction scope, live
 * queue counters, notifications, session actor). The legacy mock store
 * (`ComplianceContext` + `complianceDataService`) was deleted with the last
 * mock screens (roadmap 2.4) — every compliance screen now reads through
 * `@/services/compliance`, live-only.
 *
 * `ComplianceSessionGate` wraps everything: no compliance UI renders until a
 * real officer session is verified server-side (401/403 gate the portal;
 * backend failures are surfaced per-screen instead of blanketed over).
 */
export default function ComplianceLayout({ children }: { children: React.ReactNode }) {
  return (
    <CompliancePortalProvider>
      <ComplianceSessionGate>
        <CompliancePortalShell>{children}</CompliancePortalShell>
      </ComplianceSessionGate>
    </CompliancePortalProvider>
  );
}
