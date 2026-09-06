import React from "react";
import { AdminProvider } from "@/components/admin/AdminContext";
import { AdminDataGateway } from "@/components/admin/AdminDataGateway";
import { AdminShell } from "@/components/admin/AdminShell";

export const metadata = {
  title: "Command Center | KoriePay Admin",
  description:
    "KoriePay operational command center — Nigeria (Providus Bank) and Niger Republic (Coris Bank). Authorized staff only.",
};

/**
 * Admin shell: session gateway → phase-driven shell. Nothing admin-looking
 * renders until a real staff session is proven (AdminShell handles the
 * checking/gated states as full screens). AdminContext keeps the 35 legacy
 * pages working; EntityDrawer and MakerCheckerModal mount with the ready
 * shell.
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminProvider>
      <AdminDataGateway>
        <AdminShell>{children}</AdminShell>
      </AdminDataGateway>
    </AdminProvider>
  );
}
