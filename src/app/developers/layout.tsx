import React from 'react';
import { DeveloperProvider } from '@/components/developer/DeveloperContext';
import { DeveloperShell } from '@/components/developer/DeveloperShell';

export const metadata = {
  title: 'Developer Platform & API Management Portal | KoriePay',
  description: 'Enterprise API Gateway, Developer Sandbox, Webhooks, Credentials, and Integration Telemetry for Nigeria and Niger Republic.',
};

export default function DevelopersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DeveloperProvider>
      <DeveloperShell>{children}</DeveloperShell>
    </DeveloperProvider>
  );
}
