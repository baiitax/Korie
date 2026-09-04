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
  title: "Secure Cross-Border Payments & Fintech Infrastructure for Nigeria & Niger Republic",
  description:
    "KoriePay connects people, agency banking networks, BDC/FX operators, merchants and businesses with secure digital payments and financial infrastructure across Nigeria and Niger Republic. Money transfer, agency banking, merchant payments and digital wallets. Kudinka, Hannunka.",
  keywords: [
    "KoriePay",
    "cross-border payments Nigeria Niger",
    "agency banking Nigeria",
    "secure money transfer West Africa",
    "African fintech infrastructure",
    "digital banking Nigeria",
    "merchant payments",
    "BDC FX digital operations",
    "Nigeria Niger financial connectivity",
    "Kudinka Hannunka",
  ],
  openGraph: {
    title: "KoriePay | Secure Cross-Border Payments & Fintech Infrastructure",
    description:
      "Secure, scalable digital financial infrastructure connecting agency banking, BDC/FX operators, merchants and consumers across Nigeria and Niger Republic.",
    url: "https://koriepay.com",
    siteName: "KoriePay",
    images: [
      {
        url: "/images/visual/hero-ecosystem.webp",
        width: 1536,
        height: 1024,
        alt: "KoriePay digital payment ecosystem connecting Nigeria and Niger Republic",
      },
    ],
    locale: "en_NG",
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
      <section className="py-16 kp-band-neutral relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AgentCalculator />
        </div>
      </section>

      {/* 05: Bilateral Economic Corridors (Nigeria 🇳🇬 ↔ Niger 🇳🇪) */}
      <CrossBorderCorridor />

      {/* 06: Institutional FX & Multi-Currency Rate Simulator */}
      <section className="py-16 kp-band-neutral relative">
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
