import React from "react";
import HeroSection from "@/components/sections/HeroSection";
import EcosystemVisualizer from "@/components/sections/EcosystemVisualizer";
import ThreePillarsSection from "@/components/sections/ThreePillarsSection";
import CrossBorderCorridor from "@/components/sections/CrossBorderCorridor";
import AgentCalculator from "@/components/sections/AgentCalculator";
import FxRateSimulator from "@/components/sections/FxRateSimulator";
import DevCodePreview from "@/components/sections/DevCodePreview";
import TrustMetrics from "@/components/sections/TrustMetrics";
import TestimonialsStories from "@/components/sections/TestimonialsStories";
import CTASection from "@/components/sections/CTASection";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "KoriePay | Tier-1 Cross-Border Fintech Infrastructure for Nigeria & Niger Republic",
  description:
    "KoriePay is Tier-1 financial technology infrastructure powering Agency Banking, BDC & FX operations, Customer Wallets, and Merchant Payments across Nigeria and Niger Republic. Kudinka, Hannunka.",
  keywords: [
    "KoriePay",
    "Fintech Nigeria",
    "Fintech Niger Republic",
    "Agency Banking Nigeria",
    "Agency Banking Niger",
    "BDC technology",
    "FX fintech",
    "Payment infrastructure Nigeria",
    "Payment infrastructure Niger",
    "African fintech",
    "Cross-border payments West Africa",
    "Kudinka Hannunka",
  ],
  openGraph: {
    title: "KoriePay — Powering the Financial Ecosystem Across Nigeria & Niger Republic",
    description:
      "Connecting customers, agents, BDCs, merchants, and businesses through secure digital financial infrastructure built for the next generation of African commerce.",
    url: "https://koriepay.com",
    siteName: "KoriePay",
    images: [
      {
        url: "/brand/koriepay-logo-full.png",
        width: 1200,
        height: 630,
        alt: "KoriePay Fintech Infrastructure",
      },
    ],
    locale: "en_US",
    type: "website",
  },
};

export default function HomePage() {
  return (
    <main className="min-h-screen">
      {/* 01: Hero Section with Live Ticker and Dynamic Audience Switcher */}
      <HeroSection />

      {/* 02: Interconnected Ecosystem Architecture Visualization */}
      <EcosystemVisualizer />

      {/* 03: The Three Core Pillars (Agency Banking, BDC / FX, Customers) */}
      <ThreePillarsSection />

      {/* 04: Interactive Agent Commission & Volume Calculator */}
      <section className="py-16 bg-[#080d1a] relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AgentCalculator />
        </div>
      </section>

      {/* 05: Bilateral Economic Corridors (Nigeria 🇳🇬 ↔ Niger 🇳🇪) */}
      <CrossBorderCorridor />

      {/* 06: Institutional FX & Multi-Currency Rate Simulator */}
      <section className="py-16 bg-[#080d1a] relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FxRateSimulator />
        </div>
      </section>

      {/* 07: Developer Platform & Interactive Sandbox Code Explorer */}
      <DevCodePreview />

      {/* 08: Institutional Security, Governance & Risk Controls */}
      <TrustMetrics />

      {/* 09: Authentic Regional Voices & Market Case Stories */}
      <TestimonialsStories />

      {/* 10: Master Call to Action Section */}
      <CTASection />
    </main>
  );
}
