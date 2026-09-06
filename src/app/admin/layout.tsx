import React from "react";
import { AdminProvider } from "@/components/admin/AdminContext";
import AdminConsoleFrame from "@/components/admin/AdminConsoleFrame";
import EntityDrawer from "@/components/admin/EntityDrawer";
import MakerCheckerModal from "@/components/admin/MakerCheckerModal";

export const metadata = {
  title: "Super Admin Command Center | KoriePay",
  description:
    "KoriePay Tier-1 Production Banking Command Center for Nigeria (Providus Bank) and Niger Republic (Coris Bank).",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminProvider>
      <AdminConsoleFrame>{children}</AdminConsoleFrame>
      <EntityDrawer />
      <MakerCheckerModal />
    </AdminProvider>
  );
}
