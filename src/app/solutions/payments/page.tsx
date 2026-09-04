"use client";

import React from "react";
import CrossBorderCorridor from "@/components/sections/CrossBorderCorridor";
import FxRateSimulator from "@/components/sections/FxRateSimulator";
import CTASection from "@/components/sections/CTASection";

export default function PaymentsPage() {
  return (
    <main className="pt-28 sm:pt-32 pb-20">
      {/* Interactive Corridor Visualizer */}
      <CrossBorderCorridor />

      {/* Simulator Section */}
      <section className="py-16 bg-[#080d1a] relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FxRateSimulator />
        </div>
      </section>

      <CTASection />
    </main>
  );
}
