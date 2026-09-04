import React from "react";
import { AdminProvider } from "@/components/admin/AdminContext";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminTopBar from "@/components/admin/AdminTopBar";
import EntityDrawer from "@/components/admin/EntityDrawer";
import MakerCheckerModal from "@/components/admin/MakerCheckerModal";

export const metadata = {
  title: "Super Admin Command Center | KoriePay",
  description:
    "KoriePay Tier-1 Production Banking Command Center for Nigeria (Providus Bank) and Niger Republic (Koris Bank).",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminProvider>
      <div className="min-h-screen bg-[#050914] text-slate-100 flex flex-row font-sans selection:bg-emerald-500 selection:text-slate-950">
        {/* Left Collapsible Admin Sidebar */}
        <AdminSidebar />

        {/* Right Main Working Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
          {/* Global Super Admin Topbar */}
          <AdminTopBar />

          {/* Dynamic Page Content */}
          <main className="flex-1 pb-16">{children}</main>

          {/* Universal Slide-In Entity Inspection Drawer */}
          <EntityDrawer />

          {/* Maker-Checker / Four-Eyes Authorization Dialog */}
          <MakerCheckerModal />
        </div>
      </div>
    </AdminProvider>
  );
}
