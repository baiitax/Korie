import React from 'react';
import { SupportProvider } from '@/components/support/SupportContext';
import { SupportShell } from '@/components/support/SupportShell';

export const metadata = {
  title: 'Support Operations & Automation Portal | KoriePay',
  description: 'Enterprise Customer Support Workforce, Ticketing, Automation & Service Intelligence Platform for Nigeria and Niger Republic.',
};

export default function SupportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SupportProvider>
      <SupportShell>{children}</SupportShell>
    </SupportProvider>
  );
}
