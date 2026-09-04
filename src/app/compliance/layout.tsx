import React from 'react';
import { ComplianceProvider } from '@/components/compliance/ComplianceContext';
import { ComplianceShell } from '@/components/compliance/ComplianceShell';

export const metadata = {
  title: 'Compliance & Financial Crime Management Portal | KoriePay',
  description: 'Enterprise AML Monitoring, KYC/KYB Due Diligence, Sanctions Screening, and Regulatory Control Center for Nigeria and Niger Republic.',
};

export default function ComplianceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ComplianceProvider>
      <ComplianceShell>{children}</ComplianceShell>
    </ComplianceProvider>
  );
}
