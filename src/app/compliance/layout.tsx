import React from 'react';
import './compliance.css';
import { ComplianceProvider } from '@/components/compliance/ComplianceContext';
import { CompliancePortalProvider } from '@/components/compliance/CompliancePortalContext';
import { ComplianceShell } from '@/components/compliance/ComplianceShell';

export const metadata = {
  title: 'Compliance & Financial Crime Management Portal | KoriePay',
  description: 'Enterprise AML Monitoring, KYC/KYB Due Diligence, Sanctions Screening, and Regulatory Control Center for Nigeria and Niger Republic.',
};

export default function ComplianceLayout({ children }: { children: React.ReactNode }) {
  return (
    <ComplianceProvider>
      <CompliancePortalProvider>
        <ComplianceShell>{children}</ComplianceShell>
      </CompliancePortalProvider>
    </ComplianceProvider>
  );
}
