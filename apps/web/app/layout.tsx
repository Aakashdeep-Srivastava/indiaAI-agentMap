import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, DM_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.msmemate.com"),
  title: {
    default: "MSMEMate — Bridging Bharat's Businesses",
    template: "%s | MSMEMate",
  },
  description:
    "MSMEMate: AI-native onboarding for India's MSMEs onto ONDC — voice-first registration, classification and seller-platform matching, built with Sovereign AI under the DPDP Act 2023.",
  applicationName: "MSMEMate",
  keywords: [
    "ONDC for MSME",
    "MSME registration",
    "Udyam registration",
    "ONDC seller app",
    "sell online India",
    "MSME digital onboarding",
    "ONDC network participant",
    "small business India",
  ],
  authors: [{ name: "Team XphoraAI" }],
  creator: "Team XphoraAI",
  publisher: "MSMEMate",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://www.msmemate.com",
    siteName: "MSMEMate",
    title: "MSMEMate — Bridging Bharat's Businesses",
    description:
      "Voice-first AI onboarding that takes India's MSMEs from Udyam registration to selling on ONDC — in their own language.",
    images: [{ url: "/logo.png", width: 512, height: 512, alt: "MSMEMate logo" }],
  },
  twitter: {
    card: "summary",
    title: "MSMEMate — Bridging Bharat's Businesses",
    description:
      "Voice-first AI onboarding that takes India's MSMEs from Udyam registration to selling on ONDC — in their own language.",
    images: ["/logo.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  icons: { icon: "/logo.png", apple: "/icon-192.png" },
  category: "business",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "MSMEMate",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F8F9FC" },
    { media: "(prefers-color-scheme: dark)", color: "#0B1437" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${jakarta.variable} ${dmSans.variable} ${jetbrains.variable}`}>
      <body className="min-h-screen font-body">{children}</body>
    </html>
  );
}
