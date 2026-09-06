"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { SupportOpsProvider } from "@/components/support/SupportOpsProvider";
import { SupportShell } from "@/components/support/SupportShell";

/**
 * The sign-in page (/support/login) must render standalone — no sidebar,
 * no officer session requirement, no redirect-if-unauthenticated logic,
 * since it IS the place an unauthenticated officer lands. Every other
 * /support/* route gets the full operating-system shell, which requires a
 * real signed-in officer.
 */
export default function SupportLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/support/login") {
    return <>{children}</>;
  }

  return (
    <SupportOpsProvider>
      <SupportShell>{children}</SupportShell>
    </SupportOpsProvider>
  );
}
