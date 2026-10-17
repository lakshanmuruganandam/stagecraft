import { Suspense } from "react";
import type { Metadata } from "next";
import { listHouses } from "@/server/queries";
import { isDemo } from "@/lib/env";
import { DEMO_EMAILS } from "@/lib/demo";
import { Logo } from "@/components/site/Logo";
import { AuthForms } from "./AuthForms";
import { Showcase } from "./Showcase";
import { Tilt } from "@/components/ui/Tilt";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-stretch gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:py-12">
      <Showcase />
      <div className="flex items-center justify-center">
        {/* The sign-in form is a theatre ticket: you're taking your seat. */}
        <div className="relative w-full max-w-md animate-rise">
          <Tilt max={5} foil className="rounded-[1.25rem]">
          <div className="card relative overflow-hidden p-7 sm:p-8">
            <div className="flex items-start justify-between">
              <Logo size={36} />
              <div className="text-right font-mono text-[0.6rem] uppercase leading-relaxed tracking-[0.2em] text-ink-400">
                Admit one
                <br />
                <span className="text-spot-300">Row H · Seat 12</span>
              </div>
            </div>
            <h1 className="mt-5 font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">Take your seat</h1>
            <p className="mt-2 text-sm text-ink-300">Chat, ask, vote and collect certificates. Your house earns points every time you take part.</p>
            <Suspense fallback={<div className="mt-6 h-72 animate-pulse rounded-xl bg-white/4" />}>
              <FormLoader searchParams={searchParams} />
            </Suspense>
          </div>
          </Tilt>
          {/* Perforated stub */}
          <div aria-hidden className="relative mx-6 -mt-px flex items-center justify-between rounded-b-2xl border border-t-0 border-dashed border-white/15 bg-ink-850/70 px-5 py-3 font-mono text-[0.62rem] uppercase tracking-[0.2em] text-ink-400">
            <span>StageCraft · IITM BS houses</span>
            <span className="tracking-[0.35em] text-ink-300">▮▯▮▮▯▮▯▮▮</span>
          </div>
        </div>
      </div>
    </div>
  );
}

async function FormLoader({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const [houses, sp] = await Promise.all([listHouses(), searchParams]);
  const next = typeof sp.next === "string" ? sp.next : "/";
  const mode = sp.mode === "signup" ? "signup" : "signin";
  const { DEMO_PASSWORD } = await import("@/db/seed");
  return <AuthForms houses={houses} next={next} initialMode={mode} demo={isDemo() ? { password: DEMO_PASSWORD, accounts: DEMO_EMAILS } : null} />;
}
