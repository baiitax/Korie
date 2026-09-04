import type { Metadata, Viewport } from "next";
import { Public_Sans, Source_Serif_4 } from "next/font/google";
import "./globals.css";
import { CountryProvider } from "@/components/ui/CountryContext";
import { AuthProvider } from "@/components/auth/AuthContext";
import { ThemeProvider } from "@/components/ui/ThemeContext";
import { LanguageProvider } from "@/components/ui/LanguageContext";
import dynamic from "next/dynamic";
import { RouteProgress } from "@/components/ui/RouteProgress";
import PublicChrome from "@/components/navigation/PublicChrome";
import Preloader from "@/components/brand/Preloader";

// These are full-screen overlay/chrome primitives that only appear on user
// interaction. Lazy-load them so their dependency subtree stays out of the
// initial bundle for every route.
const Modal = dynamic(() => import("@/components/ui/Modal"), { ssr: false });
const QuickSearch = dynamic(() => import("@/components/navigation/QuickSearch"), {
  ssr: false,
});

/**
 * Professional typography:
 *  - Sans (body / UI): Public Sans — a clean, institutional humanist sans
 *    with an Arial fallback.
 *  - Serif (display / headings): Source Serif 4 — a modern, Times-inspired
 *    editorial serif used for the brand headlines.
 */
const publicSans = Public_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#070b17",
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

// Inline script to set the persisted theme before hydration -> no flash.
const themeInitScript = `(function(){try{var t=localStorage.getItem("koriepay_theme");if(t==="dark"){document.documentElement.classList.remove("light","dark");document.documentElement.classList.add("dark");}else{document.documentElement.classList.remove("light","dark");document.documentElement.classList.add("light");}}catch(e){}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`light ${publicSans.variable} ${sourceSerif.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="bg-background text-foreground min-h-screen flex flex-col font-sans antialiased selection:bg-emerald-500 selection:text-slate-950">
        <ThemeProvider>
          <LanguageProvider>
            <AuthProvider>
              <CountryProvider>
                {/* Thin, branded route progress indicator for navigation */}
                <RouteProgress />

                {/* Brief, non-blocking brand reveal (first visit only) */}
                <Preloader />

                {/* Public marketing chrome (nav + footer) only on public pages */}
                <PublicChrome>{children}</PublicChrome>

                {/* Unified Command Palette Search */}
                <QuickSearch />

                {/* Dynamic Interactive Modals (Agent, BDC, Merchant, Developer, Login, Contact) */}
                <Modal />
              </CountryProvider>
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
