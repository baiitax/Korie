"use client";

// =============================================================================
// Agent portal root layout — engine-backed portal provider + light shell.
// =============================================================================

import React from "react";
import { AgentPortalProvider } from "@/components/agent/AgentContext";
import AgencyShell from "@/components/agent/ui/AgencyShell";

export default function AgentRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <AgentPortalProvider>
      <AgencyShell>{children}</AgencyShell>
    </AgentPortalProvider>
  );
}
