import type { Metadata, Viewport } from "next";
import { Noto_Sans_Devanagari, Poppins } from "next/font/google";
import { Suspense } from "react";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { LanguageProvider } from "@/context/LanguageContext";
import "./globals.css";

const poppins = Poppins({
  weight: ["400", "500", "600", "700", "800"],
  subsets: ["latin"],
  variable: "--font-poppins",
  display: "swap",
});

// Poppins has no Devanagari glyphs, so Hindi text falls back to this.
const devanagari = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  variable: "--font-devanagari",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Sarkari Saathi — Your Guide to Government Schemes",
    template: "%s | Sarkari Saathi",
  },
  description:
    "Find central and state government schemes you are eligible for, check eligibility and reach the official application page.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1a5f3f",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${poppins.variable} ${devanagari.variable} h-full`}>
      <body className="flex min-h-full flex-col font-sans text-ink">
        <LanguageProvider>
          <Suspense fallback={<div className="h-16 border-b border-line bg-surface" />}>
            <Navbar />
          </Suspense>
          <main id="main" className="flex-1">
            {children}
          </main>
          <Footer />
        </LanguageProvider>
      </body>
    </html>
  );
}
