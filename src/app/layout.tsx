import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Geist_Mono, Instrument_Sans } from "next/font/google";
import { Header } from "@/components/site/Header";
import { Toaster } from "@/components/site/Toaster";
import { siteUrl } from "@/lib/env";
import "./globals.css";

const display = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"] });
const sans = Instrument_Sans({ variable: "--font-instrument", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: "StageCraft · Live events for IITM BS houses", template: "%s · StageCraft" },
  description:
    "Run interactive live events for your house: live Q&A and polls, esports brackets with predictions, talent-hunt voting, an OBS stage overlay, and verifiable certificates issued the moment the show ends.",
  openGraph: { type: "website", siteName: "StageCraft" },
};

export const viewport: Viewport = { themeColor: "#07070a", colorScheme: "dark" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-IN" className={`${display.variable} ${sans.variable} ${mono.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        <Header />
        <main id="main" className="flex-1">
          {children}
        </main>
        <footer className="border-t border-white/6 py-8 text-center text-xs text-ink-400">
          StageCraft — built for Build-a-Thon 1.0 · Theme 03 · Code Crafters × the houses of IITM BS
        </footer>
        <Toaster />
      </body>
    </html>
  );
}
