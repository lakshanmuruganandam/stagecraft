import { Suspense } from "react";
import type { Metadata } from "next";
import { listHouses } from "@/server/queries";
import { isDemo } from "@/lib/env";
import { DEMO_EMAILS } from "@/lib/demo";
import { Logo } from "@/components/site/Logo";
import { AuthForms } from "./AuthForms";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <div className="relative mx-auto grid max-w-md px-4 py-14 sm:py-20">
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-0 h-80 w-[36rem] -translate-x-1/2 bg-[radial-gradient(closest-side,rgb(255_169_40/0.16),transparent)]" />
      <div className="card relative p-7 sm:p-8">
        <Logo size={36} />
        <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-white">Take your seat</h1>
        <p className="mt-2 text-sm text-ink-300">Sign in to chat, ask questions, vote and collect your certificates. Your house earns points every time you take part.</p>
        <Suspense fallback={<div className="mt-6 h-72 animate-pulse rounded-xl bg-white/4" />}>
          <FormLoader searchParams={searchParams} />
        </Suspense>
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
