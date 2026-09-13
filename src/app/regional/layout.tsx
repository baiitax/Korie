"use client";

import React from "react";
import { RegionalProvider } from "@/components/regional/RegionalContext";
import RegionalShell from "@/components/regional/RegionalShell";

export default function RegionalLayout({ children }: { children: React.ReactNode }) {
  return (
    <RegionalProvider>
      <RegionalShell>{children}</RegionalShell>
    </RegionalProvider>
  );
}
