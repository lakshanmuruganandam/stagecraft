import Link from "next/link";
import { Suspense } from "react";
import { ChevronDown, LogOut, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import { getViewer } from "@/lib/auth";
import { isDemo } from "@/lib/env";
import { DEMO_EMAILS } from "@/lib/demo";
import { signOut, switchPersona } from "@/app/actions/auth";
import { Avatar, buttonClass } from "@/components/ui/primitives";
import { Logo } from "./Logo";
import { NavLinks } from "./NavLinks";
import { HereInput } from "./HereInput";
import { CommandPalette, PaletteButton } from "./CommandPalette";
import { ThemeToggle } from "./ThemeToggle";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/8 bg-ink-950/70 backdrop-blur-xl backdrop-saturate-150">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-full focus:bg-spot-500 focus:px-4 focus:py-2 focus:text-on-spot">
        Skip to content
      </a>
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5" aria-label="StageCraft home">
          <Logo />
          <span className="font-display text-lg font-semibold tracking-tight">
            Stage<span className="text-spot-400">Craft</span>
          </span>
        </Link>
        <Suspense fallback={<nav aria-label="Main" className="h-8 flex-1" />}>
          <ManagedNav />
        </Suspense>
        <div className="ml-auto flex items-center gap-2">
          <PaletteButton />
          <ThemeToggle />
          <CommandPalette />
          <Suspense fallback={<div className="h-9 w-24 animate-pulse rounded-full bg-white/5" />}>
            <UserMenu />
          </Suspense>
        </div>
      </div>
    </header>
  );
}

async function ManagedNav() {
  const v = await getViewer();
  return <NavLinks isManager={v?.role === "admin" || v?.role === "organizer"} />;
}

const PERSONAS = [
  { email: DEMO_EMAILS.admin, label: "Admin", note: "All events, all tools" },
  { email: DEMO_EMAILS.organizer, label: "Saranda organizer", note: "Runs Saranda events" },
  { email: DEMO_EMAILS.member, label: "Saranda member", note: "Audience · has certificates" },
  { email: DEMO_EMAILS.guest, label: "Kaziranga member", note: "Audience from another house" },
];

async function UserMenu() {
  const v = await getViewer();
  const demo = isDemo();
  return (
    <details className="group relative">
      <summary className={`${buttonClass(v ? "subtle" : "primary", "sm")} cursor-pointer list-none [&::-webkit-details-marker]:hidden`}>
        {v ? (
          <>
            <Avatar name={v.name} color={v.house?.color} size={22} />
            <span className="hidden max-w-32 truncate sm:inline">{v.name.split(" ")[0]}</span>
          </>
        ) : (
          <>
            <UserRound size={15} /> Sign in
          </>
        )}
        <ChevronDown size={14} className="transition group-open:rotate-180" />
      </summary>
      <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-white/10 bg-ink-850/95 p-2 shadow-2xl backdrop-blur-xl">
        {v ? (
          <div className="border-b border-white/6 px-3 pb-3 pt-2">
            <p className="font-medium text-white">{v.name}</p>
            <p className="text-xs text-ink-400">
              {v.house?.name ?? "No house"} · {v.role}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href="/me" className={buttonClass("outline", "sm")}>
                <Sparkles size={14} /> Credentials
              </Link>
              <Link href="/account" className={buttonClass("outline", "sm")}>
                <ShieldCheck size={14} /> Account
              </Link>
              <form action={signOut}>
                <HereInput />
                <button className={buttonClass("ghost", "sm")}>
                  <LogOut size={14} /> Sign out
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="border-b border-white/6 p-2 pb-3">
            <Link href="/login" className={`${buttonClass("primary", "sm")} w-full`}>
              Sign in or create account
            </Link>
          </div>
        )}
        {demo && (
          <div className="pt-2">
            <p className="eyebrow flex items-center gap-1.5 px-3 py-1.5">
              <ShieldCheck size={12} /> Demo · switch persona
            </p>
            {PERSONAS.map((p) => (
              <form key={p.email} action={switchPersona}>
                <input type="hidden" name="email" value={p.email} />
                <HereInput />
                <button className={`flex w-full flex-col items-start rounded-xl px-3 py-2 text-left hover:bg-white/6 ${v?.email === p.email ? "bg-spot-500/10 ring-1 ring-spot-500/30" : ""}`}>
                  <span className="text-sm text-white">{p.label}</span>
                  <span className="text-xs text-ink-400">{p.note}</span>
                </button>
              </form>
            ))}
          </div>
        )}
      </div>
    </details>
  );
}
