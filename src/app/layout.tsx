import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { CountryProvider } from "@/components/ui/CountryContext";
import { AuthProvider } from "@/components/auth/AuthContext";
import Navbar from "@/components/navigation/Navbar";
import Footer from "@/components/navigation/Footer";
import Preloader from "@/components/brand/Preloader";
import Modal from "@/components/ui/Modal";
import QuickSearch from "@/components/navigation/QuickSearch";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#080d1a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://koriepay.com"),
  title: {
    default: "KoriePay | Tier-1 Cross-Border Fintech Infrastructure for Nigeria & Niger Republic",
    template: "%s | KoriePay",
  },
  description:
    "KoriePay powers Agency Banking, BDC / FX digital operations, Consumer Wallets, and Merchant Payments across Nigeria and Niger Republic. Kudinka, Hannunka.",
  keywords: [
    "KoriePay",
    "Agency Banking Nigeria",
    "Agency Banking Niger",
    "BDC Fintech",
    "Cross-border payments",
    "Nigeria Niger trade",
    "Kudinka Hannunka",
    "West Africa fintech infrastructure",
  ],
  icons: {
    icon: "/brand/koriepay-icon-tight.png",
    shortcut: "/brand/koriepay-icon-tight.png",
    apple: "/brand/icon-192.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${plusJakarta.variable}`}>
      <body className="bg-[#080d1a] text-slate-100 min-h-screen flex flex-col font-sans antialiased selection:bg-emerald-500 selection:text-slate-950">
        <AuthProvider>
          <CountryProvider>
            {/* Signature Brand Preloader */}
            <Preloader />

            {/* Institutional Top Navigation Header */}
            <Navbar />

            {/* Unified Command Palette Search */}
            <QuickSearch />

            {/* Dynamic Interactive Modals (Agent, BDC, Merchant, Developer, Login, Contact) */}
            <Modal />

            {/* Page Content */}
            <div className="flex-1">{children}</div>

            {/* Institutional Footer */}
            <Footer />
          </CountryProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

