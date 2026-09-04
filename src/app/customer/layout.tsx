"use client";

import React from "react";
import { CustomerProvider } from "@/components/customer/CustomerContext";
import CustomerShell from "@/components/customer/ui/CustomerShell";

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <CustomerProvider>
      <CustomerShell>{children}</CustomerShell>
    </CustomerProvider>
  );
}
