"use client";

import React from "react";
import { MerchantProvider } from "@/components/merchant/MerchantContext";
import MerchantShell from "@/components/merchant/ui/MerchantShell";

export default function MerchantLayout({ children }: { children: React.ReactNode }) {
  return (
    <MerchantProvider>
      <MerchantShell>{children}</MerchantShell>
    </MerchantProvider>
  );
}
