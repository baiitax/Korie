"use client";

import React from "react";
import { AggregatorProvider } from "@/components/aggregator/AggregatorContext";
import AggregatorShell from "@/components/aggregator/ui/AggregatorShell";

export default function AggregatorLayout({ children }: { children: React.ReactNode }) {
  return (
    <AggregatorProvider>
      <AggregatorShell>{children}</AggregatorShell>
    </AggregatorProvider>
  );
}
