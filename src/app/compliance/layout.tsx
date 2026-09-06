import React from 'react';
import { ComplianceProvider } from '@/components/compliance/ComplianceContext';
import { CompliancePortalProvider } from '@/components/compliance/CompliancePortal';
import { CompliancePortalShell } from '@/components/compliance/PortalShell';
import { ComplianceSessionGate } from '@/components/compliance/ComplianceSessionGate';

export const metadata = {
  title: 'Compliance & Financial Crime Portal | KoriePay',
  description:
    'AML monitoring, KYC/KYB due diligence, sanctions screening and regulatory control for Nigeria and Niger Republic.',
};

/**
 * Two providers, on purpose and only while the rebuild is in flight.
 *
 * `CompliancePortalProvider` is the new portal state (jurisdiction scope, live
 * queue counters, notifications, session actor). `ComplianceProvider` is the
 * legacy mock store that the not-yet-rebuilt screens still read from; it is
 * deleted as soon as the last of them moves onto `@/services/compliance`, and
 * no rebuilt screen is allowed to touch it.
 *
 * `ComplianceSessionGate` wraps everything: no compliance UI renders until a
 * real officer session is verified server-side (401/403 gate the portal;
 * backend failures are surfaced per-screen instead of blanketed over).
 */
export default function ComplianceLayout({ children }: { children: React.ReactNode }) {
  return (
    <ComplianceProvider>
      <CompliancePortalProvider>
        <ComplianceSessionGate>
          <CompliancePortalShell>{children}</CompliancePortalShell>
        </ComplianceSessionGate>
      </CompliancePortalProvider>
    </ComplianceProvider>
  );
}
