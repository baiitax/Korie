import type { Metadata, Viewport } from "next";
import { Public_Sans, Source_Serif_4 } from "next/font/google";
import "./globals.css";
import { CountryProvider } from "@/components/ui/CountryContext";
import { AuthProvider } from "@/components/auth/AuthContext";
import { ThemeProvider } from "@/components/ui/ThemeContext";
import PublicChrome from "@/components/navigation/PublicChrome";
import Preloader from "@/components/brand/Preloader";
import Modal from "@/components/ui/Modal";
import QuickSearch from "@/components/navigation/QuickSearch";

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
const themeInitScript = `(function(){try{var t=localStorage.getItem("koriepay_theme");if(t!=="light"&&t!=="dark"){t=window.matchMedia&&window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";}document.documentElement.classList.remove("light","dark");document.documentElement.classList.add(t);}catch(e){}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`dark ${publicSans.variable} ${sourceSerif.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="bg-background text-foreground min-h-screen flex flex-col font-sans antialiased selection:bg-emerald-500 selection:text-slate-950">
        <ThemeProvider>
          <AuthProvider>
            <CountryProvider>
              {/* Signature Brand Preloader */}
              <Preloader />

              {/* Public marketing chrome (nav + footer) only on public pages */}
              <PublicChrome>{children}</PublicChrome>

              {/* Unified Command Palette Search */}
              <QuickSearch />

              {/* Dynamic Interactive Modals (Agent, BDC, Merchant, Developer, Login, Contact) */}
              <Modal />
            </CountryProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
