"use client";

import React from "react";
import { AgentProvider } from "@/components/agent/AgentContext";
import AgencyShell from "@/components/agent/ui/AgencyShell";

export default function AgentRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <AgentProvider>
      <AgencyShell>{children}</AgencyShell>
    </AgentProvider>
  );
}
