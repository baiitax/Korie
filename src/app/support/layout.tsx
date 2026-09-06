import React from "react";
import { SupportOpsProvider } from "@/components/support/SupportOpsProvider";
import { SupportShell } from "@/components/support/SupportShell";

export const metadata = {
  title: "Support Operations | KoriePay",
  description:
    "KoriePay Support Operating System — queue, SLA, disputes, escalations and governance for Nigeria and Niger Republic.",
};

export default function SupportLayout({ children }: { children: React.ReactNode }) {
  return (
    <SupportOpsProvider>
      <SupportShell>{children}</SupportShell>
    </SupportOpsProvider>
  );
}
