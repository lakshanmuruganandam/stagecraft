import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Geist_Mono, Instrument_Sans } from "next/font/google";
import { Header } from "@/components/site/Header";
import { Toaster } from "@/components/site/Toaster";
import { GlobalBroadcast } from "@/components/site/GlobalBroadcast";
import { GlowTracker } from "@/components/site/GlowTracker";
import { Scenery } from "@/components/site/Scenery";
import { Spot } from "@/components/motion/Spot";
import { themeScript } from "@/components/site/ThemeToggle";
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

export const viewport: Viewport = { themeColor: "#fbf5ea", colorScheme: "light dark" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-IN" suppressHydrationWarning className={`${display.variable} ${sans.variable} ${mono.variable} h-full`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-full flex-col">
        <Scenery />
        <div aria-hidden className="scroll-beam" />
        <Header />
        <main id="main" className="flex-1">
          {children}
        </main>
        <footer className="border-t border-white/6 py-8 text-center text-xs text-ink-400">
          StageCraft — built for Build-a-Thon 1.0 · Theme 03 · Code Crafters × the houses of IITM BS
        </footer>
        <Toaster />
        <GlobalBroadcast />
        <GlowTracker />
        <Spot />
      </body>
    </html>
  );
}
